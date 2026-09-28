import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const usuarios = [
  {
    email: 'director@fermintoro.edu.ve',
    password: 'FerminToro2026*',
    rol: 'DIRECTIVO',
    cedula: 'V-10200300',
    nombres: 'Dirección',
    apellidos: 'Plantel',
  },
  {
    email: 'docente.prueba@fermintoro.edu.ve',
    password: 'Docente2026*',
    rol: 'DOCENTE',
    cedula: 'V-00000000',
    nombres: 'Docente',
    apellidos: 'Prueba',
  },
  {
    email: 'admin@fermintoro.edu.ve',
    password: 'AdminToro2026*',
    rol: 'ADMINISTRATIVO',
    cedula: 'V-15444333',
    nombres: 'Secretaría',
    apellidos: 'Control de Estudios',
  },
]

async function sembrar() {
  for (const u of usuarios) {
    // 1. Verificar si existe y actualizar contraseña, o crearlo
    const { data: listData } = await supabase.auth.admin.listUsers()
    const existente = listData.users.find((user) => user.email === u.email)

    let userId = existente?.id

    if (existente) {
      console.log(`Actualizando contraseña oficial para ${u.email}...`)
      const { error: updErr } = await supabase.auth.admin.updateUserById(existente.id, {
        password: u.password,
        email_confirm: true,
      })
      if (updErr) console.error('Error al actualizar:', updErr.message)
    } else {
      console.log(`Creando usuario oficial para ${u.email}...`)
      const { data: newU, error: crtErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      })
      if (crtErr) console.error('Error al crear:', crtErr.message)
      userId = newU?.user?.id
    }

    // 2. Sincronizar tabla de perfiles
    if (userId) {
      const { error: perfErr } = await supabase.from('perfiles').upsert({
        id: userId,
        cedula: u.cedula,
        nombres: u.nombres,
        apellidos: u.apellidos,
        rol: u.rol,
      })
      if (perfErr) console.error(`Error perfil ${u.email}:`, perfErr.message)
    }
  }
  console.log('¡Usuarios y credenciales oficiales configurados exitosamente!')
}

sembrar()