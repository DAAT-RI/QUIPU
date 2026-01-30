import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface Cliente {
  id: number
  nombre: string
  tipo?: string
  sector?: string
  contacto_email?: string
  plan: string
  max_candidatos: number
  activo: boolean
  created_at: string
  usuarios?: { count: number }[]
  candidatos?: { count: number }[]
}

interface CreateClienteData {
  nombre: string
  tipo?: string
  sector?: string
  contacto_email?: string
  plan: string
  max_candidatos: number
}

export function useAdminClientes() {
  return useQuery({
    queryKey: ['admin-clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_clientes')
        .select(`
          *,
          usuarios:quipu_usuarios(count),
          candidatos:quipu_cliente_candidatos(count)
        `)
        .order('nombre')

      if (error) throw error
      return data as Cliente[]
    },
  })
}

export function useCreateCliente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateClienteData) => {
      const { data: cliente, error } = await supabase
        .from('quipu_clientes')
        .insert({
          nombre: data.nombre,
          tipo: data.tipo,
          sector: data.sector,
          contacto_email: data.contacto_email,
          plan: data.plan,
          max_candidatos: data.max_candidatos,
          activo: true,
        })
        .select()
        .single()

      if (error) throw error
      return cliente
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
    },
  })
}

export function useAssignCandidatos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clienteId, candidatoIds }: { clienteId: number; candidatoIds: number[] }) => {
      // Insertar relaciones cliente-candidato
      const records = candidatoIds.map(candidatoId => ({
        cliente_id: clienteId,
        candidato_id: candidatoId,
      }))

      const { error } = await supabase
        .from('quipu_cliente_candidatos')
        .insert(records)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clientes'] })
    },
  })
}
