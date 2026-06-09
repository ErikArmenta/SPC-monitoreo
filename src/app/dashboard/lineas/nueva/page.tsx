'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NeuCard from '@/components/ui/NeuCard';
import NeuInput from '@/components/ui/NeuInput';
import NeuButton from '@/components/ui/NeuButton';
import { createLinea } from '../actions';

export default function NuevaLineaPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [activa, setActiva] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    const numeroInt = parseInt(numero, 10);
    if (!numero || isNaN(numeroInt) || numeroInt <= 0) {
      setError('El número debe ser un entero positivo');
      return;
    }

    setLoading(true);
    const result = await createLinea({ nombre: nombre.trim(), numero: numeroInt, activa });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center p-6">
      <NeuCard className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-gray-700 mb-6">Nueva Línea</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Nombre</label>
            <NeuInput
              type="text"
              placeholder="Ej. Línea A"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Número */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Número</label>
            <NeuInput
              type="number"
              placeholder="Ej. 1"
              min={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Activa toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={activa}
              onClick={() => setActiva((v) => !v)}
              disabled={loading}
              className={[
                'relative w-12 h-6 rounded-full transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30',
                activa
                  ? 'bg-[#1565C0] shadow-[inset_2px_2px_5px_#0d4a8f,_inset_-2px_-2px_5px_#1d80f1]'
                  : 'bg-[#e0e5ec] shadow-neu-pressed',
                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md',
                  'transition-transform duration-200',
                  activa ? 'translate-x-6' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
            <span className="text-sm font-medium text-gray-600">
              {activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-[10px] px-3 py-2">{error}</p>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-2">
            <NeuButton
              type="button"
              onClick={() => router.push('/dashboard')}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </NeuButton>
            <NeuButton
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Guardando…' : 'Crear Línea'}
            </NeuButton>
          </div>
        </form>
      </NeuCard>
    </div>
  );
}
