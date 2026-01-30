import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Users, UserCheck, Plus, Trash2, Upload } from 'lucide-react'
import { useAdminCliente, useUpdateCliente, useAssignCandidatos } from '@/hooks/useAdminClientes'
import {
  useClienteUsuarios,
  useCreateUsuario,
  useDeleteUsuario,
  useClienteCandidatosAdmin,
  useRemoveCandidato,
} from '@/hooks/useAdminUsuarios'
import { CSVUploader } from '@/components/admin/CSVUploader'
import { extractDNIs, useValidateCandidatosCSV } from '@/hooks/useCSVParser'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

const TIPOS = ['gremio', 'empresa', 'consultora', 'medio']
const SECTORES = [
  'seguros',
  'mineria',
  'banca',
  'salud',
  'comunicaciones',
  'energia',
  'retail',
  'tecnologia',
]
const PLANES = ['basico', 'profesional', 'enterprise']
const ROLES = ['admin', 'analyst', 'viewer']

type Tab = 'datos' | 'usuarios' | 'candidatos'

export function ClienteEditar() {
  const { id } = useParams()
  const clienteId = parseInt(id ?? '0')
  const [activeTab, setActiveTab] = useState<Tab>('datos')
  const [isSaving, setIsSaving] = useState(false)

  // Data hooks
  const { data: cliente, isLoading } = useAdminCliente(clienteId)
  const { data: usuarios } = useClienteUsuarios(clienteId)
  const { data: candidatos } = useClienteCandidatosAdmin(clienteId)

  // Mutation hooks
  const updateCliente = useUpdateCliente()
  const createUsuario = useCreateUsuario()
  const deleteUsuario = useDeleteUsuario()
  const assignCandidatos = useAssignCandidatos()
  const removeCandidato = useRemoveCandidato()
  const validateCSV = useValidateCandidatosCSV()

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: '',
    sector: '',
    contacto_email: '',
    plan: 'profesional',
    max_candidatos: 50,
  })
  const [newUsuario, setNewUsuario] = useState({ email: '', nombre: '', rol: 'viewer' })
  const [showAddUsuario, setShowAddUsuario] = useState(false)
  const [showAddCandidatos, setShowAddCandidatos] = useState(false)
  const [csvValidation, setCsvValidation] = useState<{
    found: { id: number; dni: string; nombre_completo: string }[]
    notFound: string[]
  } | null>(null)

  // Initialize form when cliente loads
  useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        tipo: cliente.tipo || '',
        sector: cliente.sector || '',
        contacto_email: cliente.contacto_email || '',
        plan: cliente.plan,
        max_candidatos: cliente.max_candidatos,
      })
    }
  }, [cliente])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!cliente) {
    return <div className="text-center py-12 text-red-600">Cliente no encontrado</div>
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateCliente.mutateAsync({ id: clienteId, ...formData })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddUsuario = async () => {
    if (!newUsuario.email) return
    await createUsuario.mutateAsync({
      clienteId,
      email: newUsuario.email,
      nombre: newUsuario.nombre || undefined,
      rol: newUsuario.rol,
    })
    setNewUsuario({ email: '', nombre: '', rol: 'viewer' })
    setShowAddUsuario(false)
  }

  const handleCSVParsed = async (rows: string[][]) => {
    const dnis = extractDNIs(rows)
    if (dnis.length === 0) return
    const result = await validateCSV.mutateAsync(dnis)
    setCsvValidation(result)
  }

  const handleAddCandidatos = async () => {
    if (!csvValidation?.found.length) return
    await assignCandidatos.mutateAsync({
      clienteId,
      candidatoIds: csvValidation.found.map((c) => c.id),
    })
    setCsvValidation(null)
    setShowAddCandidatos(false)
  }

  const tabs = [
    { id: 'datos' as Tab, label: 'Datos', icon: Save },
    { id: 'usuarios' as Tab, label: `Usuarios (${usuarios?.length ?? 0})`, icon: Users },
    { id: 'candidatos' as Tab, label: `Candidatos (${candidatos?.length ?? 0})`, icon: UserCheck },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/clientes" className="p-2 hover:bg-muted rounded-md">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-semibold">{cliente?.nombre}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-card border rounded-lg p-6">
        {/* TAB: Datos */}
        {activeTab === 'datos' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
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
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        )}

        {/* TAB: Usuarios */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Usuarios con acceso a este cliente</p>
              <button
                onClick={() => setShowAddUsuario(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md"
              >
                <Plus className="h-4 w-4" />
                Agregar Usuario
              </button>
            </div>

            {showAddUsuario && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newUsuario.email}
                    onChange={(e) => setNewUsuario({ ...newUsuario, email: e.target.value })}
                    className="px-3 py-2 border rounded-md bg-background"
                  />
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newUsuario.nombre}
                    onChange={(e) => setNewUsuario({ ...newUsuario, nombre: e.target.value })}
                    className="px-3 py-2 border rounded-md bg-background"
                  />
                  <select
                    value={newUsuario.rol}
                    onChange={(e) => setNewUsuario({ ...newUsuario, rol: e.target.value })}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddUsuario}
                    disabled={!newUsuario.email || createUsuario.isPending}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md disabled:opacity-50"
                  >
                    {createUsuario.isPending ? 'Creando...' : 'Crear'}
                  </button>
                  <button
                    onClick={() => setShowAddUsuario(false)}
                    className="px-3 py-1.5 text-sm border rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Nombre</th>
                  <th className="pb-2">Rol</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios?.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.nombre || '-'}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 text-xs bg-muted rounded">{u.rol}</span>
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs rounded',
                          u.auth_user_id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        )}
                      >
                        {u.auth_user_id ? 'Activo' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => deleteUsuario.mutate({ id: u.id, clienteId })}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuarios?.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">No hay usuarios</p>
            )}
          </div>
        )}

        {/* TAB: Candidatos */}
        {activeTab === 'candidatos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Candidatos asignados a este cliente</p>
              <button
                onClick={() => setShowAddCandidatos(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md"
              >
                <Upload className="h-4 w-4" />
                Subir CSV
              </button>
            </div>

            {showAddCandidatos && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <CSVUploader onParsed={handleCSVParsed} expectedColumns={['DNI']} />

                {csvValidation && (
                  <div className="text-sm">
                    <p className="text-green-600">{csvValidation.found.length} encontrados</p>
                    {csvValidation.notFound.length > 0 && (
                      <p className="text-amber-600">{csvValidation.notFound.length} no encontrados</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleAddCandidatos}
                    disabled={!csvValidation?.found.length || assignCandidatos.isPending}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md disabled:opacity-50"
                  >
                    {assignCandidatos.isPending ? 'Agregando...' : 'Agregar Candidatos'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddCandidatos(false)
                      setCsvValidation(null)
                    }}
                    className="px-3 py-1.5 text-sm border rounded-md"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b sticky top-0 bg-card">
                  <tr>
                    <th className="pb-2">DNI</th>
                    <th className="pb-2">Nombre</th>
                    <th className="pb-2">Cargo</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidatos?.map((c: any) => (
                    <tr key={c.candidato_id} className="border-b">
                      <td className="py-2">{c.quipu_candidatos?.dni}</td>
                      <td className="py-2">{c.quipu_candidatos?.nombre_completo}</td>
                      <td className="py-2 text-muted-foreground">
                        {c.quipu_candidatos?.cargo_postula}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() =>
                            removeCandidato.mutate({ clienteId, candidatoId: c.candidato_id })
                          }
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {candidatos?.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">No hay candidatos asignados</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
