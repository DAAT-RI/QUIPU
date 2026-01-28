import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Partido, ResumenPartido } from '@/types/database'

export function usePartidos(search?: string) {
  return useQuery({
    queryKey: ['partidos', search],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_resumen_partidos')
        .select('*')
        .order('nombre_oficial')
      if (search) {
        query = query.ilike('nombre_oficial', `%${search}%`)
      }
      const { data, error } = await query
      if (error) throw error
      return data as ResumenPartido[]
    },
  })
}

export function usePartido(id: string | undefined) {
  return useQuery({
    queryKey: ['partido', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_partidos')
        .select('*')
        .eq('id', Number(id))
        .single()
      if (error) throw error
      return data as Partido
    },
  })
}
