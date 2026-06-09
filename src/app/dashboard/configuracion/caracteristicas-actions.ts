'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Caracteristica } from '@/types';

// ─── Tipos de payload ──────────────────────────────────────────────────────

export interface CreateCaracteristicaPayload {
  maquina_id: string;
  nombre: string;
  unidad?: string;
  descripcion?: string | null;
  activa?: boolean;
  orden?: number;
}

export interface UpdateCaracteristicaPayload {
  nombre?: string;
  unidad?: string;
  descripcion?: string | null;
  activa?: boolean;
  orden?: number;
}

// ─── Obtener características de una máquina ────────────────────────────────

export async function getCaracteristicasByMaquina(
  maquinaId: string
): Promise<{ data?: Caracteristica[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('caracteristicas')
    .select('*')
    .eq('maquina_id', maquinaId)
    .order('orden', { ascending: true });

  if (error) return { error: error.message };
  return { data: data as Caracteristica[] };
}

// ─── Crear característica ──────────────────────────────────────────────────

export async function createCaracteristica(
  payload: CreateCaracteristicaPayload
): Promise<{ data?: Caracteristica; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('caracteristicas')
    .insert({
      maquina_id: payload.maquina_id,
      nombre: payload.nombre,
      unidad: payload.unidad ?? 'mm',
      descripcion: payload.descripcion ?? null,
      activa: payload.activa ?? true,
      orden: payload.orden ?? 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return { data: data as Caracteristica };
}

// ─── Actualizar característica ─────────────────────────────────────────────

export async function updateCaracteristica(
  id: string,
  payload: UpdateCaracteristicaPayload
): Promise<{ data?: Caracteristica; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('caracteristicas')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return { data: data as Caracteristica };
}

// ─── Eliminar característica ───────────────────────────────────────────────

export async function deleteCaracteristica(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('caracteristicas')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return {};
}
