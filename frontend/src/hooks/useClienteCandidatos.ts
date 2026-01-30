import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useClienteCandidatos() {
  const { clienteId } = useAuth()

  return useQuery({
    queryKey: ['cliente-candidatos', clienteId],
    queryFn: async () => {
      if (!clienteId) return []

      const { data, error } = await supabase
        .from('quipu_cliente_candidatos')
        .select(`
          candidato_id,
          quipu_candidatos (
            id,
            nombre_completo,
            dni,
            cargo_postula
          )
        `)
        .eq('cliente_id', clienteId)

      if (error) throw error
      return data ?? []
    },
    enabled: !!clienteId,
  })
}
