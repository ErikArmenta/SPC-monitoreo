export interface SPCLimits {
  ucl: number;
  cl: number;
  lcl: number;
  sigma1: number; // CL ± 1σ boundary
  sigma2: number; // CL ± 2σ boundary
}

export interface Violation {
  index: number;
  rule: string;
}

/**
 * Detects Western Electric rule violations in a series of SPC data points.
 *
 * @param points - Array of measured values (in chronological order)
 * @param limits - Control limits including UCL, CL, LCL, sigma1, sigma2 boundaries
 * @param reglas - Optional config to enable/disable individual WE rules (all active by default)
 * @returns Array of violations with the index of the violating point and rule description
 */
export function detectViolations(
  points: number[],
  limits: { ucl: number; cl: number; lcl: number; sigma1: number; sigma2: number },
  reglas?: { regla1?: boolean; regla2?: boolean; regla3?: boolean; regla4?: boolean }
): Violation[] {
  const violations: Violation[] = [];
  const { ucl, cl, lcl, sigma1, sigma2 } = limits;

  // Derive sigma boundaries from the provided values.
  // sigma1 and sigma2 represent the distance from CL to the 1σ and 2σ zone boundaries.
  // Zone A: beyond 2σ from CL (between sigma2 and UCL/LCL)
  // Zone B: between 1σ and 2σ from CL
  // Zone C: within 1σ of CL

  const upperSigma1 = cl + sigma1; // +1σ
  const upperSigma2 = cl + sigma2; // +2σ
  const lowerSigma1 = cl - sigma1; // -1σ
  const lowerSigma2 = cl - sigma2; // -2σ

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    // Rule 1: One point beyond 3σ (outside UCL or LCL)
    if (reglas?.regla1 !== false) {
      if (p > ucl || p < lcl) {
        violations.push({
          index: i,
          rule: "Regla 1: Punto fuera de los límites de control (más de 3σ de la línea central)",
        });
      }
    }

    // Rule 2: 2 of 3 consecutive points in Zone A (same side, between 2σ and 3σ)
    if (reglas?.regla2 !== false) {
      if (i >= 2) {
        const window = [points[i - 2], points[i - 1], points[i]];
        const aboveZoneA = window.filter((v) => v > upperSigma2 && v <= ucl).length;
        const belowZoneA = window.filter((v) => v < lowerSigma2 && v >= lcl).length;
        if (aboveZoneA >= 2 || belowZoneA >= 2) {
          violations.push({
            index: i,
            rule: "Regla 2: 2 de 3 puntos consecutivos en Zona A (entre 2σ y 3σ del mismo lado)",
          });
        }
      }
    }

    // Rule 3: 4 of 5 consecutive points in Zone B or beyond (same side, beyond 1σ)
    if (reglas?.regla3 !== false) {
      if (i >= 4) {
        const window = [points[i - 4], points[i - 3], points[i - 2], points[i - 1], points[i]];
        const aboveZoneB = window.filter((v) => v > upperSigma1).length;
        const belowZoneB = window.filter((v) => v < lowerSigma1).length;
        if (aboveZoneB >= 4 || belowZoneB >= 4) {
          violations.push({
            index: i,
            rule: "Regla 3: 4 de 5 puntos consecutivos en Zona B o más allá (más de 1σ del mismo lado)",
          });
        }
      }
    }

    // Rule 4: 8 consecutive points on the same side of the center line
    if (reglas?.regla4 !== false) {
      if (i >= 7) {
        const window = [
          points[i - 7],
          points[i - 6],
          points[i - 5],
          points[i - 4],
          points[i - 3],
          points[i - 2],
          points[i - 1],
          points[i],
        ];
        const allAbove = window.every((v) => v > cl);
        const allBelow = window.every((v) => v < cl);
        if (allAbove || allBelow) {
          violations.push({
            index: i,
            rule: "Regla 4: 8 puntos consecutivos del mismo lado de la línea central",
          });
        }
      }
    }
  }

  return violations;
}
