'use client';

// ============================================================
// SPCConfigForm — Modal crear/editar configuración SPC
// Props: mode, config, maquinasSinConfig, onClose, onSaved
// ============================================================

import { useState, useTransition } from 'react';
import NeuInput from '@/components/ui/NeuInput';
import NeuButton from '@/components/ui/NeuButton';
import {
  createSPCConfig,
  updateSPCConfig,
  deleteSPCConfig,
  calculateLimitsFromData,
} from './actions';
import type { SPCConfig, TipoGrafico } from '@/types';
import type { MaquinaConConfig } from './actions';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ReglaWE {
  regla1: boolean;
  regla2: boolean;
  regla3: boolean;
  regla4: boolean;
}

interface Props {
  mode: 'create' | 'edit';
  config?: SPCConfig;
  initialMaquinaId?: string;
  maquinasSinConfig: MaquinaConConfig[];
  onClose: () => void;
  onSaved: () => void;
}

// ─── Descripciones de tipo de gráfico ─────────────────────────────────────────

const TIPO_GRAFICO_INFO: Record<TipoGrafico, { label: string; descripcion: string }> = {
  i_mr: {
    label: 'I-MR (Individuales y Rango Móvil)',
    descripcion: 'Para mediciones individuales (1 pieza a la vez)',
  },
  xbar_r: {
    label: 'X̄-R (Medias y Rangos)',
    descripcion: 'Para subgrupos de 2–10 piezas, usa rangos',
  },
  xbar_s: {
    label: 'X̄-S (Medias y Desviación)',
    descripcion: 'Para subgrupos de >10 piezas, usa desviación estándar',
  },
};

const REGLAS_INFO: { key: keyof ReglaWE; label: string; descripcion: string }[] = [
  {
    key: 'regla1',
    label: 'Regla 1',
    descripcion: '1 punto fuera de 3σ',
  },
  {
    key: 'regla2',
    label: 'Regla 2',
    descripcion: '2 de 3 puntos consecutivos fuera de 2σ',
  },
  {
    key: 'regla3',
    label: 'Regla 3',
    descripcion: '4 de 5 puntos consecutivos fuera de 1σ',
  },
  {
    key: 'regla4',
    label: 'Regla 4',
    descripcion: '8 puntos consecutivos del mismo lado de CL',
  },
];

// ─── Componentes internos ─────────────────────────────────────────────────────

