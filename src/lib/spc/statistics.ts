// ============================================================
// statistics.ts — Funciones estadísticas para el módulo Six Pack
// ============================================================

// ────────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function globalStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Sigma estimada por rango móvil promedio (MR̄ / d2).
 * d2 = 1.128 para rangos móviles de n=2 pares consecutivos.
 */
function sigmaByMovingRange(values: number[]): number {
  if (values.length < 2) return 0;
  const d2 = 1.128;
  const movingRanges = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const mrBar = mean(movingRanges);
  return mrBar / d2;
}

/**
 * Aproximación de la función de error complementaria (erfc).
 * Precisión: error máximo < 1.5e-7.
 * Abramowitz & Stegun 7.1.26.
 */
function erfc(x: number): number {
  const t = 1.0 / (1.0 + 0.3275911 * Math.abs(x));
  const poly =
    t * (0.254829592 +
      t * (-0.284496736 +
        t * (1.421413741 +
          t * (-1.453152027 +
            t * 1.061405429))));
  const result = poly * Math.exp(-x * x);
  return x >= 0 ? result : 2 - result;
}

/**
 * CDF de la distribución normal estándar: P(Z ≤ z).
 */
function normalCDF(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/**
 * PDF de la distribución normal estándar.
 */
function normalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/**
 * Cuantil de la distribución normal estándar (inversa de la CDF).
 * Algoritmo de Beasley-Springer-Moro.
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00,
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p <= pHigh) {
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }

  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// ────────────────────────────────────────────────────────────
// Tipos exportados
// ────────────────────────────────────────────────────────────

export interface CapabilityIndices {
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  sigmaWithin: number;
  sigmaOverall: number;
  ppmBelowLSL: number | null;
  ppmAboveUSL: number | null;
  ppmTotal: number | null;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  n: number;
}

export interface HistogramBar {
  x0: number;
  x1: number;
  count: number;
  normalCurveY: number;
}

export interface NormalProbPoint {
  value: number;
  zScore: number;
}

export interface BoxPlotData {
  q1: number;
  median: number;
  q3: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

export interface Last25Point {
  index: number;
  value: number;
  isOutOfSpec: boolean;
}

// ────────────────────────────────────────────────────────────
// 1. calcCapabilityIndices
// ────────────────────────────────────────────────────────────

/**
 * Calcula índices de capacidad del proceso (Cp, Cpk, Pp, Ppk).
 *
 * - Cp / Cpk: usan sigma estimada por rango móvil promedio (sigma within).
 * - Pp / Ppk: usan sigma global (desviación estándar muestral de todos los datos).
 * - PPM: partes por millón estimadas asumiendo distribución normal.
 */
export function calcCapabilityIndices(
  values: number[],
  usl: number | null,
  lsl: number | null
): CapabilityIndices {
  const n = values.length;
  const m = n > 0 ? mean(values) : 0;
  const stdDev = n > 1 ? globalStdDev(values) : 0;
  const sigmaWithin = n > 1 ? sigmaByMovingRange(values) : 0;
  const sigmaOverall = stdDev;
  const minVal = n > 0 ? Math.min(...values) : 0;
  const maxVal = n > 0 ? Math.max(...values) : 0;

  // Cp y Cpk (sigma within)
  let cp: number | null = null;
  let cpk: number | null = null;
  if (sigmaWithin > 0) {
    if (usl !== null && lsl !== null) {
      cp = (usl - lsl) / (6 * sigmaWithin);
    }
    if (usl !== null && lsl !== null) {
      cpk = Math.min((usl - m) / (3 * sigmaWithin), (m - lsl) / (3 * sigmaWithin));
    } else if (usl !== null) {
      cpk = (usl - m) / (3 * sigmaWithin);
    } else if (lsl !== null) {
      cpk = (m - lsl) / (3 * sigmaWithin);
    }
  }

  // Pp y Ppk (sigma overall)
  let pp: number | null = null;
  let ppk: number | null = null;
  if (sigmaOverall > 0) {
    if (usl !== null && lsl !== null) {
      pp = (usl - lsl) / (6 * sigmaOverall);
    }
    if (usl !== null && lsl !== null) {
      ppk = Math.min((usl - m) / (3 * sigmaOverall), (m - lsl) / (3 * sigmaOverall));
    } else if (usl !== null) {
      ppk = (usl - m) / (3 * sigmaOverall);
    } else if (lsl !== null) {
      ppk = (m - lsl) / (3 * sigmaOverall);
    }
  }

  // PPM estimadas (usando sigma overall para la distribución)
  let ppmBelowLSL: number | null = null;
  let ppmAboveUSL: number | null = null;
  let ppmTotal: number | null = null;
  if (sigmaOverall > 0) {
    if (lsl !== null) {
      const zLSL = (lsl - m) / sigmaOverall;
      ppmBelowLSL = normalCDF(zLSL) * 1_000_000;
    }
    if (usl !== null) {
      const zUSL = (usl - m) / sigmaOverall;
      ppmAboveUSL = (1 - normalCDF(zUSL)) * 1_000_000;
    }
    if (ppmBelowLSL !== null || ppmAboveUSL !== null) {
      ppmTotal = (ppmBelowLSL ?? 0) + (ppmAboveUSL ?? 0);
    }
  }

  return {
    cp,
    cpk,
    pp,
    ppk,
    sigmaWithin,
    sigmaOverall,
    ppmBelowLSL,
    ppmAboveUSL,
    ppmTotal,
    mean: m,
    stdDev,
    min: minVal,
    max: maxVal,
    n,
  };
}

// ────────────────────────────────────────────────────────────
// 2. buildHistogramData
// ────────────────────────────────────────────────────────────

/**
 * Construye datos para el histograma de frecuencias.
 * Cada barra incluye el valor de la curva normal teórica en su punto medio,
 * escalado para que el área total de la curva sea igual al número de observaciones
 * multiplicado por el ancho de barra (densidad de frecuencia).
 *
 * @param values  Array de valores
 * @param bins    Número de barras (default: 10)
 */
export function buildHistogramData(values: number[], bins = 10): HistogramBar[] {
  if (values.length === 0) return [];

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Si todos los valores son iguales, crear un único bin
  const range = maxVal - minVal;
  const binWidth = range === 0 ? 1 : range / bins;

  const m = mean(values);
  const sigma = globalStdDev(values);

  const result: HistogramBar[] = [];

  for (let i = 0; i < bins; i++) {
    const x0 = minVal + i * binWidth;
    const x1 = i === bins - 1 ? maxVal + 1e-10 : x0 + binWidth;
    const midpoint = (x0 + x1) / 2;

    const count = values.filter((v) => v >= x0 && v < x1).length;

    // Altura de la curva normal teórica escalada (frecuencia, no densidad)
    let normalCurveY = 0;
    if (sigma > 0) {
      const zMid = (midpoint - m) / sigma;
      normalCurveY = normalPDF(zMid) * (values.length * binWidth) / sigma;
    }

    result.push({ x0, x1, count, normalCurveY });
  }

  return result;
}

// ────────────────────────────────────────────────────────────
// 3. buildNormalProbData
// ────────────────────────────────────────────────────────────

/**
 * Construye datos para el gráfico de probabilidad normal.
 * Usa la fórmula de Blom para las posiciones de trazado:
 *   p_i = (i - 0.375) / (n + 0.25)
 * donde i es el rango (1-based) del valor ordenado.
 *
 * Si los puntos forman una línea recta, los datos siguen una distribución normal.
 *
 * @returns Array de { value, zScore } ordenado de menor a mayor
 */
export function buildNormalProbData(values: number[]): NormalProbPoint[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  return sorted.map((value, idx) => {
    const i = idx + 1; // rango 1-based
    const p = (i - 0.375) / (n + 0.25); // fórmula de Blom
    const zScore = normalQuantile(p);
    return { value, zScore };
  });
}

// ────────────────────────────────────────────────────────────
// 4. buildBoxPlotData
// ────────────────────────────────────────────────────────────

/**
 * Calcula los datos para el diagrama de caja y bigotes (box plot).
 *
 * Bigotes: Q1 - 1.5*IQR y Q3 + 1.5*IQR, limitados al valor real más cercano.
 * Outliers: valores fuera del rango de los bigotes.
 */
export function buildBoxPlotData(values: number[]): BoxPlotData {
  if (values.length === 0) {
    return { q1: 0, median: 0, q3: 0, whiskerLow: 0, whiskerHigh: 0, outliers: [] };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  /**
   * Cuantil usando interpolación lineal (método de tipo 7 de R / numpy).
   */
  function quantile(arr: number[], p: number): number {
    if (arr.length === 1) return arr[0];
    const h = (arr.length - 1) * p;
    const lo = Math.floor(h);
    const hi = Math.ceil(h);
    return arr[lo] + (arr[hi] - arr[lo]) * (h - lo);
  }

  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  // Los bigotes llegan hasta el valor más extremo DENTRO del fence
  const inliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const whiskerLow = inliers.length > 0 ? Math.min(...inliers) : q1;
  const whiskerHigh = inliers.length > 0 ? Math.max(...inliers) : q3;

  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  return { q1, median, q3, whiskerLow, whiskerHigh, outliers };
}

// ────────────────────────────────────────────────────────────
// 5. buildLast25Data
// ────────────────────────────────────────────────────────────

/**
 * Retorna los últimos 25 valores del array con un flag isOutOfSpec.
 * Un valor está fuera de especificación si es menor que LSL o mayor que USL.
 *
 * @param values  Array completo de valores medidos (orden cronológico)
 * @param usl     Límite de especificación superior (o null)
 * @param lsl     Límite de especificación inferior (o null)
 */
export function buildLast25Data(
  values: number[],
  usl: number | null,
  lsl: number | null
): Last25Point[] {
  const last25 = values.slice(-25);

  return last25.map((value, idx) => {
    const isOutOfSpec =
      (usl !== null && value > usl) || (lsl !== null && value < lsl);
    return { index: idx + 1, value, isOutOfSpec };
  });
}
