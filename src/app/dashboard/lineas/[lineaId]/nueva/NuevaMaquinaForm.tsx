'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NeuCard from '@/components/ui/NeuCard';
import NeuButton from '@/components/ui/NeuButton';
import NeuInput from '@/components/ui/NeuInput';
import { createMaquina } from '../actions';

interface NuevaMaquinaFormProps {
  lineaId: string;
}

export default function NuevaMaquinaForm({ lineaId }: NuevaMaquinaFormProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!numero || isNaN(Number(numero))) {
      setError('El número es requerido y debe ser válido');
      return;
    }

    setLoading(true);
    const result = await createMaquina({
      nombre: nombre.trim(),
      numero: Number(numero),
      linea_id: lineaId,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(`/dashboard/lineas/${lineaId}`);
  }

  return (
    <NeuCard className="w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-gray-700 mb-6">Nueva Máquina</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">Nombre</label>
          <NeuInput
            type="text"
            placeholder="Nombre de la máquina"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-600">Número</label>
          <NeuInput
            type="number"
            placeholder="Número de la máquina"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            disabled={loading}
            min={1}
          />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <NeuButton
            type="button"
            onClick={() => router.push(`/dashboard/lineas/${lineaId}`)}
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
            {loading ? 'Creando...' : 'Crear Máquina'}
          </NeuButton>
        </div>
      </form>
    </NeuCard>
  );
}
