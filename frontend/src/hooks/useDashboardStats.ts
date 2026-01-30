import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizeKey } from '@/lib/utils'

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
      // Use v_quipu_candidatos_unicos for consistent candidate counts across the app
      const [partidos, promesas, candidatos, categorias] = await Promise.all([
        supabase.from('quipu_partidos').select('*', { count: 'exact', head: true }),
        supabase.from('quipu_promesas_planes').select('*', { count: 'exact', head: true }),
        supabase.from('v_quipu_candidatos_unicos').select('*', { count: 'exact', head: true }),
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
 * Hook para contar temas de declaraciones (tema_interaccion de v_quipu_declaraciones)
 * Usado para "Temas Más Discutidos" en el Dashboard
 * Normaliza keys para agrupar variantes (con/sin tildes) y guarda labels originales
 */
export function useDeclaracionesPorTema() {
  return useQuery({
    queryKey: ['declaraciones-por-tema'],
    queryFn: async () => {
      // Get all tema_interaccion from QUIPU_MASTER
      const { data, error } = await supabase
        .from('QUIPU_MASTER')
        .select('interacciones')

      if (error) throw error

      // Count topics from all interactions (normalize to group variants)
      const counts: Record<string, { label: string; count: number }> = {}
      for (const entry of data || []) {
        const interacciones = entry.interacciones as Array<{ type?: string; tema?: string }> | null
        if (!interacciones) continue

        for (const i of interacciones) {
          // Only count declarations (not mentions)
          if (i.type !== 'declaration') continue
          if (!i.tema) continue

          // tema can have multiple topics separated by ;
          const temas = i.tema.split(';').map(t => t.trim()).filter(t => t)
          for (const tema of temas) {
            const key = normalizeKey(tema)
            if (!counts[key]) {
              counts[key] = { label: tema, count: 0 }
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

export function useTopPartidosByDeclaraciones() {
  return useQuery({
    queryKey: ['top-partidos-declaraciones'],
    queryFn: async () => {
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

      // Add partido names and presidential candidates as search terms
      // Use normalizeForMatch to handle accents (César vs Cesar, Acuña vs Acuna)
      for (const partido of partidos) {
        if (partido.nombre_oficial) {
          searchTermsToPartido.set(normalizeForMatch(partido.nombre_oficial), partido.id)
          // Also add significant parts of partido name (words >= 4 chars)
          const parts = normalizeForMatch(partido.nombre_oficial).split(/[\s,]+/)
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, partido.id)
            }
          }
        }
        if (partido.candidato_presidencial) {
          searchTermsToPartido.set(normalizeForMatch(partido.candidato_presidencial), partido.id)
          // Add parts of presidential candidate name
          const parts = normalizeForMatch(partido.candidato_presidencial).split(' ')
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, partido.id)
            }
          }
        }
      }

      // Add all candidatos as search terms
      for (const candidato of candidatos) {
        if (!candidato.partido_id) continue
        // Add full name
        if (candidato.nombre_completo) {
          searchTermsToPartido.set(normalizeForMatch(candidato.nombre_completo), candidato.partido_id)
          // Also add parts of name that are long enough (apellidos)
          const parts = normalizeForMatch(candidato.nombre_completo).split(' ')
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, candidato.partido_id)
            }
          }
        }
        // Add apellido paterno
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

      // Stakeholder is INSIDE interacciones[], not at row level
      for (const entry of masterData) {
        const interacciones = entry.interacciones as Array<{ type?: string; stakeholder?: string }> | null
        if (!interacciones) continue

        for (const i of interacciones) {
          // Only count declarations
          if (i.type !== 'declaration') continue
          if (!i.stakeholder) continue

          // Normalize stakeholder to handle accents (César vs Cesar, Acuña vs Acuna)
          const stakeholder = normalizeForMatch(i.stakeholder)

          // Try to match stakeholder to a partido
          let matchedPartidoId: number | null = null

          // Check direct match first
          if (searchTermsToPartido.has(stakeholder)) {
            matchedPartidoId = searchTermsToPartido.get(stakeholder)!
          } else {
            // Check if stakeholder contains any search term
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

      // Build result with partido info
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
