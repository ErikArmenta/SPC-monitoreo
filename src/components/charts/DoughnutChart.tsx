'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DoughnutChartProps {
  ok: number;
  noOk: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Tooltip personalizado
// ---------------------------------------------------------------------------

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { fill: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div
      className="rounded-[12px] px-3 py-2 text-sm font-medium"
      style={{
        background: '#e0e5ec',
        boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
        color: p.fill,
      }}
    >
      {name}: <span style={{ color: '#374151' }}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function DoughnutChart({ ok, noOk, className }: DoughnutChartProps) {
  const total = ok + noOk;

  const data = [
    { name: 'OK', value: ok, fill: '#4CAF50' },
    { name: 'No OK', value: noOk, fill: '#F44336' },
  ];

  return (
    <div className={className} style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={noOk > 0 && ok > 0 ? 3 : 0}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          {/* Label central con el total */}
          <text
            x="50%"
            y="44%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: 11, fill: '#9ca3af' }}
          >
            Total
          </text>
          <text
            x="50%"
            y="57%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: 24, fontWeight: 700, fill: '#374151' }}
          >
            {total}
          </text>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Leyenda */}
      <div className="flex justify-center gap-6 mt-1">
        <span className="flex items-center gap-1.5 text-sm text-gray-600">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: '#4CAF50' }}
          />
          OK ({ok})
        </span>
        <span className="flex items-center gap-1.5 text-sm text-gray-600">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: '#F44336' }}
          />
          No OK ({noOk})
        </span>
      </div>
    </div>
  );
}
