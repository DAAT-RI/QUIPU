import { useState } from 'react'
import { Search, Check, X, Link2, AlertTriangle } from 'lucide-react'
import { useAliases, useUpdateAlias, useSearchCandidatos, useAliasStats, type AliasFilter } from '@/hooks/useAdminAliases'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS: { value: AliasFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'unmatched', label: 'Sin match' },
    { value: 'unverified', label: 'Sin verificar' },
    { value: 'low_confidence', label: 'Baja confianza' },
]

export default function StakeholderAliases() {
    const [filter, setFilter] = useState<AliasFilter>('all')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [candidatoSearch, setCandidatoSearch] = useState('')

    const { data, isLoading } = useAliases({ filter, search, page })
    const { data: stats } = useAliasStats()
    const { data: candidatoResults } = useSearchCandidatos(candidatoSearch)
    const updateAlias = useUpdateAlias()

    const handleVerify = (id: number) => {
        updateAlias.mutate({ id, verified: true })
    }

    const handleUnlink = (id: number) => {
        updateAlias.mutate({ id, candidato_id: null })
    }

    const handleAssign = (aliasId: number, candidatoId: number) => {
        updateAlias.mutate({ id: aliasId, candidato_id: candidatoId, verified: true })
        setEditingId(null)
        setCandidatoSearch('')
    }

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'text-green-600 bg-green-50'
        if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50'
        return 'text-red-600 bg-red-50'
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">Stakeholder Aliases</h1>
                <p className="text-muted-foreground">
                    Mapeo de nombres en medios a candidatos en el sistema
                </p>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total aliases</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
                        <div className="text-sm text-muted-foreground">Con match</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-600">{stats.unmatched}</div>
                        <div className="text-sm text-muted-foreground">Sin match</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">{stats.verified}</div>
                        <div className="text-sm text-muted-foreground">Verificados</div>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">{stats.lowConfidence}</div>
                        <div className="text-sm text-muted-foreground">Baja confianza</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar alias..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                    />
                </div>
                <div className="flex gap-2">
                    {FILTER_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { setFilter(opt.value); setPage(1) }}
                            className={cn(
                                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                filter === opt.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-lg">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Alias</th>
                            <th className="text-left px-4 py-3 font-medium">Candidato</th>
                            <th className="text-center px-4 py-3 font-medium">Confianza</th>
                            <th className="text-center px-4 py-3 font-medium">Método</th>
                            <th className="text-center px-4 py-3 font-medium">Estado</th>
                            <th className="text-right px-4 py-3 font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    Cargando...
                                </td>
                            </tr>
                        ) : data?.aliases.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                    No se encontraron aliases
                                </td>
                            </tr>
                        ) : (
                            data?.aliases.map((alias) => (
                                <tr key={alias.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium">{alias.alias}</div>
                                        <div className="text-xs text-muted-foreground">{alias.alias_normalized}</div>
                                    </td>
                                    <td className="px-4 py-3 relative overflow-visible">
                                        {editingId === alias.id ? (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar candidato..."
                                                    value={candidatoSearch}
                                                    onChange={(e) => setCandidatoSearch(e.target.value)}
                                                    className="w-full px-3 py-1 border rounded text-sm"
                                                    autoFocus
                                                />
                                                {candidatoResults && candidatoResults.length > 0 && (
                                                    <div className="absolute z-50 w-72 mt-1 bg-card border rounded-lg shadow-xl max-h-64 overflow-auto left-0 top-full">
                                                        {candidatoResults.map((c: any) => (
                                                            <button
                                                                key={c.id}
                                                                onClick={() => handleAssign(alias.id, c.id)}
                                                                className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                                                            >
                                                                <div className="font-medium">{c.nombre_completo}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {c.cargo_postula} • {c.partido?.nombre_corto}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : alias.candidato ? (
                                            <div>
                                                <div className="font-medium text-sm">{alias.candidato.nombre_completo}</div>
                                                <div className="text-xs text-muted-foreground">{alias.candidato.cargo_postula}</div>
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 text-sm">
                                                <X className="h-4 w-4" />
                                                Sin match
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn(
                                            'px-2 py-1 rounded-full text-xs font-medium',
                                            getConfidenceColor(alias.confidence)
                                        )}>
                                            {Math.round(alias.confidence * 100)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-xs text-muted-foreground">
                                            {alias.match_method}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {alias.verified ? (
                                            <span className="flex items-center justify-center gap-1 text-green-600">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        ) : alias.candidato_id ? (
                                            <span className="flex items-center justify-center gap-1 text-yellow-600">
                                                <AlertTriangle className="h-4 w-4" />
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {alias.candidato_id && !alias.verified && (
                                                <button
                                                    onClick={() => handleVerify(alias.id)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                    title="Verificar"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                            {alias.candidato_id && (
                                                <button
                                                    onClick={() => handleUnlink(alias.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                    title="Desvincular"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingId(editingId === alias.id ? null : alias.id)
                                                    setCandidatoSearch('')
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Asignar candidato"
                                            >
                                                {editingId === alias.id ? <X className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                        Mostrando {((page - 1) * 20) + 1}-{Math.min(page * 20, data.total)} de {data.total}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                            disabled={page === data.totalPages}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
