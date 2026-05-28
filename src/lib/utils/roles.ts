import { Rol } from '@/types';

// ============================================================
// Jerarquía de roles (mayor número = mayor privilegio)
// ============================================================

export const ROLE_HIERARCHY: Record<Rol, number> = {
  inspector: 1,
  supervisor: 2,
  admin: 3,
  super_admin: 4,
};

// ============================================================
// Guards de nivel
// ============================================================

export function isSuperAdmin(rol: Rol): boolean {
  return rol === 'super_admin';
}

export function isAdminOrAbove(rol: Rol): boolean {
  return ROLE_HIERARCHY[rol] >= ROLE_HIERARCHY['admin'];
}

// ============================================================
// Guards de acceso a recursos
// ============================================================

/** Recursos reconocidos del sistema */
type Resource =
  | 'lineas'
  | 'maquinas'
  | 'piezas'
  | 'captura'
  | 'estadisticas'
  | 'spc_dashboard'
  | 'recalcular'
  | 'usuarios'
  | 'gestion_lineas';

const RESOURCE_ACCESS: Record<Resource, Rol[]> = {
  lineas: ['super_admin', 'admin', 'supervisor', 'inspector'],
  maquinas: ['super_admin', 'admin', 'supervisor', 'inspector'],
  piezas: ['super_admin', 'admin', 'supervisor', 'inspector'],
  captura: ['inspector'],
  estadisticas: ['super_admin', 'admin', 'supervisor', 'inspector'],
  spc_dashboard: ['super_admin', 'admin', 'supervisor'],
  recalcular: ['super_admin', 'admin'],
  usuarios: ['super_admin'],
  gestion_lineas: ['super_admin', 'admin'],
};

export function canAccess(rol: Rol, resource: string): boolean {
  const allowed = RESOURCE_ACCESS[resource as Resource];
  if (!allowed) return false;
  return allowed.includes(rol);
}

// ============================================================
// Helpers de permiso específicos
// ============================================================

export function canRecalculate(rol: Rol): boolean {
  return ROLE_HIERARCHY[rol] >= ROLE_HIERARCHY['admin'];
}

export function canManageUsers(rol: Rol): boolean {
  return isSuperAdmin(rol);
}

export function canManageLines(rol: Rol): boolean {
  return ROLE_HIERARCHY[rol] >= ROLE_HIERARCHY['admin'];
}

export function canCapture(rol: Rol): boolean {
  return rol === 'inspector';
}
