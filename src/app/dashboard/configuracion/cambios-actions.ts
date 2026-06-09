'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// Tipos
// ============================================================

export type TipoCambio =
  | 'herramental'
  | 'material'
  | 'operador'
  | 'ajuste_maquina'
  | 'mantenimiento'
  | 'otro';

export interface CambioProceso {
  id: string;
  maquina_id: string;
  tipo: TipoCambio;
  descripcion: string;
  fecha: string;
  registrado_por: string | null;
  created_at: string;
}

export interface CreateCambioProcesoPayload {
  maquina_id: string;
  tipo: TipoCambio;
  descripcion: string;
  fecha?: string; // ISO string; si no viene, se usa now()
}

// ============================================================
// getCambiosByMaquina
// ============================================================

export async function getCambiosByMaquina(
  maquinaId: string
): Promise<{ data: CambioProceso[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cambios_proceso')
    .select('*')
    .eq('maquina_id', maquinaId)
    .order('fecha', { ascending: false });

  if (error) return { data: [], error: error.message };

  return { data: (data ?? []) as CambioProceso[] };
}

// ============================================================
// createCambioProceso
// ============================================================

export async function createCambioProceso(
  payload: CreateCambioProcesoPayload
): Promise<{ data?: CambioProceso; error?: string }> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { error: 'No autenticado' };

  const { data, error } = await supabase
    .from('cambios_proceso')
    .insert({
      maquina_id: payload.maquina_id,
      tipo: payload.tipo,
      descripcion: payload.descripcion,
      fecha: payload.fecha ?? new Date().toISOString(),
      registrado_por: session.user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  revalidatePath('/dashboard/spc');

  return { data: data as CambioProceso };
}
