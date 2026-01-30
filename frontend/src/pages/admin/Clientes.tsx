import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Plus, Building2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function Clientes() {
  const { data: clientes, isLoading } = useQuery({
    queryKey: ['admin-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_clientes')
        .select('*')
        .order('nombre')

      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Link
          to="/admin/clientes/nuevo"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium">Nombre</th>
              <th className="text-left p-4 font-medium">Contacto</th>
              <th className="text-left p-4 font-medium">Estado</th>
              <th className="text-left p-4 font-medium">Creado</th>
            </tr>
          </thead>
          <tbody>
            {clientes?.map((cliente) => (
              <tr key={cliente.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{cliente.nombre}</span>
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">
                  {cliente.contacto_email ?? '-'}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      cliente.activo
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {cliente.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground text-sm">
                  {new Date(cliente.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clientes?.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay clientes registrados
          </div>
        )}
      </div>
    </div>
  )
}
