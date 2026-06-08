'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// ─── Guards ────────────────────────────────────────────────────────────────

async function requireAdminOrAbove() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (profile?.rol !== 'admin' && profile?.rol !== 'super_admin') {
    throw new Error('Acceso denegado — solo admin o super_admin');
  }
}

// ─── Crear línea ────────────────────────────────────────────────────────────

export async function createLinea(payload: {
  nombre: string;
  numero: number;
  activa: boolean;
}): Promise<{ id?: string; error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('lineas')
    .insert({
      nombre: payload.nombre,
      numero: payload.numero,
      activa: payload.activa,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { id: data.id };
}

// ─── Actualizar línea ───────────────────────────────────────────────────────

export async function updateLinea(payload: {
  id: string;
  nombre: string;
  numero: number;
  activa: boolean;
}): Promise<{ error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('lineas')
    .update({
      nombre: payload.nombre,
      numero: payload.numero,
      activa: payload.activa,
    })
    .eq('id', payload.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return {};
}

// ─── Eliminar línea ─────────────────────────────────────────────────────────

export async function deleteLinea(lineaId: string): Promise<{ error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  // Verificar que no tenga máquinas asociadas
  const { count, error: countError } = await admin
    .from('maquinas')
    .select('id', { count: 'exact', head: true })
    .eq('linea_id', lineaId);

  if (countError) return { error: countError.message };

  if (count && count > 0) {
    return { error: 'No se puede eliminar: tiene máquinas asociadas' };
  }

  const { error } = await admin
    .from('lineas')
    .delete()
    .eq('id', lineaId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return {};
}
