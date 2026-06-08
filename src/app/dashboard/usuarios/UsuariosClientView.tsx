'use client';

import { useState, useTransition } from 'react';
import { Profile, Linea, Maquina, Rol } from '@/types';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';
import { createUser, updateUser, toggleActivo, deleteUser } from './actions';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  usuarios: Profile[];
  lineas: Linea[];
  maquinas: Maquina[];
  currentUserId: string;
}

type ModalMode = 'create' | 'edit' | null;

interface FormState {
  email: string;
  password: string;
  nombre: string;
  rol: Rol;
  lineas_asignadas: string[];
  maquinas_asignadas: string[];
}

const EMPTY_FORM: FormState = {
  email: '',
  password: '',
  nombre: '',
  rol: 'inspector',
  lineas_asignadas: [],
  maquinas_asignadas: [],
};

const ROLES: { value: Rol; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'inspector', label: 'Inspector' },
];

// ─── Role Badge ─────────────────────────────────────────────────────────────

const ROL_STYLES: Record<Rol, string> = {
  super_admin: 'bg-[#1565C0]/15 text-[#0d47a1] ring-1 ring-[#1565C0]/30',
  admin: 'bg-[#7B1FA2]/15 text-[#6a1082] ring-1 ring-[#7B1FA2]/30',
  supervisor: 'bg-[#F57C00]/15 text-[#e65100] ring-1 ring-[#F57C00]/30',
  inspector: 'bg-[#4CAF50]/15 text-[#2E7D32] ring-1 ring-[#4CAF50]/30',
};

const ROL_LABELS: Record<Rol, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  supervisor: 'Supervisor',
  inspector: 'Inspector',
};

