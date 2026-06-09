'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { HistogramBar } from '@/lib/spc/statistics';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HistogramProps {
  data: HistogramBar[];
  usl: number | null;
  lsl: number | null;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const count = payload.find((p) => p.name === 'Frecuencia')?.value ?? 0;
  const curve = payload.find((p) => p.name === 'Curva normal')?.value;

  return (
    <div
      style={{
        background: '#e0e5ec',
        boxShadow: '4px 4px 10px #b8bec7, -4px -4px 10px #ffffff',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '12px',
        color: '#555',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Frecuencia: {count}</p>
      {curve !== undefined && (
        <p style={{ margin: 0, color: '#6366f1' }}>
          Curva normal: {Number(curve).toFixed(2)}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatX(val: number): string {
  return Number(val).toFixed(3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Histogram = React.memo(function Histogram({ data, usl, lsl }: HistogramProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          background: '#e0e5ec',
          boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '13px',
        }}
      >
        Sin datos para histograma
      </div>
    );
  }

  // Build chart data — one entry per bin using the midpoint as X key
  const chartData = data.map((bar) => ({
    midpoint: (bar.x0 + bar.x1) / 2,
    label: `${formatX(bar.x0)}–${formatX(bar.x1)}`,
    count: bar.count,
    normalCurveY: Number(bar.normalCurveY.toFixed(4)),
  }));

  // Determine Y domain
  const maxCount = Math.max(...data.map((b) => b.count), 1);
  const maxCurve = Math.max(...data.map((b) => b.normalCurveY), 0);
  const yMax = Math.ceil(Math.max(maxCount, maxCurve) * 1.15);

  // X domain for ReferenceLine — use midpoint scale
  const xValues = chartData.map((d) => d.midpoint);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);

  const uslInRange = usl !== null && usl >= xMin && usl <= xMax;
  const lslInRange = lsl !== null && lsl >= xMin && lsl <= xMax;

  return (
    <div
      style={{
        background: '#e0e5ec',
        boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#c8cfd8" vertical={false} />

          <XAxis
            dataKey="midpoint"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatX}
            tick={{ fontSize: 10, fill: '#777' }}
            label={{
              value: 'Valor medido',
              position: 'insideBottom',
              offset: -14,
              fontSize: 11,
              fill: '#888',
            }}
          />

          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 10, fill: '#777' }}
            allowDecimals={false}
            width={36}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            verticalAlign="top"
            iconSize={10}
            wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }}
          />

          {/* Frecuency bars */}
          <Bar
            dataKey="count"
            name="Frecuencia"
            fill="#7c8cf8"
            fillOpacity={0.75}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />

          {/* Normal curve overlay */}
          <Line
            dataKey="normalCurveY"
            name="Curva normal"
            type="monotone"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* USL reference line */}
          {uslInRange && (
            <ReferenceLine
              x={usl!}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: 'USL',
                position: 'top',
                fontSize: 10,
                fill: '#ef4444',
              }}
            />
          )}

          {/* LSL reference line */}
          {lslInRange && (
            <ReferenceLine
              x={lsl!}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: 'LSL',
                position: 'top',
                fontSize: 10,
                fill: '#22c55e',
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export default Histogram;
