import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PromesaCompleta } from '@/types/database'

export function useSearchPromesas(query: string, categoria?: string, partidoId?: number) {
  return useQuery({
    queryKey: ['search-promesas', query, categoria, partidoId],
    enabled: query.length >= 3,
    queryFn: async () => {
      let q = supabase
        .from('v_quipu_promesas_planes_completas')
        .select('*', { count: 'exact' })
        .ilike('texto_original', `%${query}%`)

      if (categoria) {
        q = q.eq('categoria', categoria)
      }
      // Note: filtering by partido_id requires joining; for now filter by partido name

      q = q.limit(50)

      const { data, error, count } = await q
      if (error) throw error
      return { data: data as PromesaCompleta[], count: count ?? 0 }
    },
  })
}
