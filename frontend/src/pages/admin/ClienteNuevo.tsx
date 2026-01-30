import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, AlertTriangle, Tags } from 'lucide-react'
import { CSVUploader } from '@/components/admin/CSVUploader'
import { useCreateCliente, useAssignCandidatos } from '@/hooks/useAdminClientes'
import { extractDNIs, useValidateCandidatosCSV } from '@/hooks/useCSVParser'
import { useTemas, useAssignTemas } from '@/hooks/useAdminUsuarios'
import { cn } from '@/lib/utils'

const PRIORIDADES = [
  { value: 1, label: 'Alta', color: 'text-red-600' },
  { value: 2, label: 'Media', color: 'text-amber-600' },
  { value: 3, label: 'Baja', color: 'text-green-600' },
]

const TIPOS = ['gremio', 'empresa', 'consultora', 'medio']
const SECTORES = ['seguros', 'mineria', 'banca', 'salud', 'comunicaciones', 'energia', 'retail', 'tecnologia']
const PLANES = ['basico', 'profesional', 'enterprise']

const steps = [
  { id: 1, name: 'Datos básicos' },
  { id: 2, name: 'Candidatos' },
  { id: 3, name: 'Categorías' },
  { id: 4, name: 'Confirmar' },
]

export function ClienteNuevo() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    sector: '',
    contacto_email: '',
    plan: 'profesional',
    max_candidatos: 50,
  })

  // Candidatos
  const [candidatosValidation, setCandidatosValidation] = useState<{
    found: { id: number; dni: string; nombre_completo: string }[]
    notFound: string[]
    total: number
  } | null>(null)

  // Temas/Categorías
  const [selectedTemas, setSelectedTemas] = useState<Map<number, number>>(new Map()) // temaId -> prioridad

  const createCliente = useCreateCliente()
  const assignCandidatos = useAssignCandidatos()
  const assignTemas = useAssignTemas()
  const validateCSV = useValidateCandidatosCSV()
  const { data: temas, isLoading: temasLoading } = useTemas()

  const toggleTema = (temaId: number) => {
    setSelectedTemas((prev) => {
      const next = new Map(prev)
      if (next.has(temaId)) {
        next.delete(temaId)
      } else {
        next.set(temaId, 2) // Default: prioridad media
      }
      return next
    })
  }

  const updateTemaPrioridad = (temaId: number, prioridad: number) => {
    setSelectedTemas((prev) => {
      const next = new Map(prev)
      next.set(temaId, prioridad)
      return next
    })
  }

  const handleCSVParsed = async (rows: string[][]) => {
    const dnis = extractDNIs(rows)
    if (dnis.length === 0) return

    const result = await validateCSV.mutateAsync(dnis)
    setCandidatosValidation(result)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // 1. Crear cliente
      const cliente = await createCliente.mutateAsync({
        nombre: formData.nombre,
        tipo: formData.tipo || undefined,
        sector: formData.sector || undefined,
        contacto_email: formData.contacto_email || undefined,
        plan: formData.plan,
        max_candidatos: formData.max_candidatos,
      })

      // 2. Asignar candidatos
      if (candidatosValidation?.found.length) {
        await assignCandidatos.mutateAsync({
          clienteId: cliente.id,
          candidatoIds: candidatosValidation.found.map((c) => c.id),
        })
      }

      // 3. Asignar temas
      if (selectedTemas.size > 0) {
        // Group by priority and assign
        const temasByPrioridad = new Map<number, number[]>()
        selectedTemas.forEach((prioridad, temaId) => {
          if (!temasByPrioridad.has(prioridad)) {
            temasByPrioridad.set(prioridad, [])
          }
          temasByPrioridad.get(prioridad)!.push(temaId)
        })

        for (const [prioridad, temaIds] of temasByPrioridad) {
          await assignTemas.mutateAsync({
            clienteId: cliente.id,
            temaIds,
            prioridad,
          })
        }
      }

      navigate('/admin/clientes')
    } catch (error) {
      console.error('Error creating cliente:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.nombre.trim().length > 0
      case 2:
        return true // Candidatos son opcionales
      case 3:
        return true // Categorías opcionales
      case 4:
        return true
      default:
        return false
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Nuevo Cliente</h1>

      {/* Progress Steps */}
      <nav className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                currentStep > step.id && 'bg-green-600 text-white',
                currentStep === step.id && 'bg-primary text-primary-foreground',
                currentStep < step.id && 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span
              className={cn(
                'ml-2 text-sm',
                currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.name}
            </span>
            {index < steps.length - 1 && (
              <div
                className={cn('w-12 h-0.5 mx-4', currentStep > step.id ? 'bg-green-600' : 'bg-muted')}
              />
            )}
          </div>
        ))}
      </nav>

      {/* Step Content */}
      <div className="bg-card border rounded-lg p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sector</label>
                <select
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  <option value="">Seleccionar...</option>
                  {SECTORES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email de contacto</label>
              <input
                type="email"
                value={formData.contacto_email}
                onChange={(e) => setFormData({ ...formData, contacto_email: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                >
                  {PLANES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Máx. Candidatos</label>
                <input
                  type="number"
                  value={formData.max_candidatos}
                  onChange={(e) =>
                    setFormData({ ...formData, max_candidatos: parseInt(e.target.value) || 50 })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  min={1}
                  max={500}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <CSVUploader
              onParsed={handleCSVParsed}
              expectedColumns={['DNI']}
              label="Subir CSV de candidatos"
            />

            {validateCSV.isPending && (
              <p className="text-sm text-muted-foreground">Validando DNIs...</p>
            )}

            {candidatosValidation && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">
                    {candidatosValidation.found.length} candidatos encontrados
                  </span>
                </div>

                {candidatosValidation.notFound.length > 0 && (
                  <div className="flex items-start gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {candidatosValidation.notFound.length} DNIs no encontrados
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {candidatosValidation.notFound.slice(0, 5).join(', ')}
                        {candidatosValidation.notFound.length > 5 && '...'}
                      </p>
                    </div>
                  </div>
                )}

                {candidatosValidation.found.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="pb-2">DNI</th>
                          <th className="pb-2">Nombre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidatosValidation.found.slice(0, 10).map((c) => (
                          <tr key={c.id} className="border-t">
                            <td className="py-1">{c.dni}</td>
                            <td className="py-1">{c.nombre_completo}</td>
                          </tr>
                        ))}
                        {candidatosValidation.found.length > 10 && (
                          <tr className="border-t text-muted-foreground">
                            <td colSpan={2} className="py-1">
                              ... y {candidatosValidation.found.length - 10} más
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tags className="h-4 w-4" />
              <span>Selecciona las categorías de interés para este cliente (opcional)</span>
            </div>

            {temasLoading ? (
              <p className="text-sm text-muted-foreground">Cargando categorías...</p>
            ) : (
              <div className="space-y-6">
                {/* Group temas by categoria */}
                {['politica', 'economia', 'social', 'seguridad', 'infraestructura'].map((cat) => {
                  const temasInCat = temas?.filter((t) => t.categoria === cat) ?? []
                  if (temasInCat.length === 0) return null

                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className="font-medium capitalize text-sm">{cat}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {temasInCat.map((tema) => {
                          const isSelected = selectedTemas.has(tema.id)
                          const prioridad = selectedTemas.get(tema.id) ?? 2

                          return (
                            <div
                              key={tema.id}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-muted hover:border-muted-foreground/50'
                              )}
                              onClick={() => toggleTema(tema.id)}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTema(tema.id)}
                                  className="rounded"
                                />
                                <span className="text-sm">{tema.nombre}</span>
                              </div>

                              {isSelected && (
                                <select
                                  value={prioridad}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    updateTemaPrioridad(tema.id, parseInt(e.target.value))
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs px-2 py-1 border rounded bg-background"
                                >
                                  {PRIORIDADES.map((p) => (
                                    <option key={p.value} value={p.value}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {selectedTemas.size > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedTemas.size} categoría{selectedTemas.size !== 1 ? 's' : ''} seleccionada
                      {selectedTemas.size !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="font-medium">Resumen</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{formData.nombre}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{formData.tipo || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sector:</span>
                <p className="font-medium">{formData.sector || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plan:</span>
                <p className="font-medium">{formData.plan}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Candidatos a asignar:</span>
                <p className="font-medium">{candidatosValidation?.found.length ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Categorías seleccionadas:</span>
                <p className="font-medium">{selectedTemas.size}</p>
              </div>
            </div>

            {selectedTemas.size > 0 && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Categorías:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Array.from(selectedTemas.entries()).map(([temaId, prioridad]) => {
                    const tema = temas?.find((t) => t.id === temaId)
                    const prioridadLabel = PRIORIDADES.find((p) => p.value === prioridad)
                    return (
                      <span
                        key={temaId}
                        className={cn(
                          'text-xs px-2 py-1 rounded-full border',
                          prioridad === 1 && 'border-red-300 bg-red-50 text-red-700',
                          prioridad === 2 && 'border-amber-300 bg-amber-50 text-amber-700',
                          prioridad === 3 && 'border-green-300 bg-green-50 text-green-700'
                        )}
                      >
                        {tema?.nombre} ({prioridadLabel?.label})
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() =>
            currentStep === 1 ? navigate('/admin/clientes') : setCurrentStep((s) => s - 1)
          }
          className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {currentStep === 1 ? 'Cancelar' : 'Anterior'}
        </button>

        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creando...' : 'Crear Cliente'}
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
