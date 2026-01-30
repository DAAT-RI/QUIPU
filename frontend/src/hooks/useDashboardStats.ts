import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizeKey } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useClienteCandidatos } from './useClienteCandidatos'

/** Remove accents from text for accent-insensitive matching */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Normalize text for matching: lowercase and remove accents */
function normalizeForMatch(text: string): string {
  return removeAccents(text.toLowerCase().trim())
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [partidos, promesas, candidatos, categorias] = await Promise.all([
        supabase.from('quipu_partidos').select('*', { count: 'exact', head: true }),
        supabase.from('quipu_promesas_planes').select('*', { count: 'exact', head: true }),
        supabase.from('quipu_candidatos').select('*', { count: 'exact', head: true }),
        supabase.from('quipu_categorias_promesas').select('*', { count: 'exact', head: true }),
      ])
      return {
        totalPartidos: partidos.count ?? 0,
        totalPromesas: promesas.count ?? 0,
        totalCandidatos: candidatos.count ?? 0,
        totalCategorias: categorias.count ?? 0,
      }
    },
  })
}

export function usePromesasPorCategoria() {
  return useQuery({
    queryKey: ['promesas-por-categoria'],
    queryFn: async () => {
      // Paginate to avoid Supabase 1000-row default limit
      const BATCH = 1000
      let allRows: { categoria: string }[] = []
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('quipu_promesas_planes')
          .select('categoria')
          .range(offset, offset + BATCH - 1)
        if (error) throw error
        allRows = allRows.concat(data)
        if (data.length < BATCH) break
        offset += BATCH
      }
      // Count by category (normalize key for grouping, keep original label for display)
      const counts: Record<string, { label: string; count: number }> = {}
      for (const row of allRows) {
        const key = normalizeKey(row.categoria)
        if (!counts[key]) {
          counts[key] = { label: row.categoria, count: 0 }
        }
        counts[key].count += 1
      }
      return Object.values(counts)
        .map(({ label, count }) => ({ categoria: label, count }))
        .sort((a, b) => b.count - a.count)
    },
  })
}

export function useTopPartidos() {
  return useQuery({
    queryKey: ['top-partidos-promesas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_quipu_resumen_partidos')
        .select('*')
        .order('total_promesas', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
  })
}

/**
 * Hook para contar categorías de declaraciones (categorias_interaccion de v_quipu_declaraciones)
 * Usado para "Categorías Más Discutidas" en el Dashboard
 * Normaliza keys para agrupar variantes (con/sin tildes) y guarda labels originales
 *
 * MULTI-TENANT: Uses quipu_stakeholder_aliases for accurate filtering
 */
export function useDeclaracionesPorTema() {
  const { clienteId } = useAuth()
  const { data: candidatosData } = useClienteCandidatos()

  // Get candidato IDs for this client
  const clienteCandidatoIds = candidatosData?.map(c => c.candidato_id) ?? []

  return useQuery({
    queryKey: ['declaraciones-por-tema', clienteId, clienteCandidatoIds],
    // Solo habilitar si es superadmin (clienteId === null) o hay candidatos cargados
    enabled: clienteId === null || clienteCandidatoIds.length > 0,
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

      // Get all categorias from QUIPU_MASTER interacciones
      const { data, error } = await supabase
        .from('QUIPU_MASTER')
        .select('interacciones')

      if (error) throw error

      // Count topics from all interactions (normalize to group variants)
      const counts: Record<string, { label: string; count: number }> = {}
      for (const entry of data || []) {
        const interacciones = entry.interacciones as Array<{ type?: string; categorias?: string; stakeholder?: string }> | null
        if (!interacciones) continue

        for (const i of interacciones) {
          // Only count declarations (not mentions)
          if (i.type !== 'declaration') continue
          if (!i.categorias) continue

          // MULTI-TENANT: Si no es superadmin, filtrar por aliases
          if (clienteId !== null && aliasNormalized.length > 0) {
            const stakeholderNorm = normalizeForMatch(i.stakeholder || '')
            const matchesCliente = aliasNormalized.some(
              alias => stakeholderNorm.includes(alias) || alias.includes(stakeholderNorm)
            )
            if (!matchesCliente) continue
          }

          // categorias can have multiple topics separated by ;
          const categorias = i.categorias.split(';').map((t: string) => t.trim()).filter((t: string) => t)
          for (const categoria of categorias) {
            const key = normalizeKey(categoria)
            if (!counts[key]) {
              counts[key] = { label: categoria, count: 0 }
            }
            counts[key].count += 1
          }
        }
      }

      return Object.entries(counts)
        .map(([key, { label, count }]) => ({ key, tema: label, count }))
        .sort((a, b) => b.count - a.count)
    },
  })
}

