'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Cliente administrativo con permisos service_role (solo backend)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Se agregan DIRECTIVO y ADMINISTRATIVO al tipo oficial
export type RolUsuario =
  | 'DOCENTE'
  | 'SUBDIRECTOR'
  | 'DIRECTOR'
  | 'DIRECTIVO'
  | 'ADMINISTRATIVO'
  | 'ADMIN'

interface RegistrarUsuarioParams {
  email: string
  password: string
  cedula: string
  nombres: string
  apellidos: string
  rol: RolUsuario
  seccion_id?: number | null
}

export async function crearUsuarioAction(datos: RegistrarUsuarioParams) {
  try {
    const cedulaLimpia = datos.cedula?.trim().toUpperCase()
    const emailLimpio = datos.email?.trim().toLowerCase()
    const nombresLimpios = datos.nombres?.trim()
    const apellidosLimpios = datos.apellidos?.trim()
    const passwordLimpio = datos.password?.trim()

    // 1. Validaciones de campos obligatorios
    if (!cedulaLimpia) {
      throw new Error('La cédula de identidad es obligatoria y no puede contener solo espacios.')
    }
    if (!emailLimpio || !passwordLimpio || !nombresLimpios || !apellidosLimpios) {
      throw new Error('Todos los campos son obligatorios.')
    }
    if (datos.rol === 'DOCENTE' && !datos.seccion_id) {
      throw new Error('Es obligatorio asignarle un grado y sección al docente.')
    }

    // 2. Blindaje Backend: Restricción de cargos únicos (Director y Subdirector)
    if (datos.rol === 'DIRECTOR' || datos.rol === 'DIRECTIVO') {
      const { data: directorExistente } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombres, apellidos')
        .in('rol', ['DIRECTOR', 'DIRECTIVO'])
        .maybeSingle()

      if (directorExistente) {
        throw new Error(
          `Ya existe un Director titular en el plantel (${directorExistente.nombres} ${directorExistente.apellidos}). No está permitido registrar más de un Director.`
        )
      }
    }

    if (datos.rol === 'SUBDIRECTOR') {
      const { data: subdirectorExistente } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombres, apellidos')
        .eq('rol', 'SUBDIRECTOR')
        .maybeSingle()

      if (subdirectorExistente) {
        throw new Error(
          `Ya existe un Subdirector titular en el plantel (${subdirectorExistente.nombres} ${subdirectorExistente.apellidos}). No está permitido registrar más de un Subdirector.`
        )
      }
    }

    // 3. Crear el usuario en auth.users con correo confirmado automáticamente
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailLimpio,
      password: passwordLimpio,
      email_confirm: true,
      user_metadata: {
        nombres: nombresLimpios,
        apellidos: apellidosLimpios,
        cedula: cedulaLimpia,
        rol: datos.rol,
      },
    })

    if (authError) throw new Error(authError.message)

    // 4. Guardar en la tabla public.perfiles
    const { error: perfilError } = await supabaseAdmin.from('perfiles').upsert({
      id: authData.user.id,
      cedula: cedulaLimpia,
      nombres: nombresLimpios,
      apellidos: apellidosLimpios,
      rol: datos.rol,
      seccion_id: datos.rol === 'DOCENTE' ? datos.seccion_id : null,
    })

    if (perfilError) throw new Error(perfilError.message)

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al registrar el personal.' }
  }
}