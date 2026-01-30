import { useState } from 'react'
import { X, Search, MessageSquareQuote, FileText, GitCompare, ArrowRight, Sparkles } from 'lucide-react'
import { useSearchCandidatosByName } from '@/hooks/useCandidatos'
import { usePromesasByPartido, useSearchPromesasByPartido } from '@/hooks/usePromesas'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BackButton } from '@/components/ui/BackButton'
import { PLAN_CATEGORIES, QUIPU_MASTER_TEMAS } from '@/lib/constants'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import type { CandidatoCompleto } from '@/types/database'

const SOURCE_OPTIONS = [
  { value: '', label: 'Ambos' },
  { value: 'plan', label: 'Plan de Gobierno' },
  { value: 'declaraciones', label: 'Declaraciones' },
]

const CATEGORIA_ELECTORAL_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'PRESIDENCIAL', label: 'Presidencial' },
  { value: 'DIPUTADOS', label: 'Diputados' },
  { value: 'SENADORES DISTRITO ÚNICO', label: 'Senadores (D. Único)' },
  { value: 'SENADORES DISTRITO MÚLTIPLE', label: 'Senadores (D. Múltiple)' },
]

// Combine all temas for dropdown
const TEMA_OPTIONS = [
  ...PLAN_CATEGORIES.map(c => ({ value: c.key, label: c.label })),
  ...QUIPU_MASTER_TEMAS
    .filter(t => !PLAN_CATEGORIES.some(c => c.label.toLowerCase() === t.toLowerCase()))
    .map(t => ({ value: t.toLowerCase(), label: t })),
]

