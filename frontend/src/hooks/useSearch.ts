import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PromesaCompleta } from '@/types/database'

/** Remove accents from text for accent-insensitive search */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Generate search variants for accent-insensitive search (Spanish).
 * Creates variants with accented vowels in common positions.
 * Limited to ~10 variants to avoid query explosion.
 */
function getSearchVariants(text: string): string[] {
  const lower = text.toLowerCase()
  const withoutAccents = removeAccents(lower)

  // Always include original and without-accents version
  const variants = new Set<string>([lower, withoutAccents])

  // Map of vowels to their accented versions
  const accentMap: Record<string, string> = {
    'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú'
  }

  // Find all vowel positions
  const vowelPositions: { pos: number; char: string }[] = []
  for (let i = 0; i < withoutAccents.length; i++) {
    if (accentMap[withoutAccents[i]]) {
      vowelPositions.push({ pos: i, char: withoutAccents[i] })
    }
  }

  // Generate variants with accent on each vowel position (most common pattern)
  for (const { pos, char } of vowelPositions) {
    const chars = withoutAccents.split('')
    chars[pos] = accentMap[char]
    variants.add(chars.join(''))
  }

  // Limit to 10 variants max
  return Array.from(variants).slice(0, 10)
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
