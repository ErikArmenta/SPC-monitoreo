'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { NormalProbPoint } from '@/lib/spc/statistics';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NormalProbPlotProps {
  data: NormalProbPoint[];
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const value = payload.find((p) => p.name === 'value')?.value;
  const zScore = payload.find((p) => p.name === 'zScore')?.value;

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
      {value !== undefined && (
        <p style={{ margin: 0, fontWeight: 600 }}>Valor: {Number(value).toFixed(4)}</p>
      )}
      {zScore !== undefined && (
        <p style={{ margin: 0, color: '#6366f1' }}>Z-Score: {Number(zScore).toFixed(3)}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers — best-fit reference line (least squares on x=value, y=zScore)
// ---------------------------------------------------------------------------

interface FitLine {
  slope: number;
  intercept: number;
  xMin: number;
  xMax: number;
}

function computeBestFit(data: NormalProbPoint[]): FitLine | null {
  const n = data.length;
  if (n < 2) return null;

  const sumX = data.reduce((s, d) => s + d.value, 0);
  const sumY = data.reduce((s, d) => s + d.zScore, 0);
  const sumXY = data.reduce((s, d) => s + d.value * d.zScore, 0);
  const sumX2 = data.reduce((s, d) => s + d.value * d.value, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const xMin = Math.min(...data.map((d) => d.value));
  const xMax = Math.max(...data.map((d) => d.value));

  return { slope, intercept, xMin, xMax };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const NormalProbPlot = React.memo(function NormalProbPlot({ data }: NormalProbPlotProps) {
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
        Sin datos para probabilidad normal
      </div>
    );
  }

  const fit = computeBestFit(data);

  // Scatter expects { value, zScore } but recharts Scatter maps by dataKey
  // We use x=value, y=zScore naming convention via XAxis/YAxis dataKey
  const scatterData = data.map((d) => ({ value: d.value, zScore: d.zScore }));

  // Build two endpoints for the best-fit diagonal reference line
  // Recharts ReferenceLine with segment prop or we draw it as a second scatter series
  const fitLinePoints =
    fit !== null
      ? [
          { value: fit.xMin, zFit: fit.slope * fit.xMin + fit.intercept },
          { value: fit.xMax, zFit: fit.slope * fit.xMax + fit.intercept },
        ]
      : [];

  const xValues = data.map((d) => d.value);
  const yValues = data.map((d) => d.zScore);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xPad = (xMax - xMin) * 0.05 || 0.01;
  const yPad = (yMax - yMin) * 0.1 || 0.2;

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
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c8cfd8" />

          <XAxis
            type="number"
            dataKey="value"
            name="value"
            domain={[xMin - xPad, xMax + xPad]}
            tickFormatter={(v: number) => Number(v).toFixed(3)}
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
            type="number"
            dataKey="zScore"
            name="zScore"
            domain={[yMin - yPad, yMax + yPad]}
            tickFormatter={(v: number) => Number(v).toFixed(2)}
            tick={{ fontSize: 10, fill: '#777' }}
            width={40}
            label={{
              value: 'Z-Score',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 11,
              fill: '#888',
            }}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          {/* Horizontal reference at z=0 */}
          <ReferenceLine
            y={0}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth={1}
          />

          {/* Best-fit diagonal line rendered as a Scatter with line shape */}
          {fitLinePoints.length === 2 && (
            <Scatter
              name="Línea de ajuste"
              data={fitLinePoints}
              line={{ stroke: '#6366f1', strokeWidth: 2 }}
              lineType="fitting"
              fill="transparent"
              shape={() => null as unknown as React.ReactElement}
              legendType="none"
              isAnimationActive={false}
            />
          )}

          {/* Actual data points */}
          <Scatter
            name="Datos"
            data={scatterData}
            fill="#7c8cf8"
            fillOpacity={0.85}
            r={4}
            isAnimationActive={false}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});

export default NormalProbPlot;
