'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface SeccionEstadistica {
  id: number
  nombre: string
  totalEstudiantes: number
  totalPresentes: number
  totalAusentes: number
  totalJustificados: number
  porcentajeAsistencia: number
}

export interface AlumnoAlerta {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
  seccion: string
  ausencias: number
  nombre_representante: string
  telefono_representante: string | null
}

interface Props {
  mesSeleccionado: string
  estadisticasSecciones: SeccionEstadistica[]
  alertasCriticas: AlumnoAlerta[]
  totalPlantel: number
  promedioPlantel: number
}

// Limpia el número telefónico para formato internacional de WhatsApp
function formatearTelefonoWhatsApp(telf: string): string {
  const limpio = telf.replace(/\D/g, '')
  if (limpio.startsWith('04')) {
    return `58${limpio.slice(1)}`
  }
  if (limpio.startsWith('4')) {
    return `58${limpio}`
  }
  return limpio
}

export default function DashboardDireccionView({
  mesSeleccionado,
  estadisticasSecciones,
  alertasCriticas,
  totalPlantel,
  promedioPlantel,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mes, setMes] = useState(mesSeleccionado)

  const handleCambioMes = (nuevoMes: string) => {
    setMes(nuevoMes)
    startTransition(() => {
      router.push(`/dashboard?mes=${nuevoMes}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Selector de Mes y Encabezado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Rendimiento Institucional</h2>
          <p className="text-xs text-slate-500">Métricas consolidadas de asistencia escolar del plantel</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Mes evaluado {isPending && <span className="text-blue-600 normal-case font-normal">(Cargando...)</span>}:
          </label>
          <input
            type="month"
            value={mes}
            onChange={(e) => handleCambioMes(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tarjetas KPI Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Matrícula Activa Total</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">
            {totalPlantel} <span className="text-xs font-medium text-slate-500">alumnos</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Asistencia Media Institucional</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-3xl font-extrabold ${promedioPlantel >= 80 ? 'text-emerald-600' : promedioPlantel >= 65 ? 'text-amber-500' : 'text-rose-600'}`}>
              {promedioPlantel}%
            </p>
            <span className="text-xs text-slate-400 font-medium">efectiva</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inasistencias Críticas</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-extrabold text-rose-600">{alertasCriticas.length}</p>
            <span className="text-xs text-slate-500 font-medium">alumnos con ≥3 faltas</span>
          </div>
        </div>
      </div>

      {/* Comparativa por Secciones */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Comparativa de Asistencia por Aulas</h3>
          <span className="text-xs text-slate-400">{estadisticasSecciones.length} aulas activas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Aula / Sección</th>
                <th className="py-3 px-4 text-center">Matrícula</th>
                <th className="py-3 px-4 text-center">Presentes</th>
                <th className="py-3 px-4 text-center">Ausentes</th>
                <th className="py-3 px-4 text-center">Justificados</th>
                <th className="py-3 px-4 text-center">Efectividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {estadisticasSecciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se han registrado asistencias durante este mes.
                  </td>
                </tr>
              ) : (
                estadisticasSecciones.map((sec) => (
                  <tr key={sec.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {sec.nombre}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600 font-mono">
                      {sec.totalEstudiantes}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-semibold font-mono">
                      {sec.totalPresentes}
                    </td>
                    <td className="py-3 px-4 text-center text-rose-600 font-semibold font-mono">
                      {sec.totalAusentes}
                    </td>
                    <td className="py-3 px-4 text-center text-blue-600 font-semibold font-mono">
                      {sec.totalJustificados}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        sec.porcentajeAsistencia >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        sec.porcentajeAsistencia >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {sec.porcentajeAsistencia}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alertas Tempranas Institucionales */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🚨</span> Estudiantes con Inasistencia Crítica (Atención Directiva)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Alumnos con 3 o más faltas injustificadas en el período seleccionado.
            </p>
          </div>
          <span className="text-xs font-bold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-200">
            {alertasCriticas.length} casos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Estudiante</th>
                <th className="py-3 px-4">Sección</th>
                <th className="py-3 px-4 text-center">Faltas</th>
                <th className="py-3 px-4">Representante Legal</th>
                <th className="py-3 px-4 text-center">Acciones de Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {alertasCriticas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-emerald-600 font-medium">
                    ✓ No hay alumnos en estado de alerta crítica para este mes.
                  </td>
                </tr>
              ) : (
                alertasCriticas.map((al) => {
                  const telfWa = al.telefono_representante ? formatearTelefonoWhatsApp(al.telefono_representante) : null
                  const mensajeWa = encodeURIComponent(
                    `Estimado/a ${al.nombre_representante || 'Representante'}, le contactamos de la Dirección del Liceo Bolivariano "Fermín Toro". Notificamos que su representado(a) ${al.nombres} ${al.apellidos} acumula ${al.ausencias} inasistencias en el mes actual. Solicitamos su comparecencia para justificar dichas faltas.`
                  )

                  return (
                    <tr key={al.id} className="hover:bg-rose-50/30 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{al.apellidos}, {al.nombres}</p>
                        <p className="text-xs font-mono text-slate-400">{al.cedula_escolar}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                        {al.seccion}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full text-xs font-mono">
                          {al.ausencias} faltas
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-xs font-medium">
                        {al.nombre_representante || 'Sin representante'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {al.telefono_representante ? (
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={`tel:${al.telefono_representante}`}
                              title="Llamar al representante"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium rounded-lg border border-slate-200 flex items-center gap-1"
                            >
                              📞 {al.telefono_representante}
                            </a>
                            <a
                              href={`https://wa.me/${telfWa}?text=${mensajeWa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Enviar notificación vía WhatsApp"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1"
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No registrado</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}