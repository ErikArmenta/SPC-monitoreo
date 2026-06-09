'use client';

import { cn } from '@/lib/utils';
import Breadcrumb from './Breadcrumb';
import NotificationBell from './NotificationBell';

// ============================================================
// Icono hamburger
// ============================================================

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

// ============================================================
// Props
// ============================================================

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// ============================================================
// Componente Navbar (top bar mobile)
// ============================================================

export default function Navbar({ sidebarOpen, onToggleSidebar }: NavbarProps) {
  return (
    <header
      className={cn(
        'md:hidden sticky top-0 z-30',
        'flex items-center gap-3 px-4 py-3',
        'bg-[#e0e5ec]',
        'shadow-[0_4px_8px_#b8bec7,_0_-2px_6px_#ffffff]'
      )}
    >
      {/* Botón hamburger */}
      <button
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={sidebarOpen}
        className={cn(
          'p-2 rounded-[12px] text-gray-600 transition-all duration-150',
          sidebarOpen
            ? 'shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] text-[#1565C0]'
            : 'shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff] hover:text-[#1565C0]'
        )}
      >
        <IconMenu open={sidebarOpen} />
      </button>

      {/* Logo + nombre app */}
      <div className="flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2L28.7846 9V23L16 30L3.21539 23V9L16 2Z" fill="#1565C0" />
          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Inter, sans-serif">
            SPC
          </text>
        </svg>
        <span className="font-semibold text-[#2d3748] text-sm">SPC Tiempo Real</span>
      </div>

      {/* Breadcrumb + NotificationBell a la derecha */}
      <div className="ml-auto flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <Breadcrumb compact />
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
