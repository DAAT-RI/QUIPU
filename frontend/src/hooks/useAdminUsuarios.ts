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
      nombre?: string
      rol: string
      cliente_id?: number | null
      clienteId?: number
    }) => {
      // Support both cliente_id and clienteId for backwards compatibility
      const insertData = {
        email: usuario.email,
        nombre: usuario.nombre || null,
        rol: usuario.rol,
        cliente_id: usuario.cliente_id ?? usuario.clienteId ?? null
      }
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['cliente-usuarios'] })
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

// Hook for getting usuarios of a specific cliente
export function useClienteUsuarios(clienteId: number) {
  return useQuery({
    queryKey: ['cliente-usuarios', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })
}

// Hook for deleting a usuario
export function useDeleteUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, clienteId: _clienteId }: { id: string; clienteId: number }) => {
      const { error } = await supabase
        .from('quipu_usuarios')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente-usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] })
    }
  })
}

// Hook for getting candidatos assigned to a cliente (admin view)
export function useClienteCandidatosAdmin(clienteId: number) {
  return useQuery({
    queryKey: ['cliente-candidatos-admin', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_cliente_candidatos')
        .select(`
          candidato_id,
          quipu_candidatos(id, dni, nombre_completo, cargo_postula)
        `)
        .eq('cliente_id', clienteId)

      if (error) throw error
      return data
    }
  })
}

// Hook for removing a candidato from a cliente
export function useRemoveCandidato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clienteId, candidatoId }: { clienteId: number; candidatoId: number }) => {
      const { error } = await supabase
        .from('quipu_cliente_candidatos')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('candidato_id', candidatoId)

      if (error) throw error
    },
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cliente-candidatos-admin', clienteId] })
    }
  })
}

// Hook for getting all temas (categories)
export function useTemas() {
  return useQuery({
    queryKey: ['temas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_temas')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true })

      if (error) throw error
      return data as { id: number; nombre: string; categoria: string }[]
    }
  })
}

// Hook for getting temas assigned to a cliente
export function useClienteTemas(clienteId: number) {
  return useQuery({
    queryKey: ['cliente-temas', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_cliente_temas')
        .select(`
          tema_id,
          prioridad,
          quipu_temas(id, nombre, categoria)
        `)
        .eq('cliente_id', clienteId)

      if (error) throw error
      return data as unknown as { tema_id: number; prioridad: number; quipu_temas: { id: number; nombre: string; categoria: string } | null }[]
    }
  })
}

// Hook for assigning temas to a cliente
export function useAssignTemas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clienteId,
      temaIds,
      prioridad = 2
    }: {
      clienteId: number
      temaIds: number[]
      prioridad?: number
    }) => {
      const rows = temaIds.map(temaId => ({
        cliente_id: clienteId,
        tema_id: temaId,
        prioridad
      }))

      const { error } = await supabase
        .from('quipu_cliente_temas')
        .upsert(rows, { onConflict: 'cliente_id,tema_id' })

      if (error) throw error
    },
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cliente-temas', clienteId] })
    }
  })
}

// Hook for removing a tema from a cliente
export function useRemoveTema() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clienteId, temaId }: { clienteId: number; temaId: number }) => {
      const { error } = await supabase
        .from('quipu_cliente_temas')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('tema_id', temaId)

      if (error) throw error
    },
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cliente-temas', clienteId] })
    }
  })
}

// Hook for updating tema priority
export function useUpdateTemaPrioridad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      clienteId,
      temaId,
      prioridad
    }: {
      clienteId: number
      temaId: number
      prioridad: number
    }) => {
      const { error } = await supabase
        .from('quipu_cliente_temas')
        .update({ prioridad })
        .eq('cliente_id', clienteId)
        .eq('tema_id', temaId)

      if (error) throw error
    },
    onSuccess: (_, { clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['cliente-temas', clienteId] })
    }
  })
}
