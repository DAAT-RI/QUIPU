import { Link } from 'react-router-dom'
import { Plus, Building2, Users, UserCheck } from 'lucide-react'
import { useAdminClientes } from '@/hooks/useAdminClientes'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function Clientes() {
  const { data: clientes, isLoading, error } = useAdminClientes()

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">Error al cargar clientes</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link
          to="/admin/clientes/nuevo"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Link>
      </div>

      <div className="grid gap-4">
        {clientes?.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium">{cliente.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  {cliente.tipo || 'Sin tipo'} • {cliente.sector || 'Sin sector'} • Plan{' '}
                  {cliente.plan}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{cliente.usuarios?.[0]?.count ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Usuarios</p>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <UserCheck className="h-4 w-4" />
                  <span className="font-medium">{cliente.candidatos?.[0]?.count ?? 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Candidatos</p>
              </div>

              <Link
                to={`/admin/clientes/${cliente.id}`}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Editar
              </Link>
            </div>
          </div>
        ))}

        {clientes?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No hay clientes. Crea el primero.
          </div>
        )}
      </div>
    </div>
  )
}
