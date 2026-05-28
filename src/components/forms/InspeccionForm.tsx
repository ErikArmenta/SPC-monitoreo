'use client'

// ============================================================
// InspeccionForm — Formulario de captura de inspección
// Reutilizable en: página /dashboard/captura y modal de máquina
// ============================================================

import { useState, useCallback } from 'react'
import NeuInput from '@/components/ui/NeuInput'
import NeuButton from '@/components/ui/NeuButton'
import type { Maquina } from '@/types'

// ─── Helpers de UI locales ────────────────────────────────────────────────────

function NeuSelect({
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder: string
  options: { id: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 w-full text-sm',
          'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
          'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
          'appearance-none cursor-pointer pr-10',
          value ? 'text-gray-700' : 'text-gray-400',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}

function NeuTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={[
        'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 w-full resize-none',
        'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
        'text-gray-700 placeholder-gray-400 text-sm',
        'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
      ].join(' ')}
    />
  )
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
      {optional && <span className="ml-1 font-normal normal-case text-gray-400">(opcional)</span>}
    </label>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InspeccionFormProps {
  /** Lista de máquinas disponibles para seleccionar */
  maquinas: Maquina[]
  /** Indica si las máquinas están siendo cargadas */
  maquinasLoading: boolean
  /** ID del inspector que envía la inspección */
  inspectorId: string
  /** Máquina pre-seleccionada (controlado externamente) */
  selectedMaquinaId: string
  /** Callback cuando el usuario cambia la máquina seleccionada */
  onMaquinaChange: (maquinaId: string) => void
  /** Callback al enviar con éxito — recibe si está fuera de control */
  onSuccess?: (result: { isOutOfControl: boolean; ruleViolated: string | null }) => void
  /** Callback cuando hay un error de envío */
  onError?: (message: string) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function InspeccionForm({
  maquinas,
  maquinasLoading,
  inspectorId,
  selectedMaquinaId,
  onMaquinaChange,
  onSuccess,
  onError,
}: InspeccionFormProps) {
  const [codigoPieza, setCodigoPieza] = useState('')
  const [valorMedido, setValorMedido] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isFormValid = !!selectedMaquinaId && !!codigoPieza.trim() && !!valorMedido

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!inspectorId || !selectedMaquinaId || !codigoPieza.trim() || !valorMedido) return

      const parsed = parseFloat(valorMedido)
      if (isNaN(parsed)) {
        onError?.('El valor medido debe ser un número válido')
        return
      }

      setSubmitting(true)
      try {
        const res = await fetch('/api/spc/evaluar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            maquina_id: selectedMaquinaId,
            codigo_pieza: codigoPieza.trim(),
            valor_medido: parsed,
            inspector_id: inspectorId,
            observaciones: observaciones.trim() || null,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          onError?.(data.error ?? 'Error al enviar la inspección')
          return
        }

        onSuccess?.({
          isOutOfControl: data.isOutOfControl ?? false,
          ruleViolated: data.ruleViolated ?? null,
        })

        // Limpiar campos tras envío exitoso (mantener máquina seleccionada)
        setCodigoPieza('')
        setValorMedido('')
        setObservaciones('')
      } finally {
        setSubmitting(false)
      }
    },
    [inspectorId, selectedMaquinaId, codigoPieza, valorMedido, observaciones, onSuccess, onError]
  )

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">

        {/* Selector de máquina */}
        <div>
          <FieldLabel>Máquina</FieldLabel>
          {maquinasLoading ? (
            <div className="text-sm text-gray-400 py-2">Cargando máquinas…</div>
          ) : maquinas.length === 0 ? (
            <div
              className="py-3 px-4 rounded-[15px] text-sm text-gray-400"
              style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
            >
              No tienes máquinas asignadas. Contacta al administrador.
            </div>
          ) : (
            <NeuSelect
              value={selectedMaquinaId}
              onChange={onMaquinaChange}
              placeholder="Selecciona una máquina"
              options={maquinas.map((m) => ({ id: m.id, label: m.nombre }))}
            />
          )}
        </div>

        {/* Código de pieza */}
        <div>
          <FieldLabel>Código de pieza</FieldLabel>
          <NeuInput
            type="text"
            placeholder="Ej. PZ83"
            value={codigoPieza}
            onChange={(e) => setCodigoPieza(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Valor medido */}
        <div>
          <FieldLabel>Valor medido</FieldLabel>
          <NeuInput
            type="number"
            step="any"
            placeholder="Ej. 12.450"
            value={valorMedido}
            onChange={(e) => setValorMedido(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Observaciones */}
        <div>
          <FieldLabel optional>Observaciones</FieldLabel>
          <NeuTextarea
            value={observaciones}
            onChange={setObservaciones}
            placeholder="Notas adicionales sobre esta inspección…"
            rows={3}
          />
        </div>

        {/* Botón enviar */}
        <NeuButton
          type="submit"
          variant="primary"
          disabled={!isFormValid || submitting || maquinas.length === 0}
          className="w-full py-3 text-base font-semibold"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Enviando…
            </span>
          ) : (
            'Enviar Inspección'
          )}
        </NeuButton>

      </div>
    </form>
  )
}
