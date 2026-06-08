import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isAdminOrAbove } from '@/lib/utils/roles';
import { Linea, Profile } from '@/types';
import LineasClientView from './LineasClientView';

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
      <LineasClientView lineas={filteredLineas} canAdd={canAdd} initialQ={q} />
    </div>
  );
}
