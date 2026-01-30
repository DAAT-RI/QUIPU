import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Building2, Users, FileText } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [clientesRes, usuariosRes, declaracionesRes] = await Promise.all([
        supabase.from('quipu_clientes').select('*', { count: 'exact', head: true }),
        supabase.from('quipu_usuarios').select('*', { count: 'exact', head: true }),
        supabase.from('v_quipu_declaraciones').select('*', { count: 'exact', head: true }),
      ])

      return {
        clientes: clientesRes.count ?? 0,
        usuarios: usuariosRes.count ?? 0,
        declaraciones: declaracionesRes.count ?? 0,
      }
    },
  })

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard de Administración</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold">{stats?.clientes}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuarios</p>
              <p className="text-2xl font-bold">{stats?.usuarios}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Declaraciones</p>
              <p className="text-2xl font-bold">{stats?.declaraciones?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
