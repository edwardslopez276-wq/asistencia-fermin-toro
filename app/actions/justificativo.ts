'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

interface DatosRegistroJustificativo {
  estudiante_id: number
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  observaciones?: string
}

// Desglosa todos los días hábiles (lunes a viernes) entre ambas fechas
function desglosarDiasHabiles(inicio: string, fin: string): string[] {
  const fechas: string[] = []
  // Se fija a las 12:00 para evitar desajustes por zona horaria UTC
  const actual = new Date(`${inicio}T12:00:00`)
  const limite = new Date(`${fin}T12:00:00`)

  while (actual <= limite) {
    const diaSemana = actual.getDay() // 0 = Domingo, 6 = Sábado
    if (diaSemana >= 1 && diaSemana <= 5) {
      fechas.push(actual.toISOString().split('T')[0])
    }
    actual.setDate(actual.getDate() + 1)
  }

  return fechas
}

export async function registrarJustificativoAction(datos: DatosRegistroJustificativo) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no autorizada o expirada.' }
  }

  if (!datos.estudiante_id) {
    return { success: false, error: 'Debe seleccionar un estudiante válido.' }
  }

  // 1. Obtener datos del alumno
  const { data: estudiante, error: errEst } = await supabase
    .from('estudiantes')
    .select('id, seccion_actual_id')
    .eq('id', datos.estudiante_id)
    .single()

  if (errEst || !estudiante) {
    return { success: false, error: 'Estudiante no encontrado.' }
  }

  // 2. Registrar en la tabla histórica justificativos
  const { error: errJust } = await supabase.from('justificativos').insert({
    estudiante_id: estudiante.id,
    fecha_inicio: datos.fecha_inicio,
    fecha_fin: datos.fecha_fin,
    motivo: datos.motivo?.trim() || 'Reposo Médico / Enfermedad',
    observaciones: datos.observaciones?.trim() || null,
    registrado_por: user.id,
  })

  if (errJust) {
    return { success: false, error: `Error al registrar justificativo: ${errJust.message}` }
  }

  // 3. Generar la lista de días hábiles e insertar en la tabla asistencias
  const dias = desglosarDiasHabiles(datos.fecha_inicio, datos.fecha_fin)

  if (dias.length > 0) {
    const filas = dias.map((f) => ({
      estudiante_id: estudiante.id,
      seccion_id: estudiante.seccion_actual_id,
      fecha: f,
      estado: 'JUSTIFICADO',
      observacion: datos.motivo?.trim() || 'Justificado',
    }))

    const { error: errAsis } = await supabase
      .from('asistencias')
      .upsert(filas, { onConflict: 'estudiante_id,fecha' })

    if (errAsis) {
      return { success: false, error: `Error sincronizando asistencias: ${errAsis.message}` }
    }
  }

  revalidatePath('/justificativos')
  revalidatePath('/reportes')
  revalidatePath('/dashboard')
  revalidatePath('/')

  return { success: true }
}