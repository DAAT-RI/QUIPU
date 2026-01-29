import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface CandidatoMatch {
  id: number
  nombre_completo: string
  partido_id: number | null
  partido_nombre: string | null
}

/**
 * Hook para vincular un stakeholder con un candidato en la base de datos
 *
 * Intenta encontrar un candidato cuyo nombre coincida con el stakeholder.
 * Útil para mostrar link "Ver perfil" en declaraciones.
 *
 * @param stakeholder - Nombre del stakeholder (ej: "Rafael López Aliaga")
 * @returns Candidato encontrado o null
 */
export function useStakeholderCandidato(stakeholder: string | null | undefined) {
  return useQuery({
    queryKey: ['stakeholder-candidato', stakeholder],
    enabled: !!stakeholder && stakeholder.length > 3,
    queryFn: async () => {
      if (!stakeholder) return null

      // Estrategia: buscar por apellido (más específico)
      // "Rafael López Aliaga" -> buscar "López Aliaga" o "Aliaga"
      const parts = stakeholder.trim().split(/\s+/)

      // Si tiene múltiples palabras, usar las últimas (apellidos)
      let searchTerm = stakeholder
      if (parts.length >= 2) {
        // Usar los últimos 2 términos (apellido paterno + materno)
        searchTerm = parts.slice(-2).join(' ')
      }

      const { data, error } = await supabase
        .from('v_quipu_candidatos_unicos')
        .select('id, nombre_completo, partido_id, partido_nombre')
        .ilike('nombre_completo', `%${searchTerm}%`)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Error buscando candidato para stakeholder:', error)
        return null
      }

      return data as CandidatoMatch | null
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (datos estables)
    retry: false, // No reintentar si falla
  })
}

/**
 * Hook para buscar múltiples candidatos por nombre
 * Útil para el selector de candidatos en Comparar
 *
 * @param search - Término de búsqueda
 * @returns Lista de candidatos que coinciden
 */
export function useSearchCandidatosByName(search: string) {
  return useQuery({
    queryKey: ['search-candidatos-name', search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_candidatos_unicos')
        .select('id, nombre_completo, partido_id, partido_nombre, tipo_eleccion, cargo_postula')
        .ilike('nombre_completo', `%${search}%`)
        .eq('tipo_eleccion', 'PRESIDENCIAL') // Solo presidenciales para comparar
        .order('orden_cargo')
        .limit(20)

      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
