import { useCallback, useState } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CSVUploaderProps {
  onParsed: (rows: string[][]) => void
  expectedColumns?: string[]
  label?: string
  accept?: string
}

export function CSVUploader({
  onParsed,
  expectedColumns = ['DNI'],
  label = 'Subir archivo CSV',
  accept = '.csv',
}: CSVUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(
    (file: File) => {
      setError(null)

      if (!file.name.endsWith('.csv')) {
        setError('Solo se permiten archivos CSV')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        if (!text || text.trim().length === 0) {
          setError('El archivo está vacío')
          return
        }

        // Parsear CSV
        const delimiter = text.includes(';') ? ';' : ','
        const rows = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((line) => line.split(delimiter).map((cell) => cell.trim()))

        if (rows.length < 2) {
          setError('El archivo debe tener al menos una fila de datos')
          return
        }

        setFileName(file.name)
        onParsed(rows)
      }
      reader.onerror = () => setError('Error al leer el archivo')
      reader.readAsText(file, 'utf-8')
    },
    [onParsed]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleClear = useCallback(() => {
    setFileName(null)
    setError(null)
  }, [])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          error && 'border-red-500 bg-red-50 dark:bg-red-900/10'
        )}
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">Archivo cargado</p>
            </div>
            <button onClick={handleClear} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm">
              Arrastra un archivo o{' '}
              <label className="text-primary cursor-pointer hover:underline">
                selecciona
                <input type="file" accept={accept} onChange={handleChange} className="hidden" />
              </label>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Columnas esperadas: {expectedColumns.join(', ')}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
}
