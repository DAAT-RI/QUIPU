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

      // Get all declarations from QUIPU_MASTER
      const { data: masterData, error: masterError } = await supabase
        .from('QUIPU_MASTER')
        .select('stakeholder, canal, interacciones')
      if (masterError) throw masterError

      // Count declarations per partido
      const counts: Record<number, { partido: typeof partidos[0]; count: number }> = {}

      for (const partido of partidos) {
        counts[partido.id] = { partido, count: 0 }
        const nombreLower = partido.nombre_oficial.toLowerCase()
        const candidatoLower = partido.candidato_presidencial?.toLowerCase()

        for (const entry of masterData) {
          const stakeholder = entry.stakeholder?.toLowerCase() || ''
          const canal = entry.canal?.toLowerCase() || ''

          // Match by partido name or candidate name
          const matchesByName = stakeholder.includes(nombreLower) || canal.includes(nombreLower)
          const matchesByCandidato = candidatoLower && (
            stakeholder.includes(candidatoLower) ||
            candidatoLower.split(' ').some((part: string) => part.length > 3 && stakeholder.includes(part))
          )

          if (matchesByName || matchesByCandidato) {
            // Count declarations in this entry
            const interacciones = entry.interacciones as Array<{ type?: string }> | null
            if (interacciones) {
              const declCount = interacciones.filter(i => i.type === 'declaration').length
              counts[partido.id].count += declCount
            }
          }
        }
      }

      return Object.values(counts)
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(c => ({
          id: c.partido.id,
          nombre_oficial: c.partido.nombre_oficial,
          candidato_presidencial: c.partido.candidato_presidencial,
          total_declaraciones: c.count,
        }))
    },
  })
}
