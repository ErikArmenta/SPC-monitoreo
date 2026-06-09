'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ErrorBar,
  Scatter,
  Cell,
} from 'recharts';
import type { BoxPlotData } from '@/lib/spc/statistics';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BoxPlotChartProps {
  data: BoxPlotData;
  usl: number | null;
  lsl: number | null;
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
}

function CustomTooltip({ active }: CustomTooltipProps) {
  if (!active) return null;
  return null; // Stats are shown in the chart labels — no tooltip needed
}

// ---------------------------------------------------------------------------
// Custom Bar shape — renders the IQR box (Q1 to Q3)
// ---------------------------------------------------------------------------

interface IQRBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  q1?: number;
  q3?: number;
  median?: number;
  yAxis?: { scale?: (v: number) => number };
}

function IQRBar({ x = 0, y = 0, width = 0, height = 0, q1, q3, median, yAxis }: IQRBarProps) {
  if (q1 === undefined || q3 === undefined || median === undefined || !yAxis?.scale) {
    return null;
  }

  const scale = yAxis.scale;
  const yQ3 = scale(q3);
  const yQ1 = scale(q1);
  const yMed = scale(median);
  const boxWidth = Math.max(width, 40);
  const cx = x + width / 2;
  const left = cx - boxWidth / 2;

  return (
    <g>
      {/* IQR box — Q1 to Q3 */}
      <rect
        x={left}
        y={yQ3}
        width={boxWidth}
        height={Math.abs(yQ1 - yQ3)}
        fill="#7c8cf8"
        fillOpacity={0.35}
        stroke="#6366f1"
        strokeWidth={2}
        rx={4}
      />
      {/* Median line */}
      <line
        x1={left}
        x2={left + boxWidth}
        y1={yMed}
        y2={yMed}
        stroke="#6366f1"
        strokeWidth={3}
      />
      {/* suppress unused y/height lint */}
      <rect x={x} y={y} width={0} height={height} fill="none" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BoxPlotChart = React.memo(function BoxPlotChart({
  data,
  usl,
  lsl,
}: BoxPlotChartProps) {
  if (!data) {
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
        Sin datos para Box Plot
      </div>
    );
  }

  const { q1, median, q3, whiskerLow, whiskerHigh, outliers } = data;

  // Build Y domain covering all elements + limits
  const allValues = [q1, median, q3, whiskerLow, whiskerHigh, ...outliers];
  if (usl !== null) allValues.push(usl);
  if (lsl !== null) allValues.push(lsl);
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
  const yPad = (yMax - yMin) * 0.18 || 0.05;

  // The bar chart uses a single category "box" on the X axis.
  // The bar encodes the Q1–Q3 range via a custom shape.
  // Whiskers are drawn as ErrorBar on the median point.
  // Outliers are plotted as a Scatter series.

  const barData = [
    {
      category: 'Box',
      // Bar value spans from whiskerLow to whiskerHigh (full range for ErrorBar)
      // We use the median as the "center" value for the bar and derive offset via ErrorBar
      median,
      q1,
      q3,
      whiskerLow,
      whiskerHigh,
      // ErrorBar needs error in [lower, upper] relative to the dataKey value
      errorLow: median - whiskerLow,
      errorHigh: whiskerHigh - median,
    },
  ];

  // Outliers as scatter points in the same category
  const outlierData = outliers.map((v) => ({ category: 'Box', value: v }));

  return (
    <div
      style={{
        background: '#e0e5ec',
        boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      {/* Stats summary row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '8px',
          fontSize: '11px',
          color: '#666',
        }}
      >
        {[
          { label: 'Mín. bigote', value: whiskerLow },
          { label: 'Q1', value: q1 },
          { label: 'Mediana', value: median },
          { label: 'Q3', value: q3 },
          { label: 'Máx. bigote', value: whiskerHigh },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 600, color: '#6366f1' }}>{Number(value).toFixed(3)}</div>
            <div style={{ color: '#999', fontSize: '10px' }}>{label}</div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={barData}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#c8cfd8" horizontal={false} />

          <XAxis
            type="number"
            domain={[yMin - yPad, yMax + yPad]}
            tickFormatter={(v: number) => Number(v).toFixed(3)}
            tick={{ fontSize: 10, fill: '#777' }}
          />

          <YAxis
            type="category"
            dataKey="category"
            tick={false}
            axisLine={false}
            tickLine={false}
            width={4}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* USL */}
          {usl !== null && (
            <ReferenceLine
              x={usl}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `USL ${Number(usl).toFixed(3)}`,
                position: 'top',
                fontSize: 10,
                fill: '#ef4444',
              }}
            />
          )}

          {/* LSL */}
          {lsl !== null && (
            <ReferenceLine
              x={lsl}
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `LSL ${Number(lsl).toFixed(3)}`,
                position: 'top',
                fontSize: 10,
                fill: '#22c55e',
              }}
            />
          )}

          {/* Median reference */}
          <ReferenceLine
            x={median}
            stroke="#6366f1"
            strokeWidth={1}
            strokeDasharray="4 4"
          />

          {/*
           * Bar from whiskerLow to whiskerHigh with custom IQR box shape.
           * We render the bar at whiskerLow and use height = (whiskerHigh - whiskerLow).
           * A custom shape draws the Q1-Q3 box and median line over it.
           */}
          <Bar
            dataKey="whiskerHigh"
            fill="transparent"
            stroke="none"
            barSize={60}
            isAnimationActive={false}
            shape={(props: unknown) => {
              const p = props as {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                yAxis?: { scale?: (v: number) => number };
              };
              return (
                <IQRBar
                  x={p.x}
                  y={p.y}
                  width={p.width}
                  height={p.height}
                  q1={q1}
                  q3={q3}
                  median={median}
                  yAxis={p.yAxis}
                />
              );
            }}
          >
            <ErrorBar
              dataKey="errorHigh"
              width={0}
              strokeWidth={2}
              stroke="#6366f1"
              direction="x"
            />
          </Bar>

          {/* Whisker low side as separate ErrorBar-less bar at whiskerLow */}
          <Bar
            dataKey="errorLow"
            fill="transparent"
            stroke="none"
            barSize={0}
            isAnimationActive={false}
          >
            <ErrorBar
              dataKey="errorLow"
              width={0}
              strokeWidth={2}
              stroke="#6366f1"
              direction="x"
            />
          </Bar>

          {/* Outlier scatter points */}
          {outlierData.length > 0 && (
            <Scatter
              data={outlierData}
              dataKey="value"
              fill="#ef4444"
              isAnimationActive={false}
            >
              {outlierData.map((_entry, index) => (
                <Cell key={`outlier-${index}`} fill="#ef4444" />
              ))}
            </Scatter>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {outliers.length > 0 && (
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#ef4444', margin: '4px 0 0' }}>
          {outliers.length} valor{outliers.length > 1 ? 'es' : ''} atípico
          {outliers.length > 1 ? 's' : ''} (outlier{outliers.length > 1 ? 's' : ''})
        </p>
      )}
    </div>
  );
});

export default BoxPlotChart;
