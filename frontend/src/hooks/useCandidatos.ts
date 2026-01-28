import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CandidatoFilters, CandidatoCompleto, HojaVida } from '@/types/database'

export function useCandidatos(filters: CandidatoFilters) {
  return useQuery({
    queryKey: ['candidatos', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_candidatos_completos')
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
      if (filters.departamento) {
        query = query.eq('departamento', filters.departamento)
      }

      query = query
        .order('nombre_completo')
        .range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error, count } = await query
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

export function useSearchCandidatosByName(search: string) {
  return useQuery({
    queryKey: ['search-candidatos', search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_completos')
        .select('*')
        .ilike('nombre_completo', `%${search}%`)
        .limit(20)
      if (error) throw error
      return data as CandidatoCompleto[]
    },
  })
}

export function useHojaVida(candidatoId: number | undefined) {
  return useQuery({
    queryKey: ['hoja-vida', candidatoId],
    enabled: !!candidatoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_hojas_vida')
        .select('*')
        .eq('candidato_id', candidatoId!)
        .maybeSingle()
      if (error) throw error
      return data as HojaVida | null
    },
  })
}
