import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useClienteCandidatos() {
  const { clienteId, loading, isSuperadmin } = useAuth()

  return useQuery({
    queryKey: ['cliente-candidatos', clienteId, isSuperadmin],
    enabled: !loading,
    queryFn: async () => {
      // Superadmin = todos los candidatos (más eficiente que ir por junction table)
      if (isSuperadmin) {
        const { data, error } = await supabase
          .from('quipu_candidatos')
          .select('id, nombre_completo, dni, cargo_postula')
          .limit(500)

        if (error) throw error
        return data?.map(c => ({
          candidato_id: c.id,
          quipu_candidatos: c
        })) ?? []
      }

      // Usuario normal = solo sus candidatos via junction table
      const { data, error } = await supabase
        .from('quipu_cliente_candidatos')
        .select(`
          candidato_id,
          quipu_candidatos (id, nombre_completo, dni, cargo_postula)
        `)
        .eq('cliente_id', clienteId)

      if (error) throw error
      return data ?? []
    },
  })
}
