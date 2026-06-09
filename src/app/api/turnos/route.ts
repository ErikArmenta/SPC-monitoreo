export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/turnos
// Retorna todos los turnos activos ordenados por hora_inicio
export async function GET() {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('turnos')
    .select('*')
    .eq('activo', true)
    .order('hora_inicio', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
