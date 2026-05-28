'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ============================================================
// Mapa de segmentos de ruta a etiquetas legibles
// ============================================================

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Inicio',
  lineas: 'Líneas',
  estadisticas: 'Estadísticas',
  spc: 'Dashboard SPC',
  usuarios: 'Usuarios',
  captura: 'Captura',
  maquinas: 'Máquinas',
};

interface BreadcrumbItem {
  label: string;
  href: string;
}

function buildBreadcrumbs(
  pathname: string,
  params: Record<string, string | string[]>
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];
  let cumulativePath = '';

  // Extraer IDs dinámicos de params para saber cuáles segmentos son IDs
  const dynamicValues = new Set(
    Object.values(params)
      .flat()
      .map((v) => v.toString())
  );

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    cumulativePath += `/${segment}`;

    // Si el segmento es un ID dinámico (UUID o string de params), usar un label contextual
    if (dynamicValues.has(segment)) {
      // Intentar obtener el nombre del parámetro de contexto anterior
      const prevSegment = segments[i - 1];
      if (prevSegment === 'lineas') {
        items.push({ label: `Línea`, href: cumulativePath });
      } else if (prevSegment === 'maquinas') {
        items.push({ label: `Máquina`, href: cumulativePath });
      } else {
        items.push({ label: segment, href: cumulativePath });
      }
      continue;
    }

    const label = SEGMENT_LABELS[segment] ?? segment;
    items.push({ label, href: cumulativePath });
  }

  return items;
}

// ============================================================
// Props
// ============================================================

interface BreadcrumbProps {
  /** Modo compacto para mobile: muestra solo el último segmento */
  compact?: boolean;
  className?: string;
}

// ============================================================
// Componente Breadcrumb
// ============================================================

export default function Breadcrumb({ compact = false, className }: BreadcrumbProps) {
  const pathname = usePathname();
  const params = useParams() as Record<string, string | string[]>;

  const items = buildBreadcrumbs(pathname, params);

  if (items.length === 0) return null;

  // En modo compacto (mobile) mostrar solo el último item
  if (compact) {
    const last = items[items.length - 1];
    return (
      <span className="text-xs text-gray-500 truncate block text-right pr-1">
        {last.label}
      </span>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 flex-wrap', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1">
            {index > 0 && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400 flex-shrink-0"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {isLast ? (
              <span
                className="text-sm font-semibold text-[#1565C0]"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-gray-500 hover:text-[#1565C0] transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
