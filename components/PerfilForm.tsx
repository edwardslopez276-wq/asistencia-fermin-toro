'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface PerfilFormProps {
  userEmail?: string
}

export default function PerfilForm({ userEmail }: PerfilFormProps) {
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)

    if (nuevaPassword.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    setCargando(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: nuevaPassword,
      })

      if (error) {
        setMensaje({ tipo: 'error', texto: error.message || 'Error al actualizar la contraseña.' })
      } else {
        setMensaje({ tipo: 'ok', texto: '¡Contraseña actualizada con éxito!' })
        setNuevaPassword('')
        setConfirmarPassword('')
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Ocurrió un error inesperado al conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Seguridad de la Cuenta</h3>
        <p className="text-xs text-slate-500">
          Modifica tu contraseña de acceso para mantener segura tu sesión institucional.
        </p>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleCambiarPassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nueva Contraseña
          </label>
          <input
            type="password"
            required
            placeholder="Mínimo 6 caracteres"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirmar Nueva Contraseña
          </label>
          <input
            type="password"
            required
            placeholder="Repite la contraseña"
            value={confirmarPassword}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {cargando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
        </button>
      </form>
    </div>
  )
}