import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardDireccionView, {
  SeccionEstadistica,
  AlumnoAlerta,
} from '@/components/DashboardDireccionView'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ mes?: string }>
}

// Formateador institucional según nivel académico
function formatearNombreAula(grado: number, seccion: string, nivel?: string | null): string {
  const n = nivel?.toUpperCase().trim()
  if (n === 'MEDIA_GENERAL' || n === 'SECUNDARIA' || n === 'LICEO' || (!nivel && grado > 6)) {
    return `${grado}° Año "${seccion}"`
  }
  return `${grado}° Grado "${seccion}"`
}

export default async function DashboardPage({ searchParams }: Props) {
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

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombres, apellidos, rol')
    .eq('id', user.id)
    .single()

  // Proteger: Si es solo DOCENTE, no entra al Dashboard General
  if (perfil?.rol === 'DOCENTE') {
    redirect('/')
  }

  // Mes seleccionado o actual (YYYY-MM)
  const mesActual = params.mes || new Date().toISOString().slice(0, 7)
  const [anioStr, mesStr] = mesActual.split('-')
  const anioNum = parseInt(anioStr, 10)
  const mesNum = parseInt(mesStr, 10)

  const fechaInicio = `${mesActual}-01`
  const ultimoDiaNum = new Date(anioNum, mesNum, 0).getDate()
  const fechaFin = `${mesActual}-${String(ultimoDiaNum).padStart(2, '0')}`

  // 1. Obtener todas las secciones con su respectivo nivel
  const { data: seccionesData } = await supabase
    .from('secciones')
    .select('id, grado, seccion, nivel')
    .order('nivel', { ascending: false })
    .order('grado', { ascending: true })
    .order('seccion', { ascending: true })

  const secciones = seccionesData || []

  // 2. Obtener todos los estudiantes activos con género y datos del representante
  const { data: estudiantesData } = await supabase
    .from('estudiantes')
    .select('id, cedula_escolar, nombres, apellidos, genero, seccion_actual_id, nombre_representante, telefono_representante')
    .eq('activo', true)

  const todosEstudiantes = estudiantesData || []

  // 3. Obtener todas las asistencias del mes
  const { data: asistenciasData } = await supabase
    .from('asistencias')
    .select('estudiante_id, estado, fecha')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

  const todasAsistencias = asistenciasData || []

  // 4. Calcular métricas por aula/sección
  const estadisticasSecciones: SeccionEstadistica[] = secciones.map((sec) => {
    const alumnosSeccion = todosEstudiantes.filter(
      (e) => Number(e.seccion_actual_id) === Number(sec.id)
    )
    const idsAlumnos = new Set(alumnosSeccion.map((e) => e.id))

    const asisArray = todasAsistencias.filter((a) => idsAlumnos.has(a.estudiante_id))
    const presentes = asisArray.filter((a) => a.estado === 'PRESENTE').length
    const retardos = asisArray.filter((a) => a.estado === 'RETARDO').length
    const justificados = asisArray.filter((a) => a.estado === 'JUSTIFICADO').length
    const ausentes = asisArray.filter((a) => a.estado === 'AUSENTE').length

    // Días computables que requerían asistencia
    const computables = presentes + retardos + ausentes
    const porcentaje = computables > 0
      ? Math.round(((presentes + retardos) / computables) * 100)
      : 100

    return {
      id: Number(sec.id),
      nombre: formatearNombreAula(sec.grado, sec.seccion, sec.nivel),
      totalEstudiantes: alumnosSeccion.length,
      totalPresentes: presentes + retardos,
      totalAusentes: ausentes,
      totalJustificados: justificados,
      porcentajeAsistencia: porcentaje,
    }
  })

  // 5. Estudiantes con ausencias críticas (>= 3 faltas injustificadas en el mes)
  const ausenciasPorAlumno: Record<number, number> = {}
  todasAsistencias.forEach((a) => {
    if (a.estado === 'AUSENTE') {
      ausenciasPorAlumno[a.estudiante_id] = (ausenciasPorAlumno[a.estudiante_id] || 0) + 1
    }
  })

  const seccionMap = new Map(
    secciones.map((s) => [Number(s.id), formatearNombreAula(s.grado, s.seccion, s.nivel)])
  )

  const alertasCriticas: AlumnoAlerta[] = todosEstudiantes
    .filter((e) => (ausenciasPorAlumno[e.id] || 0) >= 3)
    .map((e) => ({
      id: e.id,
      cedula_escolar: e.cedula_escolar,
      nombres: e.nombres,
      apellidos: e.apellidos,
      seccion: seccionMap.get(Number(e.seccion_actual_id)) || 'N/A',
      ausencias: ausenciasPorAlumno[e.id] || 0,
      nombre_representante: e.nombre_representante || '',
      telefono_representante: e.telefono_representante || null,
    }))
    .sort((a, b) => b.ausencias - a.ausencias)

  // 6. Promedio global institucional
  const totalPlantel = todosEstudiantes.length
  const totalPresentesGeneral = todasAsistencias.filter(
    (a) => a.estado === 'PRESENTE' || a.estado === 'RETARDO'
  ).length
  const totalAusenciasGeneral = todasAsistencias.filter((a) => a.estado === 'AUSENTE').length
  const totalComputablesGeneral = totalPresentesGeneral + totalAusenciasGeneral

  const promedioPlantel = totalComputablesGeneral > 0
    ? Math.round((totalPresentesGeneral / totalComputablesGeneral) * 100)
    : 100

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <Navbar perfil={perfil} />

        <DashboardDireccionView
          mesSeleccionado={mesActual}
          estadisticasSecciones={estadisticasSecciones}
          alertasCriticas={alertasCriticas}
          totalPlantel={totalPlantel}
          promedioPlantel={promedioPlantel}
        />
      </div>
    </main>
  )
}