'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | 'RETARDO'

export interface ItemAsistencia {
  estudiante_id: number
  estado: EstadoAsistencia
  observacion?: string
}

export async function guardarAsistenciasAction(payload: {
  fecha: string
  asistencias: ItemAsistencia[]
}) {
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
          } catch {
            // Se ignora en Server Actions si la cabecera ya fue enviada
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autorizado. Por favor inicia sesión.' }
  }

  if (!payload.asistencias || payload.asistencias.length === 0) {
    return { success: true }
  }

  const filas = payload.asistencias.map((item) => ({
    estudiante_id: item.estudiante_id,
    fecha: payload.fecha,
    estado: item.estado,
    observacion: item.observacion?.trim() || null,
    docente_id: user.id,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('asistencias').upsert(filas, {
    onConflict: 'estudiante_id,fecha',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Revalida la toma diaria, las sábanas de reportes y las métricas directivas
  revalidatePath('/')
  revalidatePath('/reportes')
  revalidatePath('/dashboard')

  return { success: true }
}

// Alias de retrocompatibilidad
export const registrarAsistenciaDia = guardarAsistenciasAction