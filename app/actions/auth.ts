'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function iniciarSesion(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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
            // El bloque catch previene errores si se llama desde Server Components
          }
        },
      },
    }
  )

  // 1. Autenticación con Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { error: 'Credenciales inválidas. Verifique correo y contraseña.' }
  }

  // 2. Consultar el rol del usuario autenticado
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', data.user.id)
    .single()

  const rol = perfil?.rol || ''
  const esDirectivo = ['DIRECTOR', 'SUBDIRECTOR', 'DIRECTIVO', 'ADMIN'].includes(rol)

  // 3. Redirección condicional según perfil
  if (esDirectivo) {
    redirect('/dashboard')
  } else {
    redirect('/')
  }
}