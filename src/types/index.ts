// ============================================================
// Enumeraciones / Literales de unión
// ============================================================

export type Rol = 'super_admin' | 'admin' | 'supervisor' | 'inspector';

export type EstadoPieza = 'ok' | 'no_ok';

export type TipoGrafico = 'xbar_r' | 'xbar_s' | 'i_mr';

// ============================================================
// Entidades de base de datos
// ============================================================

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  lineas_asignadas: string[];
  maquinas_asignadas: string[];
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Linea {
  id: string;
  nombre: string;
  numero: number;
  icono: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Maquina {
  id: string;
  linea_id: string;
  nombre: string;
  numero: number;
  icono: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Pieza {
  id: string;
  maquina_id: string;
  codigo_pieza: string;
  estado: EstadoPieza;
  valor_medido: number | null;
  hora_inspeccion: string;
  tiempo_ciclo: number | null;
  inspector_id: string;
  observaciones: string | null;
  fuera_de_control: boolean;
  regla_violada: string | null;
  created_at: string;
}

export interface SPCConfig {
  id: string;
  maquina_id: string;
  tipo_grafico: TipoGrafico;
  ucl: number | null;
  cl: number | null;
  lcl: number | null;
  usl: number | null;
  lsl: number | null;
  tamano_subgrupo: number;
  cp: number | null;
  cpk: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface SPCRecalculo {
  id: string;
  maquina_id: string;
  usuario_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  ucl_anterior: number | null;
  cl_anterior: number | null;
  lcl_anterior: number | null;
  ucl_nuevo: number | null;
  cl_nuevo: number | null;
  lcl_nuevo: number | null;
  cp_anterior: number | null;
  cpk_anterior: number | null;
  cp_nuevo: number | null;
  cpk_nuevo: number | null;
  puntos_excluidos: string[];
  notas: string | null;
  created_at: string;
}

// ============================================================
// Tipos para gráficas SPC
// ============================================================

/** Un punto trazado en la gráfica de control */
export interface SPCPoint {
  /** Índice secuencial del punto (1-based) */
  index: number;
  /** Valor individual medido (para I-MR) o media del subgrupo (para X̄-R / X̄-S) */
  value: number;
  /** Media del subgrupo (X̄); coincide con value para I-MR */
  subgroupMean: number;
  /** Rango del subgrupo (R) o rango móvil (MR) */
  range: number | null;
  /** Desviación estándar del subgrupo (S); null para X̄-R e I-MR */
  sigma: number | null;
  /** true si el punto viola alguna regla de Western Electric */
  isOutOfControl: boolean;
  /** Descripción de la regla violada (null si el punto está bajo control) */
  ruleViolated: string | null;
  /** ISO 8601 — hora de inspección */
  timestamp: string;
  /** Referencia a la pieza original de BD */
  piezaId: string;
}

/** Límites estadísticos calculados para la gráfica de control */
export interface SPCLimits {
  ucl: number;
  cl: number;
  lcl: number;
  /** Límite de especificación superior (definido por el cliente) */
  usl: number | null;
  /** Límite de especificación inferior (definido por el cliente) */
  lsl: number | null;
  /** Índice de capacidad del proceso */
  cp: number | null;
  /** Índice de capacidad centrado del proceso */
  cpk: number | null;
}

// ============================================================
// Tipos auxiliares para UI
// ============================================================

/** Semáforo de capacidad de proceso basado en Cpk */
export type CpkStatus = 'capable' | 'marginal' | 'incapable';

/** Resultado de la evaluación SPC al insertar una pieza */
export interface SPCEvaluationResult {
  pieza: Pieza;
  isOutOfControl: boolean;
  ruleViolated: string | null;
}

/** Comparativa de valores antes/después de un recálculo */
export interface RecalculoComparativa {
  ucl_anterior: number | null;
  cl_anterior: number | null;
  lcl_anterior: number | null;
  ucl_nuevo: number;
  cl_nuevo: number;
  lcl_nuevo: number;
  cp_anterior: number | null;
  cpk_anterior: number | null;
  cp_nuevo: number | null;
  cpk_nuevo: number | null;
}
