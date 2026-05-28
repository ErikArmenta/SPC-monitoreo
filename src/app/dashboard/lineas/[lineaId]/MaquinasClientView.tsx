'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import MachineModal from '@/components/MachineModal';
import { Maquina, Pieza, Rol } from '@/types';

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
  onClick: () => void;
}

function MachineCard({ maquina, lastPieza, onClick }: MachineCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left w-full focus:outline-none"
    >
      <NeuCard className="p-5 cursor-pointer transition-shadow duration-200 hover:shadow-neu-pressed group-focus-visible:ring-2 group-focus-visible:ring-[#1565C0]/50">
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
              onClick={() => setSelectedMaquina(maquina)}
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
    </>
  );
}
