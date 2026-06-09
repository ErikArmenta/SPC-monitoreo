'use client';

import { useState, useTransition } from 'react';
import { Turno } from '@/types';
import {
  createTurno,
  updateTurno,
  deleteTurno,
  CreateTurnoPayload,
  UpdateTurnoPayload,
} from '../turnos-actions';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  turno?: Turno;
}

interface FormData {
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

const EMPTY_FORM: FormData = {
  nombre: '',
  hora_inicio: '',
  hora_fin: '',
  activo: true,
};

// ─── Componente principal ────────────────────────────────────────────────────

interface TurnosClientViewProps {
  initialTurnos: Turno[];
}

export default function TurnosClientView({ initialTurnos }: TurnosClientViewProps) {
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ─── Abrir modal ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ open: true, mode: 'create' });
  }

  function openEdit(turno: Turno) {
    setForm({
      nombre: turno.nombre,
      hora_inicio: turno.hora_inicio,
      hora_fin: turno.hora_fin,
      activo: turno.activo,
    });
    setFormError(null);
    setModal({ open: true, mode: 'edit', turno });
  }

  function closeModal() {
    setModal({ open: false, mode: 'create' });
    setFormError(null);
  }

  // ─── Guardar ────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (!form.hora_inicio) {
      setFormError('La hora de inicio es obligatoria.');
      return;
    }
    if (!form.hora_fin) {
      setFormError('La hora de fin es obligatoria.');
      return;
    }

    setFormError(null);

    startTransition(async () => {
      if (modal.mode === 'create') {
        const payload: CreateTurnoPayload = {
          nombre: form.nombre.trim(),
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          activo: form.activo,
        };
        const result = await createTurno(payload);
        if (result.error) {
          setFormError(result.error);
          return;
        }
        // Optimistic: reload will happen via revalidatePath; add placeholder
        setTurnos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            nombre: payload.nombre,
            hora_inicio: payload.hora_inicio,
            hora_fin: payload.hora_fin,
            activo: payload.activo ?? true,
            created_at: new Date().toISOString(),
          },
        ]);
      } else if (modal.turno) {
        const payload: UpdateTurnoPayload = {
          nombre: form.nombre.trim(),
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          activo: form.activo,
        };
        const result = await updateTurno(modal.turno.id, payload);
        if (result.error) {
          setFormError(result.error);
          return;
        }
        setTurnos((prev) =>
          prev.map((t) =>
            t.id === modal.turno!.id ? { ...t, ...payload } : t
          )
        );
      }
      closeModal();
    });
  }

  // ─── Eliminar (soft delete) ──────────────────────────────────────────────────

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTurno(id);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setTurnos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, activo: false } : t))
      );
      setDeleteConfirm(null);
    });
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Card contenedor */}
      <div
        className="rounded-[20px] bg-[#e0e5ec] p-6"
        style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
      >
        {/* Encabezado de la tabla */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#31456a]">Turnos configurados</h2>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-sm font-medium text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(145deg, #4f8ef7, #3b6fd4)',
              boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
            }}
          >
            <IconPlus />
            Nuevo Turno
          </button>
        </div>

        {/* Tabla desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[#c8cfd8]">
                <Th>Nombre</Th>
                <Th>Hora Inicio</Th>
                <Th>Hora Fin</Th>
                <Th>Estado</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5a7184]">
                    No hay turnos registrados. Crea el primero.
                  </td>
                </tr>
              ) : (
                turnos.map((turno) => (
                  <tr key={turno.id} className="border-b border-[#e8ecf0] last:border-0">
                    <Td>
                      <span className="font-medium text-[#31456a]">{turno.nombre}</span>
                    </Td>
                    <Td>
                      <span className="font-mono">{formatTime(turno.hora_inicio)}</span>
                    </Td>
                    <Td>
                      <span className="font-mono">{formatTime(turno.hora_fin)}</span>
                    </Td>
                    <Td>
                      <EstadoBadge activo={turno.activo} />
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          onClick={() => openEdit(turno)}
                          title="Editar turno"
                          color="blue"
                        >
                          <IconEdit />
                        </ActionButton>
                        <ActionButton
                          onClick={() => setDeleteConfirm(turno.id)}
                          title="Desactivar turno"
                          color="red"
                          disabled={!turno.activo}
                        >
                          <IconTrash />
                        </ActionButton>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tarjetas mobile */}
        <div className="md:hidden flex flex-col gap-3">
          {turnos.length === 0 ? (
            <p className="py-8 text-center text-[#5a7184]">
              No hay turnos registrados. Crea el primero.
            </p>
          ) : (
            turnos.map((turno) => (
              <div
                key={turno.id}
                className="rounded-[16px] bg-[#e0e5ec] p-4"
                style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-semibold text-[#31456a]">{turno.nombre}</span>
                  <EstadoBadge activo={turno.activo} />
                </div>
                <div className="text-sm text-[#5a7184] space-y-1 mb-3">
                  <div>
                    <span className="font-medium">Inicio:</span>{' '}
                    <span className="font-mono">{formatTime(turno.hora_inicio)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Fin:</span>{' '}
                    <span className="font-mono">{formatTime(turno.hora_fin)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <ActionButton onClick={() => openEdit(turno)} title="Editar" color="blue">
                    <IconEdit />
                    <span className="text-xs ml-1">Editar</span>
                  </ActionButton>
                  <ActionButton
                    onClick={() => setDeleteConfirm(turno.id)}
                    title="Desactivar"
                    color="red"
                    disabled={!turno.activo}
                  >
                    <IconTrash />
                    <span className="text-xs ml-1">Desactivar</span>
                  </ActionButton>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Nota aclaratoria */}
        <div
          className="mt-6 rounded-[12px] px-4 py-3 text-sm text-[#5a7184] bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        >
          <span className="font-medium text-[#31456a]">Nota:</span>{' '}
          Los turnos se detectan automáticamente al capturar inspecciones, basándose en la
          hora de la inspección comparada con el rango hora inicio–hora fin de cada turno.
        </div>
      </div>

      {/* ─── Modal Crear / Editar ─────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div
            className="relative z-10 w-full max-w-md rounded-[24px] bg-[#e0e5ec] p-6"
            style={{ boxShadow: '10px 10px 20px #b8bec7, -10px -10px 20px #ffffff' }}
          >
            {/* Título */}
            <h2 className="text-xl font-bold text-[#31456a] mb-6">
              {modal.mode === 'create' ? 'Nuevo Turno' : 'Editar Turno'}
            </h2>

            {/* Error */}
            {formError && (
              <div
                className="mb-4 rounded-[10px] px-3 py-2 text-sm text-red-700 bg-[#e0e5ec]"
                style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
              >
                {formError}
              </div>
            )}

            {/* Campos */}
            <div className="flex flex-col gap-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-[#31456a] mb-2">
                  Nombre del turno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Turno 1 - Mañana"
                  className="w-full rounded-[12px] bg-[#e0e5ec] px-4 py-3 text-sm text-[#31456a] outline-none placeholder:text-[#8a9bb0] transition-all"
                  style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
                />
              </div>

              {/* Hora inicio / fin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#31456a] mb-2">
                    Hora Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                    className="w-full rounded-[12px] bg-[#e0e5ec] px-4 py-3 text-sm text-[#31456a] outline-none transition-all"
                    style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#31456a] mb-2">
                    Hora Fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                    className="w-full rounded-[12px] bg-[#e0e5ec] px-4 py-3 text-sm text-[#31456a] outline-none transition-all"
                    style={{ boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff' }}
                  />
                </div>
              </div>

              {/* Toggle activo */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#31456a]">Estado activo</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.activo}
                  onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 ${
                    form.activo ? 'bg-[#4f8ef7]' : 'bg-[#c8cfd8]'
                  }`}
                  style={{
                    boxShadow: form.activo
                      ? 'inset 2px 2px 4px rgba(0,0,0,0.2)'
                      : 'inset 2px 2px 4px #b8bec7, inset -2px -2px 4px #ffffff',
                  }}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      form.activo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(145deg, #4f8ef7, #3b6fd4)',
                  boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
                }}
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={closeModal}
                disabled={isPending}
                className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-[#31456a] transition-all active:scale-95 disabled:opacity-60 bg-[#e0e5ec]"
                style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Confirmar eliminación ──────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-[24px] bg-[#e0e5ec] p-6"
            style={{ boxShadow: '10px 10px 20px #b8bec7, -10px -10px 20px #ffffff' }}
          >
            <h3 className="text-lg font-bold text-[#31456a] mb-2">Desactivar turno</h3>
            <p className="text-sm text-[#5a7184] mb-6">
              El turno se marcará como inactivo. Los registros históricos no se verán afectados.
              ¿Confirmas?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isPending}
                className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(145deg, #f47c7c, #d44f4f)',
                  boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
                }}
              >
                {isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isPending}
                className="flex-1 rounded-[12px] py-3 text-sm font-semibold text-[#31456a] bg-[#e0e5ec] transition-all active:scale-95 disabled:opacity-60"
                style={{ boxShadow: '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#5a7184]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-[#31456a]">{children}</td>;
}

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        activo ? 'text-green-700' : 'text-red-700'
      } bg-[#e0e5ec]`}
      style={{
        boxShadow: activo
          ? 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff'
          : 'inset 1px 1px 3px #b8bec7, inset -1px -1px 3px #ffffff',
      }}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  title: string;
  color: 'blue' | 'red';
  disabled?: boolean;
  children: React.ReactNode;
}

function ActionButton({ onClick, title, color, disabled, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`inline-flex items-center rounded-[10px] px-3 py-1.5 text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed bg-[#e0e5ec] ${
        color === 'blue' ? 'text-[#4f8ef7]' : 'text-red-500'
      }`}
      style={{ boxShadow: '3px 3px 6px #b8bec7, -3px -3px 6px #ffffff' }}
    >
      {children}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte 'HH:MM:SS' o 'HH:MM' a 'HH:MM' */
function formatTime(time: string): string {
  return time?.slice(0, 5) ?? '—';
}

// ─── Íconos SVG ───────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
