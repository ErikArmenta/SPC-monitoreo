'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useOOCAlerts, OOCAlert } from '@/hooks/useOOCAlerts';

// ============================================================
// Icono campana
// ============================================================

function IconBell() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ============================================================
// Utilidad: formatear hora
// ============================================================

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

function formatRelative(isoString: string): string {
  try {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr} h`;
    return formatTime(isoString);
  } catch {
    return '';
  }
}

// ============================================================
// Toast individual
// ============================================================

interface ToastProps {
  alert: OOCAlert;
  onDismiss: () => void;
}

function AlertToast({ alert, onDismiss }: ToastProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-[14px] min-w-[280px] max-w-[340px]',
        'bg-[#e0e5ec]',
        'shadow-[4px_4px_10px_#b8bec7,_-4px_-4px_10px_#ffffff]',
        'border-l-4 border-[#e53e3e]',
        'animate-slide-in'
      )}
    >
      <span className="text-[#e53e3e] text-lg leading-none mt-0.5">&#9888;</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#e53e3e] leading-tight">Fuera de control</p>
        <p className="text-xs text-[#2d3748] mt-0.5 leading-snug truncate">
          {alert.maquinaNombre}
          {alert.ruleViolated ? ` — ${alert.ruleViolated}` : ''}
        </p>
        <p className="text-[10px] text-[#718096] mt-0.5">{formatTime(alert.timestamp)}</p>
        <button
          onClick={() => {
            router.push(`/dashboard/spc?maquina_id=${alert.maquina_id}`);
            onDismiss();
          }}
          className="mt-1.5 text-[10px] font-semibold text-[#1565C0] hover:underline"
        >
          Ver SPC &rarr;
        </button>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Cerrar"
        className="text-[#a0aec0] hover:text-[#2d3748] text-sm leading-none"
      >
        &times;
      </button>
    </div>
  );
}

// ============================================================
// Toast container (esquina superior derecha)
// ============================================================

interface ToastEntry {
  alert: OOCAlert;
  key: number;
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const alert = (e as CustomEvent<OOCAlert>).detail;
      const key = ++keyRef.current;
      setToasts((prev) => [...prev, { alert, key }]);

      // Auto-dismiss en 8s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.key !== key));
      }, 8000);
    };

    window.addEventListener('ooc-alert', handler);
    return () => window.removeEventListener('ooc-alert', handler);
  }, []);

  const dismiss = (key: number) => {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(({ alert, key }) => (
        <div key={key} className="pointer-events-auto">
          <AlertToast alert={alert} onDismiss={() => dismiss(key)} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Componente principal NotificationBell
// ============================================================

export default function NotificationBell() {
  const { alerts, unreadCount, markAllRead } = useOOCAlerts();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    setOpen((o) => !o);
  };

  const handleVerSPC = (maquinaId: string) => {
    router.push(`/dashboard/spc?maquina_id=${maquinaId}`);
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  return (
    <>
      {/* Toast container global — escucha el evento ooc-alert */}
      <ToastContainer />

      {/* Campana + dropdown */}
      <div ref={dropdownRef} className="relative">
        {/* Botón campana */}
        <button
          onClick={handleToggle}
          aria-label="Notificaciones de alarmas"
          aria-expanded={open}
          className={cn(
            'relative p-2 rounded-[12px] text-[#4a5568] transition-all duration-150',
            open
              ? 'shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff] text-[#1565C0]'
              : 'shadow-[3px_3px_6px_#b8bec7,_-3px_-3px_6px_#ffffff] hover:text-[#1565C0]'
          )}
        >
          <IconBell />

          {/* Badge contador */}
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-1 -right-1',
                'min-w-[18px] h-[18px] px-1',
                'flex items-center justify-center',
                'bg-[#e53e3e] text-white text-[10px] font-bold',
                'rounded-full leading-none',
                'shadow-[1px_1px_3px_#b8bec7]'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className={cn(
              'absolute right-0 mt-2 w-[320px] z-50',
              'bg-[#e0e5ec] rounded-[16px]',
              'shadow-[6px_6px_14px_#b8bec7,_-6px_-6px_14px_#ffffff]',
              'overflow-hidden'
            )}
          >
            {/* Header dropdown */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#c8cfd8]">
              <span className="text-sm font-semibold text-[#2d3748]">
                Alarmas OOC
                {unreadCount > 0 && (
                  <span className="ml-2 text-[10px] font-bold text-white bg-[#e53e3e] px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-[#1565C0] hover:underline font-medium"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Lista de alertas */}
            <div className="max-h-[340px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-[#718096]">Sin alarmas activas</p>
                  <p className="text-xs text-[#a0aec0] mt-1">
                    Las alertas OOC aparecen aqui en tiempo real
                  </p>
                </div>
              ) : (
                alerts.slice(0, 20).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      'px-4 py-3 border-b border-[#d1d9e6] last:border-b-0',
                      'hover:bg-[#d8dde6] transition-colors duration-100'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#2d3748] leading-snug">
                          <span className="text-[#e53e3e] mr-1">&#9888;</span>
                          {alert.maquinaNombre}
                          {alert.ruleViolated ? (
                            <span className="text-[#718096] font-normal">
                              {' '}— {alert.ruleViolated}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[10px] text-[#a0aec0] mt-0.5">
                          {alert.lineaNombre} &bull; {formatRelative(alert.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleVerSPC(alert.maquina_id)}
                        className={cn(
                          'shrink-0 text-[10px] font-semibold text-[#1565C0]',
                          'px-2 py-1 rounded-[8px] whitespace-nowrap',
                          'shadow-[2px_2px_4px_#b8bec7,_-2px_-2px_4px_#ffffff]',
                          'hover:shadow-[inset_2px_2px_4px_#b8bec7,_inset_-2px_-2px_4px_#ffffff]',
                          'transition-shadow duration-150'
                        )}
                      >
                        Ver SPC
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="px-4 py-2 border-t border-[#c8cfd8] text-center">
                <button
                  onClick={handleMarkAllRead}
                  className={cn(
                    'w-full py-1.5 text-xs font-medium text-[#4a5568] rounded-[10px]',
                    'shadow-[2px_2px_5px_#b8bec7,_-2px_-2px_5px_#ffffff]',
                    'hover:shadow-[inset_2px_2px_5px_#b8bec7,_inset_-2px_-2px_5px_#ffffff]',
                    'transition-shadow duration-150'
                  )}
                >
                  Marcar todas como leidas
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
