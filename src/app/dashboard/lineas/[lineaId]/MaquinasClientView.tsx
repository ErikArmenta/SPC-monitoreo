'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';
import MachineModal from '@/components/MachineModal';
import { Maquina, Pieza, Rol } from '@/types';
import { updateMaquina, deleteMaquina } from './actions';

// ---------------------------------------------------------------------------
// Camera / Inspection SVG icon — blue (#1565C0)
// ---------------------------------------------------------------------------
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Camera body */}
      <rect x="8" y="16" width="48" height="36" rx="5" fill="#1565C0" />

      {/* Lens outer ring */}
      <circle cx="32" cy="34" r="12" fill="#e0e5ec" stroke="#1565C0" strokeWidth="2" />

      {/* Lens inner */}
      <circle cx="32" cy="34" r="8" fill="#1565C0" />

      {/* Lens reflection */}
      <circle cx="32" cy="34" r="4" fill="#e0e5ec" />
      <circle cx="30" cy="32" r="1.5" fill="#ffffff" opacity="0.7" />

      {/* Viewfinder bump */}
      <rect x="20" y="10" width="14" height="8" rx="3" fill="#1565C0" />

      {/* Flash / status light */}
      <circle cx="50" cy="22" r="3" fill="#4CAF50" />

      {/* Shutter button */}
      <circle cx="50" cy="34" r="2.5" fill="#e0e5ec" opacity="0.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Last state indicator — shows ok/no_ok badge or "Sin datos"
