import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  buildSubgroups,
  calculateXBarR,
  calculateXBarS,
  calculateIMR,
} from '@/lib/spc/calculations'
import { canAccess } from '@/lib/utils/roles'
import type { Pieza, Rol, SPCConfig } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/spc/recalcular
//
// Body: {
//   maquina_id:        string    (UUID)
//   fecha_inicio:      string    (ISO 8601)
//   fecha_fin:         string    (ISO 8601)
//   puntos_excluidos:  string[]  (UUID[] de piezas a ignorar)
//   usl:               number | null
//   lsl:               number | null
//   notas?:            string
// }
//
// Returns: { anterior: RecalculoComparativa, nuevo: RecalculoComparativa }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 0. Autenticación — extraer Bearer token ──────────────────────────────
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'No autorizado: se requiere token de sesión' }, { status: 401 })
    }

    // Verificar usuario con Supabase usando el token (service client soporta getUser con JWT)
    const supabase = getServiceClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado: sesión inválida' }, { status: 401 })
    }

    // Fetch profile para verificar rol
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No se pudo verificar el perfil del usuario' }, { status: 403 })
    }

    if (!canAccess(profile.rol as Rol, 'recalcular')) {
      return NextResponse.json(
        { error: 'Acceso denegado: se requiere rol admin, super_admin o supervisor para recalcular' },
        { status: 403 }
      )
    }

    // ── 1. Parsear y validar body ────────────────────────────────────────────
    const body = await req.json()
    const {
      maquina_id,
      fecha_inicio,
      fecha_fin,
      puntos_excluidos = [],
      usl = null,
      lsl = null,
      notas = null,
    } = body

    if (!maquina_id || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: maquina_id, fecha_inicio, fecha_fin' },
        { status: 400 }
      )
    }

    if (!Array.isArray(puntos_excluidos)) {
      return NextResponse.json({ error: 'puntos_excluidos debe ser un array de UUIDs' }, { status: 400 })
    }

    const uslNum = usl !== null ? Number(usl) : null
    const lslNum = lsl !== null ? Number(lsl) : null

    if (uslNum !== null && isNaN(uslNum)) {
      return NextResponse.json({ error: 'usl debe ser un número válido' }, { status: 400 })
    }
    if (lslNum !== null && isNaN(lslNum)) {
      return NextResponse.json({ error: 'lsl debe ser un número válido' }, { status: 400 })
    }

    // ── 2. Fetch spc_config actual (valores anteriores) ──────────────────────
    const { data: spcConfig, error: configError } = await supabase
      .from('spc_config')
      .select('*')
      .eq('maquina_id', maquina_id)
      .maybeSingle()

    if (configError) {
      return NextResponse.json({ error: `Error al leer spc_config: ${configError.message}` }, { status: 500 })
    }

    if (!spcConfig) {
      return NextResponse.json(
        { error: 'No existe configuración SPC para esta máquina' },
        { status: 404 }
      )
    }

    const config = spcConfig as SPCConfig

    // ── 3. Fetch piezas del rango excluyendo puntos_excluidos ─────────────────
    let piezasQuery = supabase
      .from('piezas')
      .select('*')
      .eq('maquina_id', maquina_id)
      .gte('hora_inspeccion', fecha_inicio)
      .lte('hora_inspeccion', fecha_fin)
      .not('valor_medido', 'is', null)
      .order('hora_inspeccion', { ascending: true })

    if (puntos_excluidos.length > 0) {
      piezasQuery = piezasQuery.not('id', 'in', `(${puntos_excluidos.join(',')})`)
    }

    const { data: piezasRaw, error: piezasError } = await piezasQuery

    if (piezasError) {
      return NextResponse.json({ error: `Error al fetch piezas: ${piezasError.message}` }, { status: 500 })
    }

    const piezas = (piezasRaw ?? []) as Pieza[]

    if (piezas.length === 0) {
      return NextResponse.json(
        { error: 'No hay piezas con valor_medido en el rango de fechas seleccionado' },
        { status: 422 }
      )
    }

    // ── 4. Calcular nuevos límites según tipo_grafico ─────────────────────────
    const n = config.tamano_subgrupo ?? 5
    let nuevaUcl: number
    let nuevaCl: number
    let nuevaLcl: number
    let nuevoCp: number | null = null
    let nuevoCpk: number | null = null

    if (config.tipo_grafico === 'xbar_r') {
      const subgroups = buildSubgroups(piezas, n)
      if (subgroups.length === 0) {
        return NextResponse.json(
          { error: `No hay suficientes piezas para formar subgrupos de tamaño ${n} (se requieren al menos ${n} piezas)` },
          { status: 422 }
        )
      }
      const { xbar } = calculateXBarR(subgroups, n, uslNum, lslNum)
      nuevaUcl = xbar.ucl
      nuevaCl = xbar.cl
      nuevaLcl = xbar.lcl
      nuevoCp = xbar.cp
      nuevoCpk = xbar.cpk

    } else if (config.tipo_grafico === 'xbar_s') {
      const subgroups = buildSubgroups(piezas, n)
      if (subgroups.length === 0) {
        return NextResponse.json(
          { error: `No hay suficientes piezas para formar subgrupos de tamaño ${n} (se requieren al menos ${n} piezas)` },
          { status: 422 }
        )
      }
      const { xbar } = calculateXBarS(subgroups, n, uslNum, lslNum)
      nuevaUcl = xbar.ucl
      nuevaCl = xbar.cl
      nuevaLcl = xbar.lcl
      nuevoCp = xbar.cp
      nuevoCpk = xbar.cpk

    } else {
      // i_mr — cada pieza es un punto individual
      const values = piezas.map((p) => p.valor_medido as number)
      if (values.length < 2) {
        return NextResponse.json(
          { error: 'Se requieren al menos 2 observaciones para el gráfico I-MR' },
          { status: 422 }
        )
      }
      const { individuals } = calculateIMR(values, uslNum, lslNum)
      nuevaUcl = individuals.ucl
      nuevaCl = individuals.cl
      nuevaLcl = individuals.lcl
      nuevoCp = individuals.cp
      nuevoCpk = individuals.cpk
    }

    // ── 5. Guardar historial en spc_recalculos ────────────────────────────────
    const recalculoPayload = {
      maquina_id,
      usuario_id: user.id,
      fecha_inicio,
      fecha_fin,
      ucl_anterior: config.ucl,
      cl_anterior: config.cl,
      lcl_anterior: config.lcl,
      ucl_nuevo: nuevaUcl,
      cl_nuevo: nuevaCl,
      lcl_nuevo: nuevaLcl,
      cp_anterior: config.cp,
      cpk_anterior: config.cpk,
      cp_nuevo: nuevoCp,
      cpk_nuevo: nuevoCpk,
      puntos_excluidos,
      notas: notas ?? null,
    }

    const { error: recalculoError } = await supabase
      .from('spc_recalculos')
      .insert(recalculoPayload)

    if (recalculoError) {
      return NextResponse.json(
        { error: `Error al guardar historial de recálculo: ${recalculoError.message}` },
        { status: 500 }
      )
    }

    // ── 6. Actualizar spc_config con los nuevos límites ───────────────────────
    const { error: updateError } = await supabase
      .from('spc_config')
      .update({
        ucl: nuevaUcl,
        cl: nuevaCl,
        lcl: nuevaLcl,
        usl: uslNum ?? config.usl,
        lsl: lslNum ?? config.lsl,
        cp: nuevoCp,
        cpk: nuevoCpk,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('maquina_id', maquina_id)

    if (updateError) {
      return NextResponse.json(
        { error: `Error al actualizar spc_config: ${updateError.message}` },
        { status: 500 }
      )
    }

    // ── 7. Respuesta con comparativa anterior vs nuevo ────────────────────────
    return NextResponse.json({
      anterior: {
        ucl: config.ucl,
        cl: config.cl,
        lcl: config.lcl,
        usl: config.usl,
        lsl: config.lsl,
        cp: config.cp,
        cpk: config.cpk,
      },
      nuevo: {
        ucl: nuevaUcl,
        cl: nuevaCl,
        lcl: nuevaLcl,
        usl: uslNum ?? config.usl,
        lsl: lslNum ?? config.lsl,
        cp: nuevoCp,
        cpk: nuevoCpk,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
