import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PerfilForm from '@/components/PerfilForm'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
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

  // Consultar perfil institucional
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

  // Extraer y normalizar la información del aula
  const rawSecciones = perfil?.secciones as any
  const aula = Array.isArray(rawSecciones) ? rawSecciones[0] : rawSecciones

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Navbar perfil={perfil} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tarjeta Informativa del Usuario */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl mx-auto mb-4 border border-blue-200">
                {perfil?.nombres?.[0] || 'U'}{perfil?.apellidos?.[0] || ''}
              </div>
              <h2 className="text-center font-bold text-slate-800 text-lg">
                {perfil?.nombres} {perfil?.apellidos}
              </h2>
              <p className="text-center text-xs font-semibold text-blue-600 bg-blue-50 py-1 px-2 rounded-md inline-block w-full mt-1">
                {perfil?.rol || 'USUARIO'}
              </p>

              <div className="mt-6 space-y-3 text-sm border-t border-slate-100 pt-4">
                <div>
                  <span className="text-slate-500 text-xs block">Correo Electrónico:</span>
                  <span className="font-medium text-slate-700 break-all">{user.email}</span>
                </div>

                {aula && (
                  <div>
                    <span className="text-slate-500 text-xs block">Aula Asignada:</span>
                    <span className="font-medium text-slate-700">
                      {aula.grado}° {aula.nivel === 'MEDIA_GENERAL' ? 'Año' : 'Grado'} - Sección "{aula.seccion}"
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
              Para modificar tus datos institucionales o asignación de aula, contacta a la Dirección o Control de Estudios.
            </div>
          </div>

          {/* Formulario de Seguridad / Cambio de Clave */}
          <div className="md:col-span-2">
            <PerfilForm userEmail={user.email || ''} />
          </div>
        </div>
      </div>
    </main>
  )
}