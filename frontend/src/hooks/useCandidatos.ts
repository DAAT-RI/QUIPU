import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CandidatoFilters, CandidatoCompleto, HojaVida } from '@/types/database'

export function useCandidatos(filters: CandidatoFilters) {
  return useQuery({
    queryKey: ['candidatos', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_candidatos_unicos')
        .select('*', { count: 'exact' })

      if (filters.search) {
        query = query.ilike('nombre_completo', `%${filters.search}%`)
      }
      if (filters.tipo_eleccion) {
        query = query.eq('tipo_eleccion', filters.tipo_eleccion)
      }
      if (filters.partido_id) {
        query = query.eq('partido_id', filters.partido_id)
      }
      // Skip departamento filter for PRESIDENCIAL (national position, not regional)
      if (filters.departamento && filters.tipo_eleccion !== 'PRESIDENCIAL') {
        query = query.eq('departamento', filters.departamento)
      }

      // Server-side ordering: orden_cargo (computed column), then partido
      query = query
        .order('orden_cargo')
        .order('partido_nombre')
        .range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error, count } = await query
      if (error) throw error

      return { data: data as CandidatoCompleto[], count: count ?? 0 }
    },
  })
}

/**
 * Fetch candidates by partial cargo_postula match.
 * Used in Dashboard to separate Presidente, 1er Vice, 2do Vice.
 */
export function useCandidatosByCargo(cargoPattern: string, limit = 50) {
  return useQuery({
    queryKey: ['candidatos-cargo', cargoPattern, limit],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('v_quipu_candidatos_unicos')
        .select('*', { count: 'exact' })
        .ilike('cargo_postula', `%${cargoPattern}%`)
        .order('partido_nombre')
        .limit(limit)
      if (error) throw error
      return { data: data as CandidatoCompleto[], count: count ?? 0 }
    },
  })
}

export function useCandidato(id: string | undefined) {
  return useQuery({
    queryKey: ['candidato', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_completos')
        .select('*')
        .eq('id', Number(id))
        .single()
      if (error) throw error
      return data as CandidatoCompleto
    },
  })
}

/**
 * Search candidatos by name, partido, or cargo.
 * Used in Comparar page for flexible candidate selection.
 */
export function useSearchCandidatosByName(search: string) {
  return useQuery({
    queryKey: ['search-candidatos', search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_unicos')
        .select('*')
        .or(`nombre_completo.ilike.%${search}%,partido_nombre.ilike.%${search}%,cargo_postula.ilike.%${search}%`)
        .limit(20)
      if (error) throw error
      return data as CandidatoCompleto[]
    },
  })
}

/**
 * Fetch other candidacy records for the same person (same DNI, different cargo).
 * Returns sibling records excluding the current candidato ID.
 */
export function useCandidatoSiblings(candidatoId: number | undefined, dni?: string | null) {
  return useQuery({
    queryKey: ['candidato-siblings', candidatoId, dni],
    enabled: !!candidatoId && !!dni,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_completos')
        .select('*')
        .eq('dni', dni!)
        .neq('id', candidatoId!)
      if (error) throw error
      return data as CandidatoCompleto[]
    },
  })
}

/**
 * Fetch hoja de vida for a candidato.
 * A person can have multiple candidacy records (same DNI, different cargo),
 * so the hoja_vida may be linked to a sibling candidato_id.
 * We try direct ID first, then fall back to any candidato with the same DNI.
 */
/**
 * Get counts of candidates by tipo_eleccion for dashboard cargo cards.
 */
export function useCandidatoCountByTipo() {
  return useQuery({
    queryKey: ['candidato-count-by-tipo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_unicos')
        .select('tipo_eleccion')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data) {
        if (row.tipo_eleccion) {
          counts[row.tipo_eleccion] = (counts[row.tipo_eleccion] || 0) + 1
        }
      }
      return counts
    },
  })
}

export function useHojaVida(candidatoId: number | undefined, dni?: string | null) {
  return useQuery({
    queryKey: ['hoja-vida', candidatoId, dni],
    enabled: !!candidatoId,
    queryFn: async () => {
      // Direct lookup by candidato_id
      const { data, error } = await supabase
        .from('quipu_hojas_vida')
        .select('*')
        .eq('candidato_id', candidatoId!)
        .maybeSingle()
      if (error) throw error
      if (data) return data as HojaVida

      // Fallback: look up via any candidato record sharing the same DNI
      if (dni) {
        const { data: siblings } = await supabase
          .from('quipu_candidatos')
          .select('id')
          .eq('dni', dni)
        if (siblings && siblings.length > 0) {
          const ids = siblings.map((c) => c.id)
          const { data: hv, error: hvError } = await supabase
            .from('quipu_hojas_vida')
            .select('*')
            .in('candidato_id', ids)
            .maybeSingle()
          if (hvError) throw hvError
          return (hv as HojaVida) ?? null
        }
      }

      return null
    },
  })
}
