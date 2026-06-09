'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface OOCAlert {
  id: string;
  maquina_id: string;
  maquinaNombre: string;
  lineaNombre: string;
  ruleViolated: string | null;
  timestamp: string;
}

interface UseOOCAlerts {
  alerts: OOCAlert[];
  unreadCount: number;
  markAllRead: () => void;
  clearAlert: (id: string) => void;
}

export function useOOCAlerts(): UseOOCAlerts {
  const [alerts, setAlerts] = useState<OOCAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel('ooc-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'piezas',
          filter: 'fuera_de_control=eq.true',
        },
        async (payload) => {
          const pieza = payload.new as {
            id: string;
            maquina_id: string;
            regla_violada: string | null;
            hora_inspeccion: string;
          };

          // Fetch machine and line names for the alert
          const { data: maquina } = await supabase
            .from('maquinas')
            .select('nombre, lineas!inner(nombre)')
            .eq('id', pieza.maquina_id)
            .single();

          const maquinaNombre =
            (maquina as { nombre: string } | null)?.nombre ?? 'Máquina desconocida';
          const lineaNombre =
            (maquina as { lineas: { nombre: string } } | null)?.lineas?.nombre ??
            'Línea desconocida';

          const newAlert: OOCAlert = {
            id: pieza.id,
            maquina_id: pieza.maquina_id,
            maquinaNombre,
            lineaNombre,
            ruleViolated: pieza.regla_violada,
            timestamp: pieza.hora_inspeccion,
          };

          setAlerts((prev) => [newAlert, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Emit custom event so other components (e.g. toast) can react
          window.dispatchEvent(
            new CustomEvent('ooc-alert', { detail: newAlert })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = () => {
    setUnreadCount(0);
  };

  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { alerts, unreadCount, markAllRead, clearAlert };
}