// ---------------------------------------------------------------------------
function LastStateIndicator({ pieza }: { pieza?: Pieza }) {
  if (!pieza) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-gray-400">
        Sin inspecciones
      </span>
    );
  }

  const isOk = pieza.estado === 'ok';
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        isOk
          ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
          : 'bg-[#F44336]/15 text-[#C62828]',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          isOk ? 'bg-[#4CAF50]' : 'bg-[#F44336]',
        ].join(' ')}
      />
      {isOk ? 'Última: OK' : 'Última: No OK'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Machine Card
// ---------------------------------------------------------------------------
interface MachineCardProps {
  maquina: Maquina;
  lastPieza?: Pieza;
  canAdd: boolean;
  onClick: () => void;
  onEdit: (m: Maquina) => void;
  onDelete: (m: Maquina) => void;
}

function MachineCard({ maquina, lastPieza, canAdd, onClick, onEdit, onDelete }: MachineCardProps) {
  return (
    <div className="relative group">
      {/* Action buttons — top-right overlay */}
      {canAdd && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            type="button"
            title="Editar máquina"
            onClick={(e) => { e.stopPropagation(); onEdit(maquina); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#e0e5ec] shadow-[2px_2px_4px_#b8bec7,-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8bec7,inset_-2px_-2px_4px_#ffffff] transition-shadow duration-150 text-[#1565C0]"
          >
            {/* Pencil icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            title="Eliminar máquina"
            onClick={(e) => { e.stopPropagation(); onDelete(maquina); }}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-[#e0e5ec] shadow-[2px_2px_4px_#b8bec7,-2px_-2px_4px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8bec7,inset_-2px_-2px_4px_#ffffff] transition-shadow duration-150 text-[#C62828]"
          >
            {/* Trash icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Main clickable card */}
      <button
        type="button"
        onClick={onClick}
        className="group/card text-left w-full focus:outline-none"
      >
        <NeuCard className="p-5 cursor-pointer transition-shadow duration-200 hover:shadow-neu-pressed group-focus-visible/card:ring-2 group-focus-visible/card:ring-[#1565C0]/50">
          <div className="flex flex-col items-center gap-3 text-center">
            {/* Camera icon container */}
            <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
              <CameraIcon className="w-10 h-10" />
            </div>

            {/* Machine info */}
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Máquina
              </p>
              <p className="text-lg font-bold text-gray-800 leading-tight">
                {maquina.nombre}
              </p>
              {maquina.numero != null && (
                <p className="text-xs text-gray-400 font-medium">
                  #{maquina.numero}
                </p>
              )}
            </div>

            {/* Last state */}
            <LastStateIndicator pieza={lastPieza} />
          </div>
        </NeuCard>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div className="col-span-2 md:col-span-3 flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 flex items-center justify-center bg-[#e0e5ec] rounded-[20px] shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff]">
        <CameraIcon className="w-12 h-12 opacity-40" />
      </div>
      <p className="text-gray-500 text-base font-medium">
        No hay máquinas registradas en esta línea.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MaquinasClientView
// ---------------------------------------------------------------------------
interface MaquinasClientViewProps {
  maquinas: Maquina[];
  lastPiezaByMaquina: Record<string, Pieza>;
  canAdd: boolean;
  lineaId: string;
  lineaNombre: string;
  profileRol: Rol;
}

export default function MaquinasClientView({
  maquinas,
  lastPiezaByMaquina,
  canAdd,
  lineaId,
  profileRol,
}: MaquinasClientViewProps) {
  const router = useRouter();
  const [selectedMaquina, setSelectedMaquina] = useState<Maquina | null>(null);

  // Edit state
  const [editingMaquina, setEditingMaquina] = useState<Maquina | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editNumero, setEditNumero] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [deletingMaquina, setDeletingMaquina] = useState<Maquina | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function openEdit(m: Maquina) {
    setEditingMaquina(m);
    setEditNombre(m.nombre);
    setEditNumero(m.numero != null ? String(m.numero) : '');
    setEditError('');
  }

  function openDelete(m: Maquina) {
    setDeletingMaquina(m);
    setDeleteError('');
  }

  async function handleEditSave() {
    if (!editingMaquina) return;
    setEditLoading(true);
    setEditError('');
    const result = await updateMaquina({
      id: editingMaquina.id,
      nombre: editNombre.trim(),
      numero: Number(editNumero),
      linea_id: lineaId,
    });
    setEditLoading(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setEditingMaquina(null);
      window.location.reload();
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingMaquina) return;
    setDeleteLoading(true);
    setDeleteError('');
    const result = await deleteMaquina(deletingMaquina.id, lineaId);
    setDeleteLoading(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      setDeletingMaquina(null);
      window.location.reload();
    }
  }

  return (
    <>
      {/* Add machine button */}
      {canAdd && (
        <div className="flex justify-end mb-5">
          <NeuButton
            variant="primary"
            onClick={() => router.push(`/dashboard/lineas/${lineaId}/nueva`)}
            aria-label="Agregar máquina"
            className="flex items-center gap-1.5"
          >
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
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nueva Máquina</span>
          </NeuButton>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {maquinas.length === 0 ? (
          <EmptyState />
        ) : (
          maquinas.map((maquina) => (
            <MachineCard
              key={maquina.id}
              maquina={maquina}
              lastPieza={lastPiezaByMaquina[maquina.id]}
              canAdd={canAdd}
              onClick={() => setSelectedMaquina(maquina)}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          ))
        )}
      </div>

      {/* Machine Modal */}
      {selectedMaquina && (
        <MachineModal
          maquina={selectedMaquina}
          profileRol={profileRol}
          onClose={() => setSelectedMaquina(null)}
        />
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editingMaquina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#e0e5ec] rounded-2xl shadow-[8px_8px_16px_#b8bec7,-8px_-8px_16px_#ffffff] p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">
              Editar máquina
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nombre
                </label>
                <NeuInput
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Nombre de la máquina"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Número
                </label>
                <NeuInput
                  type="number"
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                  placeholder="Número"
                />
              </div>
            </div>

            {editError && (
              <p className="mt-3 text-sm text-[#C62828]">{editError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <NeuButton
                variant="default"
                onClick={() => setEditingMaquina(null)}
                className="flex-1"
                disabled={editLoading}
              >
                Cancelar
              </NeuButton>
              <NeuButton
                variant="primary"
                onClick={handleEditSave}
                className="flex-1"
                disabled={editLoading || !editNombre.trim()}
              >
                {editLoading ? 'Guardando…' : 'Guardar'}
              </NeuButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deletingMaquina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-[#e0e5ec] rounded-2xl shadow-[8px_8px_16px_#b8bec7,-8px_-8px_16px_#ffffff] p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Eliminar máquina
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              ¿Eliminar máquina{' '}
              <span className="font-semibold text-gray-800">
                {deletingMaquina.nombre}
              </span>
              ? Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <p className="mb-3 text-sm text-[#C62828]">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <NeuButton
                variant="default"
                onClick={() => setDeletingMaquina(null)}
                className="flex-1"
                disabled={deleteLoading}
              >
                Cancelar
              </NeuButton>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#C62828] shadow-[3px_3px_6px_#b8bec7,-3px_-3px_6px_#ffffff] hover:bg-[#b71c1c] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] disabled:opacity-50 transition-all duration-150"
              >
                {deleteLoading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
