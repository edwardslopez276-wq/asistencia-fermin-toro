'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  guardarAsistenciasAction,
  EstadoAsistencia,
  ItemAsistencia,
} from '@/app/actions/asistencia'

export interface Seccion {
  id: number | string
  grado: number
  seccion: string
  nivel?: 'PRIMARIA' | 'MEDIA_GENERAL' | string | null
}

interface Estudiante {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
}

interface AsistenciaPrevia {
  estudiante_id: number
  estado: EstadoAsistencia
  observacion?: string | null
}

interface Props {
  secciones: Seccion[]
  estudiantesIniciales: Estudiante[]
  asistenciasPrevias: AsistenciaPrevia[]
  fechaSeleccionada: string
  seccionSeleccionadaId: string
}

// Formateador pedagógico estándar
function formatearEtiquetaSeccion(grado: number, seccion: string, nivel?: string | null): string {
  const n = nivel?.toUpperCase().trim()
  if (n === 'MEDIA_GENERAL' || n === 'SECUNDARIA' || n === 'LICEO' || (!nivel && grado > 6)) {
    return `${grado}° Año - Sección "${seccion}"`
  }
  return `${grado}° Grado - Sección "${seccion}"`
}

export default function AsistenciaForm({
  secciones,
  estudiantesIniciales,
  asistenciasPrevias,
  fechaSeleccionada,
  seccionSeleccionadaId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Estados de asistencia (P, A, J, R)
  const [estados, setEstados] = useState<Record<number, EstadoAsistencia>>(() => {
    const mapa: Record<number, EstadoAsistencia> = {}
    estudiantesIniciales.forEach((est) => {
      mapa[est.id] = 'PRESENTE'
    })
    asistenciasPrevias.forEach((a) => {
      mapa[a.estudiante_id] = a.estado
    })
    return mapa
  })

  // Observaciones e incidencias
  const [observaciones, setObservaciones] = useState<Record<number, string>>(() => {
    const mapa: Record<number, string> = {}
    asistenciasPrevias.forEach((a) => {
      if (a.observacion) mapa[a.estudiante_id] = a.observacion
    })
    return mapa
  })

  // Control de apertura de casilla de texto
  const [expandidoObs, setExpandidoObs] = useState<Record<number, boolean>>(() => {
    const mapa: Record<number, boolean> = {}
    asistenciasPrevias.forEach((a) => {
      if (a.observacion) mapa[a.estudiante_id] = true
    })
    return mapa
  })

  // Sincronizar estados locales cuando cambian los props
  useEffect(() => {
    const nuevoMapaEstados: Record<number, EstadoAsistencia> = {}
    const nuevoMapaObs: Record<number, string> = {}
    const nuevoMapaExpandido: Record<number, boolean> = {}

    estudiantesIniciales.forEach((est) => {
      nuevoMapaEstados[est.id] = 'PRESENTE'
    })

    asistenciasPrevias.forEach((a) => {
      nuevoMapaEstados[a.estudiante_id] = a.estado
      if (a.observacion) {
        nuevoMapaObs[a.estudiante_id] = a.observacion
        nuevoMapaExpandido[a.estudiante_id] = true
      }
    })

    setEstados(nuevoMapaEstados)
    setObservaciones(nuevoMapaObs)
    setExpandidoObs(nuevoMapaExpandido)
  }, [estudiantesIniciales, asistenciasPrevias])

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const cambiarSeccionOFecha = (nuevaSeccion: string, nuevaFecha: string) => {
    router.push(`/?seccion=${nuevaSeccion}&fecha=${nuevaFecha}`)
  }

  const setEstadoAlumno = (estudianteId: number, nuevoEstado: EstadoAsistencia) => {
    setEstados((prev) => ({
      ...prev,
      [estudianteId]: nuevoEstado,
    }))
  }

  const setObservacionAlumno = (estudianteId: number, texto: string) => {
    setObservaciones((prev) => ({
      ...prev,
      [estudianteId]: texto,
    }))
  }

  const toggleExpandirObs = (estudianteId: number) => {
    setExpandidoObs((prev) => ({
      ...prev,
      [estudianteId]: !prev[estudianteId],
    }))
  }

  const marcarTodosPresentes = () => {
    const nuevo: Record<number, EstadoAsistencia> = {}
    estudiantesIniciales.forEach((est) => {
      nuevo[est.id] = 'PRESENTE'
    })
    setEstados(nuevo)
  }

  const handleGuardar = () => {
    if (!seccionSeleccionadaId) {
      setMensaje({ tipo: 'error', texto: 'Debes seleccionar una sección válida.' })
      return
    }

    startTransition(async () => {
      const asistenciasPayload: ItemAsistencia[] = estudiantesIniciales.map((est) => ({
        estudiante_id: est.id,
        estado: estados[est.id] || 'PRESENTE',
        observacion: observaciones[est.id]?.trim() || undefined,
      }))

      const res = await guardarAsistenciasAction({
        fecha: fechaSeleccionada,
        asistencias: asistenciasPayload,
      })

      if (res.success) {
        setMensaje({ tipo: 'ok', texto: '¡Asistencias e incidencias registradas con éxito!' })
        setTimeout(() => setMensaje(null), 4000)
      } else {
        setMensaje({ tipo: 'error', texto: res.error || 'Ocurrió un error al guardar.' })
      }
    })
  }

  // Totales de la sesión
  const totalPresentes = Object.values(estados).filter((e) => e === 'PRESENTE').length
  const totalAusentes = Object.values(estados).filter((e) => e === 'AUSENTE').length
  const totalJustificados = Object.values(estados).filter((e) => e === 'JUSTIFICADO').length
  const totalRetardos = Object.values(estados).filter((e) => e === 'RETARDO').length

  return (
    <div className="space-y-4 sm:space-y-6">
      {mensaje && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Selector de Sección y Fecha + Botones de Acción */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Sección
            </label>
            <select
              value={seccionSeleccionadaId}
              onChange={(e) => cambiarSeccionOFecha(e.target.value, fechaSeleccionada)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {secciones.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {formatearEtiquetaSeccion(sec.grado, sec.seccion, sec.nivel)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => cambiarSeccionOFecha(seccionSeleccionadaId, e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <button
            type="button"
            onClick={marcarTodosPresentes}
            className="w-full sm:w-auto text-xs font-bold px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-center"
          >
            ✓ Todos
          </button>
          <button
            type="button"
            disabled={isPending || estudiantesIniciales.length === 0}
            onClick={handleGuardar}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
          >
            {isPending ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {/* Contadores resumidos táctiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 sm:p-3 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase">Presentes</p>
          <p className="text-lg sm:text-2xl font-black text-emerald-700">{totalPresentes}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 p-2.5 sm:p-3 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase">Ausentes</p>
          <p className="text-lg sm:text-2xl font-black text-rose-700">{totalAusentes}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 p-2.5 sm:p-3 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs font-bold text-blue-800 uppercase">Justificados</p>
          <p className="text-lg sm:text-2xl font-black text-blue-700">{totalJustificados}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-2.5 sm:p-3 rounded-xl text-center">
          <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase">Retardos</p>
          <p className="text-lg sm:text-2xl font-black text-amber-700">{totalRetardos}</p>
        </div>
      </div>

      {/* Lista de Alumnos Adaptativa */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800">
            Nómina de Estudiantes ({estudiantesIniciales.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Usa el botón 📝 para incidencias puntuales
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {estudiantesIniciales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
              No hay estudiantes inscritos en esta sección.
            </div>
          ) : (
            estudiantesIniciales.map((est, index) => {
              const estadoActual = estados[est.id] || 'PRESENTE'
              const tieneObservacion = Boolean(observaciones[est.id]?.trim())
              const estaExpandido = Boolean(expandidoObs[est.id])

              return (
                <div
                  key={est.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/60 transition space-y-3 sm:space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Datos del estudiante */}
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-400 w-6 text-right shrink-0">
                        {index + 1}.
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {est.apellidos}, {est.nombres}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {est.cedula_escolar}
                        </p>
                      </div>
                    </div>

                    {/* Botones de marcación táctiles (P, A, J, R) + Botón Nota */}
                    <div className="flex items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setEstadoAlumno(est.id, 'PRESENTE')}
                        title="Presente"
                        className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-black rounded-xl transition ${
                          estadoActual === 'PRESENTE'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoAlumno(est.id, 'AUSENTE')}
                        title="Ausente"
                        className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-black rounded-xl transition ${
                          estadoActual === 'AUSENTE'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoAlumno(est.id, 'JUSTIFICADO')}
                        title="Justificado"
                        className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-black rounded-xl transition ${
                          estadoActual === 'JUSTIFICADO'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        J
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstadoAlumno(est.id, 'RETARDO')}
                        title="Retardo"
                        className={`flex-1 sm:flex-none px-3.5 py-2.5 sm:py-1.5 text-xs font-black rounded-xl transition ${
                          estadoActual === 'RETARDO'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        R
                      </button>

                      {/* Botón Nota/Incidencia */}
                      <button
                        type="button"
                        onClick={() => toggleExpandirObs(est.id)}
                        title="Añadir nota o incidencia"
                        className={`px-3 py-2.5 sm:py-1.5 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1 shrink-0 ${
                          tieneObservacion
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>📝</span>
                        {tieneObservacion && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Input de incidencia adaptable */}
                  {(estaExpandido || tieneObservacion) && (
                    <div className="pt-1 sm:pl-8">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nota puntual (ej: Llegó tarde, fiebre)..."
                          value={observaciones[est.id] || ''}
                          onChange={(e) => setObservacionAlumno(est.id, e.target.value)}
                          className="w-full border border-slate-200 bg-slate-50/80 focus:bg-white rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                        />
                        {tieneObservacion && (
                          <button
                            type="button"
                            onClick={() => {
                              setObservacionAlumno(est.id, '')
                              setExpandidoObs((prev) => ({ ...prev, [est.id]: false }))
                            }}
                            className="text-slate-400 hover:text-rose-500 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-100"
                            title="Limpiar nota"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}