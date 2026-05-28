'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface HourlyData {
  /** Etiqueta del eje X, p.ej. "12:00", "13:00" */
  hora: string;
  ok: number;
  noOk: number;
}

export interface BarChartProps {
  data: HourlyData[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Tooltip personalizado
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[12px] px-4 py-3 text-sm"
      style={{
        background: '#e0e5ec',
        boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
      }}
    >
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.name} style={{ color: item.color }}>
          {item.name}: <span className="font-medium text-gray-700">{item.value}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function BarChart({ data, className }: BarChartProps) {
  return (
    <div className={className} style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          barCategoryGap="30%"
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#c8cfd8"
            vertical={false}
          />
          <XAxis
            dataKey="hora"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ color: '#6b7280', fontSize: 12 }}>{value}</span>
            )}
          />
          <Bar
            dataKey="ok"
            name="OK"
            fill="#4CAF50"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="noOk"
            name="No OK"
            fill="#F44336"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
