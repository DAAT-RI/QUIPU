import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PromesaCompleta } from '@/types/database'

/** Remove accents from text for accent-insensitive search */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Generate search variants (with and without accents) */
function getSearchVariants(text: string): string[] {
  const withoutAccents = removeAccents(text)
  const variants = new Set([text.toLowerCase(), withoutAccents.toLowerCase()])
  return Array.from(variants)
}

export function useSearchPromesas(query: string, categoria?: string, partido?: string) {
  return useQuery({
    queryKey: ['search-promesas', query, categoria, partido],
    enabled: query.length >= 3,
    queryFn: async () => {
      const variants = getSearchVariants(query)

      let q = supabase
        .from('v_quipu_promesas_planes_completas')
        .select('*', { count: 'exact' })

      // Search with accent variants
      if (variants.length > 1) {
        q = q.or(variants.map(v => `texto_original.ilike.%${v}%`).join(','))
      } else {
        q = q.ilike('texto_original', `%${query}%`)
      }

      if (categoria) {
        q = q.eq('categoria', categoria)
      }

      if (partido) {
        q = q.eq('partido', partido)
      }

      q = q.limit(50)

      const { data, error, count } = await q
      if (error) throw error
      return { data: data as PromesaCompleta[], count: count ?? 0 }
    },
  })
}
