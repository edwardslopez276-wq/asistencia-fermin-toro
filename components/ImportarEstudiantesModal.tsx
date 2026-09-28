'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { importarEstudiantesMasivosAction, EstudianteImportacion } from '@/app/actions/admin'

export interface SeccionAdmin {
  id: number | string
  grado: number
  seccion: string
  nivel?: 'PRIMARIA' | 'MEDIA_GENERAL' | string | null
}

interface Props {
  secciones: SeccionAdmin[]
  onClose: () => void
  onSuccess: () => void
}

// Formateador institucional según nivel académico
function formatearEtiquetaSeccion(grado: number, seccion: string, nivel?: string | null): string {
  const n = nivel?.toUpperCase().trim()
  if (n === 'MEDIA_GENERAL' || n === 'SECUNDARIA' || n === 'LICEO' || (!nivel && grado > 6)) {
    return `${grado}° Año - Sección "${seccion}"`
  }
  return `${grado}° Grado - Sección "${seccion}"`
}

export default function ImportarEstudiantesModal({ secciones, onClose, onSuccess }: Props) {
  const [seccionId, setSeccionId] = useState<number | ''>(
    secciones[0]?.id ? Number(secciones[0].id) : ''
  )
  const [datosParseados, setDatosParseados] = useState<EstudianteImportacion[]>([])
  const [procesando, setProcesando] = useState(false)
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Descarga de plantilla CSV estándar
  const descargarPlantilla = () => {
    const encabezados = [
      'cedula_escolar',
      'nombres',
      'apellidos',
      'genero',
      'fecha_nacimiento',
      'nombre_representante',
      'telefono_representante',
    ]
    const filaEjemplo1 = [
      'V-32145678',
      'Juan Andres',
      'Perez Gomez',
      'M',
      '2012-05-14',
      'Maria Gomez',
      '04141234567',
    ]
    const filaEjemplo2 = [
      'V-32987654',
      'Sofia Valentina',
      'Rodriguez Blanco',
      'F',
      '2012-08-22',
      'Carlos Rodriguez',
      '04249876543',
    ]

    const contenidoCSV =
      '\uFEFF' +
      [
        encabezados.join(','),
        filaEjemplo1.join(','),
        filaEjemplo2.join(','),
      ].join('\r\n')

    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'plantilla_matricula_fermin_toro.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Leer y procesar el archivo CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNombreArchivo(file.name)
    setErrorMsg(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filas = results.data as Record<string, string | undefined>[]

        const validos: EstudianteImportacion[] = []
        for (let i = 0; i < filas.length; i++) {
          const f = filas[i]

          const cedula = f.cedula_escolar || f.cedula || f.CEDULA || f.Cedula
          const nombres = f.nombres || f.nombre || f.NOMBRES || f.Nombres
          const apellidos = f.apellidos || f.apellido || f.APELLIDOS || f.Apellidos

          if (!cedula || !nombres || !apellidos) continue

          const generoRaw = String(f.genero || f.GENERO || 'M').trim().toUpperCase()
          const generoValido = generoRaw === 'F' ? 'F' : 'M'

          validos.push({
            cedula_escolar: String(cedula).trim().toUpperCase(),
            nombres: String(nombres).trim(),
            apellidos: String(apellidos).trim(),
            genero: generoValido,
            fecha_nacimiento: f.fecha_nacimiento || f.nacimiento || '2010-01-01',
            nombre_representante: (f.nombre_representante || f.representante || 'Sin representante').trim(),
            telefono_representante: (f.telefono_representante || f.telefono || '').trim(),
          })
        }

        if (validos.length === 0) {
          setErrorMsg('El archivo no contiene filas válidas o faltan columnas obligatorias (cedula_escolar, nombres, apellidos).')
          setDatosParseados([])
        } else {
          setDatosParseados(validos)
        }
      },
      error: (err) => {
        setErrorMsg('Error al interpretar el archivo CSV: ' + err.message)
      },
    })
  }

  // Guardado masivo mediante Server Action
  const handleGuardar = async () => {
    if (!seccionId) {
      setErrorMsg('Debes seleccionar la sección a la que se asignará la nómina.')
      return
    }

    if (datosParseados.length === 0) {
      setErrorMsg('No hay alumnos válidos para importar.')
      return
    }

    setProcesando(true)
    setErrorMsg(null)

    try {
      const res = await importarEstudiantesMasivosAction(Number(seccionId), datosParseados)
      setProcesando(false)

      if (res.success) {
        alert(`¡Se procesaron e importaron exitosamente ${res.count} estudiantes!`)
        onSuccess()
        onClose()
      } else {
        setErrorMsg(res.error || 'Ocurrió un error en el servidor al guardar la nómina.')
      }
    } catch (err: unknown) {
      setProcesando(false)
      const mensaje = err instanceof Error ? err.message : 'Error desconocido al procesar la carga masiva.'
      setErrorMsg(mensaje)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-xl space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              📥 Importación Masiva de Nómina
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Carga alumnos por lote a través de una plantilla delimitada por comas (CSV).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Sección de Selección de Aula y Descarga de Plantilla */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              1. Aula de Destino:
            </label>
            <select
              value={seccionId}
              onChange={(e) => setSeccionId(Number(e.target.value))}
              className="w-full border border-slate-300 bg-white rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {secciones.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {formatearEtiquetaSeccion(sec.grado, sec.seccion, sec.nivel)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={descargarPlantilla}
              className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center justify-center gap-1.5"
            >
              <span>📄</span>
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>
        </div>

        {/* Selector de Archivo CSV */}
        <div>
          <label className="block text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            2. Seleccionar archivo CSV con la nómina:
          </label>
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center cursor-pointer transition">
            <span className="text-2xl sm:text-3xl mb-1">📂</span>
            <span className="text-xs font-semibold text-slate-700 text-center break-all px-2">
              {nombreArchivo || 'Toca para seleccionar el archivo CSV'}
            </span>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              Archivo con extensión .csv
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Vista previa de los datos leídos */}
        {datosParseados.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Alumnos detectados ({datosParseados.length}):
              </span>
              <span className="text-emerald-600 font-bold text-[11px]">✓ Formato correcto</span>
            </div>

            {/* Vista previa en móvil: Tarjetas (< sm) */}
            <div className="sm:hidden max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {datosParseados.slice(0, 8).map((d, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{d.apellidos}, {d.nombres}</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-600">
                      {d.cedula_escolar}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Rep: {d.nombre_representante}</span>
                    <span className="font-bold text-slate-700">{d.genero}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista previa en tablets/escritorio: Tabla (sm+) */}
            <div className="hidden sm:block max-h-44 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase font-semibold">
                    <th className="py-2 px-3">Cédula</th>
                    <th className="py-2 px-3">Nombres y Apellidos</th>
                    <th className="py-2 px-3 text-center">Género</th>
                    <th className="py-2 px-3">Representante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {datosParseados.slice(0, 10).map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-mono font-medium">{d.cedula_escolar}</td>
                      <td className="py-1.5 px-3 font-medium text-slate-900">
                        {d.apellidos}, {d.nombres}
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold">{d.genero}</td>
                      <td className="py-1.5 px-3 text-slate-500">{d.nombre_representante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {datosParseados.length > 8 && (
              <p className="text-[10px] sm:text-[11px] text-slate-400 text-center italic">
                ...y {datosParseados.length - 8} alumnos adicionales listos para procesar.
              </p>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition text-center"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando || datosParseados.length === 0}
            onClick={handleGuardar}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
          >
            {procesando ? 'Guardando nómina...' : `Importar (${datosParseados.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}