'use client';

import { useState, useMemo } from 'react';
import NeuCard from '@/components/ui/NeuCard';
import NeuDatePicker from '@/components/ui/NeuDatePicker';
import { Pieza } from '@/types';
import { formatDateTime, formatDuration } from '@/lib/utils/formatters';

// ---------------------------------------------------------------------------
// Gear SVG icon — blue (#1565C0)
// ---------------------------------------------------------------------------
function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1565C0"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Search icon SVG
// ---------------------------------------------------------------------------
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status dot + label
// ---------------------------------------------------------------------------
function StatusDot({ estado }: { estado: Pieza['estado'] }) {
  const isOk = estado === 'ok';
  return (
    <span
      className={[
        'flex-shrink-0 w-3.5 h-3.5 rounded-full border-2',
        isOk
          ? 'bg-[#4CAF50] border-[#2E7D32]'
          : 'bg-[#F44336] border-[#C62828]',
      ].join(' ')}
      aria-label={isOk ? 'OK' : 'No OK'}
    />
  );
}

// ---------------------------------------------------------------------------
// Expanded detail panel (inline)
// ---------------------------------------------------------------------------
function PiezaDetail({ pieza }: { pieza: Pieza }) {
  const isOk = pieza.estado === 'ok';

  return (
    <div className="mt-3 pt-3 border-t border-[#d0d5de] grid grid-cols-3 gap-3">
      {/* Hora */}
      <div className="bg-[#e0e5ec] rounded-[12px] px-3 py-2 shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
          Hora
        </p>
        <p className="text-xs font-bold text-gray-700 leading-tight">
          {formatDateTime(pieza.hora_inspeccion)}
        </p>
      </div>

      {/* Estado */}
      <div className="bg-[#e0e5ec] rounded-[12px] px-3 py-2 shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
          Estado
        </p>
        <p
          className={[
            'text-xs font-bold leading-tight',
            isOk ? 'text-[#2E7D32]' : 'text-[#C62828]',
          ].join(' ')}
        >
          {isOk ? 'OK' : 'No OK'}
        </p>
      </div>

      {/* Tiempo de ciclo */}
      <div className="bg-[#e0e5ec] rounded-[12px] px-3 py-2 shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
          Ciclo
        </p>
        <p className="text-xs font-bold text-gray-700 leading-tight">
          {pieza.tiempo_ciclo != null
            ? formatDuration(pieza.tiempo_ciclo)
            : '—'}
        </p>
      </div>

      {/* Fuera de control */}
      {pieza.fuera_de_control && pieza.regla_violada && (
        <div className="col-span-3 bg-[#F44336]/10 rounded-[12px] px-3 py-2">
          <p className="text-[10px] text-[#C62828] font-semibold uppercase tracking-wide mb-0.5">
            Fuera de control
          </p>
          <p className="text-xs text-[#C62828]">{pieza.regla_violada}</p>
        </div>
      )}

      {/* Observaciones */}
      {pieza.observaciones && (
        <div className="col-span-3 bg-[#e0e5ec] rounded-[12px] px-3 py-2 shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
            Observaciones
          </p>
          <p className="text-xs text-gray-600">{pieza.observaciones}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single piece row card
// ---------------------------------------------------------------------------
interface PiezaRowProps {
  pieza: Pieza;
  isExpanded: boolean;
  onToggle: () => void;
}

function PiezaRow({ pieza, isExpanded, onToggle }: PiezaRowProps) {
  const isOk = pieza.estado === 'ok';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left focus:outline-none group"
      aria-expanded={isExpanded}
    >
      <NeuCard
        className={[
          'px-4 py-3 transition-shadow duration-200',
          isExpanded
            ? 'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]'
            : 'hover:shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] group-focus-visible:ring-2 group-focus-visible:ring-[#1565C0]/50',
        ].join(' ')}
      >
        {/* Row summary */}
        <div className="flex items-center gap-3">
          {/* Gear icon container */}
          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#e0e5ec] rounded-[12px] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]">
            <GearIcon className="w-5 h-5" />
          </div>

          {/* Piece code */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">
              {pieza.codigo_pieza}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(pieza.hora_inspeccion).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </p>
          </div>

          {/* Status badge */}
          <span
            className={[
              'flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full',
              isOk
                ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
                : 'bg-[#F44336]/15 text-[#C62828]',
            ].join(' ')}
          >
            {isOk ? 'OK' : 'No OK'}
          </span>

          {/* Status dot */}
          <StatusDot estado={pieza.estado} />

          {/* Chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={[
              'flex-shrink-0 text-gray-400 transition-transform duration-200',
              isExpanded ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Expanded detail */}
        {isExpanded && <PiezaDetail pieza={pieza} />}
      </NeuCard>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[20px] shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff]">
        <GearIcon className="w-9 h-9 opacity-40" />
      </div>
      <p className="text-gray-500 text-sm font-medium text-center">
        {hasFilters
          ? 'No hay piezas que coincidan con los filtros aplicados.'
          : 'No hay piezas registradas para esta máquina.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PiezasClientView
// ---------------------------------------------------------------------------
export interface PiezasClientViewProps {
  piezas: Pieza[];
  maquinaNombre: string;
}

export default function PiezasClientView({
  piezas,
  maquinaNombre,
}: PiezasClientViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Filter logic
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    let result = piezas;

    // Search by piece code
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) =>
        p.codigo_pieza.toLowerCase().includes(q)
      );
    }

    // Filter by date range
    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(
        (p) => new Date(p.hora_inspeccion) >= start
      );
    }
    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(
        (p) => new Date(p.hora_inspeccion) <= end
      );
    }

    return result;
  }, [piezas, searchQuery, dateRange]);

  const hasFilters =
    searchQuery.trim() !== '' ||
    dateRange.startDate !== '' ||
    dateRange.endDate !== '';

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-3 mb-2">
        {/* Title */}
        <h1 className="flex-1 text-xl font-bold text-gray-800 leading-tight truncate">
          Piezas de {maquinaNombre}
        </h1>

        {/* Calendar / Date picker */}
        <NeuDatePicker value={dateRange} onChange={setDateRange} />

        {/* Search button */}
        <button
          type="button"
          onClick={() => {
            setShowSearch((prev) => !prev);
            if (showSearch) setSearchQuery('');
          }}
          className={[
            'flex items-center justify-center w-10 h-10 bg-[#e0e5ec] rounded-[12px]',
            'transition-shadow duration-150',
            showSearch
              ? 'shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] text-[#1565C0]'
              : 'shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff] text-gray-500',
          ].join(' ')}
          aria-label="Buscar por código"
          aria-expanded={showSearch}
        >
          <SearchIcon className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Search input (visible when toggled) */}
      {showSearch && (
        <div className="mb-5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar código de pieza…"
            autoFocus
            className="w-full bg-[#e0e5ec] rounded-[12px] px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150"
          />
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-gray-400 mb-4 font-medium">
        {filtered.length}{' '}
        {filtered.length === 1 ? 'pieza encontrada' : 'piezas encontradas'}
        {hasFilters && ' (con filtros aplicados)'}
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Pieces list                                                        */}
      {/* ----------------------------------------------------------------- */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((pieza) => (
            <PiezaRow
              key={pieza.id}
              pieza={pieza}
              isExpanded={expandedId === pieza.id}
              onToggle={() => handleToggle(pieza.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