function RolBadge({ rol }: { rol: Rol }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROL_STYLES[rol]}`}>
      {ROL_LABELS[rol]}
    </span>
  );
}

// ─── Activo Toggle ──────────────────────────────────────────────────────────

function ActivoToggle({
  userId,
  activo,
  onToggle,
}: {
  userId: string;
  activo: boolean;
  onToggle: (userId: string, activo: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(userId, !activo)}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        activo
          ? 'bg-[#4CAF50] shadow-[inset_2px_2px_4px_#388e3c,inset_-2px_-2px_4px_#66bb6a]'
          : 'bg-[#b8bec7] shadow-[inset_2px_2px_4px_#a3b1c6,inset_-2px_-2px_4px_#d1d9e6]',
      ].join(' ')}
      aria-label={activo ? 'Desactivar usuario' : 'Activar usuario'}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
          'shadow-[2px_2px_4px_#b8bec7,-2px_-2px_4px_#ffffff]',
          activo ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

// ─── Multiselect ────────────────────────────────────────────────────────────

function MultiSelect<T extends { id: string; nombre: string }>({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: T[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="max-h-36 overflow-y-auto rounded-[12px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] bg-[#e0e5ec] p-3 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Sin registros</p>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 rounded accent-[#1565C0]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">
                {item.nombre}
              </span>
            </label>
          ))
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-[#1565C0] mt-1">
          {selected.length} seleccionado{selected.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ─── User Form Modal ─────────────────────────────────────────────────────────

function UserModal({
  mode,
  editingUser,
  lineas,
  maquinas,
  onClose,
  onSuccess,
}: {
  mode: ModalMode;
  editingUser: Profile | null;
  lineas: Linea[];
  maquinas: Maquina[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (mode === 'edit' && editingUser) {
      return {
        email: editingUser.email,
        password: '',
        nombre: editingUser.nombre,
        rol: editingUser.rol,
        lineas_asignadas: editingUser.lineas_asignadas ?? [],
        maquinas_asignadas: editingUser.maquinas_asignadas ?? [],
      };
    }
    return EMPTY_FORM;
  });

  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (mode === 'create') {
      if (!form.email.trim()) {
        setError('El email es requerido');
        return;
      }
      if (form.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
    }

    setError('');
    startTransition(async () => {
      let result: { error?: string };

      if (mode === 'create') {
        result = await createUser({
          email: form.email,
          password: form.password,
          nombre: form.nombre,
          rol: form.rol,
          lineas_asignadas: form.lineas_asignadas,
          maquinas_asignadas: form.maquinas_asignadas,
        });
      } else {
        result = await updateUser({
          id: editingUser!.id,
          nombre: form.nombre,
          rol: form.rol,
          lineas_asignadas: form.lineas_asignadas,
          maquinas_asignadas: form.maquinas_asignadas,
        });
      }

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#e0e5ec] rounded-[24px] shadow-[8px_8px_24px_#b8bec7,-8px_-8px_24px_#ffffff] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#d1d9e6] flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {mode === 'create'
              ? 'Crea un nuevo usuario en el sistema'
              : `Editando: ${editingUser?.email}`}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Email — solo en creación */}
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <NeuInput
                type="email"
                placeholder="usuario@empresa.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="off"
              />
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nombre completo
            </label>
            <NeuInput
              type="text"
              placeholder="Nombre del usuario"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </div>

          {/* Contraseña — solo en creación */}
          {mode === 'create' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Contraseña temporal
              </label>
              <NeuInput
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Rol */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Rol
            </label>
            <div className="relative">
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value as Rol }))}
                className="w-full bg-[#e0e5ec] rounded-[15px] shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff] px-4 py-2.5 text-gray-700 text-sm outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow appearance-none cursor-pointer"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                ▾
              </div>
            </div>
          </div>

          {/* Líneas asignadas */}
          <MultiSelect
            label="Líneas asignadas"
            items={lineas}
            selected={form.lineas_asignadas}
            onChange={(ids) => setForm((f) => ({ ...f, lineas_asignadas: ids }))}
          />

          {/* Máquinas asignadas */}
          <MultiSelect
            label="Máquinas asignadas"
            items={maquinas}
            selected={form.maquinas_asignadas}
            onChange={(ids) => setForm((f) => ({ ...f, maquinas_asignadas: ids }))}
          />

          {/* Error */}
          {error && (
            <div className="bg-[#F44336]/10 border border-[#F44336]/30 rounded-[12px] px-4 py-3">
              <p className="text-sm text-[#C62828] font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#d1d9e6] flex gap-3 justify-end flex-shrink-0">
          <NeuButton variant="default" onClick={onClose} disabled={isPending}>
            Cancelar
          </NeuButton>
          <NeuButton
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? 'Guardando...'
              : mode === 'create'
              ? 'Crear Usuario'
              : 'Guardar Cambios'}
          </NeuButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UsuariosClientView({ usuarios, lineas, maquinas, currentUserId }: Props) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [localUsers, setLocalUsers] = useState<Profile[]>(usuarios);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string>('');
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setModalMode('create');
  };

  const openEdit = (user: Profile) => {
    setEditingUser(user);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingUser(null);
  };

  // Optimistic toggle
  const handleToggle = async (userId: string, activo: boolean) => {
    setTogglingId(userId);
    setToggleError('');
    // Optimistic update
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, activo } : u))
    );

    const result = await toggleActivo(userId, activo);
    setTogglingId(null);

    if (result.error) {
      // Revert
      setLocalUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, activo: !activo } : u))
      );
      setToggleError(result.error);
    }
  };

  // After successful save, refresh the list from the server-provided data
  // (revalidatePath handles the server state; we sync localUsers on success)
  const handleSuccess = () => {
    // The page will re-render via Next.js revalidation
    // Reset local state to trigger server fetch
    window.location.reload();
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setDeleteError('');
    const result = await deleteUser(deletingUser.id, currentUserId);
    setIsDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeletingUser(null);
      window.location.reload();
    }
  };

  // Helpers to display names
  const getLineaNames = (ids: string[]) =>
    ids
      .map((id) => lineas.find((l) => l.id === id)?.nombre)
      .filter(Boolean)
      .join(', ') || '—';

  const getMaquinaNames = (ids: string[]) =>
    ids
      .map((id) => maquinas.find((m) => m.id === id)?.nombre)
      .filter(Boolean)
      .join(', ') || '—';

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {localUsers.length} usuario{localUsers.length !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <NeuButton variant="primary" onClick={openCreate}>
          <span className="flex items-center gap-2">
            <span className="text-lg leading-none">+</span>
            Nuevo Usuario
          </span>
        </NeuButton>
      </div>

      {/* Error de toggle */}
      {toggleError && (
        <div className="mb-4 bg-[#F44336]/10 border border-[#F44336]/30 rounded-[12px] px-4 py-3">
          <p className="text-sm text-[#C62828] font-medium">{toggleError}</p>
        </div>
      )}

      {/* Table card */}
      <NeuCard className="overflow-hidden">
        {localUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d1d9e6]">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">
                    Usuario
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">
                    Rol
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4 hidden md:table-cell">
                    Líneas
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4 hidden lg:table-cell">
                    Máquinas
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">
                    Activo
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d1d9e6]/60">
                {localUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-[#e8edf4] transition-colors duration-150"
                  >
                    {/* Usuario */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {user.nombre || '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-4">
                      <RolBadge rol={user.rol} />
                    </td>

                    {/* Líneas */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-xs text-gray-600 max-w-[160px] truncate" title={getLineaNames(user.lineas_asignadas ?? [])}>
                        {getLineaNames(user.lineas_asignadas ?? [])}
                      </p>
                    </td>

                    {/* Máquinas */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-xs text-gray-600 max-w-[160px] truncate" title={getMaquinaNames(user.maquinas_asignadas ?? [])}>
                        {getMaquinaNames(user.maquinas_asignadas ?? [])}
                      </p>
                    </td>

                    {/* Toggle activo */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        {togglingId === user.id ? (
                          <div className="w-11 h-6 rounded-full bg-[#d1d9e6] animate-pulse" />
                        ) : (
                          <ActivoToggle
                            userId={user.id}
                            activo={user.activo}
                            onToggle={handleToggle}
                          />
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <NeuButton
                          variant="default"
                          className="text-xs px-3 py-1.5"
                          onClick={() => openEdit(user)}
                        >
                          Editar
                        </NeuButton>
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => { setDeleteError(''); setDeletingUser(user); }}
                            className="text-xs px-3 py-1.5 rounded-[12px] bg-[#e0e5ec] shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff] text-[#C62828] font-medium hover:shadow-[inset_2px_2px_5px_#b8bec7,inset_-2px_-2px_5px_#ffffff] transition-shadow duration-150"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NeuCard>

      {/* Modal */}
      <UserModal
        mode={modalMode}
        editingUser={editingUser}
        lineas={lineas}
        maquinas={maquinas}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />

      {/* Delete confirmation modal */}
      {deletingUser !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
            onClick={() => { if (!isDeleting) setDeletingUser(null); }}
          />
          <div className="relative w-full max-w-sm bg-[#e0e5ec] rounded-[24px] shadow-[8px_8px_24px_#b8bec7,-8px_-8px_24px_#ffffff] p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Eliminar usuario</h2>
              <p className="text-sm text-gray-600 mt-2">
                ¿Estás seguro de eliminar a{' '}
                <span className="font-semibold text-gray-800">{deletingUser.nombre || deletingUser.email}</span>?
                Esta acción no se puede deshacer.
              </p>
            </div>
            {deleteError && (
              <div className="bg-[#F44336]/10 border border-[#F44336]/30 rounded-[12px] px-4 py-3">
                <p className="text-sm text-[#C62828] font-medium">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <NeuButton
                variant="default"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Cancelar
              </NeuButton>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[12px] bg-[#F44336] text-white text-sm font-semibold shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff] hover:bg-[#D32F2F] disabled:opacity-50 transition-colors duration-150"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
