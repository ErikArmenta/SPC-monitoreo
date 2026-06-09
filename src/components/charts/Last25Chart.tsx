'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import type { Last25Point } from '@/lib/spc/statistics';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Last25ChartProps {
  data: Last25Point[];
  usl: number | null;
  lsl: number | null;
  mean: number | null;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: Last25Point;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const isOut = point?.payload?.isOutOfSpec;

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
      <p style={{ margin: 0, fontWeight: 600 }}>Obs. {label}</p>
      <p style={{ margin: 0, color: isOut ? '#ef4444' : '#555' }}>
        Valor: {Number(point?.value ?? 0).toFixed(4)}
      </p>
      {isOut && (
        <p style={{ margin: 0, color: '#ef4444', fontWeight: 600 }}>⚠ Fuera de especificación</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Dot — red for out-of-spec points
// ---------------------------------------------------------------------------

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: Last25Point;
  r?: number;
}

function CustomDot({ cx, cy, payload, r = 4 }: CustomDotProps) {
  if (cx === undefined || cy === undefined) return null;

  const isOut = payload?.isOutOfSpec ?? false;

  if (isOut) {
    return (
      <g>
        <Dot
          cx={cx}
          cy={cy}
          r={r + 2}
          fill="#ef4444"
          stroke="#fff"
          strokeWidth={2}
        />
      </g>
    );
  }

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={r}
      fill="#7c8cf8"
      stroke="#fff"
      strokeWidth={1.5}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Last25Chart = React.memo(function Last25Chart({
  data,
  usl,
  lsl,
  mean,
}: Last25ChartProps) {
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
        Sin datos para las últimas observaciones
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const allLimits = [
    ...values,
    ...(usl !== null ? [usl] : []),
    ...(lsl !== null ? [lsl] : []),
    ...(mean !== null ? [mean] : []),
  ];
  const yMin = Math.min(...allLimits);
  const yMax = Math.max(...allLimits);
  const yPad = (yMax - yMin) * 0.15 || 0.01;

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
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#c8cfd8" vertical={false} />

          <XAxis
            dataKey="index"
            tick={{ fontSize: 10, fill: '#777' }}
            label={{
              value: 'Observación',
              position: 'insideBottom',
              offset: -14,
              fontSize: 11,
              fill: '#888',
            }}
          />

          <YAxis
            domain={[yMin - yPad, yMax + yPad]}
            tickFormatter={(v: number) => Number(v).toFixed(3)}
            tick={{ fontSize: 10, fill: '#777' }}
            width={52}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Media */}
          {mean !== null && (
            <ReferenceLine
              y={mean}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              label={{
                value: `X̄=${Number(mean).toFixed(3)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#6366f1',
              }}
            />
          )}

          {/* USL */}
          {usl !== null && (
            <ReferenceLine
              y={usl}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: 'USL',
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#ef4444',
              }}
            />
          )}

          {/* LSL */}
          {lsl !== null && (
            <ReferenceLine
              y={lsl}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: 'LSL',
                position: 'insideBottomRight',
                fontSize: 10,
                fill: '#22c55e',
              }}
            />
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke="#7c8cf8"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#6366f1' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default Last25Chart;
