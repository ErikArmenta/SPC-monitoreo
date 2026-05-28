import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminOrAbove } from '@/lib/utils/roles';
import { Linea, Profile } from '@/types';
import NeuCard from '@/components/ui/NeuCard';
import LineasClientFilters from './LineasClientFilters';

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
      {/* Base platform */}
      <rect x="10" y="52" width="44" height="6" rx="3" fill="#D4A017" />

      {/* Vertical column */}
      <rect x="28" y="38" width="8" height="16" rx="2" fill="#B8860B" />

      {/* Pivot joint at shoulder */}
      <circle cx="32" cy="38" r="5" fill="#D4A017" stroke="#B8860B" strokeWidth="1.5" />

      {/* Upper arm */}
      <rect
        x="30"
        y="22"
        width="6"
        height="18"
        rx="3"
        fill="#D4A017"
        transform="rotate(-15 32 38)"
      />

      {/* Elbow joint */}
      <circle
        cx="24"
        cy="24"
        r="4"
        fill="#D4A017"
        stroke="#B8860B"
        strokeWidth="1.5"
      />

      {/* Forearm */}
      <rect
        x="10"
        y="14"
        width="6"
        height="14"
        rx="3"
        fill="#B8860B"
        transform="rotate(30 24 24)"
      />

      {/* Wrist joint */}
      <circle cx="14" cy="13" r="3.5" fill="#D4A017" stroke="#B8860B" strokeWidth="1.5" />

      {/* Gripper left finger */}
      <path
        d="M10 10 Q6 8 6 4"
        stroke="#D4A017"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gripper right finger */}
      <path
        d="M14 9 Q16 6 16 3"
        stroke="#D4A017"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Shine/highlight on upper arm */}
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
// Linea Card
// ---------------------------------------------------------------------------
function LineaCard({ linea }: { linea: Linea }) {
  return (
    <Link
      href={`/dashboard/lineas/${linea.id}`}
      className="group focus:outline-none"
    >
      <NeuCard className="p-5 cursor-pointer transition-shadow duration-200 hover:shadow-neu-pressed group-focus-visible:ring-2 group-focus-visible:ring-[#1565C0]/50">
        <div className="flex flex-col items-center gap-3 text-center">
          {/* Robot arm icon */}
          <div className="w-16 h-16 flex items-center justify-center bg-[#e0e5ec] rounded-[16px] shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff]">
            <RobotArmIcon className="w-10 h-10" />
          </div>

          {/* Line name */}
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

          {/* Status badge */}
          <EstadoBadge activa={linea.activa} />
        </div>
      </NeuCard>
    </Link>
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
        {hasSearch ? 'No se encontraron líneas con ese nombre.' : 'No hay líneas de producción registradas.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface DashboardPageProps {
  searchParams: { q?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single<Profile>();

  // Build lineas query
  let query = supabase
    .from('lineas')
    .select('*')
    .order('numero', { ascending: true });

  // Inspectors only see their assigned lines
  if (
    profile?.rol === 'inspector' &&
    Array.isArray(profile.lineas_asignadas) &&
    profile.lineas_asignadas.length > 0
  ) {
    query = query.in('id', profile.lineas_asignadas);
  }

  const { data: lineas = [] } = await query;

  // Server-side search filter
  const q = (searchParams?.q ?? '').trim().toLowerCase();
  const filteredLineas: Linea[] = q
    ? (lineas ?? []).filter((l: Linea) =>
        l.nombre.toLowerCase().includes(q)
      )
    : (lineas ?? []);

  const canAdd = isAdminOrAbove(profile?.rol ?? 'inspector');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Líneas de Producción
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredLineas.length}{' '}
            {filteredLineas.length === 1 ? 'línea' : 'líneas'}
            {q ? ` encontrada${filteredLineas.length !== 1 ? 's' : ''} para "${searchParams.q}"` : ' en total'}
          </p>
        </div>

        <LineasClientFilters canAdd={canAdd} initialQ={q} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {filteredLineas.length === 0 ? (
          <EmptyState hasSearch={!!q} />
        ) : (
          filteredLineas.map((linea: Linea) => (
            <LineaCard key={linea.id} linea={linea} />
          ))
        )}
      </div>
    </div>
  );
}
