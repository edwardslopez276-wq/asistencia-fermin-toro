'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface Seccion {
  id: number | string
  grado: number
  seccion: string
  nivel?: 'PRIMARIA' | 'MEDIA_GENERAL' | string | null
}

export interface EstudianteReporte {
  id: number
  cedula_escolar: string
  nombres: string
  apellidos: string
  genero?: string
}

export interface AsistenciaRegistro {
  estudiante_id: number
  fecha: string
  estado: 'PRESENTE' | 'RETARDO' | 'JUSTIFICADO' | 'AUSENTE' | 'P' | 'R' | 'J' | 'A' | string
  observacion?: string | null
}

interface Props {
  secciones: Seccion[]
  seccionSeleccionadaId: number | null
  mesSeleccionado: number
  anioSeleccionado: number
  estudiantes: EstudianteReporte[]
  asistencias: AsistenciaRegistro[]
  docenteTitular?: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Formateador pedagógico
const formatearNivel = (grado: number, seccion: string, nivel?: string | null) => {
  const n = nivel?.toUpperCase().trim()
  if (n === 'MEDIA_GENERAL' || n === 'SECUNDARIA' || n === 'LICEO' || (!nivel && grado > 6)) {
    return `${grado}° Año - Sección "${seccion}"`
  }
  return `${grado}° Grado - Sección "${seccion}"`
}

export default function ReporteAsistenciaView({
  secciones,
  seccionSeleccionadaId,
  mesSeleccionado,
  anioSeleccionado,
  estudiantes,
  asistencias,
  docenteTitular,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Calcular número de días del mes seleccionado
  const diasEnMes = new Date(anioSeleccionado, mesSeleccionado, 0).getDate()
  const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1)

  // Normalizador de estados
  const normalizarEstado = (estado?: string): 'PRESENTE' | 'RETARDO' | 'JUSTIFICADO' | 'AUSENTE' | null => {
    if (!estado) return null
    const e = estado.toUpperCase()
    if (e === 'P' || e === 'PRESENTE') return 'PRESENTE'
    if (e === 'R' || e === 'RETARDO') return 'RETARDO'
    if (e === 'J' || e === 'JUSTIFICADO') return 'JUSTIFICADO'
    if (e === 'A' || e === 'AUSENTE') return 'AUSENTE'
    return null
  }

  // Mapa de asistencias: estudianteId_dia => estado
  const mapaAsistencias = new Map<string, 'PRESENTE' | 'RETARDO' | 'JUSTIFICADO' | 'AUSENTE'>()
  let totalPresentes = 0
  let totalRetardos = 0
  let totalJustificados = 0
  let totalAusencias = 0

  asistencias.forEach((reg) => {
    const partes = reg.fecha.split('-')
    const diaReg = parseInt(partes[2], 10)
    const st = normalizarEstado(reg.estado)
    if (st) {
      mapaAsistencias.set(`${reg.estudiante_id}_${diaReg}`, st)
      if (st === 'PRESENTE') totalPresentes++
      else if (st === 'RETARDO') totalRetardos++
      else if (st === 'JUSTIFICADO') totalJustificados++
      else if (st === 'AUSENTE') totalAusencias++
    }
  })

  // La tasa institucional se calcula sobre días que demandaban presencia efectiva
  const totalDiasComputables = totalPresentes + totalRetardos + totalAusencias
  const porcentajeAsistencia = totalDiasComputables > 0
    ? Math.round(((totalPresentes + totalRetardos) / totalDiasComputables) * 100)
    : 0

  // Alerta de inasistencias críticas (3 o más ausencias injustificadas en el mes)
  const alertasEstudiantes = estudiantes.map((est) => {
    let ausencias = 0
    diasArray.forEach((dia) => {
      if (mapaAsistencias.get(`${est.id}_${dia}`) === 'AUSENTE') {
        ausencias++
      }
    })
    return { ...est, totalAusencias: ausencias }
  }).filter((est) => est.totalAusencias >= 3)

  const seccionActual = secciones.find((s) => Number(s.id) === Number(seccionSeleccionadaId))

  const cambiarFiltros = (nuevaSec: number | string, nuevoMes: number, nuevoAnio: number) => {
    startTransition(() => {
      router.push(`/reportes?seccion=${nuevaSec}&mes=${nuevoMes}&anio=${nuevoAnio}`)
    })
  }

  // Exportar matriz a Excel / CSV
  const exportarACSV = () => {
    if (estudiantes.length === 0) return

    const separador = ';'
    const nombreMes = MESES[mesSeleccionado - 1]
    const etiquetaSeccion = seccionActual 
      ? formatearNivel(seccionActual.grado, seccionActual.seccion, seccionActual.nivel).replace(/["\s]/g, '_')
      : 'Seccion'

    const filasCSV: string[] = [
      `"REPORTE MENSUAL DE ASISTENCIA ESCOLAR"`,
      `"PERÍODO: ${nombreMes.toUpperCase()}${anioSeleccionado}"`,
      `"AULA: ${seccionActual ? formatearNivel(seccionActual.grado, seccionActual.seccion, seccionActual.nivel) : ''}"`,
      `"DOCENTE RESPONSABLE: ${docenteTitular || 'No registrado'}"`,
      ``,
    ]

    const encabezados = [
      'N°',
      'Cédula Escolar',
      'Apellidos y Nombres',
      ...diasArray.map((d) => `Día ${d}`),
      'Total Presentes',
      'Total Retardos',
      'Total Justificados',
      'Total Ausencias',
      '% Asistencia Efectiva'
    ]
    filasCSV.push(encabezados.map(e => `"${e}"`).join(separador))

    estudiantes.forEach((est, index) => {
      let p = 0
      let r = 0
      let j = 0
      let a = 0

      const diasRegistro = diasArray.map((dia) => {
        const estado = mapaAsistencias.get(`${est.id}_${dia}`)
        if (estado === 'PRESENTE') { p++; return 'P' }
        if (estado === 'RETARDO') { r++; return 'R' }
        if (estado === 'JUSTIFICADO') { j++; return 'J' }
        if (estado === 'AUSENTE') { a++; return 'A' }
        return '-'
      })

      const computables = p + r + a
      const porcentajeAlumno = computables > 0 
        ? `${Math.round(((p + r) / computables) * 100)}%` 
        : '100%'

      const fila = [
        String(index + 1),
        `"${est.cedula_escolar}"`,
        `"${est.apellidos}, ${est.nombres}"`,
        ...diasRegistro.map(val => `"${val}"`),
        String(p),
        String(r),
        String(j),
        String(a),
        `"${porcentajeAlumno}"`
      ]

      filasCSV.push(fila.join(separador))
    })

    const contenidoCSV = '\uFEFF' + filasCSV.join('\r\n')
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Asistencia_${etiquetaSeccion}_${nombreMes}_${anioSeleccionado}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderBadge = (estado?: string | null) => {
    if (!estado) return <span className="text-slate-200">·</span>
    switch (estado) {
      case 'PRESENTE':
        return <span className="inline-block w-6 text-center text-xs font-bold text-emerald-700 bg-emerald-100 rounded">P</span>
      case 'RETARDO':
        return <span className="inline-block w-6 text-center text-xs font-bold text-amber-700 bg-amber-100 rounded">R</span>
      case 'JUSTIFICADO':
        return <span className="inline-block w-6 text-center text-xs font-bold text-blue-700 bg-blue-100 rounded">J</span>
      case 'AUSENTE':
        return <span className="inline-block w-6 text-center text-xs font-bold text-rose-700 bg-rose-100 rounded">A</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* VISTA EN PANTALLA */}
      <div className="space-y-6 print:hidden">
        {/* Barra de Filtros y Acciones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Aula {isPending && <span className="text-blue-600 font-normal">(Cargando...)</span>}
              </label>
              <select
                value={seccionSeleccionadaId || ''}
                onChange={(e) => cambiarFiltros(e.target.value, mesSeleccionado, anioSeleccionado)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {secciones.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {formatearNivel(sec.grado, sec.seccion, sec.nivel)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Mes
              </label>
              <select
                value={mesSeleccionado}
                onChange={(e) => cambiarFiltros(seccionSeleccionadaId || '', parseInt(e.target.value, 10), anioSeleccionado)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESES.map((nombreMes, idx) => (
                  <option key={nombreMes} value={idx + 1}>
                    {nombreMes}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Año
              </label>
              <select
                value={anioSeleccionado}
                onChange={(e) => cambiarFiltros(seccionSeleccionadaId || '', mesSeleccionado, parseInt(e.target.value, 10))}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2025, 2026, 2027].map((anio) => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportarACSV}
              disabled={estudiantes.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>📊</span>
              <span>Exportar a Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={estudiantes.length === 0}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>🖨️</span>
              <span>Imprimir / Reporte Oficial</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Indicadores Clave (KPIs) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Tasa Efectiva</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{porcentajeAsistencia}%</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-sm">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Presentes</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalPresentes}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-sm">
            <p className="text-xs font-semibold text-amber-700 uppercase">Retardos</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{totalRetardos}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-sm">
            <p className="text-xs font-semibold text-blue-700 uppercase">Justificados</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{totalJustificados}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-sm">
            <p className="text-xs font-semibold text-rose-700 uppercase">Ausencias</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{totalAusencias}</p>
          </div>
        </div>

        {/* Alerta de Inasistencia Crítica */}
        {alertasEstudiantes.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm mb-1">
              <span className="text-base">⚠️</span>
              Alerta de Inasistencia Crítica ({alertasEstudiantes.length} estudiante{alertasEstudiantes.length > 1 ? 's' : ''})
            </div>
            <p className="text-xs text-rose-700">
              Los siguientes alumnos acumulan 3 o más faltas injustificadas en el mes:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {alertasEstudiantes.map((al) => (
                <span key={al.id} className="text-xs bg-white border border-rose-300 text-rose-800 px-2.5 py-1 rounded-lg font-medium shadow-2xs">
                  {al.apellidos}, {al.nombres} ({al.totalAusencias} faltas)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sábana Mensual Interactiva */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Sábana Mensual: {MESES[mesSeleccionado - 1]} {anioSeleccionado}
            </h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-xs inline-block"></span> P = Presente</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-xs inline-block"></span> R = Retardo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-xs inline-block"></span> J = Justificado</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500 rounded-xs inline-block"></span> A = Ausente</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-50 z-10 w-10">#</th>
                  <th className="py-2.5 px-3 sticky left-10 bg-slate-50 z-10 min-w-[200px]">Estudiante</th>
                  {diasArray.map((dia) => (
                    <th key={dia} className="py-2 px-1 text-center font-mono w-7">
                      {dia}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center text-blue-700 bg-blue-50/50 w-10 font-bold">J</th>
                  <th className="py-2.5 px-2 text-center text-rose-700 bg-rose-50/50 w-10 font-bold">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {estudiantes.length === 0 ? (
                  <tr>
                    <td colSpan={diasArray.length + 4} className="py-8 text-center text-slate-400">
                      No hay estudiantes registrados en esta sección.
                    </td>
                  </tr>
                ) : (
                  estudiantes.map((est, idx) => {
                    let faltasAlumno = 0
                    let justificadosAlumno = 0
                    return (
                      <tr key={est.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2 px-3 font-mono text-slate-400 sticky left-0 bg-white">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 sticky left-10 bg-white whitespace-nowrap">
                          {est.apellidos}, {est.nombres}
                        </td>
                        {diasArray.map((dia) => {
                          const st = mapaAsistencias.get(`${est.id}_${dia}`)
                          if (st === 'AUSENTE') faltasAlumno++
                          if (st === 'JUSTIFICADO') justificadosAlumno++
                          return (
                            <td key={dia} className="py-2 px-1 text-center border-l border-slate-50">
                              {renderBadge(st)}
                            </td>
                          )
                        })}
                        <td className="py-2 px-2 text-center font-bold font-mono text-blue-700 bg-blue-50/30 border-l border-slate-100">
                          {justificadosAlumno}
                        </td>
                        <td className="py-2 px-2 text-center font-bold font-mono text-rose-700 bg-rose-50/30 border-l border-slate-100">
                          {faltasAlumno}
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

      {/* FORMATO OFICIAL IMPRIMIBLE */}
      <div className="hidden print:block text-black bg-white w-full">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: letter landscape;
              margin: 8mm 10mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}} />

        <header className="border-b-2 border-slate-900 pb-2 mb-2 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
            República Bolivariana de Venezuela • Ministerio del Poder Popular para la Educación
          </p>
          <h2 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
            Liceo Bolivariano "Fermín Toro"
          </h2>
          <p className="text-[10px] font-bold text-slate-800">
            Control de Asistencia Mensual y Registro Estadístico Escolar
          </p>
        </header>

        <div className="flex justify-between items-center text-[10px] border border-slate-400 bg-slate-100 p-2 rounded mb-2">
          <div>
            <span className="font-semibold text-slate-700">Aula: </span>
            <strong className="text-slate-900">
              {seccionActual ? formatearNivel(seccionActual.grado, seccionActual.seccion, seccionActual.nivel) : 'Sin sección'}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Período: </span>
            <strong className="text-slate-900 uppercase">
              {MESES[mesSeleccionado - 1]} {anioSeleccionado}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Docente Responsable: </span>
            <strong className="text-slate-900">
              {docenteTitular || 'Docente de Aula'}
            </strong>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-700 text-[8.5px] table-fixed">
          <thead>
            <tr className="bg-slate-200 border-b border-slate-700 text-slate-900">
              <th className="border border-slate-600 p-1 w-6 text-center">#</th>
              <th className="border border-slate-600 p-1 w-20 text-left">Cédula</th>
              <th className="border border-slate-600 p-1 text-left">Apellidos y Nombres</th>

              {diasArray.map((dia) => {
                const fechaDia = new Date(anioSeleccionado, mesSeleccionado - 1, dia)
                const esFinDeSemana = fechaDia.getDay() === 0 || fechaDia.getDay() === 6

                return (
                  <th
                    key={dia}
                    className={`border border-slate-500 p-0.5 text-center font-mono w-5 ${
                      esFinDeSemana ? 'bg-slate-300 text-slate-600' : 'bg-white'
                    }`}
                  >
                    {dia}
                  </th>
                )
              })}

              <th className="border border-slate-600 p-0.5 text-center w-6 bg-emerald-100 font-bold">P</th>
              <th className="border border-slate-600 p-0.5 text-center w-6 bg-amber-100 font-bold">R</th>
              <th className="border border-slate-600 p-0.5 text-center w-6 bg-blue-100 font-bold">J</th>
              <th className="border border-slate-600 p-0.5 text-center w-6 bg-rose-100 font-bold">A</th>
              <th className="border border-slate-600 p-0.5 text-center w-10 font-bold bg-slate-200">% Asis</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est, idx) => {
              let p = 0
              let r = 0
              let j = 0
              let a = 0

              return (
                <tr key={est.id} className="border-b border-slate-400">
                  <td className="border border-slate-400 p-0.5 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-400 p-0.5 font-mono text-[8px] whitespace-nowrap">
                    {est.cedula_escolar}
                  </td>
                  <td className="border border-slate-400 p-0.5 font-semibold truncate">
                    {est.apellidos}, {est.nombres}
                  </td>

                  {diasArray.map((dia) => {
                    const fechaDia = new Date(anioSeleccionado, mesSeleccionado - 1, dia)
                    const esFinDeSemana = fechaDia.getDay() === 0 || fechaDia.getDay() === 6
                    const st = mapaAsistencias.get(`${est.id}_${dia}`)

                    let letra = '-'
                    if (st === 'PRESENTE') { p++; letra = 'P' }
                    else if (st === 'RETARDO') { r++; letra = 'R' }
                    else if (st === 'JUSTIFICADO') { j++; letra = 'J' }
                    else if (st === 'AUSENTE') { a++; letra = 'A' }

                    return (
                      <td
                        key={dia}
                        className={`border border-slate-300 p-0 text-center font-mono font-bold ${
                          esFinDeSemana ? 'bg-slate-200 text-slate-400' : ''
                        } ${letra === 'A' ? 'text-rose-700 bg-rose-50' : ''} ${letra === 'J' ? 'text-blue-700 bg-blue-50' : ''}`}
                      >
                        {esFinDeSemana ? '' : letra}
                      </td>
                    )
                  })}

                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-emerald-800">
                    {p}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-amber-800">
                    {r}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-blue-800">
                    {j}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-rose-800">
                    {a}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold">
                    {p + r + a > 0 ? `${Math.round(((p + r) / (p + r + a)) * 100)}%` : '100%'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <footer className="mt-8 pt-4">
          <div className="grid grid-cols-3 gap-10 text-center text-[10px]">
            <div>
              <div className="border-b border-slate-700 pb-1 mb-1 min-h-[1.5rem] flex items-end justify-center font-bold">
                {docenteTitular || 'Docente Responsable'}
              </div>
              <p className="text-[8.5px] uppercase font-semibold text-slate-600">
                Docente de Aula / Guía
              </p>
            </div>

            <div>
              <div className="border-b border-slate-700 pb-1 mb-1 min-h-[1.5rem]"></div>
              <p className="text-[8.5px] uppercase font-semibold text-slate-600">
                Subdirección Pedagógica
              </p>
            </div>

            <div>
              <div className="border-b border-slate-700 pb-1 mb-1 min-h-[1.5rem]"></div>
              <p className="text-[8.5px] uppercase font-semibold text-slate-600">
                Dirección / Sello del Plantel
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}