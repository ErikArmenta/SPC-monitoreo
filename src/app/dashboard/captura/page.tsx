'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useSPCData } from '@/hooks/useSPCData'
import NeuCard from '@/components/ui/NeuCard'
import SPCChart from '@/components/charts/SPCChart'
import OutOfControlModal from '@/components/charts/OutOfControlModal'
import InspeccionForm from '@/components/forms/InspeccionForm'
import type { OutOfControlDetail } from '@/components/charts/OutOfControlModal'
import type { Maquina, SPCPoint } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

interface ToastState {
  type: 'success' | 'error'
  message: string
}

function Toast({ type, message, onDismiss }: ToastState & { onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-[16px] max-w-sm"
      style={{
        background: type === 'success' ? '#4CAF50' : '#F44336',
        boxShadow:
          type === 'success'
            ? '6px 6px 14px rgba(56,142,60,0.4), -3px -3px 10px rgba(255,255,255,0.2)'
            : '6px 6px 14px rgba(183,28,28,0.4), -3px -3px 10px rgba(255,255,255,0.2)',
      }}
    >
      {/* Icon */}
      {type === 'success' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
      <span className="text-sm font-medium text-white leading-tight">{message}</span>
      <button
        onClick={onDismiss}
        className="ml-auto flex-shrink-0 text-white/80 hover:text-white transition-colors"
        aria-label="Cerrar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SPC Chart section
// ─────────────────────────────────────────────────────────────────────────────

function ChartSection({
  maquinaId,
  maquinaNombre,
  onOutOfControlClick,
}: {
  maquinaId: string | null
  maquinaNombre: string
  onOutOfControlClick: (point: SPCPoint) => void
}) {
  const { spcPoints, limits, spcConfig, loading, error } = useSPCData(maquinaId)

  if (!maquinaId) return null

  return (
    <NeuCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-700">{maquinaNombre}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {spcConfig ? `Tipo: ${spcConfig.tipo_grafico.toUpperCase().replace('_', '-')}` : 'Sin configuración SPC'}
          </p>
        </div>
        {/* Live badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(76,175,80,0.12)' }}>
          <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
          <span className="text-xs font-semibold text-[#2e7d32]">EN VIVO</span>
        </div>
      </div>

      {/* Chart content */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Cargando datos SPC…
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-40 text-[#F44336] text-sm">
          Error: {error}
        </div>
      ) : !spcConfig ? (
        <div
          className="flex flex-col items-center justify-center h-40 gap-2 rounded-[14px]"
          style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <p className="text-sm text-gray-400">Esta máquina no tiene configuración SPC</p>
          <p className="text-xs text-gray-400">Contacte al administrador para configurar los límites de control</p>
        </div>
      ) : !limits || spcPoints.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-40 gap-2 rounded-[14px]"
          style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p className="text-sm text-gray-400">Sin datos suficientes para graficar</p>
          <p className="text-xs text-gray-400">Envía inspecciones para ver la gráfica de control</p>
        </div>
      ) : (
        <>
          {/* Cp / Cpk indicators */}
          {(limits.cp !== null || limits.cpk !== null) && (
            <div className="flex gap-3 mb-4">
              {limits.cp !== null && (
                <div
                  className="flex-1 text-center py-2 rounded-[12px]"
                  style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cp</p>
                  <p className="text-lg font-bold text-gray-700">{limits.cp.toFixed(2)}</p>
                </div>
              )}
              {limits.cpk !== null && (
                <div
                  className="flex-1 text-center py-2 rounded-[12px]"
                  style={{
                    boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                  }}
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Cpk</p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        limits.cpk >= 1.33 ? '#2e7d32' : limits.cpk >= 1.0 ? '#f57f17' : '#c62828',
                    }}
                  >
                    {limits.cpk.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          )}

          <SPCChart
            data={spcPoints}
            limits={limits}
            chartType={spcConfig.tipo_grafico}
            onOutOfControlClick={onOutOfControlClick}
          />

          {/* Out-of-control count */}
          {spcPoints.some((p) => p.isOutOfControl) && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-[12px]"
              style={{ background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.2)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-xs text-[#c62828] font-medium">
                {spcPoints.filter((p) => p.isOutOfControl).length} punto(s) fuera de control — haz clic en los puntos rojos para ver el detalle
              </span>
            </div>
          )}
        </>
      )}
    </NeuCard>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CapturaPage() {
  const router = useRouter()
  const { profile, loading: authLoading } = useAuth()

  const [maquinas, setMaquinas] = useState<Maquina[]>([])
  const [maquinasLoading, setMaquinasLoading] = useState(false)

  const [selectedMaquinaId, setSelectedMaquinaId] = useState('')

  const [toast, setToast] = useState<ToastState | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  const [oocDetail, setOocDetail] = useState<OutOfControlDetail | null>(null)
  const [oocModalOpen, setOocModalOpen] = useState(false)

  const supabaseRef = useRef(createClient())

  // ── Redirect non-inspector roles ──────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!profile) {
      router.push('/login')
      return
    }
    if (profile.rol !== 'inspector') {
      router.push('/dashboard')
    }
  }, [authLoading, profile, router])

  // ── Fetch machines assigned to this inspector ─────────────────────────────
  useEffect(() => {
    if (!profile) return
    const ids = profile.maquinas_asignadas
    if (!ids || ids.length === 0) {
      setMaquinas([])
      return
    }

    setMaquinasLoading(true)
    supabaseRef.current
      .from('maquinas')
      .select('*')
      .in('id', ids)
      .eq('activa', true)
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        setMaquinas((data as Maquina[]) ?? [])
        setMaquinasLoading(false)
      })
  }, [profile])

  // Auto-select first machine when machines load
  useEffect(() => {
    if (maquinas.length > 0 && !selectedMaquinaId) {
      setSelectedMaquinaId(maquinas[0].id)
    }
  }, [maquinas, selectedMaquinaId])

  // ── Handle out-of-control point click on chart ────────────────────────────
  const handleOocClick = useCallback(
    (point: SPCPoint) => {
      setOocDetail({
        nombreInspector: profile?.nombre ?? 'Inspector',
        horaInspeccion: point.timestamp,
        valorMedido: point.value,
        estado: point.isOutOfControl ? 'no_ok' : 'ok',
        tiempoCiclo: null,
        reglaViolada: point.ruleViolated,
        observaciones: null,
        valoresIndividuales: null,
      })
      setOocModalOpen(true)
    },
    [profile]
  )

  // ── InspeccionForm callbacks ──────────────────────────────────────────────
  const handleInspeccionSuccess = useCallback(
    ({ isOutOfControl, ruleViolated }: { isOutOfControl: boolean; ruleViolated: string | null }) => {
      if (isOutOfControl) {
        setToast({
          type: 'error',
          message: `Inspección enviada — Fuera de control: ${ruleViolated ?? 'Regla WE violada'}`,
        })
      } else {
        setToast({ type: 'success', message: 'Inspección enviada correctamente' })
      }
    },
    []
  )

  const handleInspeccionError = useCallback((message: string) => {
    setToast({ type: 'error', message })
  }, [])

  // ── Derived state ─────────────────────────────────────────────────────────
  const selectedMaquina = maquinas.find((m) => m.id === selectedMaquinaId)

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Verificando acceso…
      </div>
    )
  }

  if (!profile || profile.rol !== 'inspector') {
    return null
  }

  return (
    <>
      {/* Toast notification */}
      {toast && <Toast {...toast} onDismiss={dismissToast} />}

      {/* Out-of-control modal */}
      <OutOfControlModal
        isOpen={oocModalOpen}
        onClose={() => setOocModalOpen(false)}
        detail={oocDetail}
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-gray-700">Captura de Inspección</h1>
          <p className="text-sm text-gray-400 mt-1">
            Inspector: <span className="font-medium text-gray-600">{profile.nombre}</span>
          </p>
        </div>

        {/* Form card */}
        <NeuCard className="p-6">
          <InspeccionForm
            maquinas={maquinas}
            maquinasLoading={maquinasLoading}
            inspectorId={profile.id}
            selectedMaquinaId={selectedMaquinaId}
            onMaquinaChange={setSelectedMaquinaId}
            onSuccess={handleInspeccionSuccess}
            onError={handleInspeccionError}
          />
        </NeuCard>

        {/* SPC Chart — updates in real time when a machine is selected */}
        <ChartSection
          maquinaId={selectedMaquinaId || null}
          maquinaNombre={selectedMaquina?.nombre ?? 'Máquina'}
          onOutOfControlClick={handleOocClick}
        />

      </div>
    </>
  )
}
