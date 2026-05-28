'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Pieza } from '@/types'

interface UseRealtimePiezasReturn {
  piezas: Pieza[]
  loading: boolean
  error: string | null
}

/**
 * Hook that returns the piezas for a given maquinaId, updated in real time
 * via Supabase Realtime postgres_changes subscriptions.
 *
 * - Fetches the existing piezas on mount (ordered by hora_inspeccion ASC).
 * - Appends new piezas as INSERT events arrive from Supabase Realtime.
 * - Cleans up the channel subscription on unmount or when maquinaId changes.
 */
export function useRealtimePiezas(maquinaId: string | null): UseRealtimePiezasReturn {
  const [piezas, setPiezas] = useState<Pieza[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a stable supabase client reference across renders
  const supabase = useRef(createClient()).current

  useEffect(() => {
    if (!maquinaId) {
      setPiezas([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    // ── 1. Initial fetch ──────────────────────────────────────────────────────
    setLoading(true)
    setError(null)

    supabase
      .from('piezas')
      .select('*')
      .eq('maquina_id', maquinaId)
      .order('hora_inspeccion', { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
        } else {
          setPiezas((data as Pieza[]) ?? [])
        }
        setLoading(false)
      })

    // ── 2. Realtime subscription (INSERT only) ────────────────────────────────
    const channel = supabase
      .channel(`piezas:maquina_id=eq.${maquinaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'piezas',
          filter: `maquina_id=eq.${maquinaId}`,
        },
        (payload) => {
          if (cancelled) return
          const newPieza = payload.new as Pieza
          setPiezas((prev) => [...prev, newPieza])
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [maquinaId, supabase])

  return { piezas, loading, error }
}
