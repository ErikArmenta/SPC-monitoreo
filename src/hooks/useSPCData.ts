'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  buildSubgroups,
  calculateXBarR,
  calculateXBarS,
  calculateIMR,
} from '@/lib/spc/calculations'
import { detectViolations } from '@/lib/spc/western-electric'
import { useRealtimePiezas } from './useRealtimePiezas'
import type { SPCConfig, SPCLimits, SPCPoint } from '@/types'

interface UseSPCDataReturn {
  spcConfig: SPCConfig | null
  piezas: ReturnType<typeof useRealtimePiezas>['piezas']
  spcPoints: SPCPoint[]
  limits: SPCLimits | null
  loading: boolean
  error: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build the detectViolations limits object from sigmaEstimada and the SPCLimits.
 */
function buildWELimits(mainLimits: SPCLimits, sigmaEstimada: number) {
  return {
    ucl: mainLimits.ucl,
    cl: mainLimits.cl,
    lcl: mainLimits.lcl,
    sigma1: sigmaEstimada,
    sigma2: 2 * sigmaEstimada,
  }
}

/**
 * Returns a map of point-index → first violation rule string.
 */
function buildViolationMap(
  values: number[],
  weLimits: ReturnType<typeof buildWELimits>
): Map<number, string> {
  const violations = detectViolations(values, weLimits)
  const map = new Map<number, string>()
  for (const v of violations) {
    if (!map.has(v.index)) {
      map.set(v.index, v.rule)
    }
  }
  return map
}

// ── Main hook ──────────────────────────────────────────────────────────────────

/**
 * Composes useRealtimePiezas with the SPC calculation layer.
 *
 * Returns:
 *  - spcConfig  — configuration row from spc_config table
 *  - piezas     — raw piezas array (real-time)
 *  - spcPoints  — derived SPCPoint[] ready for the chart (recalculated on every piezas change)
 *  - limits     — SPCLimits (UCL/CL/LCL + Cp/Cpk) for the primary chart
 *  - loading    — true while either the config or initial piezas are loading
 *  - error      — first error message if any fetch/calculation failed
 */
export function useSPCData(maquinaId: string | null): UseSPCDataReturn {
  const [spcConfig, setSpcConfig] = useState<SPCConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const [spcPoints, setSpcPoints] = useState<SPCPoint[]>([])
  const [limits, setLimits] = useState<SPCLimits | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)

  const supabase = useRef(createClient()).current

  // Real-time piezas (handles its own subscription)
  const { piezas, loading: piezasLoading, error: piezasError } = useRealtimePiezas(maquinaId)

