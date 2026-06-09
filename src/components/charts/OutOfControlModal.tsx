'use client';

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { EstadoPieza } from '@/types';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface OutOfControlDetail {
  nombreInspector: string;
  horaInspeccion: string;
  valorMedido: number | null;
  estado: EstadoPieza;
  tiempoCiclo: number | null;
  reglaViolada: string | null;
  observaciones: string | null;
  valoresIndividuales: number[] | null;
}

export interface OutOfControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  detail: OutOfControlDetail | null;
}

// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatTiempoCiclo(segundos: number | null): string {
  if (segundos === null) return '—';
  return `${segundos.toFixed(2)}s`;
}

// ---------------------------------------------------------------------------
// Fila de detalle
// ---------------------------------------------------------------------------

function Row({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#d0d6df] last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className={cn('text-sm font-medium text-gray-700 text-right', valueClassName)}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function OutOfControlModal({ isOpen, onClose, detail }: OutOfControlModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !detail) return null;

  const estadoBadge =
    detail.estado === 'ok' ? (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(76,175,80,0.15)', color: '#2e7d32' }}
      >
        OK
      </span>
    ) : (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: 'rgba(244,67,54,0.15)', color: '#c62828' }}
      >
        No OK
      </span>
    );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Tarjeta neumórfica */}
      <div
        className="relative w-full max-w-sm rounded-[24px] p-6"
        style={{
          background: '#e0e5ec',
          boxShadow: '8px 8px 20px #b8bec7, -8px -8px 20px #ffffff',
        }}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Icono de alerta */}
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full"
              style={{
                background: 'rgba(244,67,54,0.12)',
                boxShadow: 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F44336"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <h3 className="text-base font-semibold text-gray-700">Fuera de Control</h3>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            style={{
              boxShadow: '3px 3px 6px #b8bec7, -3px -3px 6px #ffffff',
            }}
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Detalle */}
        <div
          className="rounded-[16px] px-4 py-1 mb-4"
          style={{
            boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
          }}
        >
          <Row label="Inspector" value={detail.nombreInspector} />
          <Row label="Hora inspección" value={formatHora(detail.horaInspeccion)} />
          <Row
            label="Promedio medido"
            value={
              detail.valorMedido !== null
                ? detail.valorMedido.toFixed(4)
                : '—'
            }
          />
          <Row label="Estado" value={estadoBadge} />
          <Row label="Tiempo de ciclo" value={formatTiempoCiclo(detail.tiempoCiclo)} />
          <Row
            label="Regla WE violada"
            value={detail.reglaViolada ?? '—'}
            valueClassName="text-red-600"
          />
          <Row
            label="Observaciones"
            value={detail.observaciones ?? '—'}
            valueClassName="text-gray-500 italic"
          />
        </div>

        {/* Desglose de mediciones individuales */}
        {detail.valoresIndividuales && detail.valoresIndividuales.length > 0 && (
          <div
            className="rounded-[12px] p-3 mb-4"
            style={{
              boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff',
            }}
          >
            <p className="text-xs font-semibold text-gray-500 mb-2">Desglose de mediciones</p>
            <ul className="space-y-0.5">
              {detail.valoresIndividuales.map((v, i) => (
                <li key={i} className="font-mono text-xs text-gray-600 flex justify-between">
                  <span>Medición {i + 1}:</span>
                  <span>{v.toFixed(4)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-[#d0d6df] mt-2 pt-2 font-mono text-xs flex justify-between">
              <span className="font-bold text-gray-700">Promedio:</span>
              <span className="font-bold text-gray-700">
                {(
                  detail.valoresIndividuales.reduce((a, b) => a + b, 0) /
                  detail.valoresIndividuales.length
                ).toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-[14px] text-sm font-semibold text-gray-600 transition-all duration-150 active:shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]"
          style={{
            boxShadow: '4px 4px 10px #b8bec7, -4px -4px 10px #ffffff',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
