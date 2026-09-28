'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ImportarEstudiantesModal from '@/components/ImportarEstudiantesModal'
import {
  crearEstudianteAction,
  toggleEstadoEstudianteAction,
  crearSeccionAction,
  reasignarSeccionDocenteAction,
} from '@/app/actions/admin'
import { crearUsuarioAction, RolUsuario } from '@/app/actions/usuarios'

export interface SeccionAdmin {
  id: number | string
  grado: number
  seccion: string
  nivel?: 'PRIMARIA' | 'MEDIA_GENERAL' | string | null
}

export interface EstudianteAdmin {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
  genero: string
  fecha_nacimiento: string
  activo: boolean
  seccion_actual_id: number
  nombre_representante?: string
  telefono_representante?: string
  secciones?: {
    grado: number
    seccion: string
    nivel?: string | null
  } | null
}

export interface PerfilAdmin {
  id: string
  cedula?: string
  nombres: string
  apellidos: string
  rol: RolUsuario
  seccion_id: number | null
  secciones?: {
    grado: number
    seccion: string
    nivel?: string | null
  } | null
}

interface Props {
  secciones: SeccionAdmin[]
  estudiantes: EstudianteAdmin[]
  perfiles: PerfilAdmin[]
}

// Función auxiliar para renderizar con precisión pedagógica venezolana
export const formatearNivelEducativo = (grado: number, seccion: string, nivel?: string | null) => {
  if (nivel === 'MEDIA_GENERAL' || (!nivel && grado > 6)) {
    return `${grado}° Año "${seccion}"`
  }
  return `${grado}° Grado "${seccion}"`
}

