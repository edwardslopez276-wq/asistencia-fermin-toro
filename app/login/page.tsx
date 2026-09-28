'use client'

import { useState } from 'react'
import { iniciarSesion } from '@/app/actions/auth'
import { School, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

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
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
        
        {/* Cabecera del formulario */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto border border-indigo-100">
            <School className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">U.E. "Fermín Toro"</h1>
          <p className="text-xs text-slate-500">Sistema Automatizado de Control de Asistencia Primaria</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Correo Institucional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                required
                placeholder="usuario@fermintoro.edu.ve"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {cargando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Ingresar al Sistema'
            )}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-[11px] text-slate-400">
            Período Escolar 2026-2027 • Control Académico
          </p>
        </div>

      </div>
    </main>
  )
}