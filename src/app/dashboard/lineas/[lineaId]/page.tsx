import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminOrAbove } from '@/lib/utils/roles';
import { Linea, Maquina, Pieza, Profile } from '@/types';
import MaquinasClientView from './MaquinasClientView';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface MaquinasPageProps {
  params: { lineaId: string };
}

export default async function MaquinasPage({ params }: MaquinasPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch user profile (needed for role-based actions)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single<Profile>();

  // Fetch linea info for breadcrumb and title
  const { data: linea } = await supabase
    .from('lineas')
    .select('*')
    .eq('id', params.lineaId)
    .single<Linea>();

  if (!linea) {
    redirect('/dashboard');
  }

  // Fetch machines for this line, ordered by numero
  const { data: rawMaquinas } = await supabase
    .from('maquinas')
    .select('*')
    .eq('linea_id', params.lineaId)
    .order('numero', { ascending: true });

  const maquinas: Maquina[] = rawMaquinas ?? [];

  // Fetch last pieza per machine for the "último estado" indicator.
  // We fetch the most recent piezas across all machines in the line and group in JS.
  const lastPiezaByMaquina: Record<string, Pieza> = {};

  const maquinaIds = maquinas.map((m) => m.id);

  if (maquinaIds.length > 0) {
    const { data: recentPiezas } = await supabase
      .from('piezas')
      .select('*')
      .in('maquina_id', maquinaIds)
      .order('hora_inspeccion', { ascending: false })
      .limit(Math.max(maquinaIds.length * 3, 50));

    if (recentPiezas) {
      for (const pieza of recentPiezas as Pieza[]) {
        if (!lastPiezaByMaquina[pieza.maquina_id]) {
          lastPiezaByMaquina[pieza.maquina_id] = pieza;
        }
      }
    }
  }

  const canAdd = isAdminOrAbove(profile?.rol ?? 'inspector');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back button + Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-10 h-10 bg-[#e0e5ec] rounded-[12px] shadow-[4px_4px_8px_#b8bec7,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] transition-shadow duration-150 text-gray-600"
          aria-label="Volver a líneas de producción"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-700 transition-colors font-medium"
          >
            Líneas de Producción
          </Link>
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
            className="text-gray-300"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="text-gray-800 font-semibold">{linea.nombre}</span>
        </nav>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          Máquinas — {linea.nombre}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {maquinas.length}{' '}
          {maquinas.length === 1 ? 'máquina registrada' : 'máquinas registradas'}
        </p>
      </div>

      {/* Client view: grid + add button + modal */}
      <MaquinasClientView
        maquinas={maquinas}
        lastPiezaByMaquina={lastPiezaByMaquina}
        canAdd={canAdd}
        lineaId={params.lineaId}
        lineaNombre={linea.nombre}
        profileRol={profile?.rol ?? 'inspector'}
      />
    </div>
  );
}
