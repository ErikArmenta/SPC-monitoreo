/**
 * SPC Control Chart Constants
 *
 * Statistical factors for control chart calculations indexed by subgroup size n (2–25).
 *
 * Factors:
 *  d2  — Expected value of the range (used to estimate σ from R̄)
 *  d3  — Standard deviation of the relative range
 *  A2  — Factor for X̄-R chart: UCL/LCL(X̄) = X̄̄ ± A2·R̄
 *  A3  — Factor for X̄-S chart: UCL/LCL(X̄) = X̄̄ ± A3·S̄
 *  D3  — Lower control limit factor for R chart: LCL(R) = D3·R̄
 *  D4  — Upper control limit factor for R chart: UCL(R) = D4·R̄
 *  B3  — Lower control limit factor for S chart: LCL(S) = B3·S̄
 *  B4  — Upper control limit factor for S chart: UCL(S) = B4·S̄
 *  c4  — Unbiasing constant for sample standard deviation (used to estimate σ from S̄)
 *
 * Source: Montgomery, D.C. "Introduction to Statistical Quality Control", 7th ed.
 */

export interface SPCFactors {
  d2: number;
  d3: number;
  A2: number;
  A3: number;
  D3: number;
  D4: number;
  B3: number;
  B4: number;
  c4: number;
}

export const SPC_CONSTANTS: Record<number, SPCFactors> = {
  2:  { d2: 1.128, d3: 0.853, A2: 1.880, A3: 2.659, D3: 0,     D4: 3.267, B3: 0,     B4: 3.267, c4: 0.7979 },
  3:  { d2: 1.693, d3: 0.888, A2: 1.023, A3: 1.954, D3: 0,     D4: 2.574, B3: 0,     B4: 2.568, c4: 0.8862 },
  4:  { d2: 2.059, d3: 0.880, A2: 0.729, A3: 1.628, D3: 0,     D4: 2.282, B3: 0,     B4: 2.266, c4: 0.9213 },
  5:  { d2: 2.326, d3: 0.864, A2: 0.577, A3: 1.427, D3: 0,     D4: 2.114, B3: 0,     B4: 2.089, c4: 0.9400 },
  6:  { d2: 2.534, d3: 0.848, A2: 0.483, A3: 1.287, D3: 0,     D4: 2.004, B3: 0.030, B4: 1.970, c4: 0.9515 },
  7:  { d2: 2.704, d3: 0.833, A2: 0.419, A3: 1.182, D3: 0.076, D4: 1.924, B3: 0.118, B4: 1.882, c4: 0.9594 },
  8:  { d2: 2.847, d3: 0.820, A2: 0.373, A3: 1.099, D3: 0.136, D4: 1.864, B3: 0.185, B4: 1.815, c4: 0.9650 },
  9:  { d2: 2.970, d3: 0.808, A2: 0.337, A3: 1.032, D3: 0.184, D4: 1.816, B3: 0.239, B4: 1.761, c4: 0.9693 },
  10: { d2: 3.078, d3: 0.797, A2: 0.308, A3: 0.975, D3: 0.223, D4: 1.777, B3: 0.284, B4: 1.716, c4: 0.9727 },
  11: { d2: 3.173, d3: 0.787, A2: 0.285, A3: 0.927, D3: 0.256, D4: 1.744, B3: 0.321, B4: 1.679, c4: 0.9754 },
  12: { d2: 3.258, d3: 0.778, A2: 0.266, A3: 0.886, D3: 0.283, D4: 1.717, B3: 0.354, B4: 1.646, c4: 0.9776 },
  13: { d2: 3.336, d3: 0.770, A2: 0.249, A3: 0.850, D3: 0.307, D4: 1.693, B3: 0.382, B4: 1.618, c4: 0.9794 },
  14: { d2: 3.407, d3: 0.762, A2: 0.235, A3: 0.817, D3: 0.328, D4: 1.672, B3: 0.406, B4: 1.594, c4: 0.9810 },
  15: { d2: 3.472, d3: 0.755, A2: 0.223, A3: 0.789, D3: 0.347, D4: 1.653, B3: 0.428, B4: 1.572, c4: 0.9823 },
  16: { d2: 3.532, d3: 0.749, A2: 0.212, A3: 0.763, D3: 0.363, D4: 1.637, B3: 0.448, B4: 1.552, c4: 0.9835 },
  17: { d2: 3.588, d3: 0.743, A2: 0.203, A3: 0.739, D3: 0.378, D4: 1.622, B3: 0.466, B4: 1.534, c4: 0.9845 },
  18: { d2: 3.640, d3: 0.738, A2: 0.194, A3: 0.718, D3: 0.391, D4: 1.608, B3: 0.482, B4: 1.518, c4: 0.9854 },
  19: { d2: 3.689, d3: 0.733, A2: 0.187, A3: 0.698, D3: 0.403, D4: 1.597, B3: 0.497, B4: 1.503, c4: 0.9862 },
  20: { d2: 3.735, d3: 0.729, A2: 0.180, A3: 0.680, D3: 0.415, D4: 1.585, B3: 0.510, B4: 1.490, c4: 0.9869 },
  21: { d2: 3.778, d3: 0.724, A2: 0.173, A3: 0.663, D3: 0.425, D4: 1.575, B3: 0.523, B4: 1.477, c4: 0.9876 },
  22: { d2: 3.819, d3: 0.720, A2: 0.167, A3: 0.647, D3: 0.434, D4: 1.566, B3: 0.534, B4: 1.466, c4: 0.9882 },
  23: { d2: 3.858, d3: 0.716, A2: 0.162, A3: 0.633, D3: 0.443, D4: 1.557, B3: 0.545, B4: 1.455, c4: 0.9887 },
  24: { d2: 3.895, d3: 0.712, A2: 0.157, A3: 0.619, D3: 0.451, D4: 1.548, B3: 0.555, B4: 1.445, c4: 0.9892 },
  25: { d2: 3.931, d3: 0.708, A2: 0.153, A3: 0.606, D3: 0.459, D4: 1.541, B3: 0.565, B4: 1.435, c4: 0.9896 },
};

/**
 * Returns SPC factors for the given subgroup size.
 * Throws if n is outside the supported range (2–25).
 */
export function getSPCFactors(n: number): SPCFactors {
  const factors = SPC_CONSTANTS[n];
  if (!factors) {
    throw new RangeError(
      `SPC factors are only defined for subgroup sizes 2–25. Received n=${n}.`
    );
  }
  return factors;
}
