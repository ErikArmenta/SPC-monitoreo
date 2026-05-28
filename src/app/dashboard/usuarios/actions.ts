'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { Rol } from '@/types';

// ─── Guards ────────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', session.user.id)
    .single();

  if (profile?.rol !== 'super_admin') {
    throw new Error('Acceso denegado — solo super_admin');
  }
}

// ─── Crear usuario ─────────────────────────────────────────────────────────

export interface CreateUserPayload {
  email: string;
  password: string;
  nombre: string;
  rol: Rol;
  lineas_asignadas: string[];
  maquinas_asignadas: string[];
}

export async function createUser(payload: CreateUserPayload): Promise<{ error?: string }> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  // Crear usuario en auth.users
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
  });

  if (authError || !authData?.user) {
    return { error: authError?.message ?? 'Error al crear usuario en Auth' };
  }

  const userId = authData.user.id;

  // Insertar/actualizar profile (el trigger lo crea, pero puede no tener todos los campos)
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      email: payload.email,
      nombre: payload.nombre,
      rol: payload.rol,
      lineas_asignadas: payload.lineas_asignadas,
      maquinas_asignadas: payload.maquinas_asignadas,
      activo: true,
    });

  if (profileError) {
    // Revertir: borrar el usuario de auth
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath('/dashboard/usuarios');
  return {};
}

// ─── Actualizar usuario ────────────────────────────────────────────────────

export interface UpdateUserPayload {
  id: string;
  nombre: string;
  rol: Rol;
  lineas_asignadas: string[];
  maquinas_asignadas: string[];
}

export async function updateUser(payload: UpdateUserPayload): Promise<{ error?: string }> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .update({
      nombre: payload.nombre,
      rol: payload.rol,
      lineas_asignadas: payload.lineas_asignadas,
      maquinas_asignadas: payload.maquinas_asignadas,
    })
    .eq('id', payload.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/usuarios');
  return {};
}

// ─── Toggle activo ─────────────────────────────────────────────────────────

export async function toggleActivo(
  userId: string,
  activo: boolean
): Promise<{ error?: string }> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .update({ activo })
    .eq('id', userId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/usuarios');
  return {};
}
