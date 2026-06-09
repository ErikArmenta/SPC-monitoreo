import { getTurnos } from '../turnos-actions';
import TurnosClientView from './TurnosClientView';

export const metadata = {
  title: 'Turnos — Configuración SPC',
};

export default async function TurnosPage() {
  const { data: turnos, error } = await getTurnos();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#31456a]">Gestión de Turnos</h1>
        <p className="mt-1 text-sm text-[#5a7184]">
          Los turnos se detectan automáticamente al capturar inspecciones.
        </p>
      </div>

      {error && (
        <div
          className="mb-4 rounded-[12px] px-4 py-3 text-sm text-red-700 bg-[#e0e5ec]"
          style={{ boxShadow: 'inset 2px 2px 5px #b8bec7, inset -2px -2px 5px #ffffff' }}
        >
          Error al cargar turnos: {error}
        </div>
      )}

      <TurnosClientView initialTurnos={turnos} />
    </div>
  );
}
