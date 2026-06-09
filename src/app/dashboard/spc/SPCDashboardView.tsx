'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useRealtimePiezas } from '@/hooks/useRealtimePiezas';
import {
  buildSubgroups,
  calculateXBarR,
  calculateXBarS,
  calculateIMR,
} from '@/lib/spc/calculations';
import { detectViolations } from '@/lib/spc/western-electric';

const SPCChart = dynamic(() => import('@/components/charts/SPCChart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse bg-[#e0e5ec] rounded-[16px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]" />
  ),
});
import OutOfControlModal from '@/components/charts/OutOfControlModal';
import type { OutOfControlDetail } from '@/components/charts/OutOfControlModal';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import RecalcularModal from '@/components/RecalcularModal';
import { isAdminOrAbove } from '@/lib/utils/roles';
import { formatDateTime, getCpkStatus } from '@/lib/utils/formatters';
import type {
  Linea,
  Maquina,
  Pieza,
  SPCConfig,
  SPCPoint,
  SPCLimits,
  TipoGrafico,
  Rol,
} from '@/types';
import type { RecalculoWithUser } from './page';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SPCTabType = TipoGrafico | 'fuera_control' | 'historial' | 'comparativa';

interface ComputedChart {
  limits: SPCLimits;
  points: SPCPoint[];
  sigmaEstimada: number;
}

interface ComparativaItem {
  maquina: Maquina;
  config: SPCConfig | null;
}

export interface SPCDashboardViewProps {
  lineas: Linea[];
  maquinas: Maquina[];
  recalculos: RecalculoWithUser[];
  userRol: Rol;
}

// ─────────────────────────────────────────────────────────────────────────────
// NeuSelect
// ─────────────────────────────────────────────────────────────────────────────

