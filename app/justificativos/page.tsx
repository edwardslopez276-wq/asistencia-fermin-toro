import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import JustificativosView from '@/components/JustificativosView'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export default async function JustificativosPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Perfil del usuario
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombres, apellidos, rol, seccion_id')
    .eq('id', user?.id)
    .single()

  const esDocente = perfil?.rol === 'DOCENTE'

  // Consulta de estudiantes condicionada por rol
  let queryEstudiantes = supabase
    .from('estudiantes')
    .select('id, cedula_escolar, nombres, apellidos, seccion_actual_id')
    .eq('activo', true)
    .order('apellidos', { ascending: true })

  if (esDocente && perfil?.seccion_id) {
    queryEstudiantes = queryEstudiantes.eq('seccion_actual_id', perfil.seccion_id)
  }

  const { data: estudiantesData } = await queryEstudiantes

  // Consulta del historial de justificativos
  const { data: justificativosData } = await supabase
    .from('justificativos')
    .select(`
      id,
      fecha_inicio,
      fecha_fin,
      motivo,
      observaciones,
      created_at,
      estudiantes!inner (
        id,
        nombres,
        apellidos,
        cedula_escolar,
        seccion_actual_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Si es docente, filtramos solo los de su sección
  const historialFiltrado = esDocente && perfil?.seccion_id
    ? (justificativosData || []).filter(
        // @ts-expect-error supabase type inference
        (j) => j.estudiantes?.seccion_actual_id === perfil.seccion_id
      )
    : justificativosData || []

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Barra de navegación unificada */}
        <Navbar perfil={perfil} />

        <JustificativosView
          estudiantes={(estudiantesData as any) || []}
          historialJustificativos={(historialFiltrado as any) || []}
        />
      </div>
    </main>
  )
}