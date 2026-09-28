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

          // Soporte flexible de cabeceras en mayúsculas o minúsculas
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
          setErrorMsg('El archivo no contiene filas válidas o faltan las columnas obligatorias (cedula_escolar, nombres, apellidos).')
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              📥 Importación Masiva de Nómina Escolar
            </h3>
            <p className="text-xs text-slate-500">
              Carga alumnos por lote a través de una plantilla de archivo CSV o Excel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Sección de Descarga de Plantilla y Configuración */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              1. Asignar a la Sección:
            </label>
            <select
              value={seccionId}
              onChange={(e) => setSeccionId(Number(e.target.value))}
              className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full py-2 px-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>📄</span>
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>
        </div>

        {/* Carga del archivo */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            2. Seleccionar archivo CSV con la nómina:
          </label>
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition">
            <span className="text-3xl mb-1">📂</span>
            <span className="text-xs font-semibold text-slate-700">
              {nombreArchivo || 'Haz clic para seleccionar el archivo CSV'}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Formato delimitado por comas (.csv)
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
                Vista previa de alumnos detectados ({datosParseados.length}):
              </span>
              <span className="text-emerald-600 font-bold">✓ Formato verificado</span>
            </div>

            <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
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
            {datosParseados.length > 10 && (
              <p className="text-[11px] text-slate-400 text-center italic">
                ...y {datosParseados.length - 10} alumnos más listos para cargar.
              </p>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={procesando || datosParseados.length === 0}
            onClick={handleGuardar}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {procesando ? 'Guardando nómina...' : `Importar ${datosParseados.length} Alumnos`}
          </button>
        </div>
      </div>
    </div>
  )
}