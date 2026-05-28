'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import NeuCard from '@/components/ui/NeuCard';
import NeuDatePicker from '@/components/ui/NeuDatePicker';
import DoughnutChart from '@/components/charts/DoughnutChart';
import BarChart, { HourlyData } from '@/components/charts/BarChart';
import { Linea, Maquina } from '@/types';

// ---------------------------------------------------------------------------
// Neuomorphic <select>
// ---------------------------------------------------------------------------

interface NeuSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  options: { id: string; label: string }[];
}

function NeuSelect({ value, onChange, disabled, placeholder, options }: NeuSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={[
        'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 text-sm text-gray-700',
        'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
        'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
        'appearance-none cursor-pointer pr-8',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------------------
// Stat Card horizontal
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <NeuCard className="flex items-center gap-4 px-6 py-5">
      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-[#e0e5ec] rounded-[14px] shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-800 leading-tight">{value}</p>
      </div>
    </NeuCard>
  );
}

// ---------------------------------------------------------------------------
// Line icon
// ---------------------------------------------------------------------------

function LineaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function MaquinaIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EstadisticasViewProps {
  lineas: Linea[];
  maquinas: Maquina[];
  totalOk: number;
  totalNoOk: number;
  hourlyData: HourlyData[];
  totalLineasActivas: number;
  totalMaquinasActivas: number;
  filters: {
    lineaId: string;
    maquinaId: string;
    startDate: string;
    endDate: string;
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EstadisticasView({
  lineas,
  maquinas,
  totalOk,
  totalNoOk,
  hourlyData,
  totalLineasActivas,
  totalMaquinasActivas,
  filters,
}: EstadisticasViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function handleLineaChange(lineaId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (lineaId) {
      params.set('linea', lineaId);
    } else {
      params.delete('linea');
    }
    // reset maquina when linea changes
    params.delete('maquina');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function handleMaquinaChange(maquinaId: string) {
    updateParam('maquina', maquinaId);
  }

  function handleDateChange({ startDate, endDate }: { startDate: string; endDate: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set('start_date', startDate); else params.delete('start_date');
    if (endDate) params.set('end_date', endDate); else params.delete('end_date');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  const lineasOptions = lineas.map((l) => ({ id: l.id, label: l.nombre }));

  // only show maquinas from the selected linea
  const maquinasFiltered = filters.lineaId
    ? maquinas.filter((m) => m.linea_id === filters.lineaId)
    : maquinas;
  const maquinasOptions = maquinasFiltered.map((m) => ({ id: m.id, label: m.nombre }));

  const hasData = totalOk + totalNoOk > 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Estadísticas Generales</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Resumen de inspecciones y calidad por período
        </p>
      </div>

      {/* Filters row */}
      <NeuCard className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Línea
            </label>
            <NeuSelect
              value={filters.lineaId}
              onChange={handleLineaChange}
              placeholder="Todas las líneas"
              options={lineasOptions}
            />
          </div>

          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Máquina
            </label>
            <NeuSelect
              value={filters.maquinaId}
              onChange={handleMaquinaChange}
              placeholder="Todas las máquinas"
              options={maquinasOptions}
              disabled={maquinasFiltered.length === 0 && !filters.lineaId}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Período
            </label>
            <NeuDatePicker
              value={{ startDate: filters.startDate, endDate: filters.endDate }}
              onChange={handleDateChange}
            />
          </div>

          {/* Clear filters */}
          {(filters.lineaId || filters.maquinaId || filters.startDate || filters.endDate) && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-transparent uppercase tracking-wide select-none">
                &nbsp;
              </label>
              <button
                type="button"
                onClick={() => {
                  startTransition(() => {
                    router.replace(pathname);
                  });
                }}
                className="text-xs text-gray-500 bg-[#e0e5ec] rounded-[12px] px-4 py-2.5 shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff] active:shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] transition-shadow duration-150 font-medium"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </NeuCard>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard
          label="Líneas activas"
          value={totalLineasActivas}
          icon={<LineaIcon />}
        />
        <StatCard
          label="Máquinas activas"
          value={totalMaquinasActivas}
          icon={<MaquinaIcon />}
        />
      </div>

      {/* Charts */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doughnut */}
          <NeuCard className="p-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Distribución OK / No OK
            </h2>
            <DoughnutChart ok={totalOk} noOk={totalNoOk} />
          </NeuCard>

          {/* Bar chart */}
          <NeuCard className="p-6">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">
              Inspecciones por hora
            </h2>
            {hourlyData.length > 0 ? (
              <BarChart data={hourlyData} />
            ) : (
              <div className="flex items-center justify-center h-[220px]">
                <p className="text-gray-400 text-sm">Sin datos por hora disponibles</p>
              </div>
            )}
          </NeuCard>
        </div>
      ) : (
        <NeuCard className="p-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[16px] shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-8 h-8 opacity-30" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <circle cx="9" cy="15" r="1" fill="#374151" />
              <circle cx="14" cy="10" r="1" fill="#374151" />
              <circle cx="18" cy="7" r="1" fill="#374151" />
            </svg>
          </div>
          <p className="text-gray-500 text-base font-medium">
            No hay inspecciones en el período seleccionado
          </p>
          <p className="text-gray-400 text-sm">
            Ajusta los filtros o amplía el rango de fechas
          </p>
        </NeuCard>
      )}
    </div>
  );
}
