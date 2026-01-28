import { useState } from 'react'
import { X, Search, MessageSquareQuote, FileText, GitCompare, ArrowRight } from 'lucide-react'
import { useSearchCandidatosByName } from '@/hooks/useCandidatos'
import { usePromesasByPartido } from '@/hooks/usePromesas'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PLAN_CATEGORIES } from '@/lib/constants'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import type { CandidatoCompleto } from '@/types/database'

const SOURCE_OPTIONS = [
  { value: '', label: 'Ambos' },
  { value: 'plan', label: 'Plan de Gobierno' },
  { value: 'declaraciones', label: 'Declaraciones' },
]

function CandidatoColumn({
  candidato,
  categoriaFilter,
  sourceFilter,
}: {
  candidato: CandidatoCompleto
  categoriaFilter: string
  sourceFilter: string
}) {
  const showPlanes = sourceFilter === '' || sourceFilter === 'plan'
  const showDeclaraciones = sourceFilter === '' || sourceFilter === 'declaraciones'

  const { data: promesas, isLoading: loadingPromesas } = usePromesasByPartido(
    showPlanes ? (candidato.partido_id ?? undefined) : undefined,
    categoriaFilter || undefined
  )

  const apellido = candidato.apellido_paterno ?? candidato.nombre_completo?.split(' ').pop() ?? ''
  const { data: declResult, isLoading: loadingDecl } = useDeclaraciones({
    stakeholder: showDeclaraciones ? apellido : undefined,
    offset: 0,
    limit: 50,
  })

  const promesasList = promesas ?? []
  const declaraciones = declResult?.data ?? []
  const declCount = declResult?.count ?? 0

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Candidate Header */}
      <div className="p-5 border-b bg-muted/30 flex flex-col items-center text-center">
        <CandidatoAvatar
          nombre={candidato.nombre_completo || ''}
          fotoUrl={candidato.foto_url}
          size="xl"
        />
        <h3 className="mt-3 font-bold text-sm leading-tight">
          {candidato.nombre_completo}
        </h3>
        {candidato.partido_nombre && (
          <span className="mt-1.5 inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
            {candidato.partido_nombre}
          </span>
        )}
        {candidato.cargo_postula && (
          <p className="mt-1 text-xs text-muted-foreground">{candidato.cargo_postula}</p>
        )}
      </div>

      {/* Stats */}
      <div className="p-3 border-b flex justify-around text-center text-xs">
        {showPlanes && (
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <FileText size={12} />
              <span>Propuestas</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatNumber(promesasList.length)}</p>
          </div>
        )}
        {showDeclaraciones && (
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <MessageSquareQuote size={12} />
              <span>Declaraciones</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatNumber(declCount)}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 max-h-[50vh] overflow-y-auto">
        {(loadingPromesas || loadingDecl) && <LoadingSpinner />}

        {/* Plan de Gobierno section */}
        {showPlanes && !loadingPromesas && promesasList.length > 0 && (
          <div className="space-y-2">
            {sourceFilter === '' && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Plan de Gobierno
              </p>
            )}
            {promesasList.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border p-2.5 text-xs leading-relaxed"
              >
                <p>{p.resumen ?? p.texto_original}</p>
                <div className="mt-1.5">
                  <CategoryBadge categoria={p.categoria} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Declaraciones section */}
        {showDeclaraciones && !loadingDecl && declaraciones.length > 0 && (
          <div className="space-y-2">
            {sourceFilter === '' && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                En Medios
              </p>
            )}
            {declaraciones.map((d, i) => (
              <div
                key={`${d.master_id}-${i}`}
                className="rounded-lg border border-primary/20 p-2.5 text-xs leading-relaxed"
              >
                <blockquote className="italic text-muted-foreground border-l-2 border-primary pl-2">
                  {d.contenido}
                </blockquote>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {d.tema && (
                    <span className="inline-block rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                      {d.tema}
                    </span>
                  )}
                  {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {d.canal}
                    </span>
                  )}
                  {d.fecha && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(d.fecha)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingPromesas && !loadingDecl && promesasList.length === 0 && declaraciones.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-6 text-center">
            Sin datos disponibles
          </p>
        )}
      </div>
    </div>
  )
}

export function Comparar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidatos, setSelectedCandidatos] = useState<CandidatoCompleto[]>([])
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const { data: searchResults, isLoading: searchLoading } = useSearchCandidatosByName(searchQuery)

  const categoriaOptions = PLAN_CATEGORIES.map((c) => ({
    value: c.key,
    label: c.label,
  }))

  // Filter out already selected candidates from search results
  const selectedIds = new Set(selectedCandidatos.map((c) => c.id))
  const filteredResults = (searchResults ?? []).filter((c) => !selectedIds.has(c.id))

  function addCandidato(candidato: CandidatoCompleto) {
    if (selectedCandidatos.length >= 4) return
    if (selectedIds.has(candidato.id)) return
    setSelectedCandidatos((prev) => [...prev, candidato])
    setSearchQuery('')
  }

  function removeCandidato(id: number) {
    setSelectedCandidatos((prev) => prev.filter((c) => c.id !== id))
  }

  const gridCols =
    selectedCandidatos.length === 1
      ? 'grid-cols-1 max-w-md'
      : selectedCandidatos.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : selectedCandidatos.length === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <GitCompare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparar Candidatos</h1>
          <p className="text-sm text-muted-foreground">
            Analisis detallado de propuestas y declaraciones
          </p>
        </div>
      </div>

      {/* Candidate search */}
      <div className="rounded-xl border bg-card p-4">
        <div className="relative">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar candidato por nombre..."
            className="max-w-md"
          />
          {/* Search dropdown */}
          {searchQuery.length >= 2 && (
            <div className="absolute z-20 mt-1 w-full max-w-md rounded-xl border bg-card shadow-lg max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4">
                  <LoadingSpinner />
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No se encontraron candidatos
                </div>
              ) : (
                <div className="divide-y">
                  {filteredResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addCandidato(c)}
                      disabled={selectedCandidatos.length >= 4}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.partido_nombre} {c.cargo_postula ? `\u2014 ${c.cargo_postula}` : ''}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected candidates as pills */}
        {selectedCandidatos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedCandidatos.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm"
              >
                <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="sm" className="h-5 w-5 text-[8px]" />
                {c.nombre_completo}
                <button
                  onClick={() => removeCandidato(c.id)}
                  className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  aria-label={`Remover ${c.nombre_completo}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {selectedCandidatos.length >= 4 && (
              <span className="text-xs text-muted-foreground self-center">
                Maximo 4 candidatos
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FilterSelect
          value={sourceFilter}
          onChange={setSourceFilter}
          options={SOURCE_OPTIONS}
          placeholder="Fuente"
        />
        <FilterSelect
          value={categoriaFilter}
          onChange={setCategoriaFilter}
          options={categoriaOptions}
          placeholder="Todas las categorias"
        />
      </div>

      {/* Prompt when no candidates selected */}
      {selectedCandidatos.length === 0 && (
        <EmptyState
          message="Busca y selecciona candidatos para comparar sus propuestas y declaraciones"
          icon={Search}
        />
      )}

      {/* Comparison grid */}
      {selectedCandidatos.length > 0 && (
        <div className={`grid ${gridCols} gap-4`}>
          {selectedCandidatos.map((c) => (
            <CandidatoColumn
              key={c.id}
              candidato={c}
              categoriaFilter={categoriaFilter}
              sourceFilter={sourceFilter}
            />
          ))}
        </div>
      )}
    </div>
  )
}
