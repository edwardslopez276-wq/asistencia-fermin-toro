'use client'

interface SeccionInfo {
  grado: number
  seccion: string
  nivel?: string | null
}

interface EstudianteResumen {
  id: number
  cedula_escolar: string
  nombreCompleto: string
  genero: string
  asistenciasPorDia: Record<string, string> // fecha -> 'P' | 'A' | 'J' | 'R'
  totales: {
    presentes: number
    ausentes: number
    justificados: number
    retardos: number
    porcentaje: number
  }
}

interface Props {
  seccion: SeccionInfo
  mesNombre: string
  anio: number
  diasHabiles: string[] // Array de strings 'YYYY-MM-DD'
  estudiantes: EstudianteResumen[]
  docenteNombre?: string
}

export default function ReporteOficialPrint({
  seccion,
  mesNombre,
  anio,
  diasHabiles,
  estudiantes,
  docenteNombre,
}: Props) {
  const handlePrint = () => {
    window.print()
  }

  const esMediaGeneral =
    seccion.nivel === 'MEDIA_GENERAL' ||
    seccion.nivel === 'SECUNDARIA' ||
    seccion.nivel === 'LICEO' ||
    (!seccion.nivel && seccion.grado > 6)

  const etiquetaNivel = esMediaGeneral
    ? `${seccion.grado}° Año "${seccion.seccion}"`
    : `${seccion.grado}° Grado "${seccion.seccion}"`

  return (
    <div className="space-y-4">
      {/* Botón visible en pantalla (se oculta al imprimir) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <p className="text-[11px] sm:text-xs text-slate-500 italic block sm:hidden">
          👉 Desliza la tabla hacia los lados para ver todos los días.
        </p>
        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto sm:ml-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🖨️</span>
          <span>Imprimir / Exportar a PDF</span>
        </button>
      </div>

      {/* DOCUMENTO OFICIAL */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 print:border-none print:p-0 text-slate-900 w-full overflow-hidden">
        {/* Reglas estrictas para impresión en hoja carta horizontal */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: letter landscape;
              margin: 6mm 8mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .evitar-corte {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}} />

        {/* Membrete Institucional Oficial MPPE */}
        <header className="border-b-2 border-slate-900 pb-2 mb-2 text-center evitar-corte">
          <p className="text-[8.5px] font-bold uppercase tracking-wider text-slate-700">
            República Bolivariana de Venezuela • Ministerio del Poder Popular para la Educación
          </p>
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-slate-900">
             Unidad Educativa "Fermín Toro"
          </h2>
          <p className="text-[9px] sm:text-[9.5px] font-bold text-slate-800">
            Control de Asistencia Mensual y Registro Estadístico Escolar
          </p>
        </header>

        {/* Ficha descriptiva de la sección y mes */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center text-[9px] sm:text-[9.5px] border border-slate-400 bg-slate-100 p-2 rounded mb-2 print:bg-slate-50 gap-1 sm:gap-0 evitar-corte">
          <div>
            <span className="font-semibold text-slate-700">Aula: </span>
            <strong className="text-slate-900">{etiquetaNivel}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Período: </span>
            <strong className="text-slate-900 uppercase">
              {mesNombre} {anio}
            </strong>
          </div>
          <div>
            <span className="font-semibold text-slate-700">Docente / Responsable: </span>
            <strong className="text-slate-900">
              {docenteNombre || 'Docente de Aula'}
            </strong>
          </div>
        </div>

        {/* Matriz Compacta con scroll horizontal para móviles y tabla fija en print */}
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="min-w-[700px] print:min-w-full w-full border-collapse border border-slate-700 text-[8px] table-fixed">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-700 text-slate-900 font-bold">
                <th className="border border-slate-600 p-0.5 w-[20px] text-center">N°</th>
                <th className="border border-slate-600 p-0.5 w-[65px] text-left">Cédula</th>
                <th className="border border-slate-600 p-0.5 w-[160px] text-left">Apellidos y Nombres</th>
                <th className="border border-slate-600 p-0.5 w-[18px] text-center">G</th>

                {/* Días hábiles del mes */}
                {diasHabiles.map((dia) => {
                  const numDia = dia.split('-')[2]
                  return (
                    <th
                      key={dia}
                      className="border border-slate-500 p-0 text-center font-mono bg-white"
                    >
                      {numDia}
                    </th>
                  )
                })}

                {/* Totales consolidados con anchos estrictos */}
                <th className="border border-slate-600 p-0.5 text-center w-[18px] bg-emerald-100 text-emerald-950 font-bold">P</th>
                <th className="border border-slate-600 p-0.5 text-center w-[18px] bg-rose-100 text-rose-950 font-bold">A</th>
                <th className="border border-slate-600 p-0.5 text-center w-[18px] bg-blue-100 text-blue-950 font-bold">J</th>
                <th className="border border-slate-600 p-0.5 text-center w-[18px] bg-amber-100 text-amber-950 font-bold">R</th>
                <th className="border border-slate-600 p-0.5 text-center w-[36px] bg-slate-200 text-slate-900 font-bold">% Asis</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, idx) => (
                <tr
                  key={est.id}
                  className="border-b border-slate-400"
                >
                  <td className="border border-slate-400 p-0.5 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-400 p-0.5 font-mono text-[7.5px] whitespace-nowrap">
                    {est.cedula_escolar}
                  </td>
                  <td className="border border-slate-400 p-0.5 font-semibold truncate text-[8px]">
                    {est.nombreCompleto}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-semibold text-[7.5px]">
                    {est.genero || '-'}
                  </td>

                  {/* Estado diario */}
                  {diasHabiles.map((dia) => {
                    const raw = est.asistenciasPorDia[dia] || '-'
                    let letra = '-'
                    if (raw === 'PRESENTE' || raw === 'P') letra = 'P'
                    else if (raw === 'AUSENTE' || raw === 'A') letra = 'A'
                    else if (raw === 'JUSTIFICADO' || raw === 'J') letra = 'J'
                    else if (raw === 'RETARDO' || raw === 'R') letra = 'R'

                    return (
                      <td
                        key={dia}
                        className={`border border-slate-300 p-0 text-center font-mono font-bold ${
                          letra === 'A'
                            ? 'text-rose-700 bg-rose-50'
                            : letra === 'J'
                            ? 'text-blue-700 bg-blue-50'
                            : letra === 'R'
                            ? 'text-amber-700'
                            : letra === 'P'
                            ? 'text-slate-800'
                            : 'text-slate-300'
                        }`}
                      >
                        {letra}
                      </td>
                    )
                  })}

                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-emerald-800">
                    {est.totales.presentes}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-rose-800">
                    {est.totales.ausentes}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-blue-800">
                    {est.totales.justificados}
                  </td>
                  <td className="border border-slate-400 p-0.5 text-center font-mono font-bold text-amber-800">
                    {est.totales.retardos}
                  </td>
                  <td
                    className={`border border-slate-400 p-0.5 text-center font-mono font-bold text-[7.5px] ${
                      est.totales.porcentaje < 75 ? 'text-rose-700 bg-rose-50' : 'text-slate-900'
                    }`}
                  >
                    {est.totales.porcentaje}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Firmas reglamentarias oficiales */}
        <footer className="mt-8 pt-4 evitar-corte">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center text-[8px] sm:text-[9px]">
            <div>
              <div className="border-b border-slate-800 pb-1 mb-1 min-h-[1.5rem] flex items-end justify-center font-bold">
                {docenteNombre || 'Docente Responsable'}
              </div>
              <p className="text-[7.5px] sm:text-[8px] uppercase font-semibold text-slate-600">
                Docente de Aula / Guía
              </p>
            </div>

            <div>
              <div className="border-b border-slate-800 pb-1 mb-1 min-h-[1.5rem]"></div>
              <p className="text-[7.5px] sm:text-[8px] uppercase font-semibold text-slate-600">
                Subdirección Pedagógica
              </p>
            </div>

            <div>
              <div className="border-b border-slate-800 pb-1 mb-1 min-h-[1.5rem]"></div>
              <p className="text-[7.5px] sm:text-[8px] uppercase font-semibold text-slate-600">
                Dirección / Sello del Plantel
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}