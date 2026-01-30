import { useState } from 'react'
import { UserPlus, X, Edit2, Shield, Building2 } from 'lucide-react'
import { useAdminUsuarios, useUpdateUsuario, useCreateUsuario, useClientes } from '@/hooks/useAdminUsuarios'
import { cn } from '@/lib/utils'

const ROLES = [
    { value: 'superadmin', label: 'Superadmin', color: 'text-amber-600 bg-amber-50' },
    { value: 'admin', label: 'Admin', color: 'text-blue-600 bg-blue-50' },
    { value: 'analyst', label: 'Analyst', color: 'text-purple-600 bg-purple-50' },
    { value: 'viewer', label: 'Viewer', color: 'text-gray-600 bg-gray-50' },
]

export default function Usuarios() {
    const [showNewForm, setShowNewForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [newUser, setNewUser] = useState({ email: '', nombre: '', rol: 'viewer', cliente_id: null as number | null })

    const { data: usuarios, isLoading } = useAdminUsuarios()
    const { data: clientes } = useClientes()
    const updateUsuario = useUpdateUsuario()
    const createUsuario = useCreateUsuario()

    const handleCreate = () => {
        if (!newUser.email) return
        createUsuario.mutate(newUser, {
            onSuccess: () => {
                setShowNewForm(false)
                setNewUser({ email: '', nombre: '', rol: 'viewer', cliente_id: null })
            }
        })
    }

    const handleUpdate = (id: string, updates: any) => {
        updateUsuario.mutate({ id, updates })
        setEditingId(null)
    }

    const getRoleStyle = (rol: string) => {
        return ROLES.find(r => r.value === rol)?.color || 'text-gray-600 bg-gray-50'
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Usuarios</h1>
                    <p className="text-muted-foreground">Gestión de usuarios del sistema</p>
                </div>
                <button
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                    <UserPlus className="h-4 w-4" />
                    Nuevo Usuario
                </button>
            </div>

            {/* New User Form */}
            {showNewForm && (
                <div className="bg-card border rounded-lg p-4 mb-6">
                    <h3 className="font-medium mb-4">Nuevo Usuario</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="px-3 py-2 border rounded-lg bg-background"
                        />
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={newUser.nombre}
                            onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                            className="px-3 py-2 border rounded-lg bg-background"
                        />
                        <select
                            value={newUser.rol}
                            onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                            className="px-3 py-2 border rounded-lg bg-background"
                        >
                            {ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                        <select
                            value={newUser.cliente_id ?? ''}
                            onChange={(e) => setNewUser({ ...newUser, cliente_id: e.target.value ? Number(e.target.value) : null })}
                            className="px-3 py-2 border rounded-lg bg-background"
                        >
                            <option value="">Sin cliente (global)</option>
                            {clientes?.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleCreate}
                            disabled={!newUser.email || createUsuario.isPending}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            Crear
                        </button>
                        <button
                            onClick={() => setShowNewForm(false)}
                            className="px-4 py-2 border rounded-lg hover:bg-muted"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-card border rounded-lg">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Usuario</th>
                            <th className="text-left px-4 py-3 font-medium">Cliente</th>
                            <th className="text-center px-4 py-3 font-medium">Rol</th>
                            <th className="text-center px-4 py-3 font-medium">Estado</th>
                            <th className="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    Cargando...
                                </td>
                            </tr>
                        ) : usuarios?.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    No hay usuarios
                                </td>
                            </tr>
                        ) : (
                            usuarios?.map((usuario) => (
                                <tr key={usuario.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{usuario.nombre || usuario.email}</div>
                                        <div className="text-sm text-muted-foreground">{usuario.email}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {usuario.cliente ? (
                                            <span className="flex items-center gap-1.5 text-sm">
                                                <Building2 className="h-3.5 w-3.5" />
                                                {usuario.cliente.nombre}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Global</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {editingId === usuario.id ? (
                                            <select
                                                defaultValue={usuario.rol}
                                                onChange={(e) => handleUpdate(usuario.id, { rol: e.target.value })}
                                                className="px-2 py-1 border rounded text-sm"
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={cn(
                                                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                                getRoleStyle(usuario.rol)
                                            )}>
                                                <Shield className="h-3 w-3" />
                                                {usuario.rol}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleUpdate(usuario.id, { activo: !usuario.activo })}
                                            className={cn(
                                                'px-2 py-1 rounded-full text-xs font-medium',
                                                usuario.activo
                                                    ? 'bg-green-50 text-green-600'
                                                    : 'bg-red-50 text-red-600'
                                            )}
                                        >
                                            {usuario.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setEditingId(editingId === usuario.id ? null : usuario.id)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                            title="Editar rol"
                                        >
                                            {editingId === usuario.id ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
