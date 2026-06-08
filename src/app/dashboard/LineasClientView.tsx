'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Linea } from '@/types';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';
import { updateLinea, deleteLinea } from './lineas/actions';

// ---------------------------------------------------------------------------
// Robot Arm SVG Icon — golden (#D4A017)
// ---------------------------------------------------------------------------
function RobotArmIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="10" y="52" width="44" height="6" rx="3" fill="#D4A017" />
      <rect x="28" y="38" width="8" height="16" rx="2" fill="#B8860B" />
      <circle cx="32" cy="38" r="5" fill="#D4A017" stroke="#B8860B" strokeWidth="1.5" />
      <rect x="30" y="22" width="6" height="18" rx="3" fill="#D4A017" transform="rotate(-15 32 38)" />
      <circle cx="24" cy="24" r="4" fill="#D4A017" stroke="#B8860B" strokeWidth="1.5" />
      <rect x="10" y="14" width="6" height="14" rx="3" fill="#B8860B" transform="rotate(30 24 24)" />
      <circle cx="14" cy="13" r="3.5" fill="#D4A017" stroke="#B8860B" strokeWidth="1.5" />
      <path d="M10 10 Q6 8 6 4" stroke="#D4A017" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M14 9 Q16 6 16 3" stroke="#D4A017" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="32" cy="38" r="2" fill="#FFD700" opacity="0.6" />
      <circle cx="24" cy="24" r="1.5" fill="#FFD700" opacity="0.6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
