'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { acknowledgeAlarm, type ActiveAlarm } from './actions';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHora(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function BadgeSeveridad() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ background: '#e53e3e' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
      Fuera de control
    </span>
  );
}

function BadgeAcknowledged({ by, at }: { by: string | null; at: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ background: '#38a169' }}
      title={at ? `${by ?? 'Usuario'} — ${formatHora(at)}` : undefined}
    >
      Acusado
    </span>
  );
}

// ─── Tarjeta de alarma ───────────────────────────────────────────────────────

interface AlarmCardProps {
  alarm: ActiveAlarm;
  onAcknowledge: (piezaId: string) => void;
  isPending: boolean;
}

function AlarmCard({ alarm, onAcknowledge, isPending }: AlarmCardProps) {
  return (
    <div
      className="rounded-[20px] p-5 bg-[#e0e5ec] flex flex-col gap-3"
      style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-[#718096] font-medium">{alarm.linea_nombre}</p>
          <p className="text-base font-bold text-[#2d3748]">{alarm.maquina_nombre}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {alarm.acknowledged ? (
            <BadgeAcknowledged
              by={alarm.acknowledged_by_nombre}
              at={alarm.acknowledged_at}
            />
          ) : (
            <BadgeSeveridad />
          )}
        </div>
      </div>

      {/* Regla violada */}
      {alarm.regla_violada && (
        <div
          className="rounded-[12px] px-3 py-2 bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        >
          <p className="text-xs text-[#718096] mb-0.5">Regla WE violada</p>
          <p className="text-sm font-semibold text-red-600">{alarm.regla_violada}</p>
        </div>
      )}

      {/* Valor medido */}
      {alarm.valor_medido !== null && (
        <div className="grid grid-cols-1 gap-1">
          <div
            className="rounded-[12px] px-3 py-2 bg-[#e0e5ec]"
            style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
          >
            <p className="text-xs text-[#718096] mb-0.5">Valor medido</p>
            <p className="text-sm font-bold text-[#2d3748]">
              {alarm.valor_medido.toFixed(4)}
            </p>
          </div>
        </div>
      )}

      {/* Inspector y hora */}
      <div className="flex flex-wrap gap-3 text-xs text-[#718096]">
        <span>
          <span className="font-medium text-[#4a5568]">Inspector:</span>{' '}
          {alarm.inspector_nombre}
        </span>
        <span>
          <span className="font-medium text-[#4a5568]">Hora:</span>{' '}
          {formatHora(alarm.hora_inspeccion)}
        </span>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-1">
        <Link
          href={`/dashboard/spc?maquina_id=${alarm.maquina_id}`}
          className="flex-1 text-center text-sm font-medium text-[#1565C0] py-2 rounded-[12px] bg-[#e0e5ec] transition-all"
          style={{ boxShadow: '3px 3px 6px #b8bec7, -3px -3px 6px #ffffff' }}
        >
          Ver SPC
        </Link>

        {!alarm.acknowledged && (
          <button
            onClick={() => onAcknowledge(alarm.pieza_id)}
            disabled={isPending}
            className="flex-1 text-sm font-medium text-[#4a5568] py-2 rounded-[12px] bg-[#e0e5ec] transition-all disabled:opacity-50"
            style={{ boxShadow: '3px 3px 6px #b8bec7, -3px -3px 6px #ffffff' }}
          >
            {isPending ? 'Procesando…' : 'Acknowledger'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

interface AlarmasViewProps {
  alarms: ActiveAlarm[];
}

export default function AlarmasView({ alarms }: AlarmasViewProps) {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Filtros
  const lineas = Array.from(new Set(alarms.map((a) => a.linea_nombre))).sort();
  const [filtroLinea, setFiltroLinea] = useState<string>('all');
  const [filtroAck, setFiltroAck] = useState<'all' | 'pending' | 'acked'>('all');

  const filtradas = alarms.filter((a) => {
    if (filtroLinea !== 'all' && a.linea_nombre !== filtroLinea) return false;
    if (filtroAck === 'pending' && a.acknowledged) return false;
    if (filtroAck === 'acked' && !a.acknowledged) return false;
    return true;
  });

  const handleAcknowledge = (piezaId: string) => {
    if (!user?.id) return;
    setPendingId(piezaId);
    startTransition(async () => {
      await acknowledgeAlarm(piezaId, user.id);
      setPendingId(null);
    });
  };

  // Input styles
  const selectStyle: React.CSSProperties = {
    boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
  };

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Filtro por línea */}
        <div className="relative">
          <select
            value={filtroLinea}
            onChange={(e) => setFiltroLinea(e.target.value)}
            className="appearance-none bg-[#e0e5ec] text-sm text-[#4a5568] px-4 py-2 pr-8 rounded-[12px] outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="all">Todas las líneas</option>
            {lineas.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718096]"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Filtro acknowledged */}
        <div className="relative">
          <select
            value={filtroAck}
            onChange={(e) => setFiltroAck(e.target.value as 'all' | 'pending' | 'acked')}
            className="appearance-none bg-[#e0e5ec] text-sm text-[#4a5568] px-4 py-2 pr-8 rounded-[12px] outline-none cursor-pointer"
            style={selectStyle}
          >
            <option value="all">Todas</option>
            <option value="pending">Sin acusar</option>
            <option value="acked">Acusadas</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718096]"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Contador */}
        <div className="ml-auto flex items-center gap-2">
          {filtradas.filter((a) => !a.acknowledged).length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white bg-red-500">
              {filtradas.filter((a) => !a.acknowledged).length} sin acusar
            </span>
          )}
        </div>
      </div>

      {/* Estado vacío */}
      {filtradas.length === 0 ? (
        <div
          className="rounded-[20px] p-10 bg-[#e0e5ec] flex flex-col items-center gap-3 text-center"
          style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
        >
          <svg
            width="48" height="48" viewBox="0 0 24 24" fill="none"
            stroke="#38a169" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-lg font-semibold text-[#38a169]">
            No hay alarmas activas
          </p>
          <p className="text-sm text-[#718096]">
            Todos los procesos están bajo control
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtradas.map((alarm) => (
            <AlarmCard
              key={alarm.pieza_id}
              alarm={alarm}
              onAcknowledge={handleAcknowledge}
              isPending={isPending && pendingId === alarm.pieza_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
