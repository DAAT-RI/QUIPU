import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizeKey } from '@/lib/utils'
import type { CategoriaPromesa, QuipuMasterEntry, Interaccion } from '@/types/database'

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_categorias_promesas')
        .select('*')
        .order('orden')
      if (error) throw error
      return data as CategoriaPromesa[]
    },
  })
}

export interface CategoriaCounts {
  plans: Record<string, number>
  declarations: Record<string, number>
  /** Mapa de key normalizada -> label original (con tildes) para temas de declaraciones */
  declarationLabels: Record<string, string>
  /** Mapa de key normalizada -> label original (con tildes) para categorías de planes */
  planLabels: Record<string, string>
}

/**
 * Fetches category counts from both plan de gobierno AND declaration temas.
 * Paginates through all plan rows to avoid Supabase's 1000-row default limit.
 * Uses normalizeKey to strip accents for proper matching.
 * Also returns original labels for dynamic category generation.
 */
export function useCategoriaCounts() {
  return useQuery({
    queryKey: ['categoria-counts-combined'],
    queryFn: async () => {
      // Fetch ALL plan categories by paginating (Supabase default limit is 1000)
      const BATCH = 1000
      let allPlanRows: { categoria: string }[] = []
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('quipu_promesas_planes')
          .select('categoria')
          .range(offset, offset + BATCH - 1)
        if (error) throw error
        allPlanRows = allPlanRows.concat(data)
        if (data.length < BATCH) break
        offset += BATCH
      }

      const plans: Record<string, number> = {}
      const planLabels: Record<string, string> = {} // key -> label original
      for (const row of allPlanRows) {
        if (!row.categoria) continue
        const key = normalizeKey(row.categoria)
        plans[key] = (plans[key] || 0) + 1
        // Guardar el label original (primera vez que lo vemos)
        if (!planLabels[key]) {
          planLabels[key] = row.categoria
        }
      }

      // Fetch declaration temas from QUIPU_MASTER interacciones
      const { data: masterData, error: masterError } = await supabase
        .from('QUIPU_MASTER')
        .select('interacciones')
      if (masterError) throw masterError

      const declarations: Record<string, number> = {}
      const declarationLabels: Record<string, string> = {} // key -> label original

      for (const entry of (masterData as Pick<QuipuMasterEntry, 'interacciones'>[])) {
        if (!entry.interacciones) continue
        for (const inter of entry.interacciones as Interaccion[]) {
          if (inter.type !== 'declaration') continue
          if (!inter.tema) continue
          // Dividir temas múltiples separados por ; (ej: "Derechos Humanos; Política")
          const temas = inter.tema.split(';').map(t => t.trim()).filter(Boolean)
          for (const tema of temas) {
            const key = normalizeKey(tema)
            declarations[key] = (declarations[key] || 0) + 1
            // Guardar el label original (primera vez que lo vemos)
            if (!declarationLabels[key]) {
              declarationLabels[key] = tema
            }
          }
        }
      }

      return { plans, declarations, declarationLabels, planLabels } as CategoriaCounts
    },
  })
}

/**
 * Fetches categories only for specific partido IDs.
 * Used in Comparar page to show only relevant categories.
 */
export function useCategoriasByPartidos(partidoIds: number[]) {
  return useQuery({
    queryKey: ['categorias-by-partidos', partidoIds],
    enabled: partidoIds.length > 0,
    queryFn: async () => {
      const plans: Record<string, number> = {}
      const planLabels: Record<string, string> = {}

      // Fetch categories for selected partidos
      const { data, error } = await supabase
        .from('quipu_promesas_planes')
        .select('categoria')
        .in('partido_id', partidoIds)

      if (error) throw error

      for (const row of data) {
        if (!row.categoria) continue
        const key = normalizeKey(row.categoria)
        plans[key] = (plans[key] || 0) + 1
        if (!planLabels[key]) {
          planLabels[key] = row.categoria
        }
      }

      return { plans, planLabels }
    },
  })
}
