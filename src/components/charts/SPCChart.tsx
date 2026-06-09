'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  ReferenceLine,
  ReferenceArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SPCPoint, SPCLimits, TipoGrafico, CambioProceso } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SPCChartProps {
  data: SPCPoint[];
  limits: SPCLimits;
  chartType: TipoGrafico;
  onOutOfControlClick?: (point: SPCPoint) => void;
  cambiosProceso?: CambioProceso[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHART_TYPE_LABEL: Record<TipoGrafico, string> = {
  xbar_r: 'X̄-R',
  xbar_s: 'X̄-S',
  i_mr:   'I-MR',
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return ts;
  }
}

function yDomain(data: SPCPoint[], limits: SPCLimits): [number, number] {
  const sigma = (limits.ucl - limits.cl) / 3;
  const padding = sigma * 1.5;
  const allValues = data.map((d) => d.value);
  const minVal = allValues.length ? Math.min(...allValues) : limits.lcl;
  const maxVal = allValues.length ? Math.max(...allValues) : limits.ucl;
  return [
    Math.min(limits.lcl, minVal) - padding,
    Math.max(limits.ucl, maxVal) + padding,
  ];
}

// ---------------------------------------------------------------------------
// Custom dot — renders differently for out-of-control points
// ---------------------------------------------------------------------------

const CustomDot = React.memo(function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: SPCPoint;
  onOutOfControlClick?: (point: SPCPoint) => void;
}) {
  const { cx, cy, payload, onOutOfControlClick } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  if (payload.isOutOfControl) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="#F44336"
        stroke="#C62828"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={() => onOutOfControlClick?.(payload)}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#1565C0"
      stroke="#0D47A1"
      strokeWidth={1}
    />
  );
});

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

const CustomTooltip = React.memo(function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SPCPoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-[#e0e5ec] shadow-neu-flat rounded-neu px-3 py-2 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-700 mb-1">
        {formatTimestamp(point.timestamp)}
      </p>
      <p className="text-gray-600">
        Valor:{' '}
        <span className="font-mono font-semibold">{point.value.toFixed(4)}</span>
      </p>
      {point.range !== null && (
        <p className="text-gray-500 text-xs">Rango: {point.range.toFixed(4)}</p>
      )}
      {point.isOutOfControl && (
        <p className="text-[#F44336] font-semibold mt-1 text-xs leading-tight">
          ⚠ {point.ruleViolated}
        </p>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function SPCChart({
  data,
  limits,
  chartType,
  onOutOfControlClick,
  cambiosProceso = [],
}: SPCChartProps) {
  const sigma = (limits.ucl - limits.cl) / 3;

  // Zone boundaries (upper)
  const z1U = limits.cl + sigma;       // 1σ upper
  const z2U = limits.cl + 2 * sigma;   // 2σ upper
  // Zone boundaries (lower)
  const z1L = limits.cl - sigma;       // 1σ lower
  const z2L = limits.cl - 2 * sigma;   // 2σ lower

  const [domainMin, domainMax] = yDomain(data, limits);

  const chartData = data.map((p) => ({
    ...p,
    label: formatTimestamp(p.timestamp),
  }));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-500 tracking-wide uppercase">
          Gráfico {CHART_TYPE_LABEL[chartType]}
        </span>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-[#1565C0]" />
            Valor
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-6 h-0.5 bg-[#1565C0] opacity-50 border-dashed border-b" />
            UCL / LCL
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#F44336]" />
            Fuera de control
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#c8d0da" opacity={0.5} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#c8d0da' }}
          />

          <YAxis
            domain={[domainMin, domainMax]}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#c8d0da' }}
            width={60}
            tickFormatter={(v: number) => v.toFixed(2)}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* ── Zones A / B / C (upper) ──────────────────────────── */}
          {/* Zone C upper (0–1σ): green, very subtle */}
          <ReferenceArea
            y1={limits.cl}
            y2={z1U}
            fill="#4CAF50"
            fillOpacity={0.08}
            ifOverflow="extendDomain"
          />
          {/* Zone B upper (1–2σ): yellow */}
          <ReferenceArea
            y1={z1U}
            y2={z2U}
            fill="#FFC107"
            fillOpacity={0.10}
            ifOverflow="extendDomain"
          />
          {/* Zone A upper (2–3σ): orange */}
          <ReferenceArea
            y1={z2U}
            y2={limits.ucl}
            fill="#FF9800"
            fillOpacity={0.10}
            ifOverflow="extendDomain"
          />

          {/* ── Zones A / B / C (lower) ──────────────────────────── */}
          {/* Zone C lower */}
          <ReferenceArea
            y1={z1L}
            y2={limits.cl}
            fill="#4CAF50"
            fillOpacity={0.08}
            ifOverflow="extendDomain"
          />
          {/* Zone B lower */}
          <ReferenceArea
            y1={z2L}
            y2={z1L}
            fill="#FFC107"
            fillOpacity={0.10}
            ifOverflow="extendDomain"
          />
          {/* Zone A lower */}
          <ReferenceArea
            y1={limits.lcl}
            y2={z2L}
            fill="#FF9800"
            fillOpacity={0.10}
            ifOverflow="extendDomain"
          />

          {/* ── Reference lines ──────────────────────────────────── */}
          {/* UCL */}
          <ReferenceLine
            y={limits.ucl}
            stroke="#F44336"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `UCL ${limits.ucl.toFixed(3)}`, position: 'insideTopRight', fill: '#F44336', fontSize: 11 }}
          />
          {/* CL */}
          <ReferenceLine
            y={limits.cl}
            stroke="#1565C0"
            strokeWidth={1.5}
            label={{ value: `CL ${limits.cl.toFixed(3)}`, position: 'insideTopRight', fill: '#1565C0', fontSize: 11 }}
          />
          {/* LCL */}
          <ReferenceLine
            y={limits.lcl}
            stroke="#F44336"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: `LCL ${limits.lcl.toFixed(3)}`, position: 'insideBottomRight', fill: '#F44336', fontSize: 11 }}
          />

          {/* ── Data line ────────────────────────────────────────── */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1565C0"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(dotProps: unknown) => {
              const p = dotProps as { cx?: number; cy?: number; payload?: SPCPoint };
              return (
                <CustomDot
                  key={`dot-${p.payload?.index ?? p.cx}`}
                  cx={p.cx}
                  cy={p.cy}
                  payload={p.payload}
                  onOutOfControlClick={onOutOfControlClick}
                />
              );
            }}
            activeDot={{ r: 6, fill: '#1565C0', stroke: '#0D47A1' }}
          />

          {/* ── Cambios de proceso ───────────────────────────────── */}
          {cambiosProceso.map((cambio) => (
            <ReferenceLine
              key={cambio.id}
              x={formatTimestamp(cambio.fecha)}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: cambio.tipo,
                position: 'top',
                fontSize: 10,
                fill: '#f59e0b',
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default React.memo(SPCChart);
