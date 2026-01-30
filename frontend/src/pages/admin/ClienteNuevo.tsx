import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { CSVUploader } from '@/components/admin/CSVUploader'
import { useCreateCliente, useAssignCandidatos } from '@/hooks/useAdminClientes'
import { extractDNIs, useValidateCandidatosCSV } from '@/hooks/useCSVParser'
import { cn } from '@/lib/utils'

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

  const createCliente = useCreateCliente()
  const assignCandidatos = useAssignCandidatos()
  const validateCSV = useValidateCandidatosCSV()

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
          <div className="text-center py-8 text-muted-foreground">
            <p>Categorías (opcional) - Por implementar</p>
            <p className="text-sm">
              Puedes agregar categorías después desde la edición del cliente.
            </p>
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
            </div>
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
