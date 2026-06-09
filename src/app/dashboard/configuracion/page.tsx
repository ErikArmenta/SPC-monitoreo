import { getSPCConfigs } from './actions';
import ConfiguracionClientView from './ConfiguracionClientView';

export const metadata = {
  title: 'Configuración SPC',
};

export default async function ConfiguracionPage() {
  const { data, error } = await getSPCConfigs();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#4a5568]">Configuración SPC</h1>
        <p className="text-sm text-[#718096] mt-1">
          Gestiona la configuración estadística de cada máquina
        </p>
      </div>

      {error ? (
        <div
          className="rounded-[16px] p-4 bg-[#e0e5ec] text-red-600 text-sm"
          style={{ boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' }}
        >
          Error al cargar configuraciones: {error}
        </div>
      ) : (
        <ConfiguracionClientView configs={data ?? []} />
      )}
    </div>
  );
}
