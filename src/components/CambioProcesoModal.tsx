'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { createCambioProceso, type TipoCambio } from '@/app/dashboard/configuracion/cambios-actions';

// ============================================================
// Tipos
// ============================================================

interface CambioProcesoModalProps {
  maquinaId: string;
  onClose: () => void;
  onSaved: () => void;
}

const TIPO_OPTIONS: { value: TipoCambio; label: string }[] = [
  { value: 'herramental', label: 'Herramental' },
  { value: 'material', label: 'Material' },
  { value: 'operador', label: 'Operador' },
  { value: 'ajuste_maquina', label: 'Ajuste de máquina' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro', label: 'Otro' },
];

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    'T' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes())
  );
}

// ============================================================
// Componente
// ============================================================

export default function CambioProcesoModal({
  maquinaId,
  onClose,
  onSaved,
}: CambioProcesoModalProps) {
  const [tipo, setTipo] = useState<TipoCambio>('herramental');
  const [descripcion, setDescripcion] = useState('');
  const [fechaLocal, setFechaLocal] = useState(toLocalDatetimeValue(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError('La descripción es requerida.');
      return;
    }

    setLoading(true);
    setError(null);

    const fechaISO = new Date(fechaLocal).toISOString();

    const result = await createCambioProceso({
      maquina_id: maquinaId,
      tipo,
      descripcion: descripcion.trim(),
      fecha: fechaISO,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full max-w-md mx-4 bg-[#e0e5ec] rounded-[24px]',
          'shadow-[8px_8px_24px_#b8bec7,_-8px_-8px_24px_#ffffff]',
          'flex flex-col overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-700">
            Registrar cambio de proceso
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-full text-gray-500',
              'bg-[#e0e5ec]',
              'shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff]',
              'active:shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]',
              'transition-shadow duration-150'
            )}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 flex flex-col gap-5">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Tipo de cambio
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoCambio)}
              className={cn(
                'w-full bg-[#e0e5ec] rounded-[14px] px-4 py-2.5',
                'text-sm text-gray-700',
                'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
                'outline-none focus:ring-2 focus:ring-[#1565C0]/20',
                'transition-shadow duration-150 cursor-pointer appearance-none'
              )}
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Descripción <span className="text-red-400 normal-case font-normal">(requerido)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Describe brevemente el cambio realizado..."
              required
              className={cn(
                'w-full bg-[#e0e5ec] rounded-[14px] px-4 py-3',
                'text-sm text-gray-700 placeholder-gray-400 resize-none',
                'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
                'outline-none focus:ring-2 focus:ring-[#1565C0]/20',
                'transition-shadow duration-150'
              )}
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fecha del cambio <span className="text-gray-400 normal-case font-normal">(opcional, default: ahora)</span>
            </label>
            <input
              type="datetime-local"
              value={fechaLocal}
              onChange={(e) => setFechaLocal(e.target.value)}
              className={cn(
                'w-full bg-[#e0e5ec] rounded-[14px] px-4 py-2.5',
                'text-sm text-gray-700',
                'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
                'outline-none focus:ring-2 focus:ring-[#1565C0]/20',
                'transition-shadow duration-150 cursor-pointer'
              )}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-4 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={cn(
                'flex-1 py-2.5 rounded-[14px] text-sm font-medium text-gray-600',
                'bg-[#e0e5ec]',
                'shadow-[5px_5px_10px_#b8bec7,_-5px_-5px_10px_#ffffff]',
                'active:shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]',
                'transition-shadow duration-150',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1 py-2.5 rounded-[14px] text-sm font-semibold text-white',
                'bg-[#1565C0]',
                'shadow-[5px_5px_10px_#0d4a8f,_-5px_-5px_10px_#1d80f1]',
                'active:shadow-[inset_3px_3px_6px_#0d4a8f,_inset_-3px_-3px_6px_#1d80f1]',
                'transition-shadow duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {loading ? 'Guardando...' : 'Registrar cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
