'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';
import NeuDatePicker from '@/components/ui/NeuDatePicker';
import type { Pieza } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maquinaId: string;
  piezas: Pieza[];
  onSuccess: () => void;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface RecalcResult {
  anterior: {
    ucl: number | null;
    cl: number | null;
    lcl: number | null;
    cp: number | null;
    cpk: number | null;
  };
  nuevo: {
    ucl: number;
    cl: number;
    lcl: number;
    cp: number | null;
    cpk: number | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RecalcDelta — shows before → after for a single metric
// ─────────────────────────────────────────────────────────────────────────────

function RecalcDelta({
  before,
  after,
}: {
  before: number | null;
  after: number | null;
}) {
  const fmt = (v: number | null) => (v !== null ? v.toFixed(3) : '—');
  const changed =
    before !== null && after !== null && Math.abs(before - after) > 0.0001;
  const increased =
    changed && after !== null && before !== null && after > before;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
      <span className="text-gray-400">{fmt(before)}</span>
      <span className="text-gray-300 mx-0.5">→</span>
      <span
        style={{
          color: !changed ? '#6b7280' : increased ? '#F44336' : '#4CAF50',
          fontWeight: changed ? 600 : 400,
        }}
      >
        {fmt(after)}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RecalcularModal
// ─────────────────────────────────────────────────────────────────────────────

export default function RecalcularModal({
  isOpen,
  onClose,
  maquinaId,
  piezas,
  onSuccess,
}: Props) {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '',
    endDate: '',
  });
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [usl, setUsl] = useState('');
  const [lsl, setLsl] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RecalcResult | null>(null);

  if (!isOpen) return null;

  const toggleExcluido = (id: string) => {
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRecalcular = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Debes seleccionar un rango de fechas.');
      return;
    }

    setError('');
    setLoading(true);
    setResult(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('No hay sesión activa. Recarga la página.');
        setLoading(false);
        return;
      }

      const body: Record<string, unknown> = {
        maquina_id: maquinaId,
        fecha_inicio: `${dateRange.startDate}T00:00:00.000Z`,
        fecha_fin: `${dateRange.endDate}T23:59:59.999Z`,
        puntos_excluidos: Array.from(excluidos),
        usl: usl !== '' ? parseFloat(usl) : null,
        lsl: lsl !== '' ? parseFloat(lsl) : null,
      };
      if (notas.trim()) body.notas = notas.trim();

      const res = await fetch('/api/spc/recalcular', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Error desconocido al recalcular.');
        setLoading(false);
        return;
      }

      setResult(json as RecalcResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red al recalcular.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) {
      onSuccess();
    }
    onClose();
    // Reset state for next open
    setDateRange({ startDate: '', endDate: '' });
    setExcluidos(new Set());
    setUsl('');
    setLsl('');
    setNotas('');
    setError('');
    setResult(null);
  };

  const piezasConValor = piezas.filter((p) => p.valor_medido !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recalc-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={() => { if (!loading) handleClose(); }}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#e0e5ec] rounded-[24px] shadow-[8px_8px_24px_#b8bec7,-8px_-8px_24px_#ffffff] p-6 flex flex-col gap-5">
        {/* Header */}
        <div>
          <h2
            id="recalc-modal-title"
            className="text-lg font-semibold text-gray-800"
          >
            Recalcular límites SPC
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona el rango de mediciones y los parámetros opcionales para
            recalcular los límites de control.
          </p>
        </div>

        {/* ── Rango de fechas ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Rango de fechas
          </p>
          <NeuDatePicker value={dateRange} onChange={setDateRange} />
        </div>

        {/* ── Puntos a excluir ────────────────────────────────────── */}
        {piezasConValor.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Excluir puntos ({excluidos.size} seleccionados)
            </p>
            <div
              className="rounded-[16px] overflow-y-auto max-h-40"
              style={{
                boxShadow:
                  'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
              }}
            >
              {piezasConValor.map((pieza) => (
                <label
                  key={pieza.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={excluidos.has(pieza.id)}
                    onChange={() => toggleExcluido(pieza.id)}
                    className="w-4 h-4 accent-[#1565C0] cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 tabular-nums">
                    {formatTimestamp(pieza.hora_inspeccion)}
                  </span>
                  <span
                    className="ml-auto text-sm font-semibold text-gray-600 tabular-nums"
                  >
                    {pieza.valor_medido?.toFixed(3)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── USL / LSL ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              USL (opcional)
            </label>
            <NeuInput
              type="number"
              step="any"
              placeholder="Límite superior"
              value={usl}
              onChange={(e) => setUsl(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              LSL (opcional)
            </label>
            <NeuInput
              type="number"
              step="any"
              placeholder="Límite inferior"
              value={lsl}
              onChange={(e) => setLsl(e.target.value)}
            />
          </div>
        </div>

        {/* ── Notas ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Notas (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Motivo del recálculo, observaciones…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 w-full text-gray-700 placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150 resize-none"
            style={{
              boxShadow:
                'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
            }}
          />
        </div>

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <div className="bg-[#F44336]/10 border border-[#F44336]/30 rounded-[12px] px-4 py-3">
            <p className="text-sm text-[#C62828]">{error}</p>
          </div>
        )}

        {/* ── Resultado comparativa ────────────────────────────────── */}
        {result && (
          <NeuCard className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Comparativa anterior → nuevo
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">UCL</span>
                <RecalcDelta before={result.anterior.ucl} after={result.nuevo.ucl} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">LCL</span>
                <RecalcDelta before={result.anterior.lcl} after={result.nuevo.lcl} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">CL</span>
                <RecalcDelta before={result.anterior.cl} after={result.nuevo.cl} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Cp</span>
                <RecalcDelta before={result.anterior.cp} after={result.nuevo.cp} />
              </div>
              <div className="flex justify-between items-center col-span-2">
                <span className="text-gray-500 font-medium">Cpk</span>
                <RecalcDelta before={result.anterior.cpk} after={result.nuevo.cpk} />
              </div>
            </div>
            <p className="text-xs text-[#4CAF50] font-medium mt-3">
              ✓ Límites actualizados correctamente. Las gráficas se refrescarán al cerrar.
            </p>
          </NeuCard>
        )}

        {/* ── Acciones ────────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-1">
          <NeuButton
            variant="default"
            onClick={handleClose}
            disabled={loading}
          >
            {result ? 'Cerrar y refrescar' : 'Cancelar'}
          </NeuButton>
          {!result && (
            <NeuButton
              variant="primary"
              onClick={handleRecalcular}
              disabled={loading || !dateRange.startDate || !dateRange.endDate}
            >
              {loading ? 'Calculando…' : 'Recalcular'}
            </NeuButton>
          )}
        </div>
      </div>
    </div>
  );
}
