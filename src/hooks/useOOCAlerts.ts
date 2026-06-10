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
  const channelRef = useRef<ReturnType<typeof supabaseRef.current.channel> | null>(null);
  // Nombre único para evitar colisiones entre instancias o ejecuciones
  const channelNameRef = useRef(`ooc-alerts-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channelName = channelNameRef.current;

    // Si había un canal previo, lo desuscribimos y removemos
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Crear un canal con nombre único
    const channel = supabase.channel(channelName);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'piezas',
        filter: 'fuera_de_control=eq.true',
      },
      (payload) => {
        (async () => {
          try {
            const pieza = payload.new as {
              id: string;
              maquina_id: string;
              regla_violada: string | null;
              hora_inspeccion: string;
            };

            // Consulta corregida: obtener la máquina y la línea relacionada sin usar !inner
            const { data: maquina, error } = await supabase
              .from('maquinas')
              .select('nombre, lineas(nombre)')
              .eq('id', pieza.maquina_id)
              .single();

            if (error) throw error;

            // Extraer el nombre de la línea desde el array (porque la relación devuelve un array)
            const lineasArray = maquina?.lineas as { nombre: string }[] | undefined;
            const lineaNombre = lineasArray && lineasArray.length > 0 ? lineasArray[0].nombre : 'Línea desconocida';

            const newAlert: OOCAlert = {
              id: pieza.id,
              maquina_id: pieza.maquina_id,
              maquinaNombre: maquina?.nombre ?? 'Máquina desconocida',
              lineaNombre: lineaNombre,
              ruleViolated: pieza.regla_violada,
              timestamp: pieza.hora_inspeccion,
            };

            setAlerts((prev) => [newAlert, ...prev]);
            setUnreadCount((prev) => prev + 1);

            window.dispatchEvent(
              new CustomEvent('ooc-alert', { detail: newAlert })
            );
          } catch (err) {
            console.error('Error procesando alerta OOC:', err);
          }
        })();
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Conectado a canal ${channelName}`);
      }
    });

    channelRef.current = channel;

    return () => {
      // Desuscribir y luego remover el canal
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const markAllRead = () => setUnreadCount(0);

  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { alerts, unreadCount, markAllRead, clearAlert };
}