/**
 * Hook para obtener los partidos con más declaraciones
 * MULTI-TENANT: Uses quipu_stakeholder_aliases for accurate filtering
 */
export function useTopPartidosByDeclaraciones() {
  const { clienteId } = useAuth()
  const { data: candidatosData } = useClienteCandidatos()

  // Get candidato IDs for this client
  const clienteCandidatoIds = candidatosData?.map(c => c.candidato_id) ?? []

  return useQuery({
    queryKey: ['top-partidos-declaraciones', clienteId, clienteCandidatoIds],
    enabled: clienteId === null || clienteCandidatoIds.length > 0,
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

      // Get all partidos with their presidential candidates
      const { data: partidos, error: partidosError } = await supabase
        .from('quipu_partidos')
        .select('id, nombre_oficial, candidato_presidencial')
      if (partidosError) throw partidosError

      // Get all candidatos with their partido_id and names
      const { data: candidatos, error: candidatosError } = await supabase
        .from('quipu_candidatos')
        .select('partido_id, nombre_completo, apellido_paterno')
      if (candidatosError) throw candidatosError

      // Build a map of search terms to partido_id
      const searchTermsToPartido = new Map<string, number>()

      for (const partido of partidos) {
        if (partido.nombre_oficial) {
          searchTermsToPartido.set(normalizeForMatch(partido.nombre_oficial), partido.id)
          const parts = normalizeForMatch(partido.nombre_oficial).split(/[\s,]+/)
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, partido.id)
            }
          }
        }
        if (partido.candidato_presidencial) {
          searchTermsToPartido.set(normalizeForMatch(partido.candidato_presidencial), partido.id)
          const parts = normalizeForMatch(partido.candidato_presidencial).split(' ')
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, partido.id)
            }
          }
        }
      }

      for (const candidato of candidatos) {
        if (!candidato.partido_id) continue
        if (candidato.nombre_completo) {
          searchTermsToPartido.set(normalizeForMatch(candidato.nombre_completo), candidato.partido_id)
          const parts = normalizeForMatch(candidato.nombre_completo).split(' ')
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, candidato.partido_id)
            }
          }
        }
        if (candidato.apellido_paterno) {
          searchTermsToPartido.set(normalizeForMatch(candidato.apellido_paterno), candidato.partido_id)
        }
      }

      // Get all declarations from QUIPU_MASTER
      const { data: masterData, error: masterError } = await supabase
        .from('QUIPU_MASTER')
        .select('interacciones')
      if (masterError) throw masterError

      // Count declarations per partido
      const counts: Record<number, number> = {}
      for (const partido of partidos) {
        counts[partido.id] = 0
      }

      for (const entry of masterData) {
        const interacciones = entry.interacciones as Array<{ type?: string; stakeholder?: string }> | null
        if (!interacciones) continue

        for (const i of interacciones) {
          if (i.type !== 'declaration') continue
          if (!i.stakeholder) continue

          const stakeholder = normalizeForMatch(i.stakeholder)

          // MULTI-TENANT: Si no es superadmin, filtrar por aliases
          if (clienteId !== null && aliasNormalized.length > 0) {
            const matchesCliente = aliasNormalized.some(
              alias => stakeholder.includes(alias) || alias.includes(stakeholder)
            )
            if (!matchesCliente) continue
          }

          // Try to match stakeholder to a partido
          let matchedPartidoId: number | null = null

          if (searchTermsToPartido.has(stakeholder)) {
            matchedPartidoId = searchTermsToPartido.get(stakeholder)!
          } else {
            for (const [term, partidoId] of searchTermsToPartido) {
              if (term.length >= 4 && stakeholder.includes(term)) {
                matchedPartidoId = partidoId
                break
              }
            }
          }

          if (matchedPartidoId !== null) {
            counts[matchedPartidoId] = (counts[matchedPartidoId] || 0) + 1
          }
        }
      }

      const partidoMap = new Map(partidos.map(p => [p.id, p]))
      return Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([id, count]) => {
          const partido = partidoMap.get(Number(id))!
          return {
            id: partido.id,
            nombre_oficial: partido.nombre_oficial,
            candidato_presidencial: partido.candidato_presidencial,
            total_declaraciones: count,
          }
        })
    },
  })
}