function EstadoBadge({ activa }: { activa: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        activa
          ? 'bg-[#4CAF50]/15 text-[#2E7D32]'
          : 'bg-[#F44336]/15 text-[#C62828]',
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          activa ? 'bg-[#4CAF50]' : 'bg-[#F44336]',
        ].join(' ')}
      />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="col-span-2 md:col-span-3 flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 flex items-center justify-center bg-[#e0e5ec] rounded-[20px] shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff]">
        <RobotArmIcon className="w-12 h-12 opacity-40" />
      </div>
      <p className="text-gray-500 text-base font-medium">
        {hasSearch
          ? 'No se encontraron líneas con ese nombre.'
          : 'No hay líneas de producción registradas.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------
interface EditModalProps {
  linea: Linea;
  onClose: () => void;
}

function EditModal({ linea, onClose }: EditModalProps) {
  const [nombre, setNombre] = useState(linea.nombre);
  const [numero, setNumero] = useState(linea.numero);
  const [activa, setActiva] = useState(linea.activa);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setLoading(true);
    setError('');
    const result = await updateLinea({ id: linea.id, nombre: nombre.trim(), numero, activa });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <NeuCard className="p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Editar línea</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Nombre
            </label>
            <NeuInput
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la línea"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Número
            </label>
            <NeuInput
              type="number"
              value={numero}
              onChange={(e) => setNumero(Number(e.target.value))}
              placeholder="Número de línea"
              min={1}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={activa}
              onClick={() => setActiva((v) => !v)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                activa
                  ? 'bg-[#1565C0]'
                  : 'bg-[#e0e5ec] shadow-[inset_2px_2px_4px_#b8bec7,inset_-2px_-2px_4px_#ffffff]',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
                  activa ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
            <span className="text-sm font-medium text-gray-600">
              {activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          {error && (
            <p className="text-sm text-[#C62828] bg-[#F44336]/10 rounded-[10px] px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <NeuButton
              type="button"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </NeuButton>
            <NeuButton
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </NeuButton>
          </div>
        </form>
      </NeuCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirm Modal
// ---------------------------------------------------------------------------
interface DeleteModalProps {
  linea: Linea;
  onClose: () => void;
}

function DeleteModal({ linea, onClose }: DeleteModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    setError('');
    const result = await deleteLinea(linea.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <NeuCard className="p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Eliminar línea</h2>
        <p className="text-sm text-gray-600 mb-4">
          ¿Eliminar línea <span className="font-semibold text-gray-800">{linea.nombre}</span>?
          Esta acción no se puede deshacer.
        </p>
        {error && (
          <p className="text-sm text-[#C62828] bg-[#F44336]/10 rounded-[10px] px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <NeuButton
            type="button"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </NeuButton>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-[#C62828] text-white rounded-[15px] px-5 py-2.5 font-medium text-sm shadow-[6px_6px_12px_#8e1a1a,_-6px_-6px_12px_#ff3636] active:shadow-[inset_4px_4px_8px_#8e1a1a,_inset_-4px_-4px_8px_#ff3636] transition-shadow duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </NeuCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface LineasClientViewProps {
  lineas: Linea[];
  canAdd: boolean;
  initialQ: string;
}

export default function LineasClientView({ lineas, canAdd, initialQ }: LineasClientViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchOpen, setSearchOpen] = useState(!!initialQ);
  const [searchValue, setSearchValue] = useState(initialQ);

  const [editingLinea, setEditingLinea] = useState<Linea | null>(null);
  const [deletingLinea, setDeletingLinea] = useState<Linea | null>(null);

  function handleSearch(value: string) {
    setSearchValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function toggleSearch() {
    if (searchOpen && searchValue) {
      handleSearch('');
    }
    setSearchOpen((prev) => !prev);
  }

  function openEdit(e: React.MouseEvent, linea: Linea) {
    e.preventDefault();
    e.stopPropagation();
    setEditingLinea(linea);
  }

  function openDelete(e: React.MouseEvent, linea: Linea) {
    e.preventDefault();
    e.stopPropagation();
    setDeletingLinea(linea);
  }

  const q = searchValue.trim().toLowerCase();
  const displayLineas = q
    ? lineas.filter((l) => l.nombre.toLowerCase().includes(q))
    : lineas;

  return (
    <>
      {/* Modals */}
      {editingLinea && (
        <EditModal linea={editingLinea} onClose={() => setEditingLinea(null)} />
      )}
      {deletingLinea && (
        <DeleteModal linea={deletingLinea} onClose={() => setDeletingLinea(null)} />
      )}

      {/* Header row: title + filters */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Líneas de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {displayLineas.length}{' '}
            {displayLineas.length === 1 ? 'línea' : 'líneas'}
            {q
              ? ` encontrada${displayLineas.length !== 1 ? 's' : ''} para "${searchValue}"`
              : ' en total'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {searchOpen && (
            <NeuInput
              type="text"
              placeholder="Buscar línea..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-48 text-sm"
              autoFocus
            />
          )}

          <NeuButton
            onClick={toggleSearch}
            aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar línea'}
            className={isPending ? 'opacity-70' : ''}
          >
            {searchOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </NeuButton>

          {canAdd && (
            <NeuButton
              variant="primary"
              onClick={() => router.push('/dashboard/lineas/nueva')}
              aria-label="Agregar línea"
              className="flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nueva Línea</span>
            </NeuButton>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {displayLineas.length === 0 ? (
          <EmptyState hasSearch={!!q} />
        ) : (
          displayLineas.map((linea) => (
            <div key={linea.id} className="relative group">
              {/* Edit / Delete buttons — only for admin+ */}
              {canAdd && (
                <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={(e) => openEdit(e, linea)}
                    title="Editar línea"
                    className="w-7 h-7 flex items-center justify-center bg-[#e0e5ec] rounded-[8px] shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff] text-gray-600 transition-shadow duration-150"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => openDelete(e, linea)}
                    title="Eliminar línea"
                    className="w-7 h-7 flex items-center justify-center bg-[#e0e5ec] rounded-[8px] shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff] hover:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff] text-[#C62828] transition-shadow duration-150"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              )}

              <Link
                href={`/dashboard/lineas/${linea.id}`}
                className="group/card focus:outline-none block"
              >
                <NeuCard className="p-5 cursor-pointer transition-shadow duration-200 hover:shadow-neu-pressed group-focus-visible/card:ring-2 group-focus-visible/card:ring-[#1565C0]/50">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
                      <RobotArmIcon className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Línea
                      </p>
                      <p className="text-xl font-bold text-gray-800 leading-tight">
                        {linea.nombre}
                      </p>
                      {linea.numero && (
                        <p className="text-xs text-gray-400 font-medium">
                          #{linea.numero}
                        </p>
                      )}
                    </div>
                    <EstadoBadge activa={linea.activa} />
                  </div>
                </NeuCard>
              </Link>
            </div>
          ))
        )}
      </div>
    </>
  );
}
