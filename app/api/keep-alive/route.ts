import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Validación de seguridad para que solo Vercel Cron lo invoque
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Consulta HEAD: Registra actividad en PostgreSQL sin descargar filas
    const { count, error } = await supabase
      .from('secciones')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      mensaje: 'Supabase activo',
      total_secciones: count,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }
}