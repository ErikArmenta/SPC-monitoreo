'use client'

// ============================================================
// RecalculoForm — Formulario de recálculo SPC
// Reutilizable en: modal de máquina nivel 3 y dashboard SPC
// ============================================================

import { useState } from 'react'
import NeuButton from '@/components/ui/NeuButton'
import NeuDatePicker from '@/components/ui/NeuDatePicker'
import { createClient } from '@/lib/supabase/client'
import type { Pieza, RecalculoComparativa } from '@/types'

// ─── Tabla comparativa anterior vs nuevo ─────────────────────────────────────

function ComparativaTable({ data }: { data: RecalculoComparativa }) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(4) : '—')

  const rows: { label: string; anterior: string; nuevo: string; highlight?: boolean }[] = [
    { label: 'UCL', anterior: fmt(data.ucl_anterior), nuevo: fmt(data.ucl_nuevo), highlight: true },
    { label: 'CL',  anterior: fmt(data.cl_anterior),  nuevo: fmt(data.cl_nuevo) },
    { label: 'LCL', anterior: fmt(data.lcl_anterior), nuevo: fmt(data.lcl_nuevo), highlight: true },
    { label: 'Cp',  anterior: fmt(data.cp_anterior),  nuevo: fmt(data.cp_nuevo) },
    { label: 'Cpk', anterior: fmt(data.cpk_anterior), nuevo: fmt(data.cpk_nuevo), highlight: true },
  ]

  return (
    <div className="overflow-hidden rounded-[14px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] bg-[#e0e5ec]">
      {/* Header */}
      <div className="grid grid-cols-3 px-3 py-2 border-b border-[#c8d0dc]">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Límite</span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Anterior</span>
        <span className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wider text-right">Nuevo</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className={[
            'grid grid-cols-3 px-3 py-2 border-b border-[#d4dae4] last:border-0',
            row.highlight ? 'bg-[#dce1e9]' : '',
          ].join(' ')}
        >
          <span className="text-xs font-bold text-gray-600">{row.label}</span>
          <span className="text-xs tabular-nums text-gray-400 text-right">{row.anterior}</span>
          <span className="text-xs tabular-nums font-semibold text-[#1565C0] text-right">{row.nuevo}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecalculoFormProps {
  /** ID de la máquina a recalcular */
  maquinaId: string
  /** Todas las piezas de la máquina (para derivar puntos excluidos) */
  piezasAll: Pieza[]
  /** Callback opcional al recalcular con éxito */
  onSuccess?: (comparativa: RecalculoComparativa) => void
  className?: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function RecalculoForm({ maquinaId, piezasAll, onSuccess, className }: RecalculoFormProps) {
  const [recalcRange, setRecalcRange]         = useState({ startDate: '', endDate: '' })
  const [excludeAtypical, setExcludeAtypical] = useState(false)
  const [uslInput, setUslInput]               = useState('')
  const [lslInput, setLslInput]               = useState('')

  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcError,   setRecalcError]   = useState<string | null>(null)
  const [comparativa,   setComparativa]   = useState<RecalculoComparativa | null>(null)
  const [applied,       setApplied]       = useState(false)

  const handleRecalcular = async () => {
    setRecalcLoading(true)
    setRecalcError(null)
    setComparativa(null)
    setApplied(false)

    try {
      // Puntos excluidos: piezas fuera de control en el rango si el checkbox está activo
      const puntosExcluidos: string[] = excludeAtypical
        ? piezasAll
            .filter((p) => {
              if (!p.fuera_de_control) return false
              if (recalcRange.startDate) {
                if (new Date(p.hora_inspeccion) < new Date(recalcRange.startDate)) return false
              }
              if (recalcRange.endDate) {
                const end = new Date(recalcRange.endDate)
                end.setHours(23, 59, 59, 999)
                if (new Date(p.hora_inspeccion) > end) return false
              }
              return true
            })
            .map((p) => p.id)
        : []

      const body: Record<string, unknown> = {
        maquina_id: maquinaId,
        puntos_excluidos: puntosExcluidos,
      }

      if (recalcRange.startDate) {
        body.fecha_inicio = new Date(recalcRange.startDate).toISOString()
      }
      if (recalcRange.endDate) {
        const end = new Date(recalcRange.endDate)
        end.setHours(23, 59, 59, 999)
        body.fecha_fin = end.toISOString()
      }
      if (uslInput.trim() !== '') body.usl = parseFloat(uslInput)
      if (lslInput.trim() !== '') body.lsl = parseFloat(lslInput)

      const { data: sessionData } = await createClient().auth.getSession()
      if (!sessionData.session) {
        throw new Error('No hay sesión activa. Por favor, inicia sesión nuevamente.')
      }

      const res = await fetch('/api/spc/recalcular', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { error?: string }).error ?? `Error ${res.status}`)
      }

      const { anterior, nuevo } = (await res.json()) as {
        anterior: { ucl: number | null; cl: number | null; lcl: number | null; cp: number | null; cpk: number | null }
        nuevo:    { ucl: number;        cl: number;        lcl: number;        cp: number | null; cpk: number | null }
      }

      const result: RecalculoComparativa = {
        ucl_anterior: anterior.ucl,
        cl_anterior:  anterior.cl,
        lcl_anterior: anterior.lcl,
        ucl_nuevo:    nuevo.ucl,
        cl_nuevo:     nuevo.cl,
        lcl_nuevo:    nuevo.lcl,
        cp_anterior:  anterior.cp,
        cpk_anterior: anterior.cpk,
        cp_nuevo:     nuevo.cp,
        cpk_nuevo:    nuevo.cpk,
      }

      setComparativa(result)
      onSuccess?.(result)
    } catch (err) {
      setRecalcError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setRecalcLoading(false)
    }
  }

  const handleAplicar = () => {
    setApplied(true)
  }

  return (
    <div className={className}>

      {/* Rango de fechas */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Rango de datos para el recálculo</p>
        <NeuDatePicker value={recalcRange} onChange={setRecalcRange} className="w-full" />
      </div>

      {/* Excluir puntos atípicos */}
      <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
        <div
          role="checkbox"
          aria-checked={excludeAtypical}
          tabIndex={0}
          onClick={() => setExcludeAtypical((v) => !v)}
          onKeyDown={(e) => e.key === ' ' && setExcludeAtypical((v) => !v)}
          className={[
            'w-5 h-5 rounded-[6px] flex items-center justify-center transition-shadow duration-150 cursor-pointer',
            excludeAtypical
              ? 'bg-[#1565C0] shadow-[inset_2px_2px_4px_#0d4a8f,inset_-2px_-2px_4px_#1d80f1]'
              : 'bg-[#e0e5ec] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]',
          ].join(' ')}
        >
          {excludeAtypical && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <polyline
                points="2 6 5 9 10 3"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <span className="text-sm text-gray-600">Excluir puntos atípicos (fuera de control)</span>
      </label>

      {/* USL y LSL */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            USL (Límite superior especif.)
          </label>
          <input
            type="number"
            step="any"
            value={uslInput}
            onChange={(e) => setUslInput(e.target.value)}
            placeholder="ej. 10.50"
            className="w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2 text-sm text-gray-700 shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            LSL (Límite inferior especif.)
          </label>
          <input
            type="number"
            step="any"
            value={lslInput}
            onChange={(e) => setLslInput(e.target.value)}
            placeholder="ej. 9.50"
            className="w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2 text-sm text-gray-700 shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150"
          />
        </div>
      </div>

      {/* Error */}
      {recalcError && (
        <div className="mb-3 px-3 py-2 bg-[#F44336]/10 rounded-[12px] text-xs text-[#C62828] font-medium">
          ⚠ {recalcError}
        </div>
      )}

      {/* Botón Recalcular */}
      <NeuButton
        variant="primary"
        onClick={handleRecalcular}
        disabled={recalcLoading}
        className="w-full flex items-center justify-center gap-2 py-3 mb-4"
      >
        {recalcLoading ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Calculando…
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Recalcular
          </>
        )}
      </NeuButton>

      {/* Comparativa de resultados */}
      {comparativa && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Comparativa de Límites
          </p>
          <ComparativaTable data={comparativa} />

          {/* Botón Aplicar / confirmación */}
          {applied ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#4CAF50]/10 rounded-[14px]">
              <span className="text-[#2E7D32]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </span>
              <span className="text-xs font-semibold text-[#2E7D32]">
                Límites actualizados correctamente
              </span>
            </div>
          ) : (
            <NeuButton
              onClick={handleAplicar}
              className="w-full flex items-center justify-center gap-2 py-2.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Aplicar nuevos límites
            </NeuButton>
          )}
        </div>
      )}

    </div>
  )
}
