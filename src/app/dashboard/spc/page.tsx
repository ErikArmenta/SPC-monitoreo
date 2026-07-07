import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/utils/roles';
import type { Linea, Maquina, SPCRecalculo, Profile, Rol } from '@/types';
import SPCDashboardView from './SPCDashboardView';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados (usados por SPCDashboardView)
// ─────────────────────────────────────────────────────────────────────────────

export interface RecalculoWithUser extends SPCRecalculo {
  usuario_nombre: string;
  maquina_nombre: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page (server component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function SPCPage({
  searchParams,
}: {
  searchParams: Promise<{ maquina_id?: string }>;
}) {
  const params = await searchParams;
  const initialMaquinaId = params.maquina_id ?? '';
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  // ── Role check (admin / super_admin only) ────────────────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (!profileData || !canAccess(profileData.rol, 'spc_dashboard')) {
    redirect('/dashboard');
  }

  // ── Lineas activas ──────────────────────────────────────────────────────────
  const { data: lineasData } = await supabase
    .from('lineas')
    .select('*')
    .eq('activa', true)
    .order('numero', { ascending: true });

  const lineas: Linea[] = lineasData ?? [];

  // ── Máquinas activas ────────────────────────────────────────────────────────
  const { data: maquinasData } = await supabase
    .from('maquinas')
    .select('*')
    .eq('activa', true)
    .order('numero', { ascending: true });

  const maquinas: Maquina[] = maquinasData ?? [];

  // ── Historial de recálculos (últimos 100) ───────────────────────────────────
  const { data: recalculosData } = await supabase
    .from('spc_recalculos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const recalculos: SPCRecalculo[] = recalculosData ?? [];

  // Resolve user names
  const userIds = Array.from(new Set(recalculos.map((r) => r.usuario_id).filter(Boolean)));
  let profilesMap: Map<string, string> = new Map();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nombre')
      .in('id', userIds);

    profilesMap = new Map(
      (profiles as Pick<Profile, 'id' | 'nombre'>[] | null ?? []).map((p) => [p.id, p.nombre])
    );
  }

  // Build maquina name map (include inactive ones that may appear in old recalculos)
  const maquinaMap = new Map(maquinas.map((m) => [m.id, m.nombre]));
  const missingMaquinaIds = Array.from(new Set(recalculos.map((r) => r.maquina_id))).filter(
    (id) => !maquinaMap.has(id)
  );

  if (missingMaquinaIds.length > 0) {
    const { data: extraMaquinas } = await supabase
      .from('maquinas')
      .select('id, nombre')
      .in('id', missingMaquinaIds);

    for (const m of extraMaquinas ?? []) {
      maquinaMap.set((m as Pick<Maquina, 'id' | 'nombre'>).id, (m as Pick<Maquina, 'id' | 'nombre'>).nombre);
    }
  }

  const recalculosWithUser: RecalculoWithUser[] = recalculos.map((r) => ({
    ...r,
    usuario_nombre: profilesMap.get(r.usuario_id) ?? 'Desconocido',
    maquina_nombre: maquinaMap.get(r.maquina_id) ?? 'Máquina desconocida',
  }));

  return (
    <SPCDashboardView
      lineas={lineas}
      maquinas={maquinas}
      recalculos={recalculosWithUser}
      userRol={profileData.rol as Rol}
      initialMaquinaId={initialMaquinaId}
    />
  );
}
