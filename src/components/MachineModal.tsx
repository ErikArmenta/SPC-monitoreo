'use client';

// ============================================================
// MachineModal — Modal expandible de máquina (3 niveles)
// Tarea 25: Nivel 1 — Resumen completo
// Tareas 26-27: Niveles 2 (Gráfica SPC) y 3 (Historial/Recálculos)
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import NeuModal from '@/components/ui/NeuModal';
import NeuButton from '@/components/ui/NeuButton';
import NeuDatePicker from '@/components/ui/NeuDatePicker';
import SPCChart from '@/components/charts/SPCChart';
import OutOfControlModal, { type OutOfControlDetail } from '@/components/charts/OutOfControlModal';
import RecalculoForm from '@/components/forms/RecalculoForm';
import { useSPCData } from '@/hooks/useSPCData';
import { Maquina, Pieza, Rol, SPCPoint } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/utils/formatters';
import { canRecalculate } from '@/lib/utils/roles';

type ModalLevel = 1 | 2 | 3;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MachineModalProps {
  maquina: Maquina;
  profileRol: Rol;
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface DayStats {
  total: number;
  ok: number;
  noOk: number;
  pctOk: number;
  pctNoOk: number;
  lastPieza: Pieza | null;
}

function computeDayStats(piezas: Pieza[]): DayStats {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayPiezas = piezas.filter(
    (p) => new Date(p.hora_inspeccion) >= startOfDay
  );

  const ok = todayPiezas.filter((p) => p.estado === 'ok').length;
  const noOk = todayPiezas.filter((p) => p.estado === 'no_ok').length;
  const total = todayPiezas.length;

  const pctOk = total > 0 ? Math.round((ok / total) * 100) : 0;
  const pctNoOk = total > 0 ? Math.round((noOk / total) * 100) : 0;

  // Última pieza inspeccionada (la más reciente de todas, no solo hoy)
  const lastPieza =
    piezas.length > 0
      ? [...piezas].sort(
          (a, b) =>
            new Date(b.hora_inspeccion).getTime() -
            new Date(a.hora_inspeccion).getTime()
        )[0]
      : null;

  return { total, ok, noOk, pctOk, pctNoOk, lastPieza };
}

// ─── Sub-componentes de Nivel 1 ──────────────────────────────────────────────

function StatusBadge({ activa }: { activa: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide',
        activa
          ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
          : 'bg-[#F44336]/15 text-[#C62828]',
      ].join(' ')}
    >
      <span
        className={[
          'w-2 h-2 rounded-full',
          activa ? 'bg-[#4CAF50] animate-pulse' : 'bg-[#F44336]',
        ].join(' ')}
      />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function LastPiezaCard({ pieza }: { pieza: Pieza | null }) {
  if (!pieza) {
    return (
      <div className="p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Última Pieza
        </p>
        <p className="text-sm text-gray-400 italic">Sin inspecciones registradas</p>
      </div>
    );
  }

  const isOk = pieza.estado === 'ok';

  return (
    <div className="p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Última Pieza Inspeccionada
      </p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-800 font-mono">
            {pieza.codigo_pieza}
          </span>
          <span
            className={[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
              isOk
                ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
                : 'bg-[#F44336]/15 text-[#C62828]',
            ].join(' ')}
          >
            <span
              className={[
                'w-1.5 h-1.5 rounded-full',
                isOk ? 'bg-[#4CAF50]' : 'bg-[#F44336]',
              ].join(' ')}
            />
            {isOk ? 'OK' : 'NO OK'}
          </span>
        </div>
        <span className="text-xs text-gray-400 font-medium tabular-nums">
          {formatDateTime(pieza.hora_inspeccion)}
        </span>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'ok' | 'nok';
}

function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  const valueColors: Record<string, string> = {
    default: 'text-gray-800',
    ok: 'text-[#2E7D32]',
    nok: 'text-[#C62828]',
  };

  return (
    <div className="flex-1 min-w-0 p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] text-center">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 truncate">
        {label}
      </p>
      <p className={['text-2xl font-extrabold tabular-nums', valueColors[color]].join(' ')}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Contenido de nivel 1 ────────────────────────────────────────────────────

interface Level1ContentProps {
  maquina: Maquina;
  stats: DayStats;
  loading: boolean;
  onViewSPC: () => void;
}

function Level1Content({ maquina, stats, loading, onViewSPC }: Level1ContentProps) {
  return (
    <div className="space-y-4">
      {/* Header: nombre + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Máquina{maquina.numero != null ? ` #${maquina.numero}` : ''}
          </p>
          <h2 className="text-xl font-bold text-gray-800 leading-tight truncate">
            {maquina.nombre}
          </h2>
        </div>
        <StatusBadge activa={maquina.activa} />
      </div>

      {/* Última pieza */}
      {loading ? (
        <div className="p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-[#1565C0] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <LastPiezaCard pieza={stats.lastPieza} />
      )}

      {/* Tarjetas de estadísticas del día */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Resumen del Día
        </p>
        <div className="flex gap-3">
          <StatCard
            label="Total"
            value={loading ? '—' : stats.total}
            sub="piezas hoy"
          />
          <StatCard
            label="% OK"
            value={loading ? '—' : `${stats.pctOk}%`}
            sub={loading ? '' : `${stats.ok} piezas`}
            color="ok"
          />
          <StatCard
            label="% No OK"
            value={loading ? '—' : `${stats.pctNoOk}%`}
            sub={loading ? '' : `${stats.noOk} piezas`}
            color="nok"
          />
        </div>
      </div>

      {/* Progress bar OK vs No OK */}
      {!loading && stats.total > 0 && (
        <div className="h-2.5 w-full rounded-full bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#b8bec7,inset_-2px_-2px_4px_#ffffff] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] rounded-full transition-all duration-500"
            style={{ width: `${stats.pctOk}%` }}
          />
        </div>
      )}

      {/* Botón Ver Gráfica SPC */}
      <NeuButton
        variant="primary"
        onClick={onViewSPC}
        className="w-full flex items-center justify-center gap-2 py-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Ver Gráfica SPC
      </NeuButton>
    </div>
  );
}

// ─── Semáforo Cp/Cpk ─────────────────────────────────────────────────────────

type SemaforoColor = 'green' | 'yellow' | 'red' | 'gray';

function getCpkColor(cpk: number | null): SemaforoColor {
  if (cpk === null) return 'gray';
  if (cpk >= 1.33) return 'green';
  if (cpk >= 1.0) return 'yellow';
  return 'red';
}

const SEMAFORO_MAP: Record<SemaforoColor, { bg: string; text: string; label: string }> = {
  green:  { bg: 'bg-[#4CAF50]/15', text: 'text-[#2E7D32]', label: 'Capaz' },
  yellow: { bg: 'bg-[#FFC107]/20', text: 'text-[#E65100]', label: 'Marginal' },
  red:    { bg: 'bg-[#F44336]/15', text: 'text-[#C62828]', label: 'No Capaz' },
  gray:   { bg: '',                text: 'text-gray-400',  label: 'Sin datos' },
};

// ─── Contenido de nivel 2 — Gráfica SPC Realtime (Tarea 26) ──────────────────

function Level2Content({ maquinaId, onViewHistory }: { maquinaId: string; onViewHistory: () => void }) {
  const { spcConfig, spcPoints, limits, loading, error } = useSPCData(maquinaId);

  // OutOfControlModal state
  const [outOfControlOpen, setOutOfControlOpen] = useState(false);
  const [outOfControlDetail, setOutOfControlDetail] = useState<OutOfControlDetail | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  const supabase = useRef(createClient()).current;

  // Fetch pieza + inspector name when a red dot is clicked
  const handleOutOfControlClick = useCallback(
    async (point: SPCPoint) => {
      if (!point.piezaId) return;
      setFetchingDetail(true);
      setOutOfControlDetail(null);

      try {
        const { data } = await supabase
          .from('piezas')
          .select('*, profiles:inspector_id(nombre)')
          .eq('id', point.piezaId)
          .single();

        if (data) {
          const profile = data.profiles as { nombre?: string } | null;
          setOutOfControlDetail({
            nombreInspector: profile?.nombre ?? 'Inspector desconocido',
            horaInspeccion: data.hora_inspeccion,
            valorMedido: data.valor_medido,
            estado: data.estado,
            tiempoCiclo: data.tiempo_ciclo,
            reglaViolada: data.regla_violada ?? point.ruleViolated,
            observaciones: data.observaciones,
          });
          setOutOfControlOpen(true);
        }
      } finally {
        setFetchingDetail(false);
      }
    },
    [supabase]
  );

  const cpk = limits?.cpk ?? null;
  const cp  = limits?.cp  ?? null;
  const cpkColor = getCpkColor(cpk);
  const sem = SEMAFORO_MAP[cpkColor];

  const noData = !loading && !error && spcPoints.length === 0;
  const hasChart = !loading && !error && spcPoints.length > 0 && limits && spcConfig;

  return (
    <div className="space-y-4">
      {/* Header: título + badge EN VIVO */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Gráfica de Control SPC
        </p>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F44336]/10 text-[#C62828]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F44336] animate-pulse" />
          EN VIVO
        </span>
      </div>

      {/* Indicadores Cp / Cpk con semáforo */}
      <div className="flex gap-3">
        {/* Cp */}
        <div className="flex-1 p-3 bg-[#e0e5ec] rounded-[14px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] text-center">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cp</p>
          <p className="text-lg font-extrabold text-gray-700 tabular-nums">
            {cp !== null ? cp.toFixed(3) : '—'}
          </p>
        </div>

        {/* Cpk + semáforo */}
        <div
          className={[
            'flex-1 p-3 rounded-[14px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] text-center',
            sem.bg,
          ].join(' ')}
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Cpk</p>
          <p className={['text-lg font-extrabold tabular-nums', sem.text].join(' ')}>
            {cpk !== null ? cpk.toFixed(3) : '—'}
          </p>
          <p className={['text-[9px] font-bold uppercase tracking-wide mt-0.5', sem.text].join(' ')}>
            {sem.label}
          </p>
        </div>
      </div>

      {/* Leyenda semáforo */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#4CAF50]" />≥ 1.33 Capaz
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FFC107]" />1.0–1.33 Marginal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F44336]" />&lt; 1.0 No Capaz
        </span>
      </div>

      {/* Área de la gráfica */}
      {loading && (
        <div className="h-48 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-[#1565C0] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400">Cargando datos SPC...</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
          <p className="text-sm text-[#C62828] font-medium">⚠ {error}</p>
        </div>
      )}

      {noData && (
        <div className="h-48 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] flex items-center justify-center px-4">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a3b1c6"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2"
              aria-hidden="true"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <p className="text-sm text-gray-400">Sin datos suficientes para la gráfica</p>
            <p className="text-xs text-gray-300 mt-1">
              Se requieren al menos 2 inspecciones con valor medido
            </p>
          </div>
        </div>
      )}

      {hasChart && (
        <div className="bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] p-3">
          {fetchingDetail && (
            <div className="flex items-center justify-center gap-1.5 mb-2 text-xs text-gray-400">
              <span className="w-3 h-3 rounded-full border-2 border-[#1565C0] border-t-transparent animate-spin" />
              Cargando detalle del punto...
            </div>
          )}
          <SPCChart
            data={spcPoints}
            limits={limits}
            chartType={spcConfig.tipo_grafico}
            onOutOfControlClick={handleOutOfControlClick}
          />
        </div>
      )}

      {/* Botón Ver Historial */}
      <NeuButton
        onClick={onViewHistory}
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
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Ver Historial y Recálculos
      </NeuButton>

      {/* Modal de punto fuera de control */}
      <OutOfControlModal
        isOpen={outOfControlOpen}
        onClose={() => setOutOfControlOpen(false)}
        detail={outOfControlDetail}
      />
    </div>
  );
}

// ─── Sub-componente: fila de pieza en historial ───────────────────────────────

function PiezaRow({ pieza }: { pieza: Pieza }) {
  const isOk = pieza.estado === 'ok';
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-[#e0e5ec] rounded-[14px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]">
      {/* Estado dot */}
      <span
        className={[
          'shrink-0 w-2.5 h-2.5 rounded-full',
          isOk ? 'bg-[#4CAF50]' : 'bg-[#F44336]',
        ].join(' ')}
      />

      {/* Código pieza */}
      <span className="flex-1 min-w-0 text-sm font-bold text-gray-800 font-mono truncate">
        {pieza.codigo_pieza}
      </span>

      {/* Hora */}
      <span className="text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
        {formatDateTime(pieza.hora_inspeccion)}
      </span>

      {/* Badge estado */}
      <span
        className={[
          'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
          isOk
            ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
            : 'bg-[#F44336]/15 text-[#C62828]',
        ].join(' ')}
      >
        {isOk ? 'OK' : 'NO OK'}
      </span>

      {/* Tiempo de ciclo */}
      {pieza.tiempo_ciclo != null && (
        <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">
          {formatDuration(pieza.tiempo_ciclo)}
        </span>
      )}
    </div>
  );
}

// ─── Contenido de nivel 3 — Historial y Recálculos (Tarea 27) ─────────────────

interface Level3ContentProps {
  maquinaId: string;
  profileRol: Rol;
  piezasAll: Pieza[];
}

function Level3Content({ maquinaId, profileRol, piezasAll }: Level3ContentProps) {
  const [histRange, setHistRange] = useState({ startDate: '', endDate: '' });

  const canRecalc = canRecalculate(profileRol);

  const filteredPiezas = piezasAll.filter((p) => {
    if (histRange.startDate) {
      if (new Date(p.hora_inspeccion) < new Date(histRange.startDate)) return false;
    }
    if (histRange.endDate) {
      const end = new Date(histRange.endDate);
      end.setHours(23, 59, 59, 999);
      if (new Date(p.hora_inspeccion) > end) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">

      {/* ─── Historial de Inspecciones ─── */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Historial de Inspecciones
          </p>
          <NeuDatePicker value={histRange} onChange={setHistRange} />
        </div>

        {filteredPiezas.length === 0 ? (
          <div className="p-4 bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] text-center">
            <p className="text-sm text-gray-400">
              {piezasAll.length === 0
                ? 'Sin inspecciones registradas'
                : 'Sin piezas en el rango seleccionado'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#b8bec7] scrollbar-track-transparent">
            {filteredPiezas.map((p) => (
              <PiezaRow key={p.id} pieza={p} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Recalcular SPC (solo Admin / Super Admin) ─── */}
      {canRecalc && (
        <section>
          <div className="h-px bg-[#c8d0dc] mb-5" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Recalcular SPC
          </p>
          <RecalculoForm maquinaId={maquinaId} piezasAll={piezasAll} />
        </section>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MachineModal({ maquina, profileRol, onClose }: MachineModalProps) {
  const [level, setLevel] = useState<ModalLevel>(1);
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useRef(createClient()).current;

  // Fetch piezas al montar (datos del día + última pieza)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('piezas')
      .select('*')
      .eq('maquina_id', maquina.id)
      .order('hora_inspeccion', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        setPiezas((data as Pieza[]) ?? []);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [maquina.id, supabase]);

  const stats = computeDayStats(piezas);

  return (
    <NeuModal
      isOpen
      onClose={onClose}
      level={level}
      onLevelChange={setLevel}
      title={undefined}
    >
      {level === 1 && (
        <Level1Content
          maquina={maquina}
          stats={stats}
          loading={loading}
          onViewSPC={() => setLevel(2)}
        />
      )}

      {level === 2 && (
        <Level2Content
          maquinaId={maquina.id}
          onViewHistory={() => setLevel(3)}
        />
      )}

      {level === 3 && (
        <Level3Content
          maquinaId={maquina.id}
          profileRol={profileRol}
          piezasAll={piezas}
        />
      )}
    </NeuModal>
  );
}
