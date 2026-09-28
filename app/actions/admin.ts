'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

// Expresiones regulares para control de calidad de datos
const REGEX_CEDULA = /^[VEve]-\d{6,12}$/
const REGEX_SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/
const REGEX_TELEFONO = /^\d{10,11}$/

export interface DatosNuevoEstudiante {
  cedula_escolar: string
  nombres: string
  apellidos: string
  genero: 'M' | 'F'
  fecha_nacimiento: string
  seccion_actual_id: number
  nombre_representante: string
  telefono_representante: string
}

// 1. Inscribir Estudiante Individual
export async function crearEstudianteAction(datos: DatosNuevoEstudiante) {
  const supabase = await getSupabaseClient()

  const cedulaLimpia = datos.cedula_escolar?.trim().toUpperCase()
  const nombresLimpios = datos.nombres?.trim()
  const apellidosLimpios = datos.apellidos?.trim()
  const repLimpio = datos.nombre_representante?.trim()
  const tlfLimpio = datos.telefono_representante?.trim()

  // Validación de campos vacíos o con solo espacios
  if (!cedulaLimpia || !nombresLimpios || !apellidosLimpios || !repLimpio || !tlfLimpio) {
    return { error: 'Todos los campos son obligatorios y no pueden contener solo espacios en blanco.' }
  }

  // Validación estricta de formato
  if (!REGEX_CEDULA.test(cedulaLimpia)) {
    return { error: 'La cédula escolar debe tener formato válido con prefijo (Ej: V-32000000).' }
  }

  if (!REGEX_SOLO_LETRAS.test(nombresLimpios)) {
    return { error: 'Los nombres solo deben contener letras.' }
  }

  if (!REGEX_SOLO_LETRAS.test(apellidosLimpios)) {
    return { error: 'Los apellidos solo deben contener letras.' }
  }

  if (!REGEX_SOLO_LETRAS.test(repLimpio)) {
    return { error: 'El nombre del representante solo debe contener letras.' }
  }

  if (!REGEX_TELEFONO.test(tlfLimpio)) {
    return { error: 'El teléfono debe ser numérico y tener 10 u 11 dígitos (Ej: 04141234567).' }
  }

  if (!datos.seccion_actual_id) {
    return { error: 'Debe seleccionar un aula válida.' }
  }

  // Verificar si la cédula ya existe
  const { data: existe } = await supabase
    .from('estudiantes')
    .select('id')
    .eq('cedula_escolar', cedulaLimpia)
    .maybeSingle()

  if (existe) {
    return { error: `La cédula escolar "${cedulaLimpia}" ya está registrada en el plantel.` }
  }

  // Insertar en la tabla estudiantes
  const { error } = await supabase.from('estudiantes').insert({
    cedula_escolar: cedulaLimpia,
    nombres: nombresLimpios,
    apellidos: apellidosLimpios,
    genero: datos.genero,
    fecha_nacimiento: datos.fecha_nacimiento,
    seccion_actual_id: datos.seccion_actual_id,
    nombre_representante: repLimpio,
    telefono_representante: tlfLimpio,
    activo: true,
  })

  if (error) {
    return { error: `Error al registrar en base de datos: ${error.message}` }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

// 2. Activar / Desactivar Estudiante
export async function toggleEstadoEstudianteAction(id: number, estadoActual: boolean) {
  const supabase = await getSupabaseClient()

  const { error } = await supabase
    .from('estudiantes')
    .update({ activo: !estadoActual })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

// 3. Crear Nueva Sección / Grado / Año (Distinguiendo Nivel Educativo y Periodo)
export async function crearSeccionAction(
  grado: number,
  seccion: string,
  nivel: 'PRIMARIA' | 'MEDIA_GENERAL' = 'PRIMARIA'
) {
  const supabase = await getSupabaseClient()
  const seccionLimpia = seccion.trim().toUpperCase()

  if (!seccionLimpia) {
    return { error: 'El identificador de sección no puede estar vacío.' }
  }

  // Obtener el ID del periodo activo desde las secciones ya existentes o tablas de periodos
  const { data: seccionExistente } = await supabase
    .from('secciones')
    .select('periodo_id')
    .not('periodo_id', 'is', null)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const periodoId = seccionExistente?.periodo_id || 1

  // Verificar si ya existe esa combinación exacta: periodo_id + nivel + grado + seccion
  const { data: existe } = await supabase
    .from('secciones')
    .select('id')
    .eq('periodo_id', periodoId)
    .eq('nivel', nivel)
    .eq('grado', grado)
    .eq('seccion', seccionLimpia)
    .maybeSingle()

  const etiquetaNivel = nivel === 'PRIMARIA' ? `${grado}° Grado` : `${grado}° Año`

  if (existe) {
    return { error: `El ${etiquetaNivel} sección "${seccionLimpia}" ya existe en el plantel.` }
  }

  const { error } = await supabase.from('secciones').insert({
    periodo_id: periodoId,
    nivel,
    grado,
    seccion: seccionLimpia,
  })

  if (error) {
    return { error: `Error al crear sección: ${error.message}` }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/')
  return { success: true }
}

export interface EstudianteImportacion {
  cedula_escolar: string
  nombres: string
  apellidos: string
  genero: 'M' | 'F'
  fecha_nacimiento?: string
  seccion_id?: number
  nombre_representante?: string
  telefono_representante?: string
}

// 4. Importación masiva de estudiantes desde CSV
export async function importarEstudiantesMasivosAction(
  seccionId: number,
  estudiantes: EstudianteImportacion[]
) {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no autorizada o expirada.' }
  }

  if (!seccionId) {
    return { success: false, error: 'Debe especificar el aula o sección de destino.' }
  }

  if (!estudiantes || estudiantes.length === 0) {
    return { success: false, error: 'No se recibieron registros para importar.' }
  }

  // Limpieza y sanitización de registros
  const registrosLimpios = estudiantes.map((e) => {
    let ci = e.cedula_escolar?.trim().toUpperCase() || ''
    if (ci && !ci.startsWith('V-') && !ci.startsWith('E-')) {
      const soloNum = ci.replace(/\D/g, '')
      ci = `V-${soloNum}`
    }

    return {
      cedula_escolar: ci,
      nombres: e.nombres?.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') || '',
      apellidos: e.apellidos?.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') || '',
      genero: e.genero === 'F' ? 'F' : 'M',
      fecha_nacimiento: e.fecha_nacimiento || '2015-01-01',
      seccion_actual_id: Number(seccionId),
      nombre_representante:
        e.nombre_representante?.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') ||
        'Representante Legal',
      telefono_representante:
        e.telefono_representante?.toString().replace(/\D/g, '').slice(0, 11) || '',
      activo: true,
    }
  })

  const tieneInvalidos = registrosLimpios.some(
    (e) => !e.cedula_escolar || !e.nombres || !e.apellidos || !e.seccion_actual_id
  )

  if (tieneInvalidos) {
    return {
      success: false,
      error:
        'El archivo contiene registros con campos obligatorios vacíos o nombres/cédulas con formato no admitido.',
    }
  }

  const { data, error } = await supabase
    .from('estudiantes')
    .upsert(registrosLimpios, { onConflict: 'cedula_escolar' })
    .select('id')

  if (error) {
    return {
      success: false,
      error: `Error al procesar lote en base de datos: ${error.message}`,
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/reportes')
  revalidatePath('/')

  const totalProcesados = data?.length || registrosLimpios.length

  return {
    success: true,
    count: totalProcesados,
    total: totalProcesados,
  }
}

// 5. Asignar o Cambiar Sección a un Docente
export async function asignarSeccionDocenteAction(docenteId: string, nuevaSeccionId: number | null) {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no autorizada o expirada.' }
  }

  const { error } = await supabase
    .from('perfiles')
    .update({ seccion_id: nuevaSeccionId })
    .eq('id', docenteId)

  if (error) {
    return { success: false, error: `Error al reasignar sección: ${error.message}` }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/')

  return { success: true }
}

export async function reasignarSeccionDocenteAction(
  usuarioId: string,
  nuevaSeccionId: number | null
) {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no autorizada o expirada.' }
  }

  // 1. Verificar privilegios del usuario ejecutor
  const { data: ejecutor } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  const rolesPermitidos = ['ADMIN', 'ADMINISTRATIVO', 'DIRECTOR', 'DIRECTIVO']
  if (!ejecutor || !rolesPermitidos.includes(ejecutor.rol)) {
    return { success: false, error: 'No tienes privilegios para reasignar secciones.' }
  }

  // 2. Si se asigna una sección, verificar si ya está asignada a otro docente
  if (nuevaSeccionId) {
    const { data: seccionOcupada } = await supabase
      .from('perfiles')
      .select('id, nombres, apellidos')
      .eq('seccion_id', nuevaSeccionId)
      .neq('id', usuarioId)
      .maybeSingle()

    if (seccionOcupada) {
      return {
        success: false,
        error: `Esta aula ya está asignada a ${seccionOcupada.nombres} ${seccionOcupada.apellidos}.`,
      }
    }
  }

  // 3. Actualizar la sección en la tabla perfiles
  const { data, error } = await supabase
    .from('perfiles')
    .update({ seccion_id: nuevaSeccionId })
    .eq('id', usuarioId)
    .select('id, seccion_id')

  if (error) {
    return { success: false, error: `Error en base de datos: ${error.message}` }
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: 'No se pudo actualizar el registro. Verifica las políticas RLS de la tabla perfiles en Supabase.',
    }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
  revalidatePath('/')

  return { success: true }
}

// ==========================================
// GESTIÓN ADMINISTRATIVA DE PERSONAL
// ==========================================

// Cliente con service_role para operaciones privilegiadas (auth y bypass de RLS)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.')
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// 6. Editar datos de personal institucional
export async function actualizarPerfilPersonal(formData: {
  id: string
  nombres: string
  apellidos: string
  rol: string
  seccion_id: number | null
}) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const nombresLimpios = formData.nombres?.trim()
    const apellidosLimpios = formData.apellidos?.trim()

    if (!nombresLimpios || !apellidosLimpios) {
      return { ok: false, error: 'Los nombres y apellidos son obligatorios.' }
    }

    // Si deja de ser DOCENTE, se desvincula cualquier aula
    const seccionFinal = formData.rol === 'DOCENTE' ? formData.seccion_id : null

    // Validar conflicto de aula
    if (seccionFinal) {
      const { data: ocupada } = await supabaseAdmin
        .from('perfiles')
        .select('id, nombres, apellidos')
        .eq('seccion_id', seccionFinal)
        .neq('id', formData.id)
        .eq('activo', true)
        .maybeSingle()

      if (ocupada) {
        return {
          ok: false,
          error: `Esa aula ya está asignada al docente ${ocupada.nombres} ${ocupada.apellidos}.`,
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('perfiles')
      .update({
        nombres: nombresLimpios,
        apellidos: apellidosLimpios,
        rol: formData.rol,
        seccion_id: seccionFinal,
      })
      .eq('id', formData.id)

    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    revalidatePath('/perfil')
    revalidatePath('/')

    return { ok: true, mensaje: 'Personal actualizado correctamente.' }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error al actualizar perfil.' }
  }
}

// 7. Resetear contraseña de un usuario desde el panel
export async function resetearClavePersonal(usuarioId: string, nuevaClave: string) {
  try {
    if (!nuevaClave || nuevaClave.length < 6) {
      return { ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' }
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
      password: nuevaClave,
    })

    if (error) throw error

    return { ok: true, mensaje: 'Contraseña restablecida con éxito.' }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error al restablecer la contraseña.' }
  }
}

// 8. Eliminación lógica / Desactivación de personal
export async function alternarEstadoPersonal(usuarioId: string, nuevoEstado: boolean) {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    // Si se desactiva, se libera el aula para que no quede ocupada
    const actualizacion: { activo: boolean; seccion_id?: null } = { activo: nuevoEstado }
    if (!nuevoEstado) {
      actualizacion.seccion_id = null
    }

    const { error } = await supabaseAdmin
      .from('perfiles')
      .update(actualizacion)
      .eq('id', usuarioId)

    if (error) throw error

    revalidatePath('/admin')
    revalidatePath('/dashboard')
    revalidatePath('/')

    return {
      ok: true,
      mensaje: nuevoEstado ? 'Usuario reactivado.' : 'Personal desactivado y aula liberada.',
    }
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error al alternar estado del usuario.' }
  }
}