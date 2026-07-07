'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  buildSubgroups,
  calculateXBarR,
  calculateXBarS,
  calculateIMR,
} from '@/lib/spc/calculations';
import type { Maquina, SPCConfig, TipoGrafico, Pieza } from '@/types';

// ============================================================
// Tipos locales
// ============================================================

export interface MaquinaConConfig extends Maquina {
  lineas: { nombre: string };
  spc_config: SPCConfig[];
}

export interface CreateSPCConfigPayload {
  maquina_id: string;
  tipo_grafico: TipoGrafico;
  tamano_subgrupo: number;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  ucl?: number | null;
  cl?: number | null;
  lcl?: number | null;
  reglas_we?: {
    regla1: boolean;
    regla2: boolean;
    regla3: boolean;
    regla4: boolean;
  } | null;
  caracteristica_id?: string | null;
}

export interface UpdateSPCConfigPayload extends CreateSPCConfigPayload {
  id: string;
}

// ============================================================
// getSPCConfigs
// ============================================================

export async function getSPCConfigs(): Promise<{
  data?: MaquinaConConfig[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data: maquinas, error: maqError } = await supabase
    .from('maquinas')
    .select('*, lineas!inner(nombre)')
    .order('nombre', { ascending: true });

  if (maqError) return { error: maqError.message };
  if (!maquinas || maquinas.length === 0) return { data: [] };

  const ids = maquinas.map((m) => m.id as string);

  const { data: configs, error: cfgError } = await supabase
    .from('spc_config')
    .select('*')
    .in('maquina_id', ids);

  if (cfgError) return { error: cfgError.message };

  const configsByMaquinaId = new Map<string, SPCConfig[]>();
  for (const cfg of configs ?? []) {
    const key = cfg.maquina_id as string;
    if (!configsByMaquinaId.has(key)) configsByMaquinaId.set(key, []);
    configsByMaquinaId.get(key)!.push(cfg as SPCConfig);
  }

  const result: MaquinaConConfig[] = maquinas.map((m) => ({
    ...(m as Maquina & { lineas: { nombre: string } }),
    spc_config: configsByMaquinaId.get(m.id as string) ?? [],
  }));

  return { data: result };
}

// ============================================================
// getMaquinasSinConfig
// ============================================================

export async function getMaquinasSinConfig(): Promise<{
  data?: MaquinaConConfig[];
  error?: string;
}> {
  const result = await getSPCConfigs();
  if (result.error) return { error: result.error };

  const sinConfig = (result.data ?? []).filter(
    (m) => !m.spc_config || m.spc_config.length === 0
  );

  return { data: sinConfig };
}

// ============================================================
// createSPCConfig
// ============================================================

export async function createSPCConfig(
  payload: CreateSPCConfigPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Verificar que la máquina no tenga config existente
  const { data: existing } = await supabase
    .from('spc_config')
    .select('id')
    .eq('maquina_id', payload.maquina_id)
    .maybeSingle();

  if (existing) {
    return { error: 'Esta máquina ya tiene una configuración SPC. Use actualizar.' };
  }

  const { error } = await supabase.from('spc_config').insert({
    maquina_id: payload.maquina_id,
    tipo_grafico: payload.tipo_grafico,
    tamano_subgrupo: payload.tamano_subgrupo,
    usl: payload.usl ?? null,
    lsl: payload.lsl ?? null,
    target: payload.target ?? null,
    ucl: payload.ucl ?? null,
    cl: payload.cl ?? null,
    lcl: payload.lcl ?? null,
    reglas_we: payload.reglas_we ?? {
      regla1: true,
      regla2: true,
      regla3: true,
      regla4: true,
    },
    caracteristica_id: payload.caracteristica_id ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return {};
}

// ============================================================
// updateSPCConfig
// ============================================================

export async function updateSPCConfig(
  payload: UpdateSPCConfigPayload
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('spc_config')
    .update({
      tipo_grafico: payload.tipo_grafico,
      tamano_subgrupo: payload.tamano_subgrupo,
      usl: payload.usl ?? null,
      lsl: payload.lsl ?? null,
      target: payload.target ?? null,
      ucl: payload.ucl ?? null,
      cl: payload.cl ?? null,
      lcl: payload.lcl ?? null,
      reglas_we: payload.reglas_we ?? null,
      caracteristica_id: payload.caracteristica_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('maquina_id', payload.maquina_id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return {};
}

// ============================================================
// deleteSPCConfig
// ============================================================

export async function deleteSPCConfig(
  maquinaId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('spc_config')
    .delete()
    .eq('maquina_id', maquinaId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/configuracion');
  return {};
}

// ============================================================
// calculateLimitsFromData
// ============================================================

export async function calculateLimitsFromData(
  maquinaId: string,
  tipoGrafico: TipoGrafico,
  tamanoSubgrupo: number,
  usl: number | null = null,
  lsl: number | null = null
): Promise<{
  data?: { ucl: number; cl: number; lcl: number; cp: number | null; cpk: number | null };
  error?: string;
}> {
  const supabase = await createClient();

  const { data: piezas, error } = await supabase
    .from('piezas')
    .select('*')
    .eq('maquina_id', maquinaId)
    .not('valor_medido', 'is', null)
    .order('hora_inspeccion', { ascending: true });

  if (error) return { error: error.message };

  if (!piezas || piezas.length === 0) {
    return { error: 'La máquina no tiene piezas medidas para calcular límites.' };
  }

  const typedPiezas = piezas as Pieza[];

  try {
    if (tipoGrafico === 'i_mr') {
      if (typedPiezas.length < 2) {
        return { error: 'Se requieren al menos 2 piezas para calcular límites I-MR.' };
      }
      const values = typedPiezas
        .filter((p) => p.valor_medido !== null)
        .map((p) => p.valor_medido as number);

      const { individuals } = calculateIMR(values, usl, lsl);
      return {
        data: {
          ucl: individuals.ucl,
          cl: individuals.cl,
          lcl: individuals.lcl,
          cp: individuals.cp,
          cpk: individuals.cpk,
        },
      };
    }

    if (tipoGrafico === 'xbar_r') {
      const subgroups = buildSubgroups(typedPiezas, tamanoSubgrupo);
      if (subgroups.length === 0) {
        return {
          error: `No hay suficientes piezas para formar subgrupos de tamaño ${tamanoSubgrupo}.`,
        };
      }
      const { xbar } = calculateXBarR(subgroups, tamanoSubgrupo, usl, lsl);
      return {
        data: {
          ucl: xbar.ucl,
          cl: xbar.cl,
          lcl: xbar.lcl,
          cp: xbar.cp,
          cpk: xbar.cpk,
        },
      };
    }

    if (tipoGrafico === 'xbar_s') {
      const subgroups = buildSubgroups(typedPiezas, tamanoSubgrupo);
      if (subgroups.length === 0) {
        return {
          error: `No hay suficientes piezas para formar subgrupos de tamaño ${tamanoSubgrupo}.`,
        };
      }
      const { xbar } = calculateXBarS(subgroups, tamanoSubgrupo, usl, lsl);
      return {
        data: {
          ucl: xbar.ucl,
          cl: xbar.cl,
          lcl: xbar.lcl,
          cp: xbar.cp,
          cpk: xbar.cpk,
        },
      };
    }

    return { error: `Tipo de gráfico no reconocido: ${tipoGrafico}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
