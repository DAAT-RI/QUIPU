import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DeclaracionFilters, DeclaracionView, QuipuMasterEntry } from '@/types/database'

/**
 * Hook para obtener declaraciones desde v_quipu_declaraciones
 *
 * NOTAS IMPORTANTES:
 * - Default: tipo='declaration' (mentions tienen mucho ruido)
 * - `resumen` es del ARTÍCULO completo, no de la declaración
 * - `search` busca en CONTENIDO (lo que dijo), NO en keywords/titulo
 * - `organizaciones` es clave para filtrar por gremio/sector
 */
export function useDeclaraciones(filters: DeclaracionFilters) {
  return useQuery({
    queryKey: ['declaraciones', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_declaraciones')
        .select('*', { count: 'exact' })

      // Filtro por tipo (default: declaration)
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo)
      }

      // Filtro por stakeholder (quién dijo)
      if (filters.stakeholder) {
        query = query.ilike('stakeholder', `%${filters.stakeholder}%`)
      }

      // Filtro por canal (fuente)
      if (filters.canal) {
        query = query.eq('canal', filters.canal)
      }

      // Filtro por tema del artículo
      if (filters.tema) {
        query = query.ilike('temas', `%${filters.tema}%`)
      }

      // Filtro por tema de la declaración específica
      if (filters.temaDeclaracion) {
        query = query.ilike('tema_interaccion', `%${filters.temaDeclaracion}%`)
      }

      // Filtro por organización mencionada (IMPORTANTE para gremios)
      if (filters.organizacion) {
        query = query.ilike('organizaciones', `%${filters.organizacion}%`)
      }

      // Filtro por producto/sector (busca en contenido, no keywords)
      if (filters.producto) {
        query = query.ilike('contenido', `%${filters.producto}%`)
      }

      // Filtro por partido (busca en canal o stakeholder)
      if (filters.partido) {
        query = query.or(`canal.ilike.%${filters.partido}%,stakeholder.ilike.%${filters.partido}%`)
      }

      // Búsqueda general - IMPORTANTE: buscar en CONTENIDO (lo que dijo)
      // NO buscar en keywords/titulo (son del artículo, no de la declaración)
      if (filters.search) {
        query = query.or(`contenido.ilike.%${filters.search}%,stakeholder.ilike.%${filters.search}%`)
      }

      // Ordenar por fecha descendente y paginar
      query = query
        .order('fecha', { ascending: false, nullsFirst: false })
        .range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: data as DeclaracionView[],
        count: count ?? 0
      }
    },
  })
}

/**
 * Hook para obtener una entry completa de QUIPU_MASTER por ID
 * Incluye todas las interacciones (declarations + mentions)
 */
export function useDeclaracionEntry(id: string | undefined) {
  return useQuery({
    queryKey: ['declaracion-entry', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('QUIPU_MASTER')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as QuipuMasterEntry
    },
  })
}

/**
 * Hook para obtener canales únicos (para dropdown dinámico)
 */
export function useCanales() {
  return useQuery({
    queryKey: ['canales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('QUIPU_MASTER')
        .select('canal')
        .not('canal', 'is', null)

      if (error) throw error

      // Extraer canales únicos
      const canales = new Set<string>()
      data?.forEach(row => {
        if (row.canal) canales.add(row.canal)
      })

      return Array.from(canales).sort().map(c => ({ value: c, label: c }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener organizaciones únicas mencionadas (para filtro de gremios)
 */
export function useOrganizacionesMencionadas() {
  return useQuery({
    queryKey: ['organizaciones-mencionadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('QUIPU_MASTER')
        .select('organizaciones')
        .not('organizaciones', 'is', null)

      if (error) throw error

      // Extraer organizaciones únicas (pueden estar separadas por , o ;)
      const orgs = new Set<string>()
      data?.forEach(row => {
        if (row.organizaciones && row.organizaciones !== 'N/A') {
          row.organizaciones.split(/[,;]/).forEach((o: string) => {
            const trimmed = o.trim()
            if (trimmed && trimmed !== 'N/A') orgs.add(trimmed)
          })
        }
      })

      return Array.from(orgs).sort().map(o => ({ value: o, label: o }))
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
