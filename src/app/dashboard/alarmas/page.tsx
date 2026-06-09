import { getActiveAlarms } from './actions';
import AlarmasView from './AlarmasView';

export const metadata = {
  title: 'Alarmas Activas',
};

export default async function AlarmasPage() {
  const { data, error } = await getActiveAlarms();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#4a5568]">Alarmas Activas</h1>
        <p className="text-sm text-[#718096] mt-1">
          Máquinas con puntos fuera de control detectados
        </p>
      </div>

      {error ? (
        <div
          className="rounded-[16px] p-4 bg-[#e0e5ec] text-red-600 text-sm"
          style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
        >
          Error al cargar alarmas: {error}
        </div>
      ) : (
        <AlarmasView alarms={data ?? []} />
      )}
    </div>
  );
}
