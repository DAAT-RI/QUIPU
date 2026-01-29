import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PromesaFilters, PromesaCompleta } from '@/types/database'

export function usePromesas(filters: PromesaFilters) {
  return useQuery({
    queryKey: ['promesas', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_promesas_planes_completas')
        .select('*', { count: 'exact' })

      if (filters.search) {
        query = query.ilike('texto_original', `%${filters.search}%`)
      }
      if (filters.categoria) {
        query = query.eq('categoria', filters.categoria)
      }
      if (filters.partido_id) {
        query = query.eq('partido_id', filters.partido_id)
      }
      if (filters.partido) {
        query = query.eq('partido', filters.partido)
      }

      query = query
        .order('id', { ascending: false })
        .range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as PromesaCompleta[], count: count ?? 0 }
    },
  })
}

export function usePromesasByPartido(partidoId: number | undefined, categoria?: string) {
  return useQuery({
    queryKey: ['promesas-partido', partidoId, categoria],
    enabled: !!partidoId,
    queryFn: async () => {
      let query = supabase
        .from('quipu_promesas_planes')
        .select('*')
        .eq('partido_id', partidoId!)
      if (categoria) {
        query = query.eq('categoria', categoria)
      }
      query = query.order('categoria').limit(500)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