function CandidatoColumn({
  candidato,
  temaSearch,
  categoriaFilter,
  sourceFilter,
}: {
  candidato: CandidatoCompleto
  temaSearch: string
  categoriaFilter: string
  sourceFilter: string
}) {
  const [expandedDecl, setExpandedDecl] = useState(false)
  const [expandedPromesas, setExpandedPromesas] = useState(false)

  const showPlanes = sourceFilter === '' || sourceFilter === 'plan'
  const showDeclaraciones = sourceFilter === '' || sourceFilter === 'declaraciones'

  // If we have tema search, use search hook; otherwise use category filter
  const { data: promesasSearch, isLoading: loadingSearch } = useSearchPromesasByPartido(
    showPlanes && temaSearch.length >= 2 ? (candidato.partido_id ?? undefined) : undefined,
    temaSearch
  )

  const { data: promesasCategoryResult, isLoading: loadingCategory } = usePromesasByPartido(
    showPlanes && !temaSearch ? (candidato.partido_id ?? undefined) : undefined,
    categoriaFilter || undefined
  )

  // Use search results if we have tema search, otherwise use category filter
  const promesasList = temaSearch.length >= 2 ? (promesasSearch ?? []) : (promesasCategoryResult?.data ?? [])
  const promesasCount = temaSearch.length >= 2 ? promesasList.length : (promesasCategoryResult?.count ?? 0)
  const loadingPromesas = temaSearch.length >= 2 ? loadingSearch : loadingCategory

  const apellido = candidato.apellido_paterno ?? candidato.nombre_completo?.split(' ').pop() ?? ''

  // Search in declaraciones by tema/search content
  const { data: declResult, isLoading: loadingDecl } = useDeclaraciones({
    stakeholder: showDeclaraciones ? apellido : undefined,
    tipo: 'declaration', // Only declarations, not mentions
    // Search in contenido when tema search is active
    search: showDeclaraciones && temaSearch.length >= 2 ? temaSearch : undefined,
    offset: 0,
    limit: 50,
  })

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

      {/* Stats - Declaraciones primero (eje principal) */}
      <div className="p-3 border-b flex justify-around text-center text-xs">
        {showDeclaraciones && (
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <MessageSquareQuote size={12} />
              <span>En Medios y RRSS</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatNumber(declCount)}</p>
          </div>
        )}
        {showPlanes && (
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <FileText size={12} />
              <span>En Plan</span>
            </div>
            <p className="font-bold text-sm tabular-nums">{formatNumber(promesasCount)}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-4 max-h-[50vh] overflow-y-auto">
        {(loadingPromesas || loadingDecl) && <LoadingSpinner />}

        {/* Declaraciones section - PRIMERO (eje principal) */}
        {showDeclaraciones && !loadingDecl && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <MessageSquareQuote size={14} className="text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                En Medios y RRSS
              </p>
            </div>
            {declaraciones.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-lg bg-muted/20">
                {temaSearch ? `Sin declaraciones sobre "${temaSearch}"` : 'Sin declaraciones encontradas'}
              </p>
            ) : (
              (expandedDecl ? declaraciones : declaraciones.slice(0, 5)).map((d, i) => (
                <div
                  key={`${d.master_id}-${i}`}
                  className="rounded-lg border border-amber-200/50 dark:border-amber-800/30 p-2.5 text-xs leading-relaxed bg-amber-50/30 dark:bg-amber-950/20"
                >
                  <blockquote className="italic border-l-2 border-amber-500/50 pl-2">
                    «{d.contenido}»
                  </blockquote>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.tema_interaccion && (
                      <span className="inline-block rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-medium">
                        {d.tema_interaccion}
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
              ))
            )}
            {declaraciones.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandedDecl(!expandedDecl)}
                className="text-[10px] text-primary hover:underline text-center w-full py-1"
              >
                {expandedDecl ? 'Ver menos' : `+${declaraciones.length - 5} más`}
              </button>
            )}
          </div>
        )}

        {/* Plan de Gobierno section - SEGUNDO */}
        {showPlanes && !loadingPromesas && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                En su Plan de Gobierno
              </p>
            </div>
            {promesasList.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-lg bg-muted/20">
                {temaSearch ? `Sin propuestas sobre "${temaSearch}"` : 'Sin propuestas en esta categoría'}
              </p>
            ) : (
              (expandedPromesas ? promesasList : promesasList.slice(0, 5)).map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border p-2.5 text-xs leading-relaxed bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-800/30"
                >
                  <p>{p.resumen ?? p.texto_original}</p>
                  <div className="mt-1.5">
                    <CategoryBadge categoria={p.categoria} />
                  </div>
                </div>
              ))
            )}
            {promesasList.length > 5 && (
              <button
                type="button"
                onClick={() => setExpandedPromesas(!expandedPromesas)}
                className="text-[10px] text-primary hover:underline text-center w-full py-1"
              >
                {expandedPromesas ? 'Ver menos' : `+${promesasList.length - 5} más`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Comparar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidatos, setSelectedCandidatos] = useState<CandidatoCompleto[]>([])
  const [temaSearch, setTemaSearch] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [categoriaElectoral, setCategoriaElectoral] = useState('')

  const { data: searchResults, isLoading: searchLoading } = useSearchCandidatosByName(searchQuery)

  // Filter out already selected candidates and restrict to same tipo_eleccion
  const selectedIds = new Set(selectedCandidatos.map((c) => c.id))
  const firstTipo = selectedCandidatos[0]?.tipo_eleccion
  const filteredResults = (searchResults ?? []).filter((c) => {
    if (selectedIds.has(c.id)) return false
    // If we have selections, only show candidates with same tipo_eleccion
    if (firstTipo && c.tipo_eleccion !== firstTipo) return false
    // Filter by categoria electoral dropdown
    if (categoriaElectoral && c.tipo_eleccion !== categoriaElectoral) return false
    return true
  })

  function addCandidato(candidato: CandidatoCompleto) {
    if (selectedCandidatos.length >= 4) return
    if (selectedIds.has(candidato.id)) return
    // Enforce same category restriction
    if (firstTipo && candidato.tipo_eleccion !== firstTipo) return
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
      {/* Back button */}
      <BackButton fallback="/" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <GitCompare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comparar Posiciones</h1>
          <p className="text-sm text-muted-foreground">
            Plan de Gobierno vs Declaraciones en Medios — ¿Coinciden?
          </p>
        </div>
      </div>

      {/* Tema Search */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">¿Sobre qué tema quieres comparar?</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={temaSearch}
            onChange={setTemaSearch}
            placeholder="Ej: minería, impuestos, educación, salud..."
            className="flex-1"
          />
          <FilterSelect
            value={categoriaFilter}
            onChange={(v) => {
              setCategoriaFilter(v)
              if (v) setTemaSearch('') // Clear search when selecting category
            }}
            options={TEMA_OPTIONS}
            placeholder="O selecciona un tema"
          />
        </div>
        {(temaSearch || categoriaFilter) && (
          <p className="text-xs text-muted-foreground mt-2">
            {temaSearch ? (
              <>Buscando: <span className="font-medium text-primary">"{temaSearch}"</span> en planes y declaraciones</>
            ) : (
              <>Filtrando por: <span className="font-medium text-primary">{TEMA_OPTIONS.find(t => t.value === categoriaFilter)?.label || categoriaFilter}</span></>
            )}
          </p>
        )}
      </div>

      {/* Candidate search */}
      <div className="rounded-xl border bg-card p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span>Paso 1: Selecciona candidatos para comparar</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar por nombre..."
                className="w-full"
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
                <div className="divide-y" role="listbox" aria-label="Resultados de busqueda">
                  {filteredResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={false}
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
            <FilterSelect
              value={categoriaElectoral}
              onChange={(v) => {
                setCategoriaElectoral(v)
                // Clear selected candidates when changing category filter
                if (v && selectedCandidatos.length > 0 && selectedCandidatos[0]?.tipo_eleccion !== v) {
                  setSelectedCandidatos([])
                }
              }}
              options={CATEGORIA_ELECTORAL_OPTIONS}
              placeholder="Categoría electoral"
              disabled={selectedCandidatos.length > 0}
            />
          </div>
          {selectedCandidatos.length > 0 && categoriaElectoral && (
            <p className="text-xs text-muted-foreground">
              Filtro bloqueado mientras hay candidatos seleccionados
            </p>
          )}
        </div>

        {/* Selected candidates as pills */}
        {selectedCandidatos.length > 0 && (
          <div className="space-y-2 mt-3">
            {/* Category indicator */}
            {firstTipo && (
              <p className="text-xs text-muted-foreground">
                Comparando candidatos: <span className="font-medium text-foreground">{firstTipo}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>

      {/* Source Filter */}
      {selectedCandidatos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <FilterSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            options={SOURCE_OPTIONS}
            placeholder="Mostrar: Ambos"
          />
          {(temaSearch || categoriaFilter) && (
            <button
              type="button"
              onClick={() => { setTemaSearch(''); setCategoriaFilter('') }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpiar filtro de tema
            </button>
          )}
        </div>
      )}

      {/* Prompt when no candidates selected */}
      {selectedCandidatos.length === 0 && (
        <EmptyState
          message="Usa el buscador de arriba para seleccionar hasta 4 candidatos y comparar sus posiciones"
          icon={GitCompare}
        />
      )}

      {/* Comparison grid */}
      {selectedCandidatos.length > 0 && (
        <div className={`grid ${gridCols} gap-4`}>
          {selectedCandidatos.map((c) => (
            <CandidatoColumn
              key={c.id}
              candidato={c}
              temaSearch={temaSearch}
              categoriaFilter={categoriaFilter}
              sourceFilter={sourceFilter}
            />
          ))}
        </div>
      )}
    </div>
  )
}
