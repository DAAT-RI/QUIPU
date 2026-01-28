import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizeKey } from '@/lib/utils'
import type { DeclaracionFilters, Declaracion, QuipuMasterEntry } from '@/types/database'

export function useDeclaraciones(filters: DeclaracionFilters) {
  return useQuery({
    queryKey: ['declaraciones', filters],
    queryFn: async () => {
      // Query QUIPU_MASTER and flatten interacciones client-side
      // since the view may not exist yet
      const query = supabase
        .from('QUIPU_MASTER')
        .select('*')
        .order('fecha', { ascending: false })

      const { data, error } = await query
      if (error) throw error

      // Flatten declarations from interacciones
      const declaraciones: Declaracion[] = []
      for (const entry of (data as QuipuMasterEntry[])) {
        if (!entry.interacciones) continue
        for (const inter of entry.interacciones) {
          if (inter.type !== 'declaration') continue
          declaraciones.push({
            master_id: entry.id,
            canal: entry.canal,
            resumen: entry.resumen,
            temas: entry.temas,
            keywords: entry.keywords,
            organizaciones: entry.organizaciones,
            ubicaciones: entry.ubicaciones,
            fecha: entry.fecha,
            ruta: entry.ruta,
            contenido: inter.content,
            stakeholder: inter.stakeholder,
            tema: inter.tema || null,
          })
        }
      }

      // Apply client-side filters
      let filtered = declaraciones
      if (filters.stakeholder) {
        const s = filters.stakeholder.toLowerCase()
        filtered = filtered.filter(d => d.stakeholder.toLowerCase().includes(s))
      }
      if (filters.canal) {
        filtered = filtered.filter(d => d.canal === filters.canal)
      }
      if (filters.tema) {
        const t = filters.tema.toLowerCase()
        filtered = filtered.filter(d => d.temas?.toLowerCase().includes(t))
      }
      if (filters.temaDeclaracion) {
        const t = normalizeKey(filters.temaDeclaracion)
        filtered = filtered.filter(d => d.tema ? normalizeKey(d.tema).includes(t) : false)
      }
      if (filters.organizacion) {
        const o = filters.organizacion.toLowerCase()
        filtered = filtered.filter(d => d.organizaciones?.toLowerCase().includes(o))
      }
      if (filters.producto) {
        const p = filters.producto.toLowerCase()
        filtered = filtered.filter(d => {
          const inKeywords = d.keywords?.toLowerCase().includes(p)
          const inContent = d.contenido.toLowerCase().includes(p)
          return inKeywords || inContent
        })
      }
      if (filters.search) {
        const q = filters.search.toLowerCase()
        filtered = filtered.filter(d =>
          d.contenido.toLowerCase().includes(q) ||
          d.stakeholder.toLowerCase().includes(q)
        )
      }

      const total = filtered.length
      const paginated = filtered.slice(filters.offset, filters.offset + filters.limit)

      return { data: paginated, count: total }
    },
  })
}

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