// Subcomponente interactivo para reasignar sección en línea
function SelectorSeccionDocente({
  perfil,
  secciones,
  docentesPorSeccion,
  onActualizado,
}: {
  perfil: PerfilAdmin
  secciones: SeccionAdmin[]
  docentesPorSeccion: Record<number, string>
  onActualizado: (texto: string, tipo: 'ok' | 'error') => void
}) {
  const router = useRouter()
  const [seccionId, setSeccionId] = useState<number | ''>(perfil.seccion_id || '')
  const [cargando, setCargando] = useState(false)

  // Mantener sincronizado el selector si el servidor refresca el perfil
  useEffect(() => {
    setSeccionId(perfil.seccion_id || '')
  }, [perfil.seccion_id])

  const handleCambio = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const valor = e.target.value
    const nuevoId = valor === '' ? null : Number(valor)

    // Validar exclusividad en cliente antes de mutar
    if (nuevoId && docentesPorSeccion[nuevoId] && nuevoId !== perfil.seccion_id) {
      alert(`Esta aula ya está asignada a: ${docentesPorSeccion[nuevoId]}.`)
      return
    }

    setSeccionId(nuevoId ?? '')
    setCargando(true)

    const res = await reasignarSeccionDocenteAction(perfil.id, nuevoId)
    setCargando(false)

    if (res.success) {
      onActualizado(`¡Sección actualizada para ${perfil.nombres} ${perfil.apellidos}!`, 'ok')
      router.refresh()
    } else {
      setSeccionId(perfil.seccion_id || '')
      onActualizado(res.error || 'Error al cambiar la sección.', 'error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={seccionId}
        disabled={cargando}
        onChange={handleCambio}
        className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <option value="">-- Sin Aula Asignada --</option>
        {secciones.map((sec) => {
          const ocupadaPor = docentesPorSeccion[Number(sec.id)]
          const esPropia = Number(sec.id) === perfil.seccion_id
          const nombreAula = formatearNivelEducativo(sec.grado, sec.seccion, sec.nivel)

          return (
            <option
              key={sec.id}
              value={sec.id}
              disabled={Boolean(ocupadaPor && !esPropia)}
              className={ocupadaPor && !esPropia ? 'text-slate-400 bg-slate-100' : 'text-slate-800'}
            >
              {nombreAula} {ocupadaPor && !esPropia ? `(Ocupada)` : ''}
            </option>
          )
        })}
      </select>
      {cargando && <span className="text-[10px] text-blue-600 font-bold animate-pulse">Guardando...</span>}
    </div>
  )
}

export default function AdminGestionView({ secciones, estudiantes, perfiles }: Props) {
  const [tab, setTab] = useState<'estudiantes' | 'secciones' | 'personal'>('estudiantes')

  // Filtros estudiantes
  const [filtroSeccion, setFiltroSeccion] = useState<string>('TODAS')
  const [busqueda, setBusqueda] = useState('')

  // Modal para carga masiva CSV
  const [mostrarModalImportacion, setMostrarModalImportacion] = useState(false)

  // Formulario nuevo estudiante individual
  const [mostrarModalEstudiante, setMostrarModalEstudiante] = useState(false)
  const [nuevoCedula, setNuevoCedula] = useState('')
  const [nuevoNombres, setNuevoNombres] = useState('')
  const [nuevoApellidos, setNuevoApellidos] = useState('')
  const [nuevoGenero, setNuevoGenero] = useState<'M' | 'F'>('M')
  const [nuevoFechaNac, setNuevoFechaNac] = useState('2018-01-01')
  const [nuevoRepresentante, setNuevoRepresentante] = useState('')
  const [nuevoTelefonoRep, setNuevoTelefonoRep] = useState('')
  const [nuevoSeccionId, setNuevoSeccionId] = useState<number | ''>(
    secciones[0]?.id ? Number(secciones[0].id) : ''
  )
  const [guardandoEstudiante, setGuardandoEstudiante] = useState(false)
  const [errorModalEstudiante, setErrorModalEstudiante] = useState<string | null>(null)

  // Formulario nueva sección / año (Con selector de nivel institucional)
  const [nivelEducativo, setNivelEducativo] = useState<'PRIMARIA' | 'MEDIA_GENERAL'>('PRIMARIA')
  const [nuevoGrado, setNuevoGrado] = useState(1)
  const [nuevaLetraSeccion, setNuevaLetraSeccion] = useState('')
  const [guardandoSeccion, setGuardandoSeccion] = useState(false)

  // Formulario nuevo personal / docente
  const [mostrarModalPersonal, setMostrarModalPersonal] = useState(false)
  const [cedulaPersonal, setCedulaPersonal] = useState('')
  const [emailPersonal, setEmailPersonal] = useState('')
  const [passwordPersonal, setPasswordPersonal] = useState('')
  const [nombresPersonal, setNombresPersonal] = useState('')
  const [apellidosPersonal, setApellidosPersonal] = useState('')
  const [rolPersonal, setRolPersonal] = useState<RolUsuario>('DOCENTE')
  const [seccionPersonalId, setSeccionPersonalId] = useState<number | ''>('')
  const [guardandoPersonal, setGuardandoPersonal] = useState(false)
  const [errorModalPersonal, setErrorModalPersonal] = useState<string | null>(null)

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const mostrarNotificacion = (texto: string, tipo: 'ok' | 'error') => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), 4000)
  }

  // Mapa de secciones ya asignadas a algún docente titular
  const docentesPorSeccion = perfiles.reduce((acc, p) => {
    if (p.rol === 'DOCENTE' && p.seccion_id) {
      acc[p.seccion_id] = `${p.nombres} ${p.apellidos}`
    }
    return acc
  }, {} as Record<number, string>)

  // Bloqueo de barra espaciadora
  const bloquearEspacio = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      e.preventDefault()
    }
  }

  // Sanitizadores
  const filtrarSoloLetras = (valor: string) => {
    return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
  }

  const filtrarSoloNumeros = (valor: string) => {
    return valor.replace(/\D/g, '')
  }

  const manejarCambioCedula = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '')
    if (!soloNumeros) {
      setNuevoCedula('')
      return
    }
    const recortado = soloNumeros.slice(0, 12)
    setNuevoCedula(`V-${recortado}`)
  }

  const manejarCambioCedulaPersonal = (valor: string) => {
    const soloNumeros = valor.replace(/\D/g, '')
    if (!soloNumeros) {
      setCedulaPersonal('')
      return
    }
    const recortado = soloNumeros.slice(0, 9)
    setCedulaPersonal(`V-${recortado}`)
  }

  const estudiantesFiltrados = estudiantes.filter((est) => {
    const coincideSeccion =
      filtroSeccion === 'TODAS' || String(est.seccion_actual_id) === filtroSeccion
    const termino = busqueda.toLowerCase().trim()
    const coincideTexto =
      est.nombres.toLowerCase().includes(termino) ||
      est.apellidos.toLowerCase().includes(termino) ||
      est.cedula_escolar.toLowerCase().includes(termino)

    return coincideSeccion && coincideTexto
  })

  // Submit Estudiante individual
  const handleCrearEstudiante = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModalEstudiante(null)

    const cedulaLimpia = nuevoCedula.trim().toUpperCase()
    const nombresLimpios = nuevoNombres.trim()
    const apellidosLimpios = nuevoApellidos.trim()
    const repLimpio = nuevoRepresentante.trim()
    const tlfLimpio = nuevoTelefonoRep.trim()

    if (!cedulaLimpia) {
      setErrorModalEstudiante('La cédula escolar es obligatoria.')
      return
    }
    if (!nombresLimpios || !apellidosLimpios) {
      setErrorModalEstudiante('Los nombres y apellidos del estudiante son obligatorios.')
      return
    }
    if (!nuevoSeccionId) {
      setErrorModalEstudiante('Debes asignar un grado o año al estudiante.')
      return
    }
    if (!repLimpio) {
      setErrorModalEstudiante('El nombre del representante legal es obligatorio.')
      return
    }
    if (!tlfLimpio) {
      setErrorModalEstudiante('El teléfono de contacto del representante es obligatorio.')
      return
    }

    setGuardandoEstudiante(true)

    const res = await crearEstudianteAction({
      cedula_escolar: cedulaLimpia,
      nombres: nombresLimpios,
      apellidos: apellidosLimpios,
      genero: nuevoGenero,
      fecha_nacimiento: nuevoFechaNac,
      seccion_actual_id: Number(nuevoSeccionId),
      nombre_representante: repLimpio,
      telefono_representante: tlfLimpio,
    })

    setGuardandoEstudiante(false)

    if (res.success) {
      mostrarNotificacion('¡Estudiante inscrito exitosamente!', 'ok')
      setNuevoCedula('')
      setNuevoNombres('')
      setNuevoApellidos('')
      setNuevoRepresentante('')
      setNuevoTelefonoRep('')
      setMostrarModalEstudiante(false)
    } else {
      setErrorModalEstudiante(res.error || 'Error al inscribir estudiante.')
    }
  }

  // Submit Sección / Grado / Año
  const handleCrearSeccion = async (e: React.FormEvent) => {
    e.preventDefault()
    const letraLimpia = nuevaLetraSeccion.trim().toUpperCase()
    if (!letraLimpia) {
      mostrarNotificacion('Debe ingresar la letra de la sección (Ej: A, B, C).', 'error')
      return
    }

    setGuardandoSeccion(true)
    setMensaje(null)

    const res = await crearSeccionAction(nuevoGrado, letraLimpia, nivelEducativo)
    setGuardandoSeccion(false)

    if (res.success) {
      const etiquetaNivel = nivelEducativo === 'PRIMARIA' ? `${nuevoGrado}° Grado` : `${nuevoGrado}° Año`
      mostrarNotificacion(`¡${etiquetaNivel} sección "${letraLimpia}" agregada con éxito!`, 'ok')
      setNuevaLetraSeccion('')
    } else {
      mostrarNotificacion(res.error || 'Error al agregar sección.', 'error')
    }
  }

  // Submit Personal / Docente
  const handleCrearPersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModalPersonal(null)

    const cedulaLimpia = cedulaPersonal.trim().toUpperCase()
    const emailLimpio = emailPersonal.trim().toLowerCase()
    const passwordLimpio = passwordPersonal.trim()
    const nombresLimpios = nombresPersonal.trim()
    const apellidosLimpios = apellidosPersonal.trim()

    if (!cedulaLimpia || !emailLimpio || !passwordLimpio || !nombresLimpios || !apellidosLimpios) {
      setErrorModalPersonal('Todos los campos son obligatorios y no pueden contener solo espacios.')
      return
    }

    if (['DIRECTOR', 'DIRECTIVO'].includes(rolPersonal)) {
      const directorActual = perfiles.find((p) => (p.rol as string) === 'DIRECTOR' || (p.rol as string) === 'DIRECTIVO')
      if (directorActual) {
        setErrorModalPersonal(
          `Ya existe un Director titular en el plantel (${directorActual.nombres} ${directorActual.apellidos}). No está permitido registrar dos directores.`
        )
        return
      }
    }

    if (rolPersonal === 'SUBDIRECTOR') {
      const subdirectorActual = perfiles.find((p) => (p.rol as string) === 'SUBDIRECTOR')
      if (subdirectorActual) {
        setErrorModalPersonal(
          `Ya existe un Subdirector titular en el plantel (${subdirectorActual.nombres} ${subdirectorActual.apellidos}). No está permitido registrar dos subdirectores.`
        )
        return
      }
    }

    if (rolPersonal === 'DOCENTE') {
      if (!seccionPersonalId) {
        setErrorModalPersonal('Debes asignarle una sección obligatoria al Docente.')
        return
      }

      if (docentesPorSeccion[Number(seccionPersonalId)]) {
        setErrorModalPersonal(
          `Esta sección ya se encuentra asignada a: ${docentesPorSeccion[Number(seccionPersonalId)]}. Seleccione una sección vacía.`
        )
        return
      }
    }

    setGuardandoPersonal(true)

    const res = await crearUsuarioAction({
      email: emailLimpio,
      password: passwordLimpio,
      cedula: cedulaLimpia,
      nombres: nombresLimpios,
      apellidos: apellidosLimpios,
      rol: rolPersonal,
      seccion_id: rolPersonal === 'DOCENTE' ? Number(seccionPersonalId) : null,
    })

    setGuardandoPersonal(false)

    if (res.success) {
      mostrarNotificacion(`¡Usuario con perfil ${rolPersonal} registrado exitosamente!`, 'ok')
      setCedulaPersonal('')
      setEmailPersonal('')
      setPasswordPersonal('')
      setNombresPersonal('')
      setApellidosPersonal('')
      setSeccionPersonalId('')
      setMostrarModalPersonal(false)
    } else {
      setErrorModalPersonal(res.error || 'Error al registrar usuario.')
    }
  }

  const handleToggleEstado = async (id: number, estadoActual: boolean) => {
    const accion = estadoActual ? 'desactivar' : 'activar'
    if (!confirm(`¿Estás seguro de que deseas ${accion} a este estudiante?`)) return
    await toggleEstadoEstudianteAction(id, estadoActual)
  }

  return (
    <div className="space-y-6">
      {mensaje && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('estudiantes')}
          className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
            tab === 'estudiantes'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👨‍🎓 Estudiantes ({estudiantes.length})
        </button>
        <button
          onClick={() => setTab('secciones')}
          className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
            tab === 'secciones'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🏫 Aulas (Grados y Años) ({secciones.length})
        </button>
        <button
          onClick={() => setTab('personal')}
          className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 cursor-pointer ${
            tab === 'personal'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👨‍🏫 Personal y Docentes ({perfiles.length})
        </button>
      </div>

      {/* PESTAÑA 1: ESTUDIANTES */}
      {tab === 'estudiantes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cédula, nombre o apellido..."
                className="w-72 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODAS">Todas las aulas</option>
                {secciones.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {formatearNivelEducativo(sec.grado, sec.seccion, sec.nivel)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMostrarModalImportacion(true)}
                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📥</span>
                <span>Importar CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorModalEstudiante(null)
                  setMostrarModalEstudiante(true)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Inscribir Estudiante</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Cédula Escolar</th>
                    <th className="py-3 px-4">Estudiante</th>
                    <th className="py-3 px-4">Representante Legal</th>
                    <th className="py-3 px-4">Aula Asignada</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {estudiantesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No se encontraron estudiantes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    estudiantesFiltrados.map((est) => (
                      <tr key={est.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {est.cedula_escolar}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {est.apellidos}, {est.nombres}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <p className="font-semibold text-slate-700">{est.nombre_representante || 'No registrado'}</p>
                          {est.telefono_representante && (
                            <p className="text-slate-400 font-mono">{est.telefono_representante}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                          {est.secciones
                            ? formatearNivelEducativo(est.secciones.grado, est.secciones.seccion, est.secciones.nivel)
                            : 'Sin aula asignada'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              est.activo
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-300'
                            }`}
                          >
                            {est.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleEstado(est.id, est.activo)}
                            className={`text-xs font-semibold cursor-pointer transition ${
                              est.activo
                                ? 'text-rose-600 hover:text-rose-800'
                                : 'text-emerald-600 hover:text-emerald-800'
                            }`}
                          >
                            {est.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: SECCIONES / GRADOS / AÑOS */}
      {tab === 'secciones' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Aperturar Nueva Aula</h3>
            <p className="text-xs text-slate-500 mb-4">Configura grados de primaria o años para liceo.</p>

            <form onSubmit={handleCrearSeccion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nivel Educativo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNivelEducativo('PRIMARIA')
                      setNuevoGrado(1)
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      nivelEducativo === 'PRIMARIA'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🎒 Primaria
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNivelEducativo('MEDIA_GENERAL')
                      setNuevoGrado(1)
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      nivelEducativo === 'MEDIA_GENERAL'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🏛️ Liceo (Media)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  {nivelEducativo === 'PRIMARIA' ? 'Grado de Primaria' : 'Año de Media General'}
                </label>
                <select
                  value={nuevoGrado}
                  onChange={(e) => setNuevoGrado(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {nivelEducativo === 'PRIMARIA'
                    ? [1, 2, 3, 4, 5, 6].map((g) => (
                        <option key={g} value={g}>
                          {g}° Grado
                        </option>
                      ))
                    : [1, 2, 3, 4, 5].map((g) => (
                        <option key={g} value={g}>
                          {g}° Año
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Letra / Sección
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Ej: A, B, C, U"
                  value={nuevaLetraSeccion}
                  onKeyDown={bloquearEspacio}
                  onChange={(e) => setNuevaLetraSeccion(filtrarSoloLetras(e.target.value).toUpperCase())}
                  required
                  className="w-full uppercase border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={guardandoSeccion}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
              >
                {guardandoSeccion
                  ? 'Guardando...'
                  : `Crear ${nivelEducativo === 'PRIMARIA' ? 'Grado' : 'Año'}`}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Aulas Activas del Plantel</h3>
              <span className="text-xs text-slate-500">Primaria y Media General</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Grado / Año</th>
                    <th className="py-3 px-4">Sección</th>
                    <th className="py-3 px-4">Docente Titular Asignado</th>
                    <th className="py-3 px-4">Estudiantes Inscritos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {secciones.map((sec) => {
                    const totalEstudiantes = estudiantes.filter(
                      (e) => Number(e.seccion_actual_id) === Number(sec.id) && e.activo
                    ).length
                    const docenteTitular = docentesPorSeccion[Number(sec.id)]

                    return (
                      <tr key={sec.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {formatearNivelEducativo(sec.grado, sec.seccion, sec.nivel).split('"')[0]}
                        </td>
                        <td className="py-3 px-4 font-bold text-blue-700">
                          Sección "{sec.seccion}"
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {docenteTitular ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              {docenteTitular}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic font-medium">Disponible (Sin docente)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-500">
                          {totalEstudiantes} estudiantes activos
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PERSONAL Y DOCENTES */}
      {tab === 'personal' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nómina de Docentes, Directivos y Personal de Control de Estudios
            </p>
            <button
              onClick={() => {
                setErrorModalPersonal(null)
                const primeraLibre = secciones.find((s) => !docentesPorSeccion[Number(s.id)])
                setSeccionPersonalId(primeraLibre ? Number(primeraLibre.id) : '')
                setMostrarModalPersonal(true)
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Registrar Personal / Docente</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Cédula</th>
                    <th className="py-3 px-4">Nombre Completo</th>
                    <th className="py-3 px-4">Cargo / Rol</th>
                    <th className="py-3 px-4">Aula Asignada (Gestión de Sección)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {perfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {p.cedula || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.nombres} {p.apellidos}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            ['ADMIN', 'ADMINISTRATIVO'].includes(p.rol as string)
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : ['DIRECTOR', 'DIRECTIVO'].includes(p.rol as string)
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : (p.rol as string) === 'SUBDIRECTOR'
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.rol}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        {p.rol === 'DOCENTE' ? (
                          <SelectorSeccionDocente
                            perfil={p}
                            secciones={secciones}
                            docentesPorSeccion={docentesPorSeccion}
                            onActualizado={mostrarNotificacion}
                          />
                        ) : (
                          <span className="text-slate-400">Supervisión Institucional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA INSCRIBIR ESTUDIANTE INDIVIDUAL */}
      {mostrarModalEstudiante && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Inscribir Estudiante</h3>
              <button
                type="button"
                onClick={() => setMostrarModalEstudiante(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {errorModalEstudiante && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorModalEstudiante}</span>
              </div>
            )}

            <form onSubmit={handleCrearEstudiante} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cédula Escolar / Identidad *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="V-32000000"
                    value={nuevoCedula}
                    onKeyDown={bloquearEspacio}
                    onChange={(e) => manejarCambioCedula(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Alejandro José"
                    value={nuevoNombres}
                    onChange={(e) => setNuevoNombres(filtrarSoloLetras(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Gómez Pérez"
                    value={nuevoApellidos}
                    onChange={(e) => setNuevoApellidos(filtrarSoloLetras(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Género *
                  </label>
                  <select
                    value={nuevoGenero}
                    onChange={(e) => setNuevoGenero(e.target.value as 'M' | 'F')}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Fecha Nacimiento *
                  </label>
                  <input
                    type="date"
                    required
                    value={nuevoFechaNac}
                    onChange={(e) => setNuevoFechaNac(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Aula Asignada (Grado o Año) *
                  </label>
                  <select
                    value={nuevoSeccionId}
                    onChange={(e) => setNuevoSeccionId(Number(e.target.value))}
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {secciones.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {formatearNivelEducativo(sec.grado, sec.seccion, sec.nivel)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 pt-3 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                    Datos del Representante Legal
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Nombre del Representante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Carmen Gómez"
                    value={nuevoRepresentante}
                    onChange={(e) => setNuevoRepresentante(filtrarSoloLetras(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Teléfono de Contacto *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    placeholder="Ej: 04141234567"
                    value={nuevoTelefonoRep}
                    onKeyDown={bloquearEspacio}
                    onChange={(e) => setNuevoTelefonoRep(filtrarSoloNumeros(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalEstudiante(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEstudiante}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  {guardandoEstudiante ? 'Inscribiendo...' : 'Inscribir Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CARGA MASIVA DE ESTUDIANTES CSV */}
      {mostrarModalImportacion && (
        <ImportarEstudiantesModal
          secciones={secciones}
          onClose={() => setMostrarModalImportacion(false)}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}

      {/* MODAL PARA REGISTRAR PERSONAL / DOCENTE */}
      {mostrarModalPersonal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Registrar Personal / Docente</h3>
              <button
                type="button"
                onClick={() => setMostrarModalPersonal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {errorModalPersonal && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorModalPersonal}</span>
              </div>
            )}

            <form onSubmit={handleCrearPersonal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cédula de Identidad *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    placeholder="V-15420369"
                    value={cedulaPersonal}
                    onKeyDown={bloquearEspacio}
                    onChange={(e) => manejarCambioCedulaPersonal(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Correo Electrónico (Acceso al sistema) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="profesor@fermintoro.edu.ve"
                    value={emailPersonal}
                    onKeyDown={bloquearEspacio}
                    onChange={(e) => setEmailPersonal(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Contraseña Inicial *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={passwordPersonal}
                    onKeyDown={bloquearEspacio}
                    onChange={(e) => setPasswordPersonal(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombresPersonal}
                    onChange={(e) => setNombresPersonal(filtrarSoloLetras(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={apellidosPersonal}
                    onChange={(e) => setApellidosPersonal(filtrarSoloLetras(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Rol Institucional *
                  </label>
                  <select
                    value={rolPersonal}
                    onChange={(e) => {
                      const nuevoRol = e.target.value as RolUsuario
                      setRolPersonal(nuevoRol)
                      setErrorModalPersonal(null)
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="DOCENTE">DOCENTE (Toma asistencia en su aula)</option>
                    <option value="SUBDIRECTOR">SUBDIRECTOR (Supervisión institucional única)</option>
                    <option value="DIRECTOR">DIRECTOR (Gestión y dirección titular)</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO (Control de Estudios y Matrícula)</option>
                    <option value="ADMIN">ADMINISTRADOR (Gestión técnica total)</option>
                  </select>
                </div>

                {rolPersonal === 'DOCENTE' && (
                  <div className="col-span-2 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-1.5">
                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Aula Asignada para Asistencias *
                    </label>
                    <select
                      value={seccionPersonalId}
                      onChange={(e) => {
                        setSeccionPersonalId(e.target.value ? Number(e.target.value) : '')
                        setErrorModalPersonal(null)
                      }}
                      required
                      className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Seleccionar Aula --</option>
                      {secciones.map((sec) => {
                        const ocupadaPor = docentesPorSeccion[Number(sec.id)]
                        const nombreAula = formatearNivelEducativo(sec.grado, sec.seccion, sec.nivel)
                        return (
                          <option
                            key={sec.id}
                            value={sec.id}
                            disabled={Boolean(ocupadaPor)}
                            className={ocupadaPor ? 'text-slate-400 bg-slate-100' : 'text-slate-800'}
                          >
                            {nombreAula} {ocupadaPor ? `(Asignada a: ${ocupadaPor})` : '✓ Disponible'}
                          </option>
                        )
                      })}
                    </select>
                    <p className="text-[11px] text-blue-700">
                      Las aulas ya asignadas a otro docente titular se muestran deshabilitadas para garantizar la exclusividad.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarModalPersonal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPersonal}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  {guardandoPersonal ? 'Creando cuenta...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}