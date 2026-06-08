import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NuevaMaquinaForm from './NuevaMaquinaForm';

interface NuevaMaquinaPageProps {
  params: { lineaId: string };
}

export default async function NuevaMaquinaPage({ params }: NuevaMaquinaPageProps) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center p-6">
      <NuevaMaquinaForm lineaId={params.lineaId} />
    </div>
  );
}
