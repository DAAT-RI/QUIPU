import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Usuario {
  id: string
  cliente_id: number | null  // null para superadmin/master
  email: string
  nombre: string | null
  rol: string  // 'admin' | 'analyst' | 'viewer' | 'superadmin'
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

// ==================== TEMAS/CATEGORÍAS ====================

export interface Tema {
  id: number
  nombre: string
  nombre_normalizado: string | null
  categoria: string | null
  sector: string | null
  icono: string | null
  color: string | null
  orden: number
}

export interface ClienteTema {
  cliente_id: number
  tema_id: number
  prioridad: number
  alertas_activas: boolean
  added_at: string
  quipu_temas: Tema | null
}

// Listar todos los temas disponibles
export function useTemas() {
  return useQuery({
    queryKey: ['admin-temas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_temas')
        .select('*')
        .eq('activo', true)
        .order('orden')

      if (error) throw error
      return data as Tema[]
    },
  })
}

// Listar temas asignados a un cliente
export function useClienteTemas(clienteId: number | undefined) {
  return useQuery({
    queryKey: ['admin-cliente-temas', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_cliente_temas')
        .select(
          `
          cliente_id,
          tema_id,
          prioridad,
          alertas_activas,
          added_at,
          quipu_temas (
            id,
            nombre,
            nombre_normalizado,
            categoria,
            sector,
            icono,
            color,
            orden
          )
        `
        )
        .eq('cliente_id', clienteId!)
        .order('prioridad')

      if (error) throw error
      // Supabase returns joined data, need to flatten
      return (data as unknown as ClienteTema[]) ?? []
    },
  })
}

// Asignar temas a un cliente (bulk)
export function useAssignTemas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      clienteId,
      temaIds,
      prioridad = 2,
    }: {
      clienteId: number
      temaIds: number[]
      prioridad?: number
    }) => {
      const inserts = temaIds.map((tema_id) => ({
        cliente_id: clienteId,
        tema_id,
        prioridad,
      }))

      const { error } = await supabase.from('quipu_cliente_temas').upsert(inserts, {
        onConflict: 'cliente_id,tema_id',
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cliente-temas', variables.clienteId] })
    },
  })
}

// Actualizar prioridad de un tema
export function useUpdateTemaPrioridad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      clienteId,
      temaId,
      prioridad,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cliente-temas', variables.clienteId] })
    },
  })
}

// Eliminar tema de cliente
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cliente-temas', variables.clienteId] })
    },
  })
}
