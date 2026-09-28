'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  ]

  // Ruta base según jerarquía
  const rutaBase = esAdminOControlEstudios && !esDirectivo ? '/admin' : esDirectivo ? '/dashboard' : '/'
  const estaEnRutaBase = pathname === rutaBase

  return (
    <header className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        {!estaEnRutaBase && (
          <Link
            href={rutaBase}
            title="Volver al panel principal"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
          >
            ← {esDirectivo ? 'Dashboard' : esAdminOControlEstudios ? 'Admin' : 'Inicio'}
          </Link>
        )}

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
            Liceo Bolivariano "Fermín Toro"
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {perfil?.nombres} {perfil?.apellidos}{' '}
            <span
              className={`inline-block ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
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

      {/* Menú de Navegación Persistente */}
      <nav className="flex flex-wrap items-center gap-2">
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
    </header>
  )
}