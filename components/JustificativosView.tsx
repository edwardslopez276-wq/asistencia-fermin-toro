'use client'

import { useState, useTransition } from 'react'
import { registrarJustificativoAction } from '@/app/actions/justificativo'

interface Estudiante {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
  secciones?: {
    grado: number
    seccion: string
  } | null
}

interface JustificativoItem {
  id: number
  fecha_inicio: string
  fecha_fin: string
  motivo: string
  observaciones?: string | null
  created_at: string
  estudiantes: {
    nombres: string
    apellidos: string
    cedula_escolar: string
  }
}

interface Props {
  estudiantes: Estudiante[]
  historialJustificativos: JustificativoItem[]
}

const MOTIVOS_FRECUENTES = [
  'Reposo Médico / Enfermedad',
  'Cita Médica Especializada',
  'Duelo Familiar',
  'Trámite de Identificación (SAIME / Registro)',
  'Representación Institucional / Deportiva',
  'Calamidad Doméstica',
]

export default function JustificativosView({
  estudiantes,
  historialJustificativos,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [estudianteId, setEstudianteId] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])
  const [motivo, setMotivo] = useState(MOTIVOS_FRECUENTES[0])
  const [observaciones, setObservaciones] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  // Filtrado de alumnos por buscador rápido
  const estudiantesFiltrados = estudiantes.filter((e) => {
    const texto = `${e.cedula_escolar} ${e.apellidos} ${e.nombres}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!estudianteId) {
      setMensaje({ tipo: 'error', texto: 'Selecciona a un estudiante de la lista.' })
      return
    }

    startTransition(async () => {
      const res = await registrarJustificativoAction({
        estudiante_id: Number(estudianteId),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        motivo,
        observaciones,
      })

      if (res.success) {
        setMensaje({
          tipo: 'ok',
          texto: 'Justificativo registrado y matriz de asistencia actualizada con éxito.',
        })
        setObservaciones('')
        setTimeout(() => setMensaje(null), 4000)
      } else {
        setMensaje({ tipo: 'error', texto: res.error || 'Ocurrió un error inesperado.' })
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Columna Izquierda: Formulario de Registro */}
      <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2.5">
          Registrar Permiso o Reposo
        </h2>

        {mensaje && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Buscar Estudiante</label>
            <input
              type="text"
              placeholder="Escribe cédula o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />

            <select
              value={estudianteId}
              onChange={(e) => setEstudianteId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- Selecciona el alumno --</option>
              {estudiantesFiltrados.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.apellidos}, {est.nombres} ({est.cedula_escolar})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Motivo Institucional</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MOTIVOS_FRECUENTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Observaciones / N° Certificado Médico
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Constancia médica, reposo por 48 horas..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            {isPending ? 'Guardando...' : 'Aplicar Justificativo'}
          </button>
        </form>
      </div>

      {/* Columna Derecha: Historial de Justificativos */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs sm:text-base font-bold text-slate-900">
            Historial de Justificativos ({historialJustificativos.length})
          </h2>
          <span className="text-[11px] sm:text-xs text-slate-400">Actualización en tiempo real</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {historialJustificativos.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay justificativos registrados en el sistema.
            </div>
          ) : (
            historialJustificativos.map((item) => (
              <div key={item.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 text-sm">
                    {item.estudiantes.apellidos}, {item.estudiantes.nombres}
                  </span>
                  <span className="self-start sm:self-auto font-mono text-[10px] sm:text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">
                    {item.fecha_inicio} al {item.fecha_fin}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <span>C.E: {item.estudiantes.cedula_escolar}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">{item.motivo}</span>
                </div>

                {item.observaciones && (
                  <p className="text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                    "{item.observaciones}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}