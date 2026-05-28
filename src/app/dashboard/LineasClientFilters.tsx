'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';

interface LineasClientFiltersProps {
  canAdd: boolean;
  initialQ: string;
}

export default function LineasClientFilters({ canAdd, initialQ }: LineasClientFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchOpen, setSearchOpen] = useState(!!initialQ);
  const [searchValue, setSearchValue] = useState(initialQ);

  function handleSearch(value: string) {
    setSearchValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function toggleSearch() {
    if (searchOpen && searchValue) {
      handleSearch('');
    }
    setSearchOpen((prev) => !prev);
  }

  return (
    <div className="flex items-center gap-3">
      {searchOpen && (
        <NeuInput
          type="text"
          placeholder="Buscar línea..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-48 text-sm"
          autoFocus
        />
      )}

      {/* Search toggle button */}
      <NeuButton
        onClick={toggleSearch}
        aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar línea'}
        className={isPending ? 'opacity-70' : ''}
      >
        {searchOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
      </NeuButton>

      {/* Add line button — only for admin or above */}
      {canAdd && (
        <NeuButton
          variant="primary"
          onClick={() => router.push('/dashboard/lineas/nueva')}
          aria-label="Agregar línea"
          className="flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nueva Línea</span>
        </NeuButton>
      )}
    </div>
  );
}
