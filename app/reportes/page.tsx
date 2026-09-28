import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ReporteAsistenciaView, {
  Seccion,
  EstudianteReporte,
  AsistenciaRegistro,
} from '@/components/ReporteAsistenciaView'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ seccion?: string; mes?: string; anio?: string }>
}

export default async function ReportesPage({ searchParams }: Props) {
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

  // Perfil del usuario autenticado
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombres, apellidos, rol, seccion_id')
    .eq('id', user?.id)
    .single()

  const esDocente = perfil?.rol === 'DOCENTE'

  // Si es DOCENTE con sección asignada, solo carga su sección.
  // Directores, Subdirectores y Admins ven TODAS las secciones.
  let querySecciones = supabase
    .from('secciones')
    .select('id, grado, seccion, nivel') // <-- INCLUIDO nivel
    .order('nivel', { ascending: false })
    .order('grado', { ascending: true })
    .order('seccion', { ascending: true })

  if (esDocente && perfil?.seccion_id) {
    querySecciones = querySecciones.eq('id', perfil.seccion_id)
  }

  const { data: seccionesData } = await querySecciones
  const secciones: Seccion[] = (seccionesData as Seccion[]) || []

  // Parámetros de fecha
  const hoy = new Date()
  const mesSeleccionado = params.mes ? parseInt(params.mes, 10) : hoy.getMonth() + 1
  const anioSeleccionado = params.anio ? parseInt(params.anio, 10) : hoy.getFullYear()

  // Sección activa: si es docente se fija la suya; de lo contrario la de URL o la primera
  const seccionActivaId = esDocente && perfil?.seccion_id
    ? Number(perfil.seccion_id)
    : params.seccion
    ? parseInt(params.seccion, 10)
    : secciones.length > 0
    ? Number(secciones[0].id)
    : null

  // Docente titular de la sección para el pie de firma oficial
  let docenteTitular = esDocente ? `${perfil?.nombres} ${perfil?.apellidos}` : ''
  if (!docenteTitular && seccionActivaId !== null) {
    const { data: docData } = await supabase
      .from('perfiles')
      .select('nombres, apellidos')
      .eq('seccion_id', seccionActivaId)
      .eq('rol', 'DOCENTE')
      .maybeSingle()

    if (docData) {
      docenteTitular = `${docData.nombres} ${docData.apellidos}`
    }
  }

  // Estudiantes de la sección
  let estudiantes: EstudianteReporte[] = []
  if (seccionActivaId !== null) {
    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id, cedula_escolar, nombres, apellidos, genero')
      .eq('seccion_actual_id', seccionActivaId)
      .eq('activo', true)
      .order('apellidos', { ascending: true })

    estudiantes = (estData as EstudianteReporte[]) || []
  }

  // Rango del mes
  const primerDiaMes = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(anioSeleccionado, mesSeleccionado, 0).getDate()
  const ultimoDiaMes = `${anioSeleccionado}-${String(mesSeleccionado).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  // Asistencias registradas en ese rango para los estudiantes de la sección
  let asistencias: AsistenciaRegistro[] = []
  if (estudiantes.length > 0) {
    const estudianteIds = estudiantes.map((e) => e.id)
    const { data: asisData } = await supabase
      .from('asistencias')
      .select('estudiante_id, fecha, estado, observacion')
      .in('estudiante_id', estudianteIds)
      .gte('fecha', primerDiaMes)
      .lte('fecha', ultimoDiaMes)

    asistencias = (asisData as AsistenciaRegistro[]) || []
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-6 print:max-w-none print:space-y-0">
        <Navbar perfil={perfil} />

        <ReporteAsistenciaView
          secciones={secciones}
          seccionSeleccionadaId={seccionActivaId}
          mesSeleccionado={mesSeleccionado}
          anioSeleccionado={anioSeleccionado}
          estudiantes={estudiantes}
          asistencias={asistencias}
          docenteTitular={docenteTitular}
        />
      </div>
    </main>
  )
}