function NeuSelect({
  value,
  onChange,
  disabled,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'bg-[#e0e5ec] rounded-[15px] px-4 py-2.5 w-full text-sm',
          'shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]',
          'outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150',
          'appearance-none cursor-pointer pr-10',
          value ? 'text-gray-700' : 'text-gray-400',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function NeuToggle({
  checked,
  onChange,
  label,
  descripcion,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  descripcion: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{descripcion}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          'relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200',
          checked
            ? 'bg-[#1565C0] shadow-[2px_2px_5px_#0d4a8f,_-2px_-2px_5px_#1d80f1]'
            : 'bg-[#e0e5ec] shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

function SectionCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#e0e5ec] rounded-[20px] p-5 shadow-[6px_6px_12px_#b8bec7,_-6px_-6px_12px_#ffffff]">
      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-1">{title}</h3>
      {note && (
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">{note}</p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseOptionalFloat(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '-') return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return String(n);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SPCConfigForm({
  mode,
  config,
  initialMaquinaId,
  maquinasSinConfig,
  onClose,
  onSaved,
}: Props) {
  // ── Estado del formulario ──────────────────────────────────────
  const [selectedMaquinaId, setSelectedMaquinaId] = useState(
    mode === 'edit' ? (config?.maquina_id ?? '') : (initialMaquinaId ?? '')
  );
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>(
    config?.tipo_grafico ?? 'i_mr'
  );
  const [tamanoSubgrupo, setTamanoSubgrupo] = useState(
    config?.tamano_subgrupo ?? 5
  );

  // Límites de especificación
  const [usl, setUsl] = useState(fmtNum(config?.usl));
  const [lsl, setLsl] = useState(fmtNum(config?.lsl));
  const [target, setTarget] = useState(fmtNum(config?.target));

  // Límites de control
  const [ucl, setUcl] = useState(fmtNum(config?.ucl));
  const [cl, setCl] = useState(fmtNum(config?.cl));
  const [lcl, setLcl] = useState(fmtNum(config?.lcl));

  // Reglas WE
  const [reglas, setReglas] = useState<ReglaWE>({
    regla1: config?.reglas_we?.regla1 ?? true,
    regla2: config?.reglas_we?.regla2 ?? true,
    regla3: config?.reglas_we?.regla3 ?? true,
    regla4: config?.reglas_we?.regla4 ?? true,
  });

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCalcPending, startCalcTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  // ── Efecto: fijar tamano_subgrupo en 1 si i_mr ────────────────
  const effectiveTamano = tipoGrafico === 'i_mr' ? 1 : tamanoSubgrupo;

  const handleTipoGraficoChange = (val: string) => {
    setTipoGrafico(val as TipoGrafico);
    if (val === 'i_mr') setTamanoSubgrupo(1);
    else if (tamanoSubgrupo === 1) setTamanoSubgrupo(5);
  };

  // ── Validación ────────────────────────────────────────────────
  function validate(): string | null {
    if (mode === 'create' && !selectedMaquinaId) {
      return 'Selecciona una máquina.';
    }
    const uslN = parseOptionalFloat(usl);
    const lslN = parseOptionalFloat(lsl);
    if (uslN !== null && lslN !== null && uslN <= lslN) {
      return 'USL debe ser mayor que LSL.';
    }
    if (tipoGrafico !== 'i_mr' && effectiveTamano < 2) {
      return 'El tamaño de subgrupo debe ser al menos 2.';
    }
    return null;
  }

  // ── Guardar ───────────────────────────────────────────────────
  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const payload = {
      maquina_id: mode === 'edit' ? (config?.maquina_id ?? '') : selectedMaquinaId,
      tipo_grafico: tipoGrafico,
      tamano_subgrupo: effectiveTamano,
      usl: parseOptionalFloat(usl),
      lsl: parseOptionalFloat(lsl),
      target: parseOptionalFloat(target),
      ucl: parseOptionalFloat(ucl),
      cl: parseOptionalFloat(cl),
      lcl: parseOptionalFloat(lcl),
      reglas_we: reglas,
      caracteristica_id: config?.caracteristica_id ?? null,
    };

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createSPCConfig(payload)
          : await updateSPCConfig({ ...payload, id: config?.id ?? '' });

      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  };

  // ── Calcular límites ──────────────────────────────────────────
  const handleCalculate = () => {
    const maquinaId =
      mode === 'edit' ? (config?.maquina_id ?? '') : selectedMaquinaId;

    if (!maquinaId) {
      setCalcError('Selecciona una máquina primero.');
      return;
    }
    setCalcError(null);

    startCalcTransition(async () => {
      const result = await calculateLimitsFromData(
        maquinaId,
        tipoGrafico,
        effectiveTamano,
        parseOptionalFloat(usl),
        parseOptionalFloat(lsl)
      );

      if (result.error) {
        setCalcError(result.error);
      } else if (result.data) {
        setUcl(fmtNum(result.data.ucl));
        setCl(fmtNum(result.data.cl));
        setLcl(fmtNum(result.data.lcl));
      }
    });
  };

  // ── Eliminar ──────────────────────────────────────────────────
  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteSPCConfig(config?.maquina_id ?? '');
      if (result.error) {
        setError(result.error);
        setShowDeleteConfirm(false);
      } else {
        onSaved();
      }
    });
  };

  // ── Opciones de máquinas para el dropdown ─────────────────────
  const maquinaOptions = maquinasSinConfig.map((m) => ({
    id: m.id,
    label: `${m.lineas.nombre} → ${m.nombre}`,
  }));

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-[#e0e5ec] rounded-[24px] shadow-[12px_12px_24px_#b8bec7,_-12px_-12px_24px_#ffffff] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#c8cfd8]">
            <h2 className="text-lg font-bold text-gray-700">
              {mode === 'create' ? 'Nueva Configuración SPC' : 'Editar Configuración SPC'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="bg-[#e0e5ec] rounded-full p-2 shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff] text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Error global */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-[12px]">
                {error}
              </div>
            )}

            {/* 1. Selector de máquina (solo crear) */}
            {mode === 'create' && (
              <SectionCard title="Máquina">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Seleccionar máquina sin configuración <span className="text-red-400">*</span>
                  </label>
                  {maquinaOptions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      Todas las máquinas ya tienen configuración SPC.
                    </p>
                  ) : (
                    <NeuSelect
                      value={selectedMaquinaId}
                      onChange={setSelectedMaquinaId}
                      placeholder="Selecciona una máquina..."
                      options={maquinaOptions}
                    />
                  )}
                </div>
              </SectionCard>
            )}

            {/* 2. Tipo de gráfico y tamaño de subgrupo */}
            <SectionCard title="Tipo de Gráfico">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Tipo de gráfico de control
                </label>
                <NeuSelect
                  value={tipoGrafico}
                  onChange={handleTipoGraficoChange}
                  options={Object.entries(TIPO_GRAFICO_INFO).map(([k, v]) => ({
                    id: k,
                    label: v.label,
                  }))}
                />
                <p className="text-xs text-[#1565C0] mt-2">
                  {TIPO_GRAFICO_INFO[tipoGrafico].descripcion}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Tamaño de subgrupo
                </label>
                <NeuInput
                  type="number"
                  min={tipoGrafico === 'i_mr' ? 1 : 2}
                  max={25}
                  value={effectiveTamano}
                  disabled={tipoGrafico === 'i_mr'}
                  onChange={(e) => setTamanoSubgrupo(Number(e.target.value))}
                  className={tipoGrafico === 'i_mr' ? 'opacity-50 cursor-not-allowed' : ''}
                />
                {tipoGrafico === 'i_mr' && (
                  <p className="text-xs text-gray-400 mt-1">
                    Fijado en 1 para gráficos I-MR.
                  </p>
                )}
              </div>
            </SectionCard>

            {/* 3. Límites de especificación */}
            <SectionCard
              title="Límites de Especificación"
              note="Estos límites los define ingeniería/cliente. No se calculan automáticamente."
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    USL (Superior)
                  </label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={usl}
                    onChange={(e) => setUsl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    LSL (Inferior)
                  </label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={lsl}
                    onChange={(e) => setLsl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Target / Nominal
                  </label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
              </div>
            </SectionCard>

            {/* 4. Límites de control */}
            <SectionCard
              title="Límites de Control"
              note="Dejar vacíos para que se calculen automáticamente con los datos de producción."
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">UCL</label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={ucl}
                    onChange={(e) => setUcl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">CL</label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={cl}
                    onChange={(e) => setCl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">LCL</label>
                  <NeuInput
                    type="number"
                    step="any"
                    placeholder="Opcional"
                    value={lcl}
                    onChange={(e) => setLcl(e.target.value)}
                  />
                </div>
              </div>

              {calcError && (
                <p className="text-xs text-red-500">{calcError}</p>
              )}

              <NeuButton
                type="button"
                onClick={handleCalculate}
                disabled={isCalcPending}
                className="w-full text-[#1565C0] font-semibold"
              >
                {isCalcPending ? 'Calculando...' : 'Calcular ahora desde datos'}
              </NeuButton>
            </SectionCard>

            {/* 5. Reglas Western Electric */}
            <SectionCard title="Reglas Western Electric">
              <div className="divide-y divide-[#c8cfd8]">
                {REGLAS_INFO.map((r) => (
                  <NeuToggle
                    key={r.key}
                    checked={reglas[r.key]}
                    onChange={(val) => setReglas((prev) => ({ ...prev, [r.key]: val }))}
                    label={r.label}
                    descripcion={r.descripcion}
                  />
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row items-center gap-3">
            {/* Eliminar (solo modo editar) */}
            {mode === 'edit' && !showDeleteConfirm && (
              <NeuButton
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="sm:mr-auto text-red-500 font-semibold"
              >
                Eliminar configuración
              </NeuButton>
            )}

            {/* Confirmar eliminar */}
            {mode === 'edit' && showDeleteConfirm && (
              <div className="sm:mr-auto flex items-center gap-2">
                <span className="text-xs text-red-500 font-medium">¿Confirmar eliminación?</span>
                <NeuButton
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeletePending}
                  className="text-red-600 font-bold text-xs px-3 py-1.5"
                >
                  {isDeletePending ? 'Eliminando...' : 'Sí, eliminar'}
                </NeuButton>
                <NeuButton
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs px-3 py-1.5"
                >
                  Cancelar
                </NeuButton>
              </div>
            )}

            {/* Cancelar y Guardar */}
            <div className="flex gap-3 ml-auto">
              <NeuButton type="button" onClick={onClose} disabled={isPending}>
                Cancelar
              </NeuButton>
              <NeuButton
                type="button"
                variant="primary"
                onClick={handleSave}
                disabled={isPending || (mode === 'create' && maquinaOptions.length === 0)}
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </NeuButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
