import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Usuario {
  id: string
  cliente_id: number
  email: string
  nombre: string | null
  rol: string
  auth_user_id: string | null
  activo: boolean
  created_at: string
}

// Listar usuarios de un cliente
export function useClienteUsuarios(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['admin-usuarios', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .select('*')
        .eq('cliente_id', clienteId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Usuario[]
    },
  })
}

// Crear usuario
export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      clienteId,
      email,
      nombre,
      rol,
    }: {
      clienteId: number
      email: string
      nombre?: string
      rol?: string
    }) => {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .insert({
          cliente_id: clienteId,
          email,
          nombre: nombre || null,
          rol: rol || 'viewer',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios', variables.clienteId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
    },
  })
}

// Actualizar usuario
export function useUpdateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      clienteId,
      ...updates
    }: {
      id: string
      clienteId: number
      nombre?: string
      rol?: string
      activo?: boolean
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios', variables.clienteId] })
    },
  })
}

// Eliminar usuario
export function useDeleteUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; clienteId: number }) => {
      const { error } = await supabase.from('quipu_usuarios').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios', variables.clienteId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
    },
  })
}

// Listar candidatos de un cliente
export function useClienteCandidatosAdmin(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['admin-cliente-candidatos', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_cliente_candidatos')
        .select(
          `
          candidato_id,
          added_at,
          quipu_candidatos (
            id,
            dni,
            nombre_completo,
            cargo_postula,
            partido_id
          )
        `
        )
        .eq('cliente_id', clienteId!)
        .order('added_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// Eliminar candidato de cliente
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cliente-candidatos', variables.clienteId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
    },
  })
}
