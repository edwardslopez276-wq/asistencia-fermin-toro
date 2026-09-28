import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminGestionView, { SeccionAdmin, EstudianteAdmin, PerfilAdmin } from '@/components/AdminGestionView'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
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

  // Obtener perfil y validar privilegios
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombres, apellidos, rol')
    .eq('id', user.id)
    .single()

  const rol = perfil?.rol || ''

  // Roles autorizados para gestionar matrícula, secciones y personal institucional
  const rolesAutorizados = ['ADMIN', 'ADMINISTRATIVO', 'DIRECTOR', 'DIRECTIVO']

  if (!rolesAutorizados.includes(rol)) {
    if (rol === 'SUBDIRECTOR') {
      redirect('/dashboard')
    }
    redirect('/')
  }

  // 1. Obtener todas las secciones (incluyendo nivel)
  const { data: seccionesData } = await supabase
    .from('secciones')
    .select('id, grado, seccion, nivel')
    .order('nivel', { ascending: false }) // Primaria primero, luego Media General
    .order('grado', { ascending: true })
    .order('seccion', { ascending: true })

  const secciones: SeccionAdmin[] = (seccionesData as SeccionAdmin[]) || []

  // 2. Obtener todos los estudiantes con su aula (incluyendo nivel)
  const { data: estudiantesData } = await supabase
    .from('estudiantes')
    .select(`
      id,
      cedula_escolar,
      nombres,
      apellidos,
      genero,
      fecha_nacimiento,
      activo,
      seccion_actual_id,
      nombre_representante,
      telefono_representante,
      secciones:seccion_actual_id (
        grado,
        seccion,
        nivel
      )
    `)
    .order('apellidos', { ascending: true })

  const estudiantes: EstudianteAdmin[] = (estudiantesData as unknown as EstudianteAdmin[]) || []

  // 3. Obtener todos los perfiles de usuarios registrados con su aula y estado
  const { data: perfilesData } = await supabase
    .from('perfiles')
    .select(`
      id,
      cedula,
      nombres,
      apellidos,
      rol,
      activo,
      seccion_id,
      secciones:seccion_id (
        grado,
        seccion,
        nivel
      )
    `)
    .order('rol', { ascending: true })
    .order('apellidos', { ascending: true })

  const perfiles: PerfilAdmin[] = (perfilesData as unknown as PerfilAdmin[]) || []

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Barra de navegación unificada */}
        <Navbar perfil={perfil} />

        <AdminGestionView
          secciones={secciones}
          estudiantes={estudiantes}
          perfiles={perfiles}
        />
      </div>
    </main>
  )
}