  // ── Fetch spc_config whenever maquinaId changes ───────────────────────────
  useEffect(() => {
    if (!maquinaId) {
      setSpcConfig(null)
      return
    }

    let cancelled = false
    setConfigLoading(true)
    setConfigError(null)

    supabase
      .from('spc_config')
      .select('*')
      .eq('maquina_id', maquinaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setConfigError(error.message)
        } else {
          setSpcConfig(data as SPCConfig | null)
        }
        setConfigLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [maquinaId, supabase])

  // ── Recalculate SPC whenever piezas or spcConfig change ──────────────────
  useEffect(() => {
    setCalcError(null)

    if (!spcConfig || piezas.length === 0) {
      setSpcPoints([])
      setLimits(null)
      return
    }

    try {
      const { tipo_grafico, tamano_subgrupo, usl, lsl } = spcConfig
      const n = tamano_subgrupo ?? 5

      if (tipo_grafico === 'i_mr') {
        // ── I-MR ─────────────────────────────────────────────────────────────
        const values = piezas
          .filter((p) => p.valor_medido !== null)
          .map((p) => p.valor_medido as number)

        if (values.length < 2) {
          setSpcPoints([])
          setLimits(null)
          return
        }

        const { individuals, sigmaEstimada } = calculateIMR(values, usl, lsl)
        const weLimits = buildWELimits(individuals, sigmaEstimada)
        const violationMap = buildViolationMap(values, weLimits)

        const validPiezas = piezas.filter((p) => p.valor_medido !== null)
        const points: SPCPoint[] = validPiezas.map((pieza, i) => {
          const v = pieza.valor_medido as number
          const mr = i === 0 ? null : Math.abs(v - (validPiezas[i - 1].valor_medido as number))
          const ruleViolated = violationMap.get(i) ?? null
          return {
            index: i + 1,
            value: v,
            subgroupMean: v,
            range: mr,
            sigma: null,
            isOutOfControl: ruleViolated !== null,
            ruleViolated,
            timestamp: pieza.hora_inspeccion,
            piezaId: pieza.id,
          }
        })

        setSpcPoints(points)
        setLimits(individuals)
      } else if (tipo_grafico === 'xbar_r') {
        // ── X̄-R ──────────────────────────────────────────────────────────────
        const subgroups = buildSubgroups(piezas, n)

        if (subgroups.length === 0) {
          setSpcPoints([])
          setLimits(null)
          return
        }

        const { xbar, sigmaEstimada } = calculateXBarR(subgroups, n, usl, lsl)
        const subgroupMeans = subgroups.map(
          (sg) => sg.reduce((a, b) => a + b, 0) / sg.length
        )
        const subgroupRanges = subgroups.map(
          (sg) => Math.max(...sg) - Math.min(...sg)
        )

        const weLimits = buildWELimits(xbar, sigmaEstimada)
        const violationMap = buildViolationMap(subgroupMeans, weLimits)

        // Associate each subgroup with the last pieza in that subgroup
        const validPiezas = piezas.filter((p) => p.valor_medido !== null)
        const points: SPCPoint[] = subgroups.map((_, i) => {
          const lastPiezaInSubgroup = validPiezas[i * n + n - 1]
          const ruleViolated = violationMap.get(i) ?? null
          return {
            index: i + 1,
            value: subgroupMeans[i],
            subgroupMean: subgroupMeans[i],
            range: subgroupRanges[i],
            sigma: null,
            isOutOfControl: ruleViolated !== null,
            ruleViolated,
            timestamp: lastPiezaInSubgroup?.hora_inspeccion ?? '',
            piezaId: lastPiezaInSubgroup?.id ?? '',
          }
        })

        setSpcPoints(points)
        setLimits(xbar)
      } else {
        // ── X̄-S ──────────────────────────────────────────────────────────────
        const subgroups = buildSubgroups(piezas, n)

        if (subgroups.length === 0) {
          setSpcPoints([])
          setLimits(null)
          return
        }

        const { xbar, sigmaEstimada } = calculateXBarS(subgroups, n, usl, lsl)
        const subgroupMeans = subgroups.map(
          (sg) => sg.reduce((a, b) => a + b, 0) / sg.length
        )
        const subgroupSigmas = subgroups.map((sg) => {
          if (sg.length < 2) return 0
          const m = subgroupMeans[subgroups.indexOf(sg)]
          const variance = sg.reduce((sum, v) => sum + (v - m) ** 2, 0) / (sg.length - 1)
          return Math.sqrt(variance)
        })

        const weLimits = buildWELimits(xbar, sigmaEstimada)
        const violationMap = buildViolationMap(subgroupMeans, weLimits)

        const validPiezas = piezas.filter((p) => p.valor_medido !== null)
        const points: SPCPoint[] = subgroups.map((_, i) => {
          const lastPiezaInSubgroup = validPiezas[i * n + n - 1]
          const ruleViolated = violationMap.get(i) ?? null
          return {
            index: i + 1,
            value: subgroupMeans[i],
            subgroupMean: subgroupMeans[i],
            range: null,
            sigma: subgroupSigmas[i],
            isOutOfControl: ruleViolated !== null,
            ruleViolated,
            timestamp: lastPiezaInSubgroup?.hora_inspeccion ?? '',
            piezaId: lastPiezaInSubgroup?.id ?? '',
          }
        })

        setSpcPoints(points)
        setLimits(xbar)
      }
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Error calculando SPC')
      setSpcPoints([])
      setLimits(null)
    }
  }, [piezas, spcConfig])

  const loading = configLoading || piezasLoading
  const error = configError ?? piezasError ?? calcError ?? null

  return { spcConfig, piezas, spcPoints, limits, loading, error }
}
