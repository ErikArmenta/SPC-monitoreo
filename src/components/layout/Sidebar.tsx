'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { Rol } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// Iconos SVG inline (lucide-react compatible)
// ============================================================

function IconLineas() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconEstadisticas() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconSPC() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconUsuarios() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCaptura() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconSixPack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="8" height="6" rx="1.5" />
      <rect x="14" y="2" width="8" height="6" rx="1.5" />
      <rect x="2" y="9" width="8" height="6" rx="1.5" />
      <rect x="14" y="9" width="8" height="6" rx="1.5" />
      <rect x="2" y="16" width="8" height="6" rx="1.5" />
      <rect x="14" y="16" width="8" height="6" rx="1.5" />
    </svg>
  );
}

// ============================================================
// Helpers de presentación
// ============================================================

const ROL_LABEL: Record<Rol, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Inspector',
};

const ROL_COLOR: Record<Rol, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-amber-100 text-amber-700',
  inspector: 'bg-green-100 text-green-700',
};

// ============================================================
// Definición de items de navegación
// ============================================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Roles que pueden ver este item */
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Líneas',
    icon: <IconLineas />,
    roles: ['super_admin', 'admin', 'supervisor', 'inspector'],
  },
  {
    href: '/dashboard/estadisticas',
    label: 'Estadísticas',
    icon: <IconEstadisticas />,
    roles: ['super_admin', 'admin', 'supervisor', 'inspector'],
  },
  {
    href: '/dashboard/spc',
    label: 'SPC',
    icon: <IconSPC />,
    roles: ['super_admin', 'admin', 'supervisor'],
  },
  {
    href: '/dashboard/spc/sixpack',
    label: 'Six Pack',
    icon: <IconSixPack />,
    roles: ['super_admin', 'admin', 'supervisor'],
  },
  {
    href: '/dashboard/usuarios',
    label: 'Usuarios',
    icon: <IconUsuarios />,
    roles: ['super_admin'],
  },
  {
    href: '/dashboard/captura',
    label: 'Captura',
    icon: <IconCaptura />,
    roles: ['inspector'],
  },
];

// ============================================================
// Props del Sidebar
// ============================================================

interface SidebarProps {
  /** Estado del sidebar en mobile (controlado desde Navbar) */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ============================================================
// Componente Sidebar
// ============================================================

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [, startTransition] = useTransition();

  const rol: Rol | null = profile?.rol ?? null;

  const visibleItems = rol
    ? NAV_ITEMS.filter((item) => item.roles.includes(rol))
    : [];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  // ---- Sidebar desktop ----
  const sidebarContent = (
    <div
      className={cn(
        'flex flex-col h-full bg-[#e0e5ec] transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo + toggle collapse */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-[#c8cfd8]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Logo hexagonal */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 2L28.7846 9V23L16 30L3.21539 23V9L16 2Z"
                fill="#1565C0"
                stroke="#1565C0"
                strokeWidth="1"
              />
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Inter, sans-serif">
                SPC
              </text>
            </svg>
            <span className="font-semibold text-[#2d3748] text-sm leading-tight whitespace-nowrap">
              SPC<br />
              <span className="text-xs font-normal text-gray-500">Tiempo Real</span>
            </span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L28.7846 9V23L16 30L3.21539 23V9L16 2Z" fill="#1565C0" />
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Inter, sans-serif">SPC</text>
            </svg>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'p-1.5 rounded-[10px] text-gray-500 hover:text-gray-700 transition-colors',
            'shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff]',
            'active:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff]',
            collapsed && 'mx-auto mt-1'
          )}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => { startTransition(() => {}); onMobileClose?.(); }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-all duration-150',
                'text-sm font-medium text-gray-600',
                active
                  ? 'shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] text-[#1565C0]'
                  : 'shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff] hover:text-[#1565C0]',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className={cn('flex-shrink-0', active ? 'text-[#1565C0]' : 'text-gray-500')}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 pb-4 space-y-2 border-t border-[#c8cfd8] pt-3">
        {profile && !collapsed && (
          <div className="neu-pressed px-3 py-2.5 rounded-[14px] space-y-0.5">
            <p className="text-sm font-semibold text-[#2d3748] truncate">{profile.nombre}</p>
            <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            <span
              className={cn(
                'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1',
                ROL_COLOR[profile.rol]
              )}
            >
              {ROL_LABEL[profile.rol]}
            </span>
          </div>
        )}

        {profile && collapsed && (
          <div
            className="mx-auto w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center text-white text-sm font-bold shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff]"
            title={`${profile.nombre} — ${ROL_LABEL[profile.rol]}`}
          >
            {profile.nombre.charAt(0).toUpperCase()}
          </div>
        )}

        <button
          onClick={handleSignOut}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-[14px]',
            'text-sm font-medium text-red-500 transition-all duration-150',
            'shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff]',
            'hover:text-red-700 active:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff]',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <IconLogout />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar desktop — siempre visible en md+ */}
      <aside className="hidden md:flex h-screen sticky top-0 neu-flat flex-col overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile — overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 z-50 flex flex-col md:hidden neu-flat overflow-hidden"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