function NeuSelect({
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: { id: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 text-sm text-gray-700',
        'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
        'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
        'appearance-none cursor-pointer pr-8',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cpk Semaphore
// ─────────────────────────────────────────────────────────────────────────────

function CpkSemaphore({ cp, cpk }: { cp: number | null; cpk: number | null }) {
  const status = cpk !== null ? getCpkStatus(cpk) : null;

  const statusConfig = {
    capable: { color: '#4CAF50', bg: 'rgba(76,175,80,0.12)', label: 'Proceso Capaz', icon: '✓' },
    marginal: { color: '#FF9800', bg: 'rgba(255,152,0,0.12)', label: 'Proceso Marginal', icon: '!' },
    incapable: { color: '#F44336', bg: 'rgba(244,67,54,0.12)', label: 'No Capaz', icon: '✗' },
  };

  const cfg = status ? statusConfig[status] : null;

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* Traffic light */}
      <div
        className="flex flex-col items-center gap-2 p-3 rounded-[16px]"
        style={{ boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff' }}
      >
        {(['capable', 'marginal', 'incapable'] as const).map((s) => (
          <div
            key={s}
            className="w-6 h-6 rounded-full transition-all duration-500"
            style={{
              background: status === s ? statusConfig[s].color : '#c8d0da',
              boxShadow:
                status === s
                  ? `0 0 14px ${statusConfig[s].color}99, inset 2px 2px 4px rgba(0,0,0,0.1)`
                  : 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff',
            }}
          />
        ))}
      </div>

      {/* Cp / Cpk values */}
      <div className="flex gap-6">
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cp</p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: cfg?.color ?? '#9ca3af' }}
          >
            {cp !== null ? cp.toFixed(3) : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cpk</p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: cfg?.color ?? '#9ca3af' }}
          >
            {cpk !== null ? cpk.toFixed(3) : '—'}
          </p>
        </div>
      </div>

      {/* Status badge */}
      {cfg ? (
        <div
          className="px-4 py-2 rounded-[12px] text-sm font-bold tracking-wide"
          style={{
            background: cfg.bg,
            color: cfg.color,
            boxShadow: `inset 2px 2px 5px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.8)`,
          }}
        >
          {cfg.icon} {cfg.label}
        </div>
      ) : (
        <div
          className="px-4 py-2 rounded-[12px] text-sm text-gray-400"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        >
          Sin datos de capacidad
        </div>
      )}

      {/* Thresholds legend */}
      <div className="flex flex-col gap-1 text-xs text-gray-400 ml-auto">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#4CAF50] mr-1" />
          Cpk ≥ 1.33 — Capaz
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#FF9800] mr-1" />
          1.00 ≤ Cpk &lt; 1.33 — Marginal
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-[#F44336] mr-1" />
          Cpk &lt; 1.00 — No Capaz
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipo gráfico badge
// ─────────────────────────────────────────────────────────────────────────────

function TipoGraficoBadge({ tipo }: { tipo: TipoGrafico }) {
  const labels: Record<TipoGrafico, string> = {
    xbar_r: 'X̄-R',
    xbar_s: 'X̄-S',
    i_mr: 'I-MR',
  };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: 'rgba(21,101,192,0.12)',
        color: '#1565C0',
        boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {labels[tipo]}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPC computation helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeXBarR(
  piezas: Pieza[],
  n: number,
  usl: number | null,
  lsl: number | null
): ComputedChart | null {
  const subgroups = buildSubgroups(piezas, n);
  if (subgroups.length === 0) return null;
  try {
    const { xbar, sigmaEstimada } = calculateXBarR(subgroups, n, usl, lsl);
    const means = subgroups.map((sg) => sg.reduce((a, b) => a + b, 0) / sg.length);
    const weLimits = {
      ucl: xbar.ucl,
      cl: xbar.cl,
      lcl: xbar.lcl,
      sigma1: sigmaEstimada,
      sigma2: 2 * sigmaEstimada,
    };
    const vMap = new Map(detectViolations(means, weLimits).map((v) => [v.index, v.rule]));
    const validPiezas = piezas.filter((p) => p.valor_medido !== null);
    const points: SPCPoint[] = subgroups.map((sg, i) => {
      const m = means[i];
      const r = Math.max(...sg) - Math.min(...sg);
      const lastPieza = validPiezas[i * n + n - 1];
      const ruleViolated = vMap.get(i) ?? null;
      return {
        index: i + 1,
        value: m,
        subgroupMean: m,
        range: r,
        sigma: null,
        isOutOfControl: ruleViolated !== null,
        ruleViolated,
        timestamp: lastPieza?.hora_inspeccion ?? '',
        piezaId: lastPieza?.id ?? '',
      };
    });
    return { limits: xbar, points, sigmaEstimada };
  } catch {
    return null;
  }
}

function computeXBarS(
  piezas: Pieza[],
  n: number,
  usl: number | null,
  lsl: number | null
): ComputedChart | null {
  const subgroups = buildSubgroups(piezas, n);
  if (subgroups.length === 0) return null;
  try {
    const { xbar, sigmaEstimada } = calculateXBarS(subgroups, n, usl, lsl);
    const means = subgroups.map((sg) => sg.reduce((a, b) => a + b, 0) / sg.length);
    const sValues = subgroups.map((sg, idx) => {
      const m = means[idx];
      if (sg.length < 2) return 0;
      const variance = sg.reduce((sum, v) => sum + (v - m) ** 2, 0) / (sg.length - 1);
      return Math.sqrt(variance);
    });
    const weLimits = {
      ucl: xbar.ucl,
      cl: xbar.cl,
      lcl: xbar.lcl,
      sigma1: sigmaEstimada,
      sigma2: 2 * sigmaEstimada,
    };
    const vMap = new Map(detectViolations(means, weLimits).map((v) => [v.index, v.rule]));
    const validPiezas = piezas.filter((p) => p.valor_medido !== null);
    const points: SPCPoint[] = subgroups.map((_, i) => {
      const lastPieza = validPiezas[i * n + n - 1];
      const ruleViolated = vMap.get(i) ?? null;
      return {
        index: i + 1,
        value: means[i],
        subgroupMean: means[i],
        range: null,
        sigma: sValues[i],
        isOutOfControl: ruleViolated !== null,
        ruleViolated,
        timestamp: lastPieza?.hora_inspeccion ?? '',
        piezaId: lastPieza?.id ?? '',
      };
    });
    return { limits: xbar, points, sigmaEstimada };
  } catch {
    return null;
  }
}

function computeIMR(
  piezas: Pieza[],
  usl: number | null,
  lsl: number | null
): ComputedChart | null {
  const values = piezas
    .filter((p) => p.valor_medido !== null)
    .map((p) => p.valor_medido as number);
  if (values.length < 2) return null;
  try {
    const { individuals, sigmaEstimada } = calculateIMR(values, usl, lsl);
    const weLimits = {
      ucl: individuals.ucl,
      cl: individuals.cl,
      lcl: individuals.lcl,
      sigma1: sigmaEstimada,
      sigma2: 2 * sigmaEstimada,
    };
    const vMap = new Map(detectViolations(values, weLimits).map((v) => [v.index, v.rule]));
    const validPiezas = piezas.filter((p) => p.valor_medido !== null);
    const points: SPCPoint[] = validPiezas.map((pieza, i) => {
      const v = pieza.valor_medido as number;
      const mr =
        i === 0 ? null : Math.abs(v - (validPiezas[i - 1].valor_medido as number));
      const ruleViolated = vMap.get(i) ?? null;
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
      };
    });
    return { limits: individuals, points, sigmaEstimada };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[300px] gap-3">
      <div
        className="w-16 h-16 flex items-center justify-center rounded-[16px]"
        style={{ boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          className="w-8 h-8 opacity-25"
          stroke="#374151"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      </div>
      <p className="text-gray-400 text-sm text-center">{message}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SPCDashboardView({
  lineas,
  maquinas,
  recalculos,
  userRol,
}: SPCDashboardViewProps) {
  const supabase = useRef(createClient()).current;

  const [selectedLineaId, setSelectedLineaId] = useState('');
  const [selectedMaquinaId, setSelectedMaquinaId] = useState('');
  const [activeTab, setActiveTab] = useState<SPCTabType>('xbar_r');
  const [spcConfig, setSpcConfig] = useState<SPCConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [comparativaData, setComparativaData] = useState<ComparativaItem[]>([]);
  const [outOfControlModal, setOutOfControlModal] = useState<{
    open: boolean;
    detail: OutOfControlDetail | null;
  }>({ open: false, detail: null });
  const [recalcularOpen, setRecalcularOpen] = useState(false);
  const [configVersion, setConfigVersion] = useState(0);

  // ── Filter maquinas by selected linea ────────────────────────────────────────
  const maquinasFiltradas = selectedLineaId
    ? maquinas.filter((m) => m.linea_id === selectedLineaId)
    : maquinas;

  // ── Real-time piezas ─────────────────────────────────────────────────────────
  const { piezas, loading: piezasLoading } = useRealtimePiezas(
    selectedMaquinaId || null
  );

  // ── Fetch spc_config when machine changes ────────────────────────────────────
  useEffect(() => {
    if (!selectedMaquinaId) {
      setSpcConfig(null);
      return;
    }
    let cancelled = false;
    setConfigLoading(true);

    supabase
      .from('spc_config')
      .select('*')
      .eq('maquina_id', selectedMaquinaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSpcConfig((data as SPCConfig | null) ?? null);
        setConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMaquinaId, supabase, configVersion]);

  // ── Compute all 3 chart types ────────────────────────────────────────────────
  const n = spcConfig?.tamano_subgrupo ?? 5;
  const usl = spcConfig?.usl ?? null;
  const lsl = spcConfig?.lsl ?? null;

  const xbarRChart = useMemo<ComputedChart | null>(
    () => (piezas.length > 0 && spcConfig ? computeXBarR(piezas, n, usl, lsl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [piezas, spcConfig, n, usl, lsl]
  );

  const xbarSChart = useMemo<ComputedChart | null>(
    () => (piezas.length > 0 && spcConfig ? computeXBarS(piezas, n, usl, lsl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [piezas, spcConfig, n, usl, lsl]
  );

  const imrChart = useMemo<ComputedChart | null>(
    () => (piezas.length > 0 && spcConfig ? computeIMR(piezas, usl, lsl) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [piezas, spcConfig, usl, lsl]
  );

  // ── All out-of-control points (combined across chart types) ──────────────────
  const allOutOfControlPoints = useMemo<
    { point: SPCPoint; chartType: TipoGrafico }[]
  >(() => {
    const results: { point: SPCPoint; chartType: TipoGrafico }[] = [];
    if (xbarRChart) {
      xbarRChart.points
        .filter((p) => p.isOutOfControl)
        .forEach((p) => results.push({ point: p, chartType: 'xbar_r' }));
    }
    if (xbarSChart) {
      xbarSChart.points
        .filter((p) => p.isOutOfControl)
        .forEach((p) => results.push({ point: p, chartType: 'xbar_s' }));
    }
    if (imrChart) {
      imrChart.points
        .filter((p) => p.isOutOfControl)
        .forEach((p) => results.push({ point: p, chartType: 'i_mr' }));
    }
    return results;
  }, [xbarRChart, xbarSChart, imrChart]);

  // ── Fetch comparativa data when tab is active ────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'comparativa') return;

    const lineMachines = selectedLineaId
      ? maquinas.filter((m) => m.linea_id === selectedLineaId)
      : maquinas;

    if (lineMachines.length === 0) {
      setComparativaData([]);
      return;
    }

    const ids = lineMachines.map((m) => m.id);

    supabase
      .from('spc_config')
      .select('*')
      .in('maquina_id', ids)
      .then(({ data }) => {
        const configMap = new Map(
          ((data ?? []) as SPCConfig[]).map((c) => [c.maquina_id, c])
        );
        setComparativaData(
          lineMachines.map((m) => ({
            maquina: m,
            config: configMap.get(m.id) ?? null,
          }))
        );
      });
  }, [activeTab, selectedLineaId, maquinas, supabase]);

  // ── Handle out-of-control point click ───────────────────────────────────────
  const handleOutOfControlClick = useCallback(
    (point: SPCPoint) => {
      const pieza = piezas.find((p) => p.id === point.piezaId);
      if (!pieza) return;

      setOutOfControlModal({
        open: true,
        detail: {
          nombreInspector: pieza.inspector_id,
          horaInspeccion: pieza.hora_inspeccion,
          valorMedido: pieza.valor_medido,
          estado: pieza.estado,
          tiempoCiclo: pieza.tiempo_ciclo,
          reglaViolada: point.ruleViolated,
          observaciones: pieza.observaciones,
          valoresIndividuales: (pieza as unknown as { valores_individuales?: number[] | null }).valores_individuales ?? null,
        },
      });

      // Resolve inspector name asynchronously
      supabase
        .from('profiles')
        .select('nombre')
        .eq('id', pieza.inspector_id)
        .single()
        .then(({ data }) => {
          if (data) {
            setOutOfControlModal((prev) => ({
              ...prev,
              detail: prev.detail
                ? { ...prev.detail, nombreInspector: (data as { nombre: string }).nombre }
                : null,
            }));
          }
        });
    },
    [piezas, supabase]
  );

  // ── Recalculos filtered by selected maquina ──────────────────────────────────
  const recalculosFiltrados = selectedMaquinaId
    ? recalculos.filter((r) => r.maquina_id === selectedMaquinaId)
    : recalculos;

  // ── Tabs config ──────────────────────────────────────────────────────────────
  const tabs: { id: SPCTabType; label: string }[] = [
    { id: 'xbar_r', label: 'X̄-R' },
    { id: 'xbar_s', label: 'X̄-S' },
    { id: 'i_mr', label: 'I-MR' },
    {
      id: 'fuera_control',
      label: `Fuera de Control${allOutOfControlPoints.length > 0 ? ` (${allOutOfControlPoints.length})` : ''}`,
    },
    { id: 'historial', label: 'Historial' },
    { id: 'comparativa', label: 'Comparativa' },
  ];

  // ── Active chart (for SPC tabs) ──────────────────────────────────────────────
  const activeChart =
    activeTab === 'xbar_r'
      ? xbarRChart
      : activeTab === 'xbar_s'
      ? xbarSChart
      : activeTab === 'i_mr'
      ? imrChart
      : null;

  const activeChartType: TipoGrafico =
    activeTab === 'xbar_r' ? 'xbar_r' : activeTab === 'xbar_s' ? 'xbar_s' : 'i_mr';

  const isSPCTab =
    activeTab === 'xbar_r' || activeTab === 'xbar_s' || activeTab === 'i_mr';

  const isLoading = configLoading || piezasLoading;

  const selectedMaquina = maquinas.find((m) => m.id === selectedMaquinaId) ?? null;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard SPC Completo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análisis estadístico de proceso — X̄-R, X̄-S, I-MR, Cp/Cpk
          </p>
        </div>
        {(['super_admin', 'admin', 'supervisor'] as Rol[]).includes(userRol) && (
          <Link
            href="/dashboard/spc/sixpack"
            className={[
              'flex items-center gap-2 px-4 py-2.5 rounded-[14px]',
              'text-sm font-semibold text-[#1565C0] transition-all duration-150',
              'shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff]',
              'hover:shadow-[2px_2px_4px_#b8bec7,_-2px_-2px_4px_#ffffff]',
              'active:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff]',
              'whitespace-nowrap',
            ].join(' ')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="8" height="6" rx="1.5" />
              <rect x="14" y="2" width="8" height="6" rx="1.5" />
              <rect x="2" y="9" width="8" height="6" rx="1.5" />
              <rect x="14" y="9" width="8" height="6" rx="1.5" />
              <rect x="2" y="16" width="8" height="6" rx="1.5" />
              <rect x="14" y="16" width="8" height="6" rx="1.5" />
            </svg>
            Ver Six Pack
          </Link>
        )}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <NeuCard className="p-5">
        <div className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Línea de Producción
            </label>
            <NeuSelect
              value={selectedLineaId}
              onChange={(id) => {
                setSelectedLineaId(id);
                setSelectedMaquinaId('');
              }}
              placeholder="Seleccionar línea"
              options={lineas.map((l) => ({ id: l.id, label: l.nombre }))}
            />
          </div>

          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Máquina
            </label>
            <NeuSelect
              value={selectedMaquinaId}
              onChange={(id) => setSelectedMaquinaId(id)}
              placeholder="Seleccionar máquina"
              options={maquinasFiltradas.map((m) => ({ id: m.id, label: m.nombre }))}
              disabled={maquinasFiltradas.length === 0}
            />
          </div>

          {/* Machine info pill */}
          {selectedMaquina && spcConfig && (
            <div className="flex items-center gap-3 ml-2">
              <div
                className="px-4 py-2 rounded-[12px] flex items-center gap-2"
                style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
              >
                <span className="text-xs text-gray-500">Tipo configurado:</span>
                <TipoGraficoBadge tipo={spcConfig.tipo_grafico} />
              </div>
              <div
                className="px-4 py-2 rounded-[12px] flex items-center gap-2"
                style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
              >
                <span className="text-xs text-gray-500">Subgrupo n=</span>
                <span className="text-xs font-bold text-gray-700">{spcConfig.tamano_subgrupo}</span>
              </div>
            </div>
          )}

          {/* Live indicator */}
          {selectedMaquinaId && (
            <div className="flex items-center gap-2 ml-auto">
              {isLoading ? (
                <span className="text-xs text-gray-400">Cargando...</span>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
                  <span className="text-xs font-semibold text-[#4CAF50]">EN VIVO</span>
                  <span className="text-xs text-gray-400">
                    — {piezas.length} puntos
                  </span>
                </>
              )}
            </div>
          )}

          {/* Recalcular button — admin and above only */}
          {selectedMaquinaId && isAdminOrAbove(userRol) && (
            <NeuButton
              variant="primary"
              onClick={() => setRecalcularOpen(true)}
            >
              Recalcular
            </NeuButton>
          )}
        </div>
      </NeuCard>

      {/* ── No machine selected ─────────────────────────────────────────────── */}
      {!selectedMaquinaId && (
        <NeuCard className="p-14 flex flex-col items-center justify-center gap-4 text-center">
          <div
            className="w-20 h-20 flex items-center justify-center rounded-[20px]"
            style={{ boxShadow: 'inset 5px 5px 10px #b8bec7, inset -5px -5px 10px #ffffff' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              className="w-10 h-10 opacity-20"
              stroke="#374151"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg font-semibold">Selecciona una máquina</p>
          <p className="text-gray-400 text-sm max-w-sm">
            Elige una línea de producción y una máquina para ver su análisis SPC completo en
            tiempo real.
          </p>
        </NeuCard>
      )}

      {/* ── Machine selected: Cp/Cpk semaphore ─────────────────────────────── */}
      {selectedMaquinaId && (
        <NeuCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Capacidad del Proceso
            </h2>
            {spcConfig?.usl !== null && spcConfig?.lsl !== null ? (
              <span className="text-xs text-gray-400">
                USL: {spcConfig?.usl} &nbsp;|&nbsp; LSL: {spcConfig?.lsl}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">
                Sin especificaciones USL/LSL definidas
              </span>
            )}
          </div>
          <CpkSemaphore
            cp={activeChart?.limits.cp ?? spcConfig?.cp ?? null}
            cpk={activeChart?.limits.cpk ?? spcConfig?.cpk ?? null}
          />
        </NeuCard>
      )}

      {/* ── Machine selected: Tabs dashboard ───────────────────────────────── */}
      {selectedMaquinaId && (
        <NeuCard className="overflow-hidden">
          {/* Tab bar */}
          <div
            className="flex overflow-x-auto"
            style={{ borderBottom: '1px solid #c8d0da' }}
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'flex-shrink-0 px-5 py-3.5 text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'text-[#1565C0] border-b-2 border-[#1565C0]'
                      : 'text-gray-500 hover:text-gray-700',
                  ].join(' ')}
                  style={{
                    background: isActive
                      ? 'linear-gradient(to bottom, #e0e5ec, #d8dde4)'
                      : 'transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-6">

            {/* ── SPC Chart tabs (X̄-R, X̄-S, I-MR) ──────────────────────── */}
            {isSPCTab && (
              <div>
                {isLoading ? (
                  <EmptyChart message="Cargando datos..." />
                ) : activeChart ? (
                  <>
                    {/* Limits summary */}
                    <div className="flex flex-wrap gap-3 mb-5">
                      {[
                        { label: 'UCL', value: activeChart.limits.ucl, color: '#F44336' },
                        { label: 'CL', value: activeChart.limits.cl, color: '#1565C0' },
                        { label: 'LCL', value: activeChart.limits.lcl, color: '#F44336' },
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-[10px]"
                          style={{
                            boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                          }}
                        >
                          <span
                            className="inline-block w-3 h-0.5"
                            style={{ background: color }}
                          />
                          <span className="text-xs text-gray-400">{label}</span>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color }}
                          >
                            {value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                      <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] ml-auto"
                        style={{
                          boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                        }}
                      >
                        <span className="text-xs text-gray-400">σ estimada</span>
                        <span className="text-xs font-bold text-gray-700 tabular-nums">
                          {activeChart.sigmaEstimada.toFixed(4)}
                        </span>
                      </div>
                    </div>

                    {/* Chart */}
                    <SPCChart
                      data={activeChart.points}
                      limits={activeChart.limits}
                      chartType={activeChartType}
                      onOutOfControlClick={handleOutOfControlClick}
                    />

                    {/* Out of control count for this chart type */}
                    {activeChart.points.filter((p) => p.isOutOfControl).length > 0 && (
                      <div
                        className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-[12px]"
                        style={{
                          background: 'rgba(244,67,54,0.08)',
                          boxShadow:
                            'inset 2px 2px 5px rgba(0,0,0,0.05), inset -2px -2px 5px rgba(255,255,255,0.7)',
                        }}
                      >
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F44336]" />
                        <span className="text-sm font-semibold text-[#F44336]">
                          {activeChart.points.filter((p) => p.isOutOfControl).length} punto
                          {activeChart.points.filter((p) => p.isOutOfControl).length !== 1
                            ? 's'
                            : ''}{' '}
                          fuera de control en este gráfico
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          (haz clic en los puntos rojos para ver detalles)
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyChart
                    message={
                      !spcConfig
                        ? 'Esta máquina no tiene configuración SPC aún.'
                        : `Se necesitan al menos ${
                            activeTab === 'i_mr'
                              ? '2 valores individuales'
                              : `${n} puntos para formar 1 subgrupo`
                          } para calcular este gráfico.`
                    }
                  />
                )}
              </div>
            )}

            {/* ── Fuera de Control tab ────────────────────────────────────── */}
            {activeTab === 'fuera_control' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Puntos Fuera de Control
                  </h3>
                  <span className="text-xs text-gray-400">
                    Combinado de los 3 tipos de gráfico
                  </span>
                </div>

                {allOutOfControlPoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div
                      className="w-14 h-14 flex items-center justify-center rounded-[14px]"
                      style={{
                        boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-7 h-7"
                        stroke="#4CAF50"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">
                      Sin puntos fuera de control
                    </p>
                    <p className="text-gray-400 text-sm">
                      El proceso está bajo control estadístico.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="text-xs font-semibold text-gray-400 uppercase tracking-wide"
                          style={{ borderBottom: '1px solid #c8d0da' }}
                        >
                          <th className="py-2.5 pr-4 text-left">Punto #</th>
                          <th className="py-2.5 pr-4 text-left">Hora</th>
                          <th className="py-2.5 pr-4 text-left">Valor</th>
                          <th className="py-2.5 pr-4 text-left">Tipo Gráfico</th>
                          <th className="py-2.5 text-left">Regla Violada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOutOfControlPoints.map(({ point, chartType }, idx) => (
                          <tr
                            key={`${chartType}-${point.index}-${idx}`}
                            className="transition-colors duration-100 hover:bg-[#d8dce3]/30"
                            style={{ borderBottom: '1px solid #d8dce3' }}
                          >
                            <td className="py-2.5 pr-4">
                              <span className="font-mono font-semibold text-[#F44336]">
                                #{point.index}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-gray-600">
                              {point.timestamp
                                ? formatDateTime(point.timestamp)
                                : '—'}
                            </td>
                            <td className="py-2.5 pr-4 font-mono font-semibold text-gray-700">
                              {point.value.toFixed(4)}
                            </td>
                            <td className="py-2.5 pr-4">
                              <TipoGraficoBadge tipo={chartType} />
                            </td>
                            <td className="py-2.5 text-[#c62828] text-xs leading-snug max-w-[280px]">
                              {point.ruleViolated ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Historial tab ───────────────────────────────────────────── */}
            {activeTab === 'historial' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Historial de Recálculos SPC
                  </h3>
                  <span className="text-xs text-gray-400">
                    {selectedMaquinaId
                      ? `Máquina seleccionada — ${recalculosFiltrados.length} registro${recalculosFiltrados.length !== 1 ? 's' : ''}`
                      : `Todas las máquinas — ${recalculosFiltrados.length} más recientes`}
                  </span>
                </div>

                {recalculosFiltrados.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div
                      className="w-14 h-14 flex items-center justify-center rounded-[14px]"
                      style={{
                        boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-7 h-7 opacity-30"
                        stroke="#374151"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">Sin historial de recálculos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr
                          className="text-xs font-semibold text-gray-400 uppercase tracking-wide"
                          style={{ borderBottom: '1px solid #c8d0da' }}
                        >
                          <th className="py-2.5 pr-3 text-left">Fecha</th>
                          <th className="py-2.5 pr-3 text-left">Máquina</th>
                          <th className="py-2.5 pr-3 text-left">Usuario</th>
                          <th className="py-2.5 pr-3 text-center">UCL ant. → nuevo</th>
                          <th className="py-2.5 pr-3 text-center">CL ant. → nuevo</th>
                          <th className="py-2.5 pr-3 text-center">LCL ant. → nuevo</th>
                          <th className="py-2.5 pr-3 text-center">Cp ant. → nuevo</th>
                          <th className="py-2.5 text-center">Cpk ant. → nuevo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recalculosFiltrados.map((r) => (
                          <tr
                            key={r.id}
                            className="transition-colors duration-100 hover:bg-[#d8dce3]/30"
                            style={{ borderBottom: '1px solid #d8dce3' }}
                          >
                            <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                              {formatDateTime(r.created_at)}
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-gray-700 whitespace-nowrap">
                              {r.maquina_nombre}
                            </td>
                            <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">
                              {r.usuario_nombre}
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono text-xs">
                              <RecalcDelta
                                before={r.ucl_anterior}
                                after={r.ucl_nuevo}
                              />
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono text-xs">
                              <RecalcDelta before={r.cl_anterior} after={r.cl_nuevo} />
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono text-xs">
                              <RecalcDelta
                                before={r.lcl_anterior}
                                after={r.lcl_nuevo}
                              />
                            </td>
                            <td className="py-2.5 pr-3 text-center font-mono text-xs">
                              <RecalcDelta before={r.cp_anterior} after={r.cp_nuevo} />
                            </td>
                            <td className="py-2.5 text-center font-mono text-xs">
                              <RecalcDelta
                                before={r.cpk_anterior}
                                after={r.cpk_nuevo}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Comparativa tab ─────────────────────────────────────────── */}
            {activeTab === 'comparativa' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    Comparativa de Máquinas
                  </h3>
                  <span className="text-xs text-gray-400">
                    {selectedLineaId
                      ? lineas.find((l) => l.id === selectedLineaId)?.nombre
                      : 'Todas las líneas'}
                  </span>
                </div>

                {comparativaData.length === 0 ? (
                  <EmptyChart message="Selecciona una línea para ver la comparativa de sus máquinas." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {comparativaData.map(({ maquina, config }) => {
                      const cpkStatus =
                        config?.cpk !== null && config?.cpk !== undefined
                          ? getCpkStatus(config.cpk)
                          : null;
                      const cpkColor =
                        cpkStatus === 'capable'
                          ? '#4CAF50'
                          : cpkStatus === 'marginal'
                          ? '#FF9800'
                          : cpkStatus === 'incapable'
                          ? '#F44336'
                          : '#9ca3af';

                      return (
                        <div
                          key={maquina.id}
                          className="rounded-[18px] p-4 flex flex-col gap-3"
                          style={{
                            background: '#e0e5ec',
                            boxShadow:
                              maquina.id === selectedMaquinaId
                                ? `0 0 0 2px #1565C0, 6px 6px 12px #b8bec7, -6px -6px 12px #ffffff`
                                : '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff',
                          }}
                        >
                          {/* Machine header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-gray-700 text-sm leading-tight">
                                {maquina.nombre}
                              </p>
                              {config && (
                                <TipoGraficoBadge tipo={config.tipo_grafico} />
                              )}
                            </div>
                            {/* Cpk dot */}
                            <div
                              className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
                              style={{
                                background: cpkColor,
                                boxShadow:
                                  cpkStatus
                                    ? `0 0 8px ${cpkColor}66`
                                    : 'inset 2px 2px 4px #b8bec7',
                              }}
                            />
                          </div>

                          {config ? (
                            <>
                              {/* Cp / Cpk */}
                              <div className="flex gap-3">
                                <div
                                  className="flex-1 text-center p-2 rounded-[10px]"
                                  style={{
                                    boxShadow:
                                      'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                                  }}
                                >
                                  <p className="text-xs text-gray-400">Cp</p>
                                  <p
                                    className="text-lg font-bold tabular-nums"
                                    style={{ color: cpkColor }}
                                  >
                                    {config.cp !== null
                                      ? config.cp.toFixed(2)
                                      : '—'}
                                  </p>
                                </div>
                                <div
                                  className="flex-1 text-center p-2 rounded-[10px]"
                                  style={{
                                    boxShadow:
                                      'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                                  }}
                                >
                                  <p className="text-xs text-gray-400">Cpk</p>
                                  <p
                                    className="text-lg font-bold tabular-nums"
                                    style={{ color: cpkColor }}
                                  >
                                    {config.cpk !== null
                                      ? config.cpk.toFixed(2)
                                      : '—'}
                                  </p>
                                </div>
                              </div>

                              {/* UCL / CL / LCL */}
                              <div className="space-y-1">
                                {[
                                  {
                                    label: 'UCL',
                                    value: config.ucl,
                                    color: '#F44336',
                                  },
                                  { label: 'CL', value: config.cl, color: '#1565C0' },
                                  {
                                    label: 'LCL',
                                    value: config.lcl,
                                    color: '#F44336',
                                  },
                                ].map(({ label, value, color }) => (
                                  <div
                                    key={label}
                                    className="flex justify-between items-center text-xs"
                                  >
                                    <span
                                      className="font-semibold"
                                      style={{ color }}
                                    >
                                      {label}
                                    </span>
                                    <span className="font-mono text-gray-600">
                                      {value !== null
                                        ? value.toFixed(3)
                                        : '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-gray-400 italic">
                              Sin configuración SPC
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </NeuCard>
      )}

      {/* ── Recalcular modal ────────────────────────────────────────────────── */}
      <RecalcularModal
        isOpen={recalcularOpen}
        onClose={() => setRecalcularOpen(false)}
        maquinaId={selectedMaquinaId}
        piezas={piezas}
        onSuccess={() => {
          setRecalcularOpen(false);
          setSpcConfig(null);
          setConfigVersion((v) => v + 1);
        }}
      />

      {/* ── Out of control detail modal ─────────────────────────────────────── */}
      <OutOfControlModal
        isOpen={outOfControlModal.open}
        onClose={() => setOutOfControlModal({ open: false, detail: null })}
        detail={outOfControlModal.detail}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecalcDelta — shows before → after comparison for recalculo rows
// ─────────────────────────────────────────────────────────────────────────────

function RecalcDelta({
  before,
  after,
}: {
  before: number | null;
  after: number | null;
}) {
  const fmt = (v: number | null) =>
    v !== null ? v.toFixed(3) : '—';

  const changed =
    before !== null && after !== null && Math.abs(before - after) > 0.0001;
  const increased = changed && after !== null && before !== null && after > before;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-gray-400">{fmt(before)}</span>
      <span className="text-gray-300">→</span>
      <span
        style={{
          color: !changed
            ? '#6b7280'
            : increased
            ? '#F44336'
            : '#4CAF50',
          fontWeight: changed ? 600 : 400,
        }}
      >
        {fmt(after)}
      </span>
    </span>
  );
}
