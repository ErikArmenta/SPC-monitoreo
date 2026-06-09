'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import {
  buildSubgroups,
  calculateXBarR,
  calculateXBarS,
  calculateIMR,
} from '@/lib/spc/calculations';
import { detectViolations } from '@/lib/spc/western-electric';
import {
  calcCapabilityIndices,
  buildHistogramData,
  buildNormalProbData,
  buildBoxPlotData,
  buildLast25Data,
} from '@/lib/spc/statistics';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import Histogram from '@/components/charts/Histogram';
import NormalProbPlot from '@/components/charts/NormalProbPlot';
import CapabilityPanel from '@/components/charts/CapabilityPanel';
import Last25Chart from '@/components/charts/Last25Chart';
import BoxPlotChart from '@/components/charts/BoxPlotChart';
import type {
  Linea,
  Maquina,
  Pieza,
  SPCConfig,
  SPCPoint,
  SPCLimits,
  TipoGrafico,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic imports (Recharts — no SSR)
// ─────────────────────────────────────────────────────────────────────────────

const SPCChart = dynamic(() => import('@/components/charts/SPCChart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse bg-[#e0e5ec] rounded-[16px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]" />
  ),
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RangeOption = '24h' | '7d' | '30d' | 'custom';

interface SixPackViewProps {
  lineas: Linea[];
  maquinas: Maquina[];
}

interface ComputedSPC {
  limits: SPCLimits;
  points: SPCPoint[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NeuSelect (local, same as SPCDashboardView)
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
// SPC computation helpers (mirror of SPCDashboardView)
// ─────────────────────────────────────────────────────────────────────────────

function computeSPC(
  piezas: Pieza[],
  config: SPCConfig
): ComputedSPC | null {
  const { tipo_grafico, tamano_subgrupo, usl, lsl } = config;

  if (tipo_grafico === 'xbar_r' || tipo_grafico === 'xbar_s') {
    const subgroups = buildSubgroups(piezas, tamano_subgrupo);
    if (subgroups.length === 0) return null;
    try {
      const fn = tipo_grafico === 'xbar_r' ? calculateXBarR : calculateXBarS;
      const { xbar, sigmaEstimada } = fn(subgroups, tamano_subgrupo, usl, lsl);
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
        const lastPieza = validPiezas[i * tamano_subgrupo + tamano_subgrupo - 1];
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
      return { limits: xbar, points };
    } catch {
      return null;
    }
  }

  // I-MR
  const values = piezas
    .filter((p) => p.valor_medido !== null)
    .map((p) => p.valor_medido as number);
  if (values.length === 0) return null;
  try {
    const { individuals: individual, sigmaEstimada } = calculateIMR(values, usl, lsl);
    const weLimits = {
      ucl: individual.ucl,
      cl: individual.cl,
      lcl: individual.lcl,
      sigma1: sigmaEstimada,
      sigma2: 2 * sigmaEstimada,
    };
    const vMap = new Map(detectViolations(values, weLimits).map((v) => [v.index, v.rule]));
    const validPiezas = piezas.filter((p) => p.valor_medido !== null);
    const points: SPCPoint[] = values.map((v, i) => {
      const ruleViolated = vMap.get(i) ?? null;
      return {
        index: i + 1,
        value: v,
        subgroupMean: v,
        range: i === 0 ? null : Math.abs(v - values[i - 1]),
        sigma: null,
        isOutOfControl: ruleViolated !== null,
        ruleViolated,
        timestamp: validPiezas[i]?.hora_inspeccion ?? '',
        piezaId: validPiezas[i]?.id ?? '',
      };
    });
    return { limits: individual, points };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Range helpers
// ─────────────────────────────────────────────────────────────────────────────

function getRangeStart(range: RangeOption, customStart: string): Date {
  const now = new Date();
  if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return customStart ? new Date(customStart) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

function getRangeEnd(range: RangeOption, customEnd: string): Date {
  if (range === 'custom' && customEnd) return new Date(customEnd);
  return new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CellSkeleton({ title }: { title: string }) {
  return (
    <NeuCard className="p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="flex-1 animate-pulse bg-[#e0e5ec] rounded-[12px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] h-48" />
    </NeuCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell wrapper
// ─────────────────────────────────────────────────────────────────────────────

function ChartCell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <NeuCard className="p-5 flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <div className="flex-1 min-h-0">{children}</div>
    </NeuCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SixPackView({ lineas, maquinas }: SixPackViewProps) {
  const supabase = createClient();
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Selectors ──────────────────────────────────────────────────────────────
  const [lineaId, setLineaId] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [range, setRange] = useState<RangeOption>('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // ── Data ───────────────────────────────────────────────────────────────────
  const [piezas, setPiezas] = useState<Pieza[]>([]);
  const [config, setConfig] = useState<SPCConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Filtered machines by line ──────────────────────────────────────────────
  const maquinasFiltradas = useMemo(
    () => (lineaId ? maquinas.filter((m) => m.linea_id === lineaId) : maquinas),
    [maquinas, lineaId]
  );

  // Reset máquina if line changes
  useEffect(() => {
    setMaquinaId('');
  }, [lineaId]);

  // ── Fetch piezas + config ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!maquinaId) {
      setPiezas([]);
      setConfig(null);
      return;
    }

    setLoading(true);
    try {
      const start = getRangeStart(range, customStart).toISOString();
      const end = getRangeEnd(range, customEnd).toISOString();

      const [piezasRes, configRes] = await Promise.all([
        supabase
          .from('piezas')
          .select('*')
          .eq('maquina_id', maquinaId)
          .gte('hora_inspeccion', start)
          .lte('hora_inspeccion', end)
          .order('hora_inspeccion', { ascending: true }),
        supabase
          .from('spc_configs')
          .select('*')
          .eq('maquina_id', maquinaId)
          .single(),
      ]);

      setPiezas(piezasRes.data ?? []);
      setConfig(configRes.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [maquinaId, range, customStart, customEnd, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Computed values ────────────────────────────────────────────────────────
  const values = useMemo(
    () => piezas.filter((p) => p.valor_medido !== null).map((p) => p.valor_medido as number),
    [piezas]
  );

  const spcData = useMemo<ComputedSPC | null>(
    () => (config && piezas.length > 0 ? computeSPC(piezas, config) : null),
    [piezas, config]
  );

  const usl = config?.usl ?? null;
  const lsl = config?.lsl ?? null;

  const capabilityIndices = useMemo(
    () => (values.length > 1 ? calcCapabilityIndices(values, usl, lsl) : null),
    [values, usl, lsl]
  );

  const histogramData = useMemo(
    () => (values.length > 0 ? buildHistogramData(values, 10) : []),
    [values]
  );

  const normalProbData = useMemo(
    () => (values.length > 0 ? buildNormalProbData(values) : []),
    [values]
  );

  const boxPlotData = useMemo(
    () => (values.length > 0 ? buildBoxPlotData(values) : null),
    [values]
  );

  const last25Data = useMemo(
    () => (values.length > 0 ? buildLast25Data(values, usl, lsl) : []),
    [values, usl, lsl]
  );

  const chartType: TipoGrafico = config?.tipo_grafico ?? 'i_mr';

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    if (!gridRef.current || typeof window === 'undefined') return;
    setExporting(true);
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: '#e0e5ec',
        scale: 1.5,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;

      let drawW = pdfWidth - 20;
      let drawH = drawW / imgRatio;
      if (drawH > pdfHeight - 20) {
        drawH = pdfHeight - 20;
        drawW = drawH * imgRatio;
      }

      const maquina = maquinas.find((m) => m.id === maquinaId);
      const rangeLabel = range === 'custom'
        ? `${customStart} – ${customEnd}`
        : { '24h': 'Últimas 24h', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días' }[range];

      pdf.setFontSize(12);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Six Pack — ${maquina?.nombre ?? ''}  |  ${rangeLabel}`, 10, 10);

      pdf.addImage(imgData, 'PNG', 10, 16, drawW, drawH);
      pdf.save(`sixpack_${maquina?.nombre ?? 'export'}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setExporting(false);
    }
  }, [maquinaId, maquinas, range, customStart, customEnd]);

  // ── Lineas options ─────────────────────────────────────────────────────────
  const lineaOptions = lineas.map((l) => ({ id: l.id, label: `${l.numero}. ${l.nombre}` }));
  const maquinaOptions = maquinasFiltradas.map((m) => ({ id: m.id, label: `${m.numero}. ${m.nombre}` }));

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasData = values.length > 0;
  const rangeButtons: { label: string; value: RangeOption }[] = [
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: 'Custom', value: 'custom' },
  ];

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-700 tracking-tight">Six Pack de Calidad</h1>
        <p className="text-sm text-gray-400 mt-1">Análisis estadístico completo por máquina</p>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div
        className="mb-6 p-5 rounded-[20px] flex flex-wrap gap-4 items-end"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff', background: '#e0e5ec' }}
      >
        {/* Línea selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Línea
          </label>
          <NeuSelect
            value={lineaId}
            onChange={setLineaId}
            placeholder="Todas las líneas"
            options={lineaOptions}
          />
        </div>

        {/* Máquina selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Máquina
          </label>
          <NeuSelect
            value={maquinaId}
            onChange={setMaquinaId}
            placeholder="Seleccionar máquina"
            options={maquinaOptions}
          />
        </div>

        {/* Range buttons */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Rango
          </label>
          <div className="flex gap-2">
            {rangeButtons.map((btn) => (
              <NeuButton
                key={btn.value}
                variant={range === btn.value ? 'primary' : 'default'}
                onClick={() => setRange(btn.value)}
                className="px-4 py-2 text-xs"
              >
                {btn.label}
              </NeuButton>
            ))}
          </div>
        </div>

        {/* Custom date inputs */}
        {range === 'custom' && (
          <div className="flex gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Desde
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className={[
                  'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 text-sm text-gray-700',
                  'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
                  'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
                ].join(' ')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Hasta
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className={[
                  'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 text-sm text-gray-700',
                  'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
                  'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
                ].join(' ')}
              />
            </div>
          </div>
        )}

        {/* Spacer + Export button */}
        <div className="ml-auto flex items-end">
          <NeuButton
            variant="primary"
            onClick={handleExportPDF}
            disabled={!hasData || exporting}
            className="flex items-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exportando…' : 'Exportar PDF'}
          </NeuButton>
        </div>
      </div>

      {/* ── No machine selected ─────────────────────────────────────────────── */}
      {!maquinaId && (
        <div
          className="flex items-center justify-center h-64 rounded-[20px] text-gray-400 text-sm"
          style={{ boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff', background: '#e0e5ec' }}
        >
          Selecciona una máquina para ver el Six Pack
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {maquinaId && loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Carta de Control', 'Histograma', 'Prob. Normal', 'Capacidad', 'Últimas 25', 'Box Plot'].map(
            (title) => (
              <CellSkeleton key={title} title={title} />
            )
          )}
        </div>
      )}

      {/* ── No data ─────────────────────────────────────────────────────────── */}
      {maquinaId && !loading && !hasData && (
        <div
          className="flex items-center justify-center h-64 rounded-[20px] text-gray-400 text-sm"
          style={{ boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff', background: '#e0e5ec' }}
        >
          Sin datos de piezas para el rango seleccionado
        </div>
      )}

      {/* ── Six Pack Grid ───────────────────────────────────────────────────── */}
      {maquinaId && !loading && hasData && (
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* 1. Carta de Control (SPC) */}
          <ChartCell title={`Carta de control — ${chartType.toUpperCase().replace('_', '-')}`}>
            {spcData ? (
              <SPCChart
                data={spcData.points}
                limits={spcData.limits}
                chartType={chartType}
              />
            ) : (
              <div
                className="flex items-center justify-center h-48 rounded-[12px] text-gray-400 text-xs"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              >
                Datos insuficientes para la carta de control
              </div>
            )}
          </ChartCell>

          {/* 2. Histograma */}
          <ChartCell title="Histograma de distribución">
            <Histogram data={histogramData} usl={usl} lsl={lsl} />
          </ChartCell>

          {/* 3. Gráfica de probabilidad normal */}
          <ChartCell title="Probabilidad normal">
            <NormalProbPlot data={normalProbData} />
          </ChartCell>

          {/* 4. Panel de capacidad */}
          <ChartCell title="Análisis de capacidad">
            {capabilityIndices ? (
              <CapabilityPanel indices={capabilityIndices} />
            ) : (
              <div
                className="flex items-center justify-center h-48 rounded-[12px] text-gray-400 text-xs"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              >
                Se necesitan al menos 2 valores para calcular capacidad
              </div>
            )}
          </ChartCell>

          {/* 5. Últimas 25 observaciones */}
          <ChartCell title="Últimas 25 observaciones">
            <Last25Chart
              data={last25Data}
              usl={usl}
              lsl={lsl}
              mean={capabilityIndices?.mean ?? null}
            />
          </ChartCell>

          {/* 6. Box Plot */}
          <ChartCell title="Diagrama de caja y bigotes">
            {boxPlotData ? (
              <BoxPlotChart data={boxPlotData} usl={usl} lsl={lsl} />
            ) : (
              <div
                className="flex items-center justify-center h-48 rounded-[12px] text-gray-400 text-xs"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              >
                Sin datos para el box plot
              </div>
            )}
          </ChartCell>
        </div>
      )}
    </div>
  );
}
