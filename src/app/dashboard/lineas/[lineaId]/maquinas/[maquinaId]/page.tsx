import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Linea, Maquina, Pieza } from '@/types';
import PiezasClientView from './PiezasClientView';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
interface PiezasPageProps {
  params: { lineaId: string; maquinaId: string };
}

export default async function PiezasPage({ params }: PiezasPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Fetch linea info for breadcrumb
  const { data: linea } = await supabase
    .from('lineas')
    .select('*')
    .eq('id', params.lineaId)
    .single<Linea>();

  if (!linea) {
    redirect('/dashboard');
  }

  // Fetch machine info
  const { data: maquina } = await supabase
    .from('maquinas')
    .select('*')
    .eq('id', params.maquinaId)
    .eq('linea_id', params.lineaId)
    .single<Maquina>();

  if (!maquina) {
    redirect(`/dashboard/lineas/${params.lineaId}`);
  }

  // Fetch piezas for this machine, most recent first
  const { data: rawPiezas } = await supabase
    .from('piezas')
    .select('*')
    .eq('maquina_id', params.maquinaId)
    .order('hora_inspeccion', { ascending: false })
    .limit(500);

  const piezas: Pieza[] = rawPiezas ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back button + Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/dashboard/lineas/${params.lineaId}`}
          className="flex items-center justify-center w-10 h-10 bg-[#e0e5ec] rounded-[12px] shadow-[4px_4px_8px_#b8bec7,-4px_-4px_8px_#ffffff] hover:shadow-[inset_3px_3px_6px_#b8bec7,inset_-3px_-3px_6px_#ffffff] transition-shadow duration-150 text-gray-600 flex-shrink-0"
          aria-label="Volver a máquinas"
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

        <nav
          className="flex items-center gap-2 text-sm overflow-hidden"
          aria-label="Breadcrumb"
        >
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
          >
            Líneas
          </Link>
          <ChevronRight />
          <Link
            href={`/dashboard/lineas/${params.lineaId}`}
            className="text-gray-400 hover:text-gray-700 transition-colors font-medium whitespace-nowrap"
          >
            {linea.nombre}
          </Link>
          <ChevronRight />
          <span className="text-gray-800 font-semibold truncate">
            {maquina.nombre}
          </span>
        </nav>
      </div>

      {/* Client view: header with filters + piece list */}
      <PiezasClientView piezas={piezas} maquinaNombre={maquina.nombre} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local helper — chevron separator for breadcrumb
// ---------------------------------------------------------------------------
function ChevronRight() {
  return (
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
      className="text-gray-300 flex-shrink-0"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
