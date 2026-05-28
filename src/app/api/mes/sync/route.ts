/**
 * POST /api/mes/sync
 *
 * Endpoint preparado para integración futura con MES (Manufacturing Execution System).
 * Permite enviar lotes de inspecciones desde el MES directamente al sistema SPC,
 * replicando internamente la lógica de evaluación de /api/spc/evaluar para cada registro.
 *
 * Body: { inspecciones: MESInspeccion[] }
 *
 * MESInspeccion: {
 *   maquina_id:      string   (UUID de la máquina)
 *   codigo_pieza:    string
 *   valor_medido:    number
 *   hora_inspeccion: string   (ISO 8601 — timestamp enviado por el MES)
 * }
 *
 * Response: { procesadas: number, errores: MESError[] }
 *
 * MESError: {
 *   indice:    number  (índice en el array original)
 *   maquina_id: string
 *   error:     string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { detectViolations } from '@/lib/spc/western-electric'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MESInspeccion {
  maquina_id: string
  codigo_pieza: string
  valor_medido: number
  hora_inspeccion: string
}

interface MESError {
  indice: number
  maquina_id: string
  error: string
}

interface SPCConfigRow {
  ucl: number | null
  cl: number | null
  lcl: number | null
  usl: number | null
  lsl: number | null
  tamano_subgrupo: number | null
  tipo_grafico: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Service-role client — bypasses RLS for server-side writes
// ─────────────────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Core evaluation logic (mirrors /api/spc/evaluar, called inline for each item)
// ─────────────────────────────────────────────────────────────────────────────

async function evaluarInspeccion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  inspeccion: MESInspeccion
): Promise<void> {
  const { maquina_id, codigo_pieza, valor_medido, hora_inspeccion } = inspeccion
  const numericValue = Number(valor_medido)

  if (isNaN(numericValue)) {
    throw new Error('valor_medido no es un número válido')
  }

  // 1. Fetch spc_config for this machine
  const { data: spcConfig, error: configError } = await supabase
    .from('spc_config')
    .select('ucl, cl, lcl, usl, lsl, tamano_subgrupo, tipo_grafico')
    .eq('maquina_id', maquina_id)
    .maybeSingle() as { data: SPCConfigRow | null; error: { message: string } | null }

  if (configError) {
    throw new Error(`Error al leer configuración SPC: ${configError.message}`)
  }

  // 2. Determine estado based on spec limits (USL / LSL)
  let estado: 'ok' | 'no_ok' = 'ok'
  if (spcConfig && spcConfig.usl !== null && spcConfig.lsl !== null) {
    if (numericValue > spcConfig.usl || numericValue < spcConfig.lsl) {
      estado = 'no_ok'
    }
  }

  // 3. Detect Western Electric violations
  let fuera_de_control = false
  let regla_violada: string | null = null

  if (
    spcConfig &&
    spcConfig.ucl !== null &&
    spcConfig.cl !== null &&
    spcConfig.lcl !== null
  ) {
    const { data: recentRows } = await supabase
      .from('piezas')
      .select('valor_medido')
      .eq('maquina_id', maquina_id)
      .not('valor_medido', 'is', null)
      .order('hora_inspeccion', { ascending: false })
      .limit(50)

    const historical: number[] = ((recentRows ?? []) as { valor_medido: number }[])
      .reverse()
      .map((r) => r.valor_medido)

    const allValues = [...historical, numericValue]
    const sigmaEstimada = (spcConfig.ucl - spcConfig.cl) / 3

    const weLimits = {
      ucl: spcConfig.ucl,
      cl: spcConfig.cl,
      lcl: spcConfig.lcl,
      sigma1: sigmaEstimada,
      sigma2: 2 * sigmaEstimada,
    }

    const violations = detectViolations(allValues, weLimits)
    const newIndex = allValues.length - 1
    const violation = violations.find((v) => v.index === newIndex)

    if (violation) {
      fuera_de_control = true
      regla_violada = violation.rule
      if (estado === 'ok') {
        estado = 'no_ok'
      }
    }
  }

  // 4. Insert pieza — usa hora_inspeccion del MES (no new Date())
  const { error: insertError } = await supabase
    .from('piezas')
    .insert({
      maquina_id,
      codigo_pieza: codigo_pieza.trim(),
      estado,
      valor_medido: numericValue,
      hora_inspeccion: new Date(hora_inspeccion).toISOString(),
      inspector_id: null, // inspecciones MES no tienen inspector humano asignado
      observaciones: 'Sincronizado desde MES',
      fuera_de_control,
      regla_violada,
    })

  if (insertError) {
    throw new Error(`Error al guardar inspección: ${insertError.message}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const inspecciones: MESInspeccion[] = body?.inspecciones

    if (!Array.isArray(inspecciones) || inspecciones.length === 0) {
      return NextResponse.json(
        { error: 'El body debe contener { inspecciones: MESInspeccion[] } con al menos un elemento' },
        { status: 400 }
      )
    }

    const supabase = getServiceClient()
    let procesadas = 0
    const errores: MESError[] = []

    for (let i = 0; i < inspecciones.length; i++) {
      const item = inspecciones[i]

      // Validate required fields per item
      if (!item.maquina_id || !item.codigo_pieza || item.valor_medido === undefined || !item.hora_inspeccion) {
        errores.push({
          indice: i,
          maquina_id: item.maquina_id ?? 'desconocido',
          error: 'Faltan campos requeridos: maquina_id, codigo_pieza, valor_medido, hora_inspeccion',
        })
        continue
      }

      try {
        await evaluarInspeccion(supabase, item)
        procesadas++
      } catch (err) {
        errores.push({
          indice: i,
          maquina_id: item.maquina_id,
          error: err instanceof Error ? err.message : 'Error desconocido',
        })
      }
    }

    return NextResponse.json({ procesadas, errores })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
