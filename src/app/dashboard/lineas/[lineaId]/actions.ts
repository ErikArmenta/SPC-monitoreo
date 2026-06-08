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

// ─── Crear máquina ──────────────────────────────────────────────────────────

export async function createMaquina(payload: {
  nombre: string;
  numero: number;
  linea_id: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('maquinas')
    .insert({
      nombre: payload.nombre,
      numero: payload.numero,
      linea_id: payload.linea_id,
      activa: true,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/lineas/${payload.linea_id}`);
  return { id: data.id };
}

// ─── Actualizar máquina ─────────────────────────────────────────────────────

export async function updateMaquina(payload: {
  id: string;
  nombre: string;
  numero: number;
  linea_id: string;
}): Promise<{ error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('maquinas')
    .update({
      nombre: payload.nombre,
      numero: payload.numero,
    })
    .eq('id', payload.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/lineas/${payload.linea_id}`);
  return {};
}

// ─── Eliminar máquina ───────────────────────────────────────────────────────

export async function deleteMaquina(
  maquinaId: string,
  linea_id: string
): Promise<{ error?: string }> {
  try {
    await requireAdminOrAbove();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('maquinas')
    .delete()
    .eq('id', maquinaId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/lineas/${linea_id}`);
  return {};
}
