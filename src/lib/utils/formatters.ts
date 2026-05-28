import { CpkStatus } from '@/types';

// ============================================================
// Fecha y hora
// ============================================================

/**
 * Formatea un string ISO 8601 o Date a formato local legible.
 * Ejemplo: "28/05/2026 15:05"
 */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ============================================================
// Duración
// ============================================================

/**
 * Convierte segundos (número) a string con 2 decimales + sufijo 's'.
 * Ejemplo: 1.38 → "1.38s"
 */
export function formatDuration(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}

// ============================================================
// Numérico
// ============================================================

/**
 * Formatea un número con 2 decimales fijos.
 * Ejemplo: 1.3 → "1.30"
 */
export function formatNumeric(value: number): string {
  return value.toFixed(2);
}

// ============================================================
// Estado de capacidad (Cpk)
// ============================================================

/**
 * Clasifica el Cpk en tres niveles:
 * - 'capable'    : Cpk ≥ 1.33  (proceso capaz)
 * - 'marginal'   : 1.0 ≤ Cpk < 1.33 (proceso marginal)
 * - 'incapable'  : Cpk < 1.0   (proceso no capaz)
 */
export function getCpkStatus(cpk: number): CpkStatus {
  if (cpk >= 1.33) return 'capable';
  if (cpk >= 1.0) return 'marginal';
  return 'incapable';
}
