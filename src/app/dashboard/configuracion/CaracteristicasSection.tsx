'use client';

// ============================================================
// CaracteristicasSection — CRUD de características de una máquina
// Panel expansible dentro de ConfiguracionClientView
// ============================================================

import { useState, useEffect, useTransition } from 'react';
import type { Caracteristica } from '@/types';
import {
  getCaracteristicasByMaquina,
  createCaracteristica,
  updateCaracteristica,
  deleteCaracteristica,
} from './caracteristicas-actions';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  maquinaId: string;
  maquinaNombre: string;
}

// ─── Estado inicial del formulario ────────────────────────────────────────────

interface FormState {
  nombre: string;
  unidad: string;
  descripcion: string;
  activa: boolean;
}

const FORM_INITIAL: FormState = {
  nombre: '',
  unidad: 'mm',
  descripcion: '',
  activa: true,
};

// ─── Mini-modal neumórfico ────────────────────────────────────────────────────

function CaracteristicaModal({
  editing,
  onClose,
  onSaved,
  maquinaId,
}: {
  editing: Caracteristica | null;
  onClose: () => void;
  onSaved: (c: Caracteristica) => void;
  maquinaId: string;
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          nombre: editing.nombre,
          unidad: editing.unidad,
          descripcion: editing.descripcion ?? '',
          activa: editing.activa,
        }
      : FORM_INITIAL
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    setError(null);

    startTransition(async () => {
      if (editing) {
        const res = await updateCaracteristica(editing.id, {
          nombre: form.nombre.trim(),
          unidad: form.unidad.trim() || 'mm',
          descripcion: form.descripcion.trim() || null,
          activa: form.activa,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          onSaved(res.data);
        }
      } else {
        const res = await createCaracteristica({
          maquina_id: maquinaId,
          nombre: form.nombre.trim(),
          unidad: form.unidad.trim() || 'mm',
          descripcion: form.descripcion.trim() || null,
          activa: form.activa,
          orden: 0,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          onSaved(res.data);
        }
      }
    });
  };

  // Cerrar al hacer click en el backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[#e0e5ec] rounded-[24px] p-6 w-full max-w-sm"
        style={{ boxShadow: '10px 10px 20px #b8bec7, -10px -10px 20px #ffffff' }}
      >
        {/* Título */}
        <h3 className="text-base font-bold text-gray-800 mb-5">
          {editing ? 'Editar característica' : 'Nueva característica'}
        </h3>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Nombre <span className="text-[#C62828]">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Diámetro exterior"
              className="w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2.5 text-sm text-gray-700
                shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]
                outline-none focus:ring-2 focus:ring-[#1565C0]/20 placeholder:text-gray-400 transition-shadow"
            />
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Unidad
            </label>
            <input
              type="text"
              value={form.unidad}
              onChange={(e) => set('unidad', e.target.value)}
              placeholder="mm"
              className="w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2.5 text-sm text-gray-700
                shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]
                outline-none focus:ring-2 focus:ring-[#1565C0]/20 placeholder:text-gray-400 transition-shadow"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Descripción breve..."
              className="w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2.5 text-sm text-gray-700
                shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]
                outline-none focus:ring-2 focus:ring-[#1565C0]/20 placeholder:text-gray-400 transition-shadow"
            />
          </div>

          {/* Activa toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Activa</span>
            <button
              type="button"
              onClick={() => set('activa', !form.activa)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
                ${form.activa ? 'bg-[#1565C0]' : 'bg-[#b8bec7]'}`}
              style={{
                boxShadow: form.activa
                  ? 'inset 2px 2px 4px #0d4a8f, inset -2px -2px 4px #1d80f1'
                  : 'inset 2px 2px 4px #9da5b0, inset -2px -2px 4px #d1d9e6',
              }}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                  ${form.activa ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-xs text-[#C62828] bg-[#F44336]/10 rounded-[10px] px-3 py-2">
            {error}
          </p>
        )}

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-[12px] text-sm font-medium text-gray-600 bg-[#e0e5ec]
              shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff]
              hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff]
              disabled:opacity-50 transition-shadow"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-[12px] text-sm font-semibold text-white bg-[#1565C0]
              shadow-[4px_4px_8px_#0d4a8f,-4px_-4px_8px_#1d80f1]
              hover:bg-[#1976D2] active:shadow-[inset_2px_2px_5px_#0d4a8f]
              disabled:opacity-50 transition-all"
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CaracteristicasSection({ maquinaId, maquinaNombre }: Props) {
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingCaracteristica, setEditingCaracteristica] = useState<Caracteristica | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Carga inicial ───────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    getCaracteristicasByMaquina(maquinaId).then((res) => {
      if (res.error) {
        setLoadError(res.error);
      } else {
        setCaracteristicas(res.data ?? []);
      }
      setLoading(false);
    });
  }, [maquinaId]);

  // ── Handlers ───────────────────────────────────────────────────

  const openCreate = () => {
    setEditingCaracteristica(null);
    setShowModal(true);
  };

  const openEdit = (c: Caracteristica) => {
    setEditingCaracteristica(c);
    setShowModal(true);
  };

  const handleSaved = (saved: Caracteristica) => {
    setCaracteristicas((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setShowModal(false);
    setEditingCaracteristica(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta característica? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    setDeleteError(null);
    const res = await deleteCaracteristica(id);
    if (res.error) {
      setDeleteError(res.error);
    } else {
      setCaracteristicas((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingId(null);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <>
      <div
        className="bg-[#e0e5ec] rounded-[20px] p-5"
        style={{ boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff' }}
      >
        {/* Header de la sección */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
              Características
            </p>
            <p className="text-xs text-gray-400">{maquinaNombre}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-[10px] font-semibold text-white bg-[#1565C0]
              shadow-[3px_3px_6px_#0d4a8f,-3px_-3px_6px_#1d80f1]
              hover:bg-[#1976D2] active:shadow-[inset_2px_2px_4px_#0d4a8f] transition-all"
          >
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
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva Característica
          </button>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded-[12px] bg-[#d1d9e6]"
              />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-xs text-[#C62828] bg-[#F44336]/10 rounded-[10px] px-3 py-2">
            Error: {loadError}
          </p>
        ) : caracteristicas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-300"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="2" />
            </svg>
            <p className="text-xs font-medium">Sin características definidas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {caracteristicas.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-[#e0e5ec]"
                style={{ boxShadow: '3px 3px 6px #b8bec7, -3px -3px 6px #ffffff' }}
              >
                {/* Orden */}
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[#d1d9e6] text-[10px] font-bold text-gray-500">
                  {c.orden + 1}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {c.nombre}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 bg-[#d1d9e6] px-1.5 py-0.5 rounded-full">
                      {c.unidad}
                    </span>
                    {/* Badge activa/inactiva */}
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        c.activa
                          ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
                          : 'bg-[#9E9E9E]/15 text-gray-500'
                      }`}
                    >
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  {c.descripcion && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{c.descripcion}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    title="Editar"
                    className="p-1.5 rounded-[8px] bg-[#e0e5ec] text-[#1565C0]
                      shadow-[2px_2px_4px_#b8bec7,-2px_-2px_4px_#ffffff]
                      hover:shadow-[inset_1px_1px_3px_#b8bec7,inset_-1px_-1px_3px_#ffffff] transition-shadow"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Eliminar"
                    className="p-1.5 rounded-[8px] bg-[#e0e5ec] text-[#C62828]
                      shadow-[2px_2px_4px_#b8bec7,-2px_-2px_4px_#ffffff]
                      hover:shadow-[inset_1px_1px_3px_#b8bec7,inset_-1px_-1px_3px_#ffffff]
                      disabled:opacity-50 transition-shadow"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error de eliminación */}
        {deleteError && (
          <p className="mt-3 text-xs text-[#C62828] bg-[#F44336]/10 rounded-[10px] px-3 py-2">
            Error al eliminar: {deleteError}
          </p>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <CaracteristicaModal
          editing={editingCaracteristica}
          onClose={() => {
            setShowModal(false);
            setEditingCaracteristica(null);
          }}
          onSaved={handleSaved}
          maquinaId={maquinaId}
        />
      )}
    </>
  );
}
