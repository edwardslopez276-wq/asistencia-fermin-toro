'use client'

import { useState } from 'react'
import { iniciarSesion } from '@/app/actions/auth'
import { School, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const bloquearEspacio = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    setCargando(true)

    const formData = new FormData(e.currentTarget)
    const res = await iniciarSesion(formData)

    if (res?.error) {
      setErrorMsg(res.error)
      setCargando(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        {/* Cabecera del formulario */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
            <School className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            U.E. "Fermín Toro"
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Sistema Automatizado de Control de Asistencia y Matrícula Escolar
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                name="email"
                required
                inputMode="email"
                autoComplete="email"
                onKeyDown={bloquearEspacio}
                placeholder="usuario@fermintoro.edu.ve"
                className="w-full bg-slate-50/70 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                onKeyDown={bloquearEspacio}
                placeholder="••••••••"
                className="w-full bg-slate-50/70 border border-slate-300 text-slate-800 text-xs sm:text-sm rounded-xl pl-10 pr-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 sm:py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Período Escolar • Control Académico y Asistencia
          </p>
        </div>

      </div>
    </main>
  )
}