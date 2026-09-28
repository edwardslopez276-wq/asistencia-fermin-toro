import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AsistenciaForm from '@/components/AsistenciaForm'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

interface Estudiante {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
}

interface Props {
  searchParams: Promise<{ seccion?: string; fecha?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams
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

  if (!user) {
    redirect('/login')
  }

  // 1. Obtener perfil completo con los datos exactos del aula asignada (incluyendo nivel)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select(`
      id,
      nombres,
      apellidos,
      rol,
      seccion_id,
      secciones:seccion_id (
        id,
        grado,
        seccion,
        nivel
      )
    `)
    .eq('id', user.id)
    .single()

  const rol = perfil?.rol || ''

  // Redirecciones por jerarquía de roles
  if (['DIRECTOR', 'SUBDIRECTOR', 'DIRECTIVO'].includes(rol)) {
    redirect('/dashboard')
  }

  if (['ADMIN', 'ADMINISTRATIVO'].includes(rol)) {
    redirect('/admin')
  }

  const esDocente = rol === 'DOCENTE'

  // 2. Consulta de secciones con soporte de 'nivel'
  let querySecciones = supabase
    .from('secciones')
    .select('id, grado, seccion, nivel')
    .order('grado', { ascending: true })
    .order('seccion', { ascending: true })

  // Si es docente, limitar la lista ÚNICAMENTE a su sección asignada
  if (esDocente) {
    if (perfil?.seccion_id) {
      querySecciones = querySecciones.eq('id', perfil.seccion_id)
    } else {
      // Si el docente no tiene sección asignada todavía
      querySecciones = querySecciones.eq('id', -1)
    }
  }

  const { data: seccionesData } = await querySecciones
  const secciones = seccionesData || []

  // 3. Determinar la sección activa de forma inequívoca
  let seccionActivaId: number | null = null

  if (esDocente) {
    // Para el docente SIEMPRE manda su perfil.seccion_id
    seccionActivaId = perfil?.seccion_id ? Number(perfil.seccion_id) : null
  } else {
    // Para otros roles que pasen asistencia: parámetro URL o la primera sección
    seccionActivaId = params.seccion
      ? Number(params.seccion)
      : secciones[0]?.id
      ? Number(secciones[0].id)
      : null
  }

  const hoy = params.fecha || new Date().toISOString().split('T')[0]

  // 4. Si el docente aún no tiene sección asignada por la dirección
  if (esDocente && !seccionActivaId) {
    return (
      <main className="min-h-screen bg-slate-100 p-3 sm:p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <Navbar perfil={perfil} />
          <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 text-center space-y-3 shadow-xs">
            <span className="text-3xl sm:text-4xl">⚠️</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Sin Aula Asignada</h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
              Aún no tienes un grado o año asignado en el sistema. Solicita al personal directivo o de control de estudios que te asigne tu sección desde el módulo de administración.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // 5. Cargar nómina de estudiantes del aula activa
  let estudiantes: Estudiante[] = []
  if (seccionActivaId !== null) {
    const { data } = await supabase
      .from('estudiantes')
      .select('id, cedula_escolar, nombres, apellidos')
      .eq('seccion_actual_id', seccionActivaId)
      .eq('activo', true)
      .order('apellidos', { ascending: true })

    estudiantes = (data as Estudiante[]) || []
  }

  // 6. Asistencias ya guardadas para esa fecha
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('estudiante_id, estado, observacion')
    .eq('fecha', hoy)

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <Navbar perfil={perfil} />

        <AsistenciaForm
          key={`${seccionActivaId}-${hoy}`}
          secciones={secciones}
          estudiantesIniciales={estudiantes}
          asistenciasPrevias={asistencias || []}
          fechaSeleccionada={hoy}
          seccionSeleccionadaId={seccionActivaId ? String(seccionActivaId) : ''}
        />
      </div>
    </main>
  )
}