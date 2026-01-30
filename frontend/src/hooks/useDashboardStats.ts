import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizeKey } from '@/lib/utils'

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
      for (const candidato of candidatos) {
        if (!candidato.partido_id) continue
        // Add full name
        if (candidato.nombre_completo) {
          searchTermsToPartido.set(candidato.nombre_completo.toLowerCase(), candidato.partido_id)
          // Also add parts of name that are long enough (apellidos)
          const parts = candidato.nombre_completo.toLowerCase().split(' ')
          for (const part of parts) {
            if (part.length >= 4) {
              searchTermsToPartido.set(part, candidato.partido_id)
            }
          }
        }
        // Add apellido paterno
        if (candidato.apellido_paterno) {
          searchTermsToPartido.set(candidato.apellido_paterno.toLowerCase(), candidato.partido_id)
        }
      }

      // Get all declarations from QUIPU_MASTER
      const { data: masterData, error: masterError } = await supabase
        .from('QUIPU_MASTER')
        .select('stakeholder, interacciones')
      if (masterError) throw masterError

      // Count declarations per partido
      const counts: Record<number, number> = {}
      for (const partido of partidos) {
        counts[partido.id] = 0
      }

      for (const entry of masterData) {
        const stakeholder = entry.stakeholder?.toLowerCase() || ''
        if (!stakeholder) continue

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
          // Count declarations in this entry
          const interacciones = entry.interacciones as Array<{ type?: string }> | null
          if (interacciones) {
            const declCount = interacciones.filter(i => i.type === 'declaration').length
            counts[matchedPartidoId] = (counts[matchedPartidoId] || 0) + declCount
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
