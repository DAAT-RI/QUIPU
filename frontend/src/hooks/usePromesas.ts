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

export function usePromesasByPartido(partidoId: number | undefined, categoria?: string, limit = 2000) {
  return useQuery({
    queryKey: ['promesas-partido', partidoId, categoria, limit],
    enabled: !!partidoId,
    queryFn: async () => {
      let query = supabase
        .from('quipu_promesas_planes')
        .select('*', { count: 'exact' })
        .eq('partido_id', partidoId!)
      if (categoria) {
        query = query.eq('categoria', categoria)
      }
      query = query.order('categoria').limit(limit)
      const { data, error, count } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}

/**
 * Search promesas by text content for a specific partido
 * Used in Comparar page to filter promesas by tema/search
 */
export function useSearchPromesasByPartido(partidoId: number | undefined, search: string, limit = 2000) {
  return useQuery({
    queryKey: ['promesas-partido-search', partidoId, search, limit],
    enabled: !!partidoId && search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_promesas_planes')
        .select('*')
        .eq('partido_id', partidoId!)
        .or(`texto_original.ilike.%${search}%,resumen.ilike.%${search}%,categoria.ilike.%${search}%`)
        .order('categoria')
        .limit(limit)
      if (error) throw error
      return data
    },
  })
}
