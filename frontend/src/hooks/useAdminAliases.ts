import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StakeholderAlias {
    id: number
    alias: string
    alias_normalized: string
    candidato_id: number | null
    confidence: number
    match_method: string
    verified: boolean
    created_at: string
    updated_at: string
    candidato?: {
        id: number
        nombre_completo: string
        cargo_postula: string
    }
}

export type AliasFilter = 'all' | 'unmatched' | 'unverified' | 'low_confidence'

interface UseAliasesParams {
    filter?: AliasFilter
    search?: string
    page?: number
    pageSize?: number
}

export function useAliases({ filter = 'all', search = '', page = 1, pageSize = 20 }: UseAliasesParams = {}) {
    return useQuery({
        queryKey: ['admin-aliases', filter, search, page, pageSize],
        queryFn: async () => {
            let query = supabase
                .from('quipu_stakeholder_aliases')
                .select(`
          *,
          candidato:quipu_candidatos(id, nombre_completo, cargo_postula)
        `, { count: 'exact' })
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1)

            // Apply filters
            if (filter === 'unmatched') {
                query = query.is('candidato_id', null)
            } else if (filter === 'unverified') {
                query = query.eq('verified', false).not('candidato_id', 'is', null)
            } else if (filter === 'low_confidence') {
                query = query.lt('confidence', 0.7).not('candidato_id', 'is', null)
            }

            // Apply search
            if (search) {
                query = query.ilike('alias', `%${search}%`)
            }

            const { data, error, count } = await query

            if (error) throw error

            return {
                aliases: data as StakeholderAlias[],
                total: count ?? 0,
                totalPages: Math.ceil((count ?? 0) / pageSize)
            }
        }
    })
}

export function useUpdateAlias() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            id,
            candidato_id,
            verified
        }: {
            id: number
            candidato_id?: number | null
            verified?: boolean
        }) => {
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            }

            if (candidato_id !== undefined) {
                updates.candidato_id = candidato_id
                updates.match_method = candidato_id ? 'manual' : 'none'
                updates.confidence = candidato_id ? 1.0 : 0
            }

            if (verified !== undefined) {
                updates.verified = verified
            }

            const { data, error } = await supabase
                .from('quipu_stakeholder_aliases')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-aliases'] })
        }
    })
}

export function useSearchCandidatos(search: string) {
    return useQuery({
        queryKey: ['search-candidatos', search],
        queryFn: async () => {
            if (!search || search.length < 2) return []

            const { data, error } = await supabase
                .from('quipu_candidatos')
                .select('id, nombre_completo, cargo_postula, partido:quipu_partidos(nombre_corto)')
                .ilike('nombre_completo', `%${search}%`)
                .limit(10)

            if (error) throw error
            return data
        },
        enabled: search.length >= 2
    })
}

export function useAliasStats() {
    return useQuery({
        queryKey: ['admin-aliases-stats'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('quipu_stakeholder_aliases')
                .select('candidato_id, verified, confidence')

            if (error) throw error

            const total = data.length
            const matched = data.filter(a => a.candidato_id !== null).length
            const verified = data.filter(a => a.verified).length
            const lowConfidence = data.filter(a => a.candidato_id && a.confidence < 0.7).length

            return { total, matched, verified, lowConfidence, unmatched: total - matched }
        }
    })
}
