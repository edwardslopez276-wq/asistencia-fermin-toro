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

  const bloquearEspacio = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault()
    }
  }

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje(null)

    const passLimpia = nuevaPassword.trim()
    const confirmLimpia = confirmarPassword.trim()

    if (passLimpia.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' })
      return
    }

    if (passLimpia !== confirmLimpia) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }

    setCargando(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passLimpia,
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
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-slate-800">Seguridad de la Cuenta</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Modifica tu clave de acceso para resguardar tu sesión en el sistema escolar.
        </p>
      </div>

      {userEmail && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <span className="text-slate-500 font-medium">Correo de acceso:</span>
          <span className="font-mono font-semibold text-slate-800 truncate ml-2">{userEmail}</span>
        </div>
      )}

      {mensaje && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{mensaje.tipo === 'ok' ? '✓' : '⚠️'}</span>
          <span>{mensaje.texto}</span>
        </div>
      )}

      <form onSubmit={handleCambiarPassword} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Nueva Contraseña *
          </label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            value={nuevaPassword}
            onKeyDown={bloquearEspacio}
            onChange={(e) => setNuevaPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Confirmar Nueva Contraseña *
          </label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="Repite la nueva contraseña"
            value={confirmarPassword}
            onKeyDown={bloquearEspacio}
            onChange={(e) => setConfirmarPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={cargando}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-xs shadow-sm transition cursor-pointer"
          >
            {cargando ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
          </button>
        </div>
      </form>
    </div>
  )
}