import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClienteCandidatos } from './useClienteCandidatos'
import type { DeclaracionFilters, DeclaracionView, QuipuMasterEntry } from '@/types/database'

/** Remove accents from text for accent-insensitive search */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// extractSearchTerms function removed - now using quipu_stakeholder_aliases table for matching

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

/**
 * Hook para obtener declaraciones desde v_quipu_declaraciones
 * FILTRADO POR CANDIDATOS DEL CLIENTE (multi-tenant)
 *
 * NOTAS IMPORTANTES:
 * - Default: tipo='declaration' (mentions tienen mucho ruido)
 * - `resumen` es del ARTÍCULO completo, no de la declaración
 * - `search` busca en CONTENIDO (lo que dijo), NO en keywords/titulo
 * - `organizaciones` es clave para filtrar por gremio/sector
 * - Uses quipu_stakeholder_aliases for accurate stakeholder matching
 */
export function useDeclaraciones(filters: DeclaracionFilters) {
  const { clienteId, loading } = useAuth()
  const { data: candidatosData } = useClienteCandidatos()

  // Get candidato IDs for this client
  const clienteCandidatoIds = candidatosData?.map(c => c.candidato_id) ?? []

  return useQuery({
    queryKey: ['declaraciones', filters, clienteId, clienteCandidatoIds],
    // Solo habilitar cuando auth terminó de cargar Y (es superadmin O hay candidatos)
    enabled: !loading && (clienteId === null || clienteCandidatoIds.length > 0),
    queryFn: async () => {
      // For non-master users, first get aliases that map to their candidates
      let aliasNormalized: string[] = []
      if (clienteId !== null && clienteCandidatoIds.length > 0) {
        const { data: aliases } = await supabase
          .from('quipu_stakeholder_aliases')
          .select('alias_normalized')
          .in('candidato_id', clienteCandidatoIds)

        aliasNormalized = aliases?.map(a => a.alias_normalized) ?? []
      }

      let query = supabase
        .from('v_quipu_declaraciones')
        .select('*', { count: 'exact' })

      // Filtro multi-tenant: solo declaraciones de candidatos del cliente
      // Uses aliases table for accurate stakeholder matching
      if (clienteId !== null) {
        if (aliasNormalized.length > 0) {
          const stakeholderConditions = aliasNormalized
            .slice(0, 100) // Limitar para performance
            .map(alias => `stakeholder.ilike.%${alias}%`)
            .join(',')

          if (stakeholderConditions) {
            query = query.or(stakeholderConditions)
          }
        } else {
          // If client has no aliases mapped, they should see NOTHING
          // Prevent data leak by forcing an impossible condition
          query = query.eq('id', -1)
        }
      }

      // Filtro por tipo (default: declaration) - case insensitive
      if (filters.tipo) {
        query = query.ilike('tipo', filters.tipo)
      }

      // Filtro por stakeholder (quién dijo) - con soporte para tildes
      if (filters.stakeholder) {
        const variants = getSearchVariants(filters.stakeholder)
        query = query.or(variants.map(v => `stakeholder.ilike.%${v}%`).join(','))
      }

      // Filtro por canal (fuente)
      if (filters.canal) {
        query = query.eq('canal', filters.canal)
      }

      // Filtro por categoría del artículo (renamed from tema)
      if (filters.categoria) {
        query = query.ilike('categorias', `%${filters.categoria}%`)
      }

      // Filtro por categoría de la declaración específica (con soporte para tildes)
      if (filters.categoriaDeclaracion) {
        const variants = getSearchVariants(filters.categoriaDeclaracion)
        query = query.or(variants.map(v => `categorias_interaccion.ilike.%${v}%`).join(','))
      }

      // Filtro por organización mencionada (IMPORTANTE para gremios) - con soporte para tildes
      if (filters.organizacion) {
        const variants = getSearchVariants(filters.organizacion)
        query = query.or(variants.map(v => `organizaciones.ilike.%${v}%`).join(','))
      }

      // Filtro por producto/sector (busca en contenido, no keywords) - con soporte para tildes
      if (filters.producto) {
        const variants = getSearchVariants(filters.producto)
        query = query.or(variants.map(v => `contenido.ilike.%${v}%`).join(','))
      }

      // Filtro por partido (busca en organizaciones, stakeholder y contenido) - con soporte para tildes
      if (filters.partido) {
        const variants = getSearchVariants(filters.partido)
        const conditions = variants.flatMap(v => [
          `organizaciones.ilike.%${v}%`,
          `stakeholder.ilike.%${v}%`,
          `contenido.ilike.%${v}%`
        ])
        query = query.or(conditions.join(','))
      }

      // Búsqueda general - IMPORTANTE: buscar en CONTENIDO (lo que dijo)
      // NO buscar en keywords/titulo (son del artículo, no de la declaración)
      // Soporta búsqueda con/sin acentos (mineria = minería)
      if (filters.search) {
        const variants = getSearchVariants(filters.search)
        const conditions = variants.flatMap(v => [
          `contenido.ilike.%${v}%`,
          `stakeholder.ilike.%${v}%`
        ])
        query = query.or(conditions.join(','))
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
