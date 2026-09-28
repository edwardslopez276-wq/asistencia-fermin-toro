'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import LogoutButton from '@/components/LogoutButton'

interface Perfil {
  nombres: string
  apellidos: string
  rol: string
}

interface Props {
  perfil?: Perfil | null
}

export default function Navbar({ perfil }: Props) {
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)

  const rol = perfil?.rol || ''
  const esDirectivo = ['DIRECTOR', 'SUBDIRECTOR', 'DIRECTIVO'].includes(rol)
  const esAdminOControlEstudios = ['ADMIN', 'ADMINISTRATIVO', 'DIRECTOR', 'DIRECTIVO'].includes(rol)
  const esDocente = rol === 'DOCENTE'

  // Rutas disponibles según el rol
  const rutas = [
    ...(esDocente ? [{ href: '/', etiqueta: 'Toma Diaria', icono: '📝' }] : []),
    ...(esDirectivo ? [{ href: '/dashboard', etiqueta: 'Estadísticas', icono: '📈' }] : []),
    { href: '/reportes', etiqueta: 'Historial y Reportes', icono: '📊' },
    { href: '/justificativos', etiqueta: 'Justificativos', icono: '📋' },
    ...(esAdminOControlEstudios ? [{ href: '/admin', etiqueta: 'Panel Admin', icono: '⚙️' }] : []),
    { href: '/perfil', etiqueta: 'Mi Perfil', icono: '👤' },
  ]

  // Ruta base según jerarquía
  const rutaBase = esAdminOControlEstudios && !esDirectivo ? '/admin' : esDirectivo ? '/dashboard' : '/'
  const estaEnRutaBase = pathname === rutaBase

  return (
    <header className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-3">
        {/* Lado izquierdo: Botón volver + Título institucional */}
        <div className="flex items-center gap-2.5 min-w-0">
          {!estaEnRutaBase && (
            <Link
              href={rutaBase}
              title="Volver al panel principal"
              className="px-2.5 py-1.5 md:px-3 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center shrink-0"
            >
              ← <span className="hidden sm:inline ml-1">{esDirectivo ? 'Dashboard' : esAdminOControlEstudios ? 'Admin' : 'Inicio'}</span>
            </Link>
          )}

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-snug truncate">
              U.E. "Fermín Toro"
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 flex items-center flex-wrap gap-1 mt-0.5">
              <span className="truncate max-w-[150px] sm:max-w-none">
                {perfil?.nombres} {perfil?.apellidos}
              </span>
              <span
                className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full uppercase shrink-0 ${
                  ['ADMIN', 'ADMINISTRATIVO'].includes(rol)
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : ['DIRECTOR', 'DIRECTIVO'].includes(rol)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : rol === 'SUBDIRECTOR'
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {rol}
              </span>
            </p>
          </div>
        </div>

        {/* Botón hamburguesa (Solo visible en móviles) */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú"
            className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition focus:outline-none"
          >
            {menuAbierto ? (
              <span className="text-lg font-bold block leading-none">✕</span>
            ) : (
              <span className="text-lg font-bold block leading-none">☰</span>
            )}
          </button>
        </div>

        {/* Navegación en Escritorio / Tablets (md en adelante) */}
        <nav className="hidden md:flex flex-wrap items-center gap-2">
          {rutas.map((r) => {
            const activo = pathname === r.href
            return (
              <Link
                key={r.href}
                href={r.href}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 ${
                  activo
                    ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{r.icono}</span>
                <span>{r.etiqueta}</span>
              </Link>
            )
          })}

          <div className="ml-1 pl-2 border-l border-slate-200">
            <LogoutButton />
          </div>
        </nav>
      </div>

      {/* Menú Desplegable Móvil */}
      {menuAbierto && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-100 space-y-2">
          <nav className="flex flex-col gap-1.5">
            {rutas.map((r) => {
              const activo = pathname === r.href
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  onClick={() => setMenuAbierto(false)}
                  className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl transition flex items-center justify-between ${
                    activo
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{r.icono}</span>
                    <span>{r.etiqueta}</span>
                  </span>
                  {activo && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">Activo</span>}
                </Link>
              )
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <LogoutButton />
          </div>
        </div>
      )}
    </header>
  )
}