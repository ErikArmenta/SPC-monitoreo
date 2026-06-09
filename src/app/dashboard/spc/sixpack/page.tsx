import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/utils/roles';
import type { Linea, Maquina } from '@/types';
import SixPackView from './SixPackView';

// ─────────────────────────────────────────────────────────────────────────────
// Page (server component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function SixPackPage() {
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  // ── Role check (admin / super_admin / supervisor) ────────────────────────────
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

  return <SixPackView lineas={lineas} maquinas={maquinas} />;
}
