import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface QuipuUsuario {
  id: string
  email: string
  nombre: string | null
  rol: 'superadmin' | 'admin' | 'analyst' | 'viewer'
  cliente_id: number | null
  auth_user_id: string | null
  activo: boolean
  created_at: string
  cliente?: {
    id: number
    nombre: string
  }
}

export function useAdminUsuarios() {
  return useQuery({
    queryKey: ['admin-usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .select(`
          *,
          cliente:quipu_clientes(id, nombre)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as QuipuUsuario[]
    }
  })
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string
      updates: Partial<Pick<QuipuUsuario, 'nombre' | 'rol' | 'cliente_id' | 'activo'>>
    }) => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] })
    }
  })
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (usuario: {
      email: string
      nombre: string
      rol: string
      cliente_id: number | null
    }) => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .insert(usuario)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] })
    }
  })
}

export function useClientes() {
  return useQuery({
    queryKey: ['admin-clientes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_clientes')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      return data
    }
  })
}
