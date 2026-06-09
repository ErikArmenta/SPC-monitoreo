'use client';

// ============================================================
// ConfiguracionClientView — Lista de configuraciones SPC
// Tabla neumórfica responsive + filtros + ordenamiento
// ============================================================

import { useState, useMemo, useTransition, Fragment } from 'react';
import SPCConfigForm from './SPCConfigForm';
import CaracteristicasSection from './CaracteristicasSection';
import { deleteSPCConfig } from './actions';
import type { MaquinaConConfig } from './actions';
import type { SPCConfig } from '@/types';
import { exportToCSV } from '@/lib/utils/export';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SortKey =
  | 'linea'
  | 'maquina'
  | 'estado'
  | 'tipo_grafico'
  | 'tamano_subgrupo'
  | 'cp'
  | 'cpk'
  | 'updated_at';

type SortDir = 'asc' | 'desc';

type EstadoFilter = 'todas' | 'configuradas' | 'sin_configurar';

interface Props {
  configs: MaquinaConConfig[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPO_GRAFICO_LABELS: Record<string, string> = {
  i_mr: 'I-MR',
  xbar_r: 'X̄-R',
  xbar_s: 'X̄-S',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number | null | undefined, decimals = 3): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getConfig(m: MaquinaConConfig): SPCConfig | null {
  return m.spc_config && m.spc_config.length > 0 ? m.spc_config[0] : null;
}

function cpkColor(cpk: number | null): string {
  if (cpk === null) return 'text-gray-400';
  if (cpk >= 1.33) return 'text-[#2E7D32]';
  if (cpk >= 1.0) return 'text-[#F57C00]';
  return 'text-[#C62828]';
}

function cpkBg(cpk: number | null): string {
  if (cpk === null) return '';
  if (cpk >= 1.33) return 'bg-[#4CAF50]/10 ring-1 ring-[#4CAF50]/30';
  if (cpk >= 1.0) return 'bg-[#FF9800]/10 ring-1 ring-[#FF9800]/30';
  return 'bg-[#F44336]/10 ring-1 ring-[#F44336]/30';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function EstadoBadge({ configurada }: { configurada: boolean }) {
  if (configurada) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4CAF50]/15 text-[#2E7D32] ring-1 ring-[#4CAF50]/30">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
        Configurada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F44336]/15 text-[#C62828] ring-1 ring-[#F44336]/30">
      <span className="w-1.5 h-1.5 rounded-full bg-[#F44336]" />
      Sin configurar
    </span>
  );
}

function CpkBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cpkColor(value)} ${cpkBg(value)}`}
    >
      {fmtNum(value, 2)}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ml-1 flex-shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
    >
      {dir === 'asc' || !active ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}

function NeuSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#e0e5ec] rounded-[12px] px-3 py-2 pr-8 text-sm text-gray-700 w-full
          shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]
          outline-none focus:ring-2 focus:ring-[#1565C0]/20 appearance-none cursor-pointer transition-shadow"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function NeuSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar...'}
        className="bg-[#e0e5ec] rounded-[12px] pl-9 pr-4 py-2 text-sm text-gray-700 w-full
          shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]
          outline-none focus:ring-2 focus:ring-[#1565C0]/20 placeholder:text-gray-400 transition-shadow"
      />
    </div>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileCard({
  maquina,
  onEdit,
  onDelete,
  isDeleting,
  onToggleCaracteristicas,
  isExpanded,
}: {
  maquina: MaquinaConConfig;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onToggleCaracteristicas: () => void;
  isExpanded: boolean;
}) {
  const config = getConfig(maquina);
  const configurada = config !== null;

  return (
    <div
      className="bg-[#e0e5ec] rounded-[20px] p-4 space-y-3"
      style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-gray-400 font-medium">{maquina.lineas.nombre}</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5">{maquina.nombre}</p>
        </div>
        <EstadoBadge configurada={configurada} />
      </div>

      {/* Config data */}
      {configurada && config && (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-[#e0e5ec] rounded-[10px] px-3 py-2" style={{ boxShadow: 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff' }}>
              <p className="text-gray-400 mb-0.5">Tipo gráfico</p>
              <p className="font-semibold text-gray-700">{TIPO_GRAFICO_LABELS[config.tipo_grafico] ?? config.tipo_grafico}</p>
            </div>
            <div className="bg-[#e0e5ec] rounded-[10px] px-3 py-2" style={{ boxShadow: 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff' }}>
              <p className="text-gray-400 mb-0.5">Subgrupo</p>
              <p className="font-semibold text-gray-700">{config.tamano_subgrupo}</p>
            </div>
            <div className="bg-[#e0e5ec] rounded-[10px] px-3 py-2" style={{ boxShadow: 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff' }}>
              <p className="text-gray-400 mb-0.5">UCL / CL / LCL</p>
              <p className="font-semibold text-gray-700 text-[11px] leading-tight">
                {fmtNum(config.ucl, 2)} / {fmtNum(config.cl, 2)} / {fmtNum(config.lcl, 2)}
              </p>
            </div>
            <div className="bg-[#e0e5ec] rounded-[10px] px-3 py-2" style={{ boxShadow: 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff' }}>
              <p className="text-gray-400 mb-0.5">USL / LSL</p>
              <p className="font-semibold text-gray-700 text-[11px] leading-tight">
                {fmtNum(config.usl, 2)} / {fmtNum(config.lsl, 2)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="text-gray-400">Cp: </span>
                <CpkBadge value={config.cp} />
              </div>
              <div className="text-xs">
                <span className="text-gray-400">Cpk: </span>
                <CpkBadge value={config.cpk} />
              </div>
            </div>
            <p className="text-xs text-gray-400">{fmtDate(config.updated_at)}</p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          onClick={onEdit}
          className="flex-1 text-xs py-2 rounded-[12px] bg-[#e0e5ec] font-medium text-[#1565C0]
            shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
            hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] transition-shadow"
        >
          {configurada ? 'Editar' : 'Configurar'}
        </button>
        <button
          onClick={onToggleCaracteristicas}
          className={`text-xs px-3 py-2 rounded-[12px] bg-[#e0e5ec] font-medium transition-shadow
            ${isExpanded
              ? 'text-[#1565C0] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]'
              : 'text-gray-600 shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]'
            }`}
        >
          Características
        </button>
        {configurada && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="text-xs px-4 py-2 rounded-[12px] bg-[#e0e5ec] font-medium text-[#C62828]
              shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
              hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]
              disabled:opacity-50 transition-shadow"
          >
            {isDeleting ? '...' : 'Eliminar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracionClientView({ configs }: Props) {
  // ── Filtros y ordenamiento ─────────────────────────────────────
  const [search, setSearch] = useState('');
  const [lineaFilter, setLineaFilter] = useState('todas');
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>('todas');
  const [sortKey, setSortKey] = useState<SortKey>('linea');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Modal ──────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingConfig, setEditingConfig] = useState<SPCConfig | null>(null);

  // ── Panel expansible de características ───────────────────────
  const [expandedMaquinaId, setExpandedMaquinaId] = useState<string | null>(null);

  // ── Eliminar directo ──────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  // ── Líneas únicas para el filtro ───────────────────────────────
  const lineas = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; nombre: string }[] = [];
    for (const m of configs) {
      if (!seen.has(m.lineas.nombre)) {
        seen.add(m.lineas.nombre);
        result.push({ id: m.lineas.nombre, nombre: m.lineas.nombre });
      }
    }
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [configs]);

  // ── Máquinas sin config (para SPCConfigForm en modo create) ───
  const maquinasSinConfig = useMemo(
    () => configs.filter((m) => !m.spc_config || m.spc_config.length === 0),
    [configs]
  );

  // ── Filtrado ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...configs];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.lineas.nombre.toLowerCase().includes(q)
      );
    }

    if (lineaFilter !== 'todas') {
      list = list.filter((m) => m.lineas.nombre === lineaFilter);
    }

    if (estadoFilter === 'configuradas') {
      list = list.filter((m) => m.spc_config && m.spc_config.length > 0);
    } else if (estadoFilter === 'sin_configurar') {
      list = list.filter((m) => !m.spc_config || m.spc_config.length === 0);
    }

    return list;
  }, [configs, search, lineaFilter, estadoFilter]);

  // ── Ordenamiento ───────────────────────────────────────────────
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const configA = getConfig(a);
      const configB = getConfig(b);
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortKey) {
        case 'linea':
          valA = a.lineas.nombre;
          valB = b.lineas.nombre;
          break;
        case 'maquina':
          valA = a.nombre;
          valB = b.nombre;
          break;
        case 'estado':
          valA = configA ? 1 : 0;
          valB = configB ? 1 : 0;
          break;
        case 'tipo_grafico':
          valA = configA?.tipo_grafico ?? '';
          valB = configB?.tipo_grafico ?? '';
          break;
        case 'tamano_subgrupo':
          valA = configA?.tamano_subgrupo ?? 0;
          valB = configB?.tamano_subgrupo ?? 0;
          break;
        case 'cp':
          valA = configA?.cp ?? -Infinity;
          valB = configB?.cp ?? -Infinity;
          break;
        case 'cpk':
          valA = configA?.cpk ?? -Infinity;
          valB = configB?.cpk ?? -Infinity;
          break;
        case 'updated_at':
          valA = configA?.updated_at ?? '';
          valB = configB?.updated_at ?? '';
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      const numA = valA as number;
      const numB = valB as number;
      return sortDir === 'asc' ? numA - numB : numB - numA;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  // ── Handlers ───────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openCreate = () => {
    setEditingConfig(null);
    setFormMode('create');
  };

  const openEdit = (maquina: MaquinaConConfig) => {
    const config = getConfig(maquina);
    if (config) {
      setEditingConfig(config);
      setFormMode('edit');
    } else {
      // No tiene config — abrir en modo create pero pre-seleccionando la máquina
      // Se re-usa el form de create que ya tiene el dropdown
      setEditingConfig(null);
      setFormMode('create');
    }
  };

  const handleDeleteDirect = (maquinaId: string) => {
    setDeletingId(maquinaId);
    startDeleteTransition(async () => {
      await deleteSPCConfig(maquinaId);
      setDeletingId(null);
      window.location.reload();
    });
  };

  const handleFormSaved = () => {
    setFormMode(null);
    setEditingConfig(null);
    window.location.reload();
  };

  const handleFormClose = () => {
    setFormMode(null);
    setEditingConfig(null);
  };

  // ── Exportar CSV ───────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Línea',
      'Máquina',
      'Estado',
      'Tipo Gráfico',
      'UCL',
      'CL',
      'LCL',
      'USL',
      'LSL',
      'Target',
      'Tamaño Subgrupo',
      'Cp',
      'Cpk',
      'Última actualización',
    ];
    const rows = sorted.map((m) => {
      const c = getConfig(m);
      return [
        m.lineas.nombre,
        m.nombre,
        c ? 'Configurada' : 'Sin configurar',
        c ? (TIPO_GRAFICO_LABELS[c.tipo_grafico] ?? c.tipo_grafico) : '',
        c?.ucl ?? '',
        c?.cl ?? '',
        c?.lcl ?? '',
        c?.usl ?? '',
        c?.lsl ?? '',
        c?.target ?? '',
        c?.tamano_subgrupo ?? '',
        c?.cp ?? '',
        c?.cpk ?? '',
        c ? fmtDate(c.updated_at) : '',
      ];
    });
    const date = new Date().toISOString().slice(0, 10);
    exportToCSV(headers, rows, `configuracion-spc-${date}.csv`);
  };

  // ── Opciones de filtros ─────────────────────────────────────────
  const lineaOptions = [
    { id: 'todas', label: 'Todas las líneas' },
    ...lineas.map((l) => ({ id: l.id, label: l.nombre })),
  ];

  const estadoOptions = [
    { id: 'todas', label: 'Todos los estados' },
    { id: 'configuradas', label: 'Configuradas' },
    { id: 'sin_configurar', label: 'Sin configurar' },
  ];

  // ── Tabla: headers con sort ─────────────────────────────────────
  const headers: { key: SortKey; label: string; className?: string }[] = [
    { key: 'linea', label: 'Línea' },
    { key: 'maquina', label: 'Máquina' },
    { key: 'estado', label: 'Estado' },
    { key: 'tipo_grafico', label: 'Tipo Gráfico' },
    { key: 'tamano_subgrupo', label: 'Subgrupo', className: 'text-center' },
    { key: 'cp', label: 'Cp', className: 'text-center' },
    { key: 'cpk', label: 'Cpk', className: 'text-center' },
    { key: 'updated_at', label: 'Actualización' },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* ── Filtros y acciones ── */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Buscador */}
        <div className="w-full sm:w-56">
          <NeuSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar máquina..."
          />
        </div>

        {/* Filtro línea */}
        <div className="w-full sm:w-44">
          <NeuSelect
            value={lineaFilter}
            onChange={setLineaFilter}
            options={lineaOptions}
          />
        </div>

        {/* Filtro estado */}
        <div className="w-full sm:w-48">
          <NeuSelect
            value={estadoFilter}
            onChange={(v) => setEstadoFilter(v as EstadoFilter)}
            options={estadoOptions}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Botón exportar CSV */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-[12px] bg-[#e0e5ec] font-medium text-gray-600
            shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
            hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] transition-shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSV
        </button>

        {/* Botón Nueva Configuración */}
        <button
          onClick={openCreate}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-[12px] font-semibold text-white bg-[#1565C0]
            shadow-[4px_4px_8px_#0d4a8f,-4px_-4px_8px_#1d80f1]
            hover:bg-[#1976D2] active:shadow-[inset_2px_2px_5px_#0d4a8f] transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva Configuración
        </button>
      </div>

      {/* Contador de resultados */}
      <p className="text-xs text-gray-400 mb-3">
        {sorted.length} máquina{sorted.length !== 1 ? 's' : ''}
        {filtered.length !== configs.length && ` (de ${configs.length} totales)`}
      </p>

      {/* ── MOBILE: Tarjetas ── */}
      <div className="md:hidden space-y-4">
        {sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 rounded-[20px] bg-[#e0e5ec]"
            style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            <p className="text-sm text-gray-400 font-medium">Sin resultados</p>
          </div>
        ) : (
          sorted.map((maquina) => (
            <div key={maquina.id}>
              <MobileCard
                maquina={maquina}
                onEdit={() => openEdit(maquina)}
                onDelete={() => handleDeleteDirect(maquina.id)}
                isDeleting={deletingId === maquina.id}
                onToggleCaracteristicas={() =>
                  setExpandedMaquinaId((prev) => (prev === maquina.id ? null : maquina.id))
                }
                isExpanded={expandedMaquinaId === maquina.id}
              />
              {expandedMaquinaId === maquina.id && (
                <div className="mt-2">
                  <CaracteristicasSection
                    maquinaId={maquina.id}
                    maquinaNombre={maquina.nombre}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── DESKTOP: Tabla ── */}
      <div
        className="hidden md:block rounded-[20px] bg-[#e0e5ec] overflow-hidden"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead>
              <tr className="border-b border-[#c8cfd8]">
                {headers.map((h) => (
                  <th
                    key={h.key}
                    onClick={() => handleSort(h.key)}
                    className={`px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 transition-colors ${h.className ?? ''}`}
                  >
                    <span className="inline-flex items-center">
                      {h.label}
                      <SortIcon active={sortKey === h.key} dir={sortDir} />
                    </span>
                  </th>
                ))}
                {/* Columna UCL/CL/LCL */}
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  UCL / CL / LCL
                </th>
                {/* Columna USL/LSL */}
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  USL / LSL
                </th>
                {/* Características */}
                <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Caract.
                </th>
                {/* Acciones */}
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-[#d1d9e6]/60">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-sm text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                      </svg>
                      <span>Sin resultados para los filtros actuales</span>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((maquina) => {
                  const config = getConfig(maquina);
                  const configurada = config !== null;

                  const isExpanded = expandedMaquinaId === maquina.id;

                  return (
                    <Fragment key={maquina.id}>
                    <tr
                      className="hover:bg-[#e8edf4] transition-colors duration-150"
                    >
                      {/* Línea */}
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                        {maquina.lineas.nombre}
                      </td>

                      {/* Máquina */}
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {maquina.nombre}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <EstadoBadge configurada={configurada} />
                      </td>

                      {/* Tipo Gráfico */}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {config
                          ? TIPO_GRAFICO_LABELS[config.tipo_grafico] ?? config.tipo_grafico
                          : '—'}
                      </td>

                      {/* Subgrupo */}
                      <td className="px-4 py-3 text-xs text-center text-gray-600">
                        {config ? config.tamano_subgrupo : '—'}
                      </td>

                      {/* Cp */}
                      <td className="px-4 py-3 text-center">
                        <CpkBadge value={config?.cp ?? null} />
                      </td>

                      {/* Cpk */}
                      <td className="px-4 py-3 text-center">
                        <CpkBadge value={config?.cpk ?? null} />
                      </td>

                      {/* Actualización */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {config ? fmtDate(config.updated_at) : '—'}
                      </td>

                      {/* UCL / CL / LCL */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {config
                          ? `${fmtNum(config.ucl, 2)} / ${fmtNum(config.cl, 2)} / ${fmtNum(config.lcl, 2)}`
                          : '—'}
                      </td>

                      {/* USL / LSL */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {config
                          ? `${fmtNum(config.usl, 2)} / ${fmtNum(config.lsl, 2)}`
                          : '—'}
                      </td>

                      {/* Características toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() =>
                            setExpandedMaquinaId((prev) =>
                              prev === maquina.id ? null : maquina.id
                            )
                          }
                          title="Ver/ocultar características"
                          className={`text-xs px-2.5 py-1.5 rounded-[10px] bg-[#e0e5ec] font-medium transition-shadow
                            ${isExpanded
                              ? 'text-[#1565C0] shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]'
                              : 'text-gray-500 shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]'
                            }`}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(maquina)}
                            className="text-xs px-3 py-1.5 rounded-[10px] bg-[#e0e5ec] font-medium text-[#1565C0]
                              shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
                              hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] transition-shadow"
                          >
                            {configurada ? 'Editar' : 'Configurar'}
                          </button>
                          {configurada && (
                            <button
                              onClick={() => handleDeleteDirect(maquina.id)}
                              disabled={deletingId === maquina.id}
                              className="text-xs px-3 py-1.5 rounded-[10px] bg-[#e0e5ec] font-medium text-[#C62828]
                                shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
                                hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]
                                disabled:opacity-50 transition-shadow"
                            >
                              {deletingId === maquina.id ? '...' : 'Eliminar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Panel expansible de características */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={12} className="px-4 pb-4">
                          <CaracteristicasSection
                            maquinaId={maquina.id}
                            maquinaNombre={maquina.nombre}
                          />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal SPCConfigForm ── */}
      {formMode !== null && (
        <SPCConfigForm
          mode={formMode}
          config={editingConfig ?? undefined}
          maquinasSinConfig={maquinasSinConfig}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </>
  );
}
