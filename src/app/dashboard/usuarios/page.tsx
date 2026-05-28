import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Profile, Linea, Maquina } from '@/types';
import UsuariosClientView from './UsuariosClientView';

export default async function UsuariosPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Verificar rol super_admin
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (currentProfile?.rol !== 'super_admin') {
    redirect('/dashboard');
  }

  // Usar admin client para leer todos los profiles (sin filtros RLS)
  const admin = createAdminClient();

  const [
    { data: usuarios },
    { data: lineas },
    { data: maquinas },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    admin
      .from('lineas')
      .select('id, nombre, numero, activa')
      .order('numero', { ascending: true }),
    admin
      .from('maquinas')
      .select('id, nombre, numero, linea_id, activa')
      .order('numero', { ascending: true }),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <UsuariosClientView
        usuarios={(usuarios ?? []) as Profile[]}
        lineas={(lineas ?? []) as Linea[]}
        maquinas={(maquinas ?? []) as Maquina[]}
      />
    </div>
  );
}
