import { getSPCFactors } from './constants';
import type { Pieza, SPCLimits } from '@/types';

// ============================================================
// Helpers internos
// ============================================================

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function range(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function sampleStdDev(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// ============================================================
// buildSubgroups
// ============================================================

/**
 * Agrupa los valores medidos de un array de piezas en subgrupos de tamaño n.
 * Las piezas sin valor_medido son descartadas.
 * El último subgrupo incompleto (< n piezas) se descarta.
 */
export function buildSubgroups(piezas: Pieza[], n: number): number[][] {
  const values = piezas
    .filter((p) => p.valor_medido !== null)
    .map((p) => p.valor_medido as number);

  const subgroups: number[][] = [];
  for (let i = 0; i + n <= values.length; i += n) {
    subgroups.push(values.slice(i, i + n));
  }
  return subgroups;
}

// ============================================================
// calculateCapability
// ============================================================

/**
 * Calcula los índices de capacidad del proceso Cp y Cpk.
 *
 * @param cl           Línea central (X̄̄ estimada)
 * @param usl          Límite de especificación superior
 * @param lsl          Límite de especificación inferior
 * @param sigmaEstimada Desviación estándar del proceso (σ estimada)
 * @returns { cp, cpk } — null si no se pueden calcular (faltan especificaciones o σ = 0)
 */
export function calculateCapability(
  cl: number,
  usl: number | null,
  lsl: number | null,
  sigmaEstimada: number
): { cp: number | null; cpk: number | null } {
  if (sigmaEstimada <= 0) return { cp: null, cpk: null };

  let cp: number | null = null;
  if (usl !== null && lsl !== null) {
    cp = (usl - lsl) / (6 * sigmaEstimada);
  }

  let cpk: number | null = null;
  if (usl !== null && lsl !== null) {
    const cpkUpper = (usl - cl) / (3 * sigmaEstimada);
    const cpkLower = (cl - lsl) / (3 * sigmaEstimada);
    cpk = Math.min(cpkUpper, cpkLower);
  } else if (usl !== null) {
    cpk = (usl - cl) / (3 * sigmaEstimada);
  } else if (lsl !== null) {
    cpk = (cl - lsl) / (3 * sigmaEstimada);
  }

  return { cp, cpk };
}

// ============================================================
// calculateXBarR — Gráfico X̄-R
// ============================================================

/**
 * Calcula los límites de control para la gráfica X̄-R.
 *
 * @param data  Subgrupos: array de arrays de mediciones individuales
 * @param n     Tamaño de subgrupo
 * @param usl   Límite de especificación superior (opcional)
 * @param lsl   Límite de especificación inferior (opcional)
 */
export function calculateXBarR(
  data: number[][],
  n: number,
  usl: number | null = null,
  lsl: number | null = null
): { xbar: SPCLimits; r: SPCLimits; sigmaEstimada: number } {
  if (data.length === 0) {
    throw new Error('calculateXBarR: se requiere al menos un subgrupo.');
  }

  const { A2, D3, D4, d2 } = getSPCFactors(n);

  const subgroupMeans = data.map((sg) => mean(sg));
  const subgroupRanges = data.map((sg) => range(sg));

  const xBarBar = mean(subgroupMeans); // X̄̄
  const rBar = mean(subgroupRanges);   // R̄

  const sigmaEstimada = rBar / d2;

  const { cp, cpk } = calculateCapability(xBarBar, usl, lsl, sigmaEstimada);

  const xbar: SPCLimits = {
    ucl: xBarBar + A2 * rBar,
    cl: xBarBar,
    lcl: xBarBar - A2 * rBar,
    usl,
    lsl,
    cp,
    cpk,
  };

  const r: SPCLimits = {
    ucl: D4 * rBar,
    cl: rBar,
    lcl: D3 * rBar,
    usl: null,
    lsl: null,
    cp: null,
    cpk: null,
  };

  return { xbar, r, sigmaEstimada };
}

// ============================================================
// calculateXBarS — Gráfico X̄-S
// ============================================================

/**
 * Calcula los límites de control para la gráfica X̄-S.
 *
 * @param data  Subgrupos: array de arrays de mediciones individuales
 * @param n     Tamaño de subgrupo
 * @param usl   Límite de especificación superior (opcional)
 * @param lsl   Límite de especificación inferior (opcional)
 */
export function calculateXBarS(
  data: number[][],
  n: number,
  usl: number | null = null,
  lsl: number | null = null
): { xbar: SPCLimits; s: SPCLimits; sigmaEstimada: number } {
  if (data.length === 0) {
    throw new Error('calculateXBarS: se requiere al menos un subgrupo.');
  }

  const { A3, B3, B4, c4 } = getSPCFactors(n);

  const subgroupMeans = data.map((sg) => mean(sg));
  const subgroupSigmas = data.map((sg) => (sg.length > 1 ? sampleStdDev(sg) : 0));

  const xBarBar = mean(subgroupMeans); // X̄̄
  const sBar = mean(subgroupSigmas);   // S̄

  const sigmaEstimada = sBar / c4;

  const { cp, cpk } = calculateCapability(xBarBar, usl, lsl, sigmaEstimada);

  const xbar: SPCLimits = {
    ucl: xBarBar + A3 * sBar,
    cl: xBarBar,
    lcl: xBarBar - A3 * sBar,
    usl,
    lsl,
    cp,
    cpk,
  };

  const s: SPCLimits = {
    ucl: B4 * sBar,
    cl: sBar,
    lcl: B3 * sBar,
    usl: null,
    lsl: null,
    cp: null,
    cpk: null,
  };

  return { xbar, s, sigmaEstimada };
}

// ============================================================
// calculateIMR — Gráfico I-MR (Individuales y Rango Móvil)
// ============================================================

/**
 * Calcula los límites de control para la gráfica I-MR.
 * Usa n=2 de forma implícita: d2=1.128, D3=0, D4=3.267.
 *
 * @param data  Array de valores individuales (cada pieza es un punto)
 * @param usl   Límite de especificación superior (opcional)
 * @param lsl   Límite de especificación inferior (opcional)
 */
export function calculateIMR(
  data: number[],
  usl: number | null = null,
  lsl: number | null = null
): { individuals: SPCLimits; mr: SPCLimits; sigmaEstimada: number } {
  if (data.length < 2) {
    throw new Error('calculateIMR: se requieren al menos 2 observaciones.');
  }

  // Para n=2 los factores son fijos por definición del gráfico I-MR
  const d2 = 1.128;
  const D3 = 0;
  const D4 = 3.267;

  const movingRanges = data.slice(1).map((v, i) => Math.abs(v - data[i]));

  const xBar = mean(data);        // X̄ (media de individuales)
  const mrBar = mean(movingRanges); // MR̄

  const sigmaEstimada = mrBar / d2;
  const sigma3 = 3 * sigmaEstimada;

  const { cp, cpk } = calculateCapability(xBar, usl, lsl, sigmaEstimada);

  const individuals: SPCLimits = {
    ucl: xBar + sigma3,
    cl: xBar,
    lcl: xBar - sigma3,
    usl,
    lsl,
    cp,
    cpk,
  };

  const mr: SPCLimits = {
    ucl: D4 * mrBar,
    cl: mrBar,
    lcl: D3 * mrBar, // 0 para n=2
    usl: null,
    lsl: null,
    cp: null,
    cpk: null,
  };

  return { individuals, mr, sigmaEstimada };
}
