'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Turno } from '@/types';

// ─── Payload types ──────────────────────────────────────────────────────────

export interface CreateTurnoPayload {
  nombre: string;
  hora_inicio: string; // format: 'HH:MM'
  hora_fin: string;    // format: 'HH:MM'
  activo?: boolean;
}

export interface UpdateTurnoPayload {
  nombre?: string;
  hora_inicio?: string;
  hora_fin?: string;
  activo?: boolean;
}

// ─── getTurnos ───────────────────────────────────────────────────────────────

export async function getTurnos(): Promise<{ data: Turno[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .order('hora_inicio', { ascending: true });

  if (error) return { data: [], error: error.message };

  return { data: data as Turno[] };
}

// ─── createTurno ────────────────────────────────────────────────────────────

export async function createTurno(
  payload: CreateTurnoPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('turnos').insert({
    nombre: payload.nombre,
    hora_inicio: payload.hora_inicio,
    hora_fin: payload.hora_fin,
    activo: payload.activo ?? true,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion/turnos');
  return {};
}

// ─── updateTurno ────────────────────────────────────────────────────────────

export async function updateTurno(
  id: string,
  payload: UpdateTurnoPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('turnos')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion/turnos');
  return {};
}

// ─── deleteTurno (soft delete: activo = false) ───────────────────────────────

export async function deleteTurno(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('turnos')
    .update({ activo: false })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion/turnos');
  return {};
}
