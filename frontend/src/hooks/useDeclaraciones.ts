import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClienteCandidatos } from './useClienteCandidatos'
import type { DeclaracionFilters, DeclaracionView, QuipuMasterEntry } from '@/types/database'

/** Remove accents from text for accent-insensitive search */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Extract significant search terms from a candidato name.
 * Peruvian names are typically: NOMBRE1 NOMBRE2 APELLIDO_PATERNO APELLIDO_MATERNO
 * Media often uses just apellidos: "López Aliaga", "Cerrón", "del Castillo"
 *
 * Strategy: Extract apellidos (words 3+ onwards) and significant name parts
 */
function extractSearchTerms(fullName: string): string[] {
  const normalized = removeAccents(fullName.toLowerCase().trim())
  const words = normalized.split(/\s+/).filter(w => w.length >= 3)

  if (words.length <= 2) {
    // Short name - use all words
    return words
  }

  // For longer names, focus on apellidos (typically last 2 words)
  // But also include compound apellidos like "del castillo", "de la cruz"
  const terms = new Set<string>()

  // Add individual apellidos (words 3+, skipping common first names)
  const commonFirstNames = new Set(['jose', 'maria', 'juan', 'luis', 'carlos', 'jorge', 'pedro', 'miguel', 'rafael', 'alberto', 'cesar', 'victor', 'manuel', 'fernando', 'antonio', 'francisco', 'rosa', 'ana', 'carmen', 'luz', 'flor', 'gloria', 'patricia', 'elizabeth', 'martha', 'silvia'])

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    // Skip very common first names for individual matching
    if (!commonFirstNames.has(word) && word.length >= 4) {
      terms.add(word)
    }
  }

  // Add compound apellidos (last 2 words together)
  if (words.length >= 2) {
    const lastTwo = words.slice(-2).join(' ')
    terms.add(lastTwo)
  }

  // Add last 3 words for compound surnames like "del castillo galvez"
  if (words.length >= 3) {
    const lastThree = words.slice(-3).join(' ')
    terms.add(lastThree)
  }

  return Array.from(terms)
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

/**
 * Hook para obtener declaraciones desde v_quipu_declaraciones
 * FILTRADO POR CANDIDATOS DEL CLIENTE (multi-tenant)
 *
 * NOTAS IMPORTANTES:
 * - Default: tipo='declaration' (mentions tienen mucho ruido)
 * - `resumen` es del ARTÍCULO completo, no de la declaración
 * - `search` busca en CONTENIDO (lo que dijo), NO en keywords/titulo
 * - `organizaciones` es clave para filtrar por gremio/sector
 */
export function useDeclaraciones(filters: DeclaracionFilters) {
  const { clienteId } = useAuth()
  const { data: candidatosData } = useClienteCandidatos()

  // Filter candidates by cargo if needed
  const filteredCandidatos = candidatosData?.filter(c => {
    if (!filters.cargo) return true
    return (c.quipu_candidatos as any)?.cargo_postula === filters.cargo
  }) ?? []

  // Extraer términos de búsqueda (apellidos) de los candidatos del cliente
  // Usamos apellidos porque los medios usan "López Aliaga" no "RAFAEL BERNARDO LOPEZ ALIAGA CAZORLA"
  const searchTerms = filteredCandidatos.flatMap(c => {
    const nombre = (c.quipu_candidatos as any)?.nombre_completo
    return nombre ? extractSearchTerms(nombre) : []
  }).filter(Boolean) ?? []

  // Deduplicar y limitar términos
  const uniqueTerms = [...new Set(searchTerms)].slice(0, 100)

  return useQuery({
    queryKey: ['declaraciones', filters, clienteId],
    enabled: clienteId === null || uniqueTerms.length > 0,
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_declaraciones')
        .select('*', { count: 'exact' })

      // Filtro multi-tenant: solo declaraciones de candidatos del cliente
      // Master (clienteId === null) no tiene filtro, ve todo
      // Buscamos por APELLIDOS (ej: "lopez aliaga") no nombres completos
      if (clienteId !== null && uniqueTerms.length > 0) {
        const stakeholderConditions = uniqueTerms
          .filter(term => term.length >= 5) // Solo términos significativos
          .slice(0, 50) // Limitar para performance
          .map(term => `stakeholder.ilike.%${term}%`)
          .join(',')

        if (stakeholderConditions) {
          query = query.or(stakeholderConditions)
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
