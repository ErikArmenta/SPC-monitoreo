'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// ─── Tipos de retorno ───────────────────────────────────────────────────────

export interface ActiveAlarm {
  pieza_id: string;
  maquina_id: string;
  maquina_nombre: string;
  linea_nombre: string;
  regla_violada: string | null;
  valor_medido: number | null;
  hora_inspeccion: string;
  inspector_nombre: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by_nombre: string | null;
}

// ─── getActiveAlarms ────────────────────────────────────────────────────────

/**
 * Retorna las últimas 100 piezas fuera_de_control=true,
 * con datos de máquina, línea, inspector y estado de acknowledge.
 */
export async function getActiveAlarms(): Promise<{
  data: ActiveAlarm[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('piezas')
    .select(`
      id,
      maquina_id,
      regla_violada,
      valor_medido,
      hora_inspeccion,
      maquinas!inner (
        nombre,
        lineas!inner ( nombre )
      ),
      profiles!inspector_id (
        nombre
      ),
      alarm_acknowledgments (
        acknowledged_at,
        profiles!acknowledged_by ( nombre )
      )
    `)
    .eq('fuera_de_control', true)
    .order('hora_inspeccion', { ascending: false })
    .limit(100);

  if (error) {
    return { data: [], error: error.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alarms: ActiveAlarm[] = (data ?? []).map((row: any) => {
    const ack = row.alarm_acknowledgments?.[0] ?? null;
    return {
      pieza_id: row.id,
      maquina_id: row.maquina_id,
      maquina_nombre: row.maquinas?.nombre ?? '—',
      linea_nombre: row.maquinas?.lineas?.nombre ?? '—',
      regla_violada: row.regla_violada,
      valor_medido: row.valor_medido,
      hora_inspeccion: row.hora_inspeccion,
      inspector_nombre: row.profiles?.nombre ?? '—',
      acknowledged: !!ack,
      acknowledged_at: ack?.acknowledged_at ?? null,
      acknowledged_by_nombre: ack?.profiles?.nombre ?? null,
    };
  });

  return { data: alarms };
}

// ─── acknowledgeAlarm ───────────────────────────────────────────────────────

/**
 * Registra que un supervisor/admin tomó nota de la alarma.
 * Si ya existe un acknowledge para esa pieza, no inserta duplicado.
 */
export async function acknowledgeAlarm(
  piezaId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Verificar si ya fue acknowledged
  const { data: existing } = await supabase
    .from('alarm_acknowledgments')
    .select('id')
    .eq('pieza_id', piezaId)
    .maybeSingle();

  if (existing) {
    // Ya acknowledged, no duplicar
    return {};
  }

  const { error } = await supabase
    .from('alarm_acknowledgments')
    .insert({
      pieza_id: piezaId,
      acknowledged_by: userId,
    });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/alarmas');
  return {};
}

// ─── getAlarmCount ──────────────────────────────────────────────────────────

/**
 * Retorna el conteo de piezas fuera_de_control en las últimas 24h
 * que aún NO han sido acknowledged.
 */
export async function getAlarmCount(): Promise<number> {
  const supabase = await createClient();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // IDs de piezas que ya tienen acknowledge
  const { data: acked } = await supabase
    .from('alarm_acknowledgments')
    .select('pieza_id');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ackedIds: string[] = (acked ?? []).map((a: any) => a.pieza_id);

  let query = supabase
    .from('piezas')
    .select('id', { count: 'exact', head: true })
    .eq('fuera_de_control', true)
    .gte('hora_inspeccion', since);

  if (ackedIds.length > 0) {
    query = query.not('id', 'in', `(${ackedIds.join(',')})`);
  }

  const { count, error } = await query;

  if (error) return 0;

  return count ?? 0;
}
