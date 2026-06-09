'use client';

import React from 'react';
import type { CapabilityIndices } from '@/lib/spc/statistics';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CapabilityPanelProps {
  indices: CapabilityIndices;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(val: number | null, decimals = 3): string {
  if (val === null) return '—';
  return val.toFixed(decimals);
}

function fmtPPM(val: number | null): string {
  if (val === null) return '—';
  return val < 1 ? '<1' : val.toFixed(0);
}

type TrafficColor = 'green' | 'yellow' | 'red';

function getCpkColor(cpk: number | null): TrafficColor {
  if (cpk === null) return 'red';
  if (cpk >= 1.33) return 'green';
  if (cpk >= 1.0) return 'yellow';
  return 'red';
}

const TRAFFIC_STYLES: Record<TrafficColor, React.CSSProperties> = {
  green: {
    background: '#22c55e',
    color: '#fff',
    boxShadow: '3px 3px 8px #16a34a88, -2px -2px 6px #86efac66',
  },
  yellow: {
    background: '#f59e0b',
    color: '#fff',
    boxShadow: '3px 3px 8px #d9780088, -2px -2px 6px #fde68a66',
  },
  red: {
    background: '#ef4444',
    color: '#fff',
    boxShadow: '3px 3px 8px #dc262688, -2px -2px 6px #fca5a566',
  },
};

const TRAFFIC_LABEL: Record<TrafficColor, string> = {
  green: 'Proceso capaz',
  yellow: 'Proceso marginal',
  red: 'Proceso no capaz',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricCellProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function MetricCell({ label, value, highlight }: MetricCellProps) {
  return (
    <div
      style={{
        background: '#e0e5ec',
        boxShadow: highlight
          ? 'inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff'
          : 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
        borderRadius: '10px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
      }}
    >
      <span style={{ fontSize: '10px', color: '#888', fontWeight: 500, letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: highlight ? '18px' : '15px',
          fontWeight: highlight ? 700 : 600,
          color: highlight ? '#4f46e5' : '#444',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

interface SectionTitleProps {
  children: React.ReactNode;
}

function SectionTitle({ children }: SectionTitleProps) {
  return (
    <p
      style={{
        margin: '0 0 8px 0',
        fontSize: '11px',
        fontWeight: 600,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CapabilityPanel = React.memo(function CapabilityPanel({ indices }: CapabilityPanelProps) {
  const cpkColor = getCpkColor(indices.cpk);

  return (
    <div
      style={{
        background: '#e0e5ec',
        boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* ── Traffic light semaphore ── */}
      <div
        style={{
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...TRAFFIC_STYLES[cpkColor],
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '11px', opacity: 0.85 }}>Cpk</p>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 800, lineHeight: 1.1 }}>
            {fmt(indices.cpk)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            {TRAFFIC_LABEL[cpkColor]}
          </p>
          <p style={{ margin: 0, fontSize: '11px', opacity: 0.85 }}>
            {cpkColor === 'green' && 'Cpk ≥ 1.33'}
            {cpkColor === 'yellow' && '1.00 ≤ Cpk < 1.33'}
            {cpkColor === 'red' && 'Cpk < 1.00'}
          </p>
        </div>
      </div>

      {/* ── Capability indices ── */}
      <div>
        <SectionTitle>Índices de capacidad</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          <MetricCell label="Cp" value={fmt(indices.cp)} />
          <MetricCell label="Cpk" value={fmt(indices.cpk)} highlight />
          <MetricCell label="Pp" value={fmt(indices.pp)} />
          <MetricCell label="Ppk" value={fmt(indices.ppk)} />
        </div>
      </div>

      {/* ── Sigma values ── */}
      <div>
        <SectionTitle>Sigma</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <MetricCell label="σ Within" value={fmt(indices.sigmaWithin)} />
          <MetricCell label="σ Overall" value={fmt(indices.sigmaOverall)} />
        </div>
      </div>

      {/* ── PPM estimates ── */}
      <div>
        <SectionTitle>PPM estimadas</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <MetricCell label="< LSL" value={fmtPPM(indices.ppmBelowLSL)} />
          <MetricCell label="> USL" value={fmtPPM(indices.ppmAboveUSL)} />
          <MetricCell label="Total" value={fmtPPM(indices.ppmTotal)} />
        </div>
      </div>

      {/* ── Descriptive statistics ── */}
      <div>
        <SectionTitle>Estadísticas</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          <MetricCell label="Media" value={fmt(indices.mean)} />
          <MetricCell label="Desv. Est." value={fmt(indices.stdDev)} />
          <MetricCell label="n" value={String(indices.n)} />
          <MetricCell label="Mínimo" value={fmt(indices.min)} />
          <MetricCell label="Máximo" value={fmt(indices.max)} />
          <MetricCell label="Rango" value={fmt(indices.max - indices.min)} />
        </div>
      </div>
    </div>
  );
});

export default CapabilityPanel;
