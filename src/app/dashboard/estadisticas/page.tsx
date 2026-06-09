import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Linea, Maquina, Pieza, Turno } from '@/types';
import EstadisticasView, { EstadisticasViewProps } from './EstadisticasView';
import { HourlyData } from '@/components/charts/BarChart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHourlyData(piezas: Pieza[]): HourlyData[] {
  const map = new Map<string, { ok: number; noOk: number }>();
  for (const pieza of piezas) {
    const h = new Date(pieza.hora_inspeccion).getHours();
    const label = `${h.toString().padStart(2, '0')}:00`;
    const slot = map.get(label) ?? { ok: 0, noOk: 0 };
    if (pieza.estado === 'ok') slot.ok++;
    else slot.noOk++;
    map.set(label, slot);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hora, counts]) => ({ hora, ok: counts.ok, noOk: counts.noOk }));
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  searchParams: {
    linea?: string;
    maquina?: string;
    turno?: string;
    start_date?: string;
    end_date?: string;
  };
}

export default async function EstadisticasPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const lineaId = searchParams?.linea ?? '';
  const maquinaId = searchParams?.maquina ?? '';
  const turnoId = searchParams?.turno ?? '';
  const startDate = searchParams?.start_date ?? '';
  const endDate = searchParams?.end_date ?? '';

  // Fetch all active lineas (for the filter select)
  const { data: lineasData } = await supabase
    .from('lineas')
    .select('*')
    .eq('activa', true)
    .order('numero', { ascending: true });
  const lineas: Linea[] = lineasData ?? [];

  // Fetch all maquinas (for filter select — filtered by linea in client)
  const maquinasQuery = supabase
    .from('maquinas')
    .select('*')
    .eq('activa', true)
    .order('numero', { ascending: true });
  const { data: maquinasData } = await maquinasQuery;
  const maquinas: Maquina[] = maquinasData ?? [];

  // Fetch active turnos (for the filter select)
  const { data: turnosData } = await supabase
    .from('turnos')
    .select('*')
    .eq('activo', true)
    .order('hora_inicio', { ascending: true });
  const turnos: Turno[] = turnosData ?? [];

  // Counts for stat cards (all, not filtered by date)
  const totalLineasActivas = lineas.length;
  const totalMaquinasActivas = maquinas.length;

  // Build piezas query with filters
  let piezasQuery = supabase
    .from('piezas')
    .select('id, maquina_id, estado, hora_inspeccion')
    .order('hora_inspeccion', { ascending: true });

  if (maquinaId) {
    piezasQuery = piezasQuery.eq('maquina_id', maquinaId);
  } else if (lineaId) {
    // Get all maquina ids from the selected linea
    const maquinaIds = maquinas
      .filter((m) => m.linea_id === lineaId)
      .map((m) => m.id);
    if (maquinaIds.length > 0) {
      piezasQuery = piezasQuery.in('maquina_id', maquinaIds);
    } else {
      // Linea has no machines — return empty result
      const filters: EstadisticasViewProps['filters'] = {
        lineaId,
        maquinaId,
        turnoId,
        startDate,
        endDate,
      };
      return (
        <EstadisticasView
          lineas={lineas}
          maquinas={maquinas}
          turnos={turnos}
          totalOk={0}
          totalNoOk={0}
          hourlyData={[]}
          totalLineasActivas={totalLineasActivas}
          totalMaquinasActivas={totalMaquinasActivas}
          filters={filters}
        />
      );
    }
  }

  if (turnoId) {
    piezasQuery = piezasQuery.eq('turno_id', turnoId);
  }

  if (startDate) {
    piezasQuery = piezasQuery.gte('hora_inspeccion', `${startDate}T00:00:00`);
  }
  if (endDate) {
    piezasQuery = piezasQuery.lte('hora_inspeccion', `${endDate}T23:59:59`);
  }

  // Limit to avoid huge fetches when no filters are applied
  if (!lineaId && !maquinaId && !startDate && !endDate) {
    // Default: today
    const today = new Date().toISOString().split('T')[0];
    piezasQuery = piezasQuery.gte('hora_inspeccion', `${today}T00:00:00`);
  }

  const { data: piezasData } = await piezasQuery;
  const piezas: Pieza[] = (piezasData ?? []) as Pieza[];

  // Aggregate
  const totalOk = piezas.filter((p) => p.estado === 'ok').length;
  const totalNoOk = piezas.filter((p) => p.estado === 'no_ok').length;
  const hourlyData = buildHourlyData(piezas);

  const filters: EstadisticasViewProps['filters'] = {
    lineaId,
    maquinaId,
    turnoId,
    startDate,
    endDate,
  };

  return (
    <EstadisticasView
      lineas={lineas}
      maquinas={maquinas}
      turnos={turnos}
      totalOk={totalOk}
      totalNoOk={totalNoOk}
      hourlyData={hourlyData}
      totalLineasActivas={totalLineasActivas}
      totalMaquinasActivas={totalMaquinasActivas}
      filters={filters}
    />
  );
}
