import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectViolations } from '@/lib/spc/western-electric'

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
// POST /api/spc/evaluar
//
// Body: {
//   maquina_id:    string  (UUID)
//   codigo_pieza:  string
//   valor_medido:  number
//   inspector_id:  string  (UUID)
//   observaciones: string | null  (optional)
// }
//
// Returns: { pieza, isOutOfControl, ruleViolated }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { maquina_id, codigo_pieza, valor_medido, inspector_id, observaciones } = body

    // Validate required fields
    if (!maquina_id || !codigo_pieza || valor_medido === undefined || valor_medido === null || !inspector_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: maquina_id, codigo_pieza, valor_medido, inspector_id' },
        { status: 400 }
      )
    }

    const numericValue = Number(valor_medido)
    if (isNaN(numericValue)) {
      return NextResponse.json({ error: 'valor_medido debe ser un número válido' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // ── 1. Fetch spc_config for this machine ────────────────────────────────
    const { data: spcConfig, error: configError } = await supabase
      .from('spc_config')
      .select('*')
      .eq('maquina_id', maquina_id)
      .maybeSingle()

    if (configError) {
      return NextResponse.json({ error: `Error al leer configuración SPC: ${configError.message}` }, { status: 500 })
    }

    // ── 2. Determine estado based on spec limits (USL / LSL) ─────────────────
    let estado: 'ok' | 'no_ok' = 'ok'
    if (
      spcConfig &&
      spcConfig.usl !== null &&
      spcConfig.lsl !== null
    ) {
      if (numericValue > spcConfig.usl || numericValue < spcConfig.lsl) {
        estado = 'no_ok'
      }
    }

    // ── 3. Detect Western Electric violations ────────────────────────────────
    let fuera_de_control = false
    let regla_violada: string | null = null

    if (
      spcConfig &&
      spcConfig.ucl !== null &&
      spcConfig.cl !== null &&
      spcConfig.lcl !== null
    ) {
      // Fetch up to 50 recent measurements for this machine (chronological)
      const { data: recentRows } = await supabase
        .from('piezas')
        .select('valor_medido')
        .eq('maquina_id', maquina_id)
        .not('valor_medido', 'is', null)
        .order('hora_inspeccion', { ascending: false })
        .limit(50)

      // Reverse to chronological order and append the new value
      const historical: number[] = ((recentRows ?? []) as { valor_medido: number }[])
        .reverse()
        .map((r) => r.valor_medido)

      const allValues = [...historical, numericValue]

      // sigmaEstimada = (UCL - CL) / 3
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
        // If WE rule violated and no spec limits configured, mark estado as no_ok
        if (estado === 'ok') {
          estado = 'no_ok'
        }
      }
    }

    // ── 4. Insert pieza ──────────────────────────────────────────────────────
    const { data: pieza, error: insertError } = await supabase
      .from('piezas')
      .insert({
        maquina_id,
        codigo_pieza: codigo_pieza.trim(),
        estado,
        valor_medido: numericValue,
        hora_inspeccion: new Date().toISOString(),
        inspector_id,
        observaciones: observaciones?.trim() || null,
        fuera_de_control,
        regla_violada,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: `Error al guardar inspección: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      pieza,
      isOutOfControl: fuera_de_control,
      ruleViolated: regla_violada,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
