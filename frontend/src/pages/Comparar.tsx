import { useState, useMemo } from 'react'
import { X, Plus, MessageSquareQuote, FileText, TrendingUp, Users, ChevronDown } from 'lucide-react'
import { useSearchCandidatosByName, useCandidatosByCargo } from '@/hooks/useCandidatos'
import { usePromesasByPartido } from '@/hooks/usePromesas'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BackButton } from '@/components/ui/BackButton'
import { useCategoriasByPartidos } from '@/hooks/useCategorias'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import type { CandidatoCompleto } from '@/types/database'

const CARGO_OPTIONS = [
  { value: 'PRESIDENTE DE LA REPÚBLICA', label: 'Presidente' },
  { value: 'PRIMER VICEPRESIDENTE DE LA REPÚBLICA', label: '1er Vicepresidente' },
  { value: 'SEGUNDO VICEPRESIDENTE DE LA REPÚBLICA', label: '2do Vicepresidente' },
  { value: 'DIPUTADO', label: 'Diputados' },
  { value: 'SENADOR', label: 'Senadores' },
  { value: 'REPRESENTANTE ANTE EL PARLAMENTO ANDINO', label: 'Parlamento Andino' },
]


function CandidatoColumn({
  candidato,
  categoriaFilter,
  textFilter,
  onRemove,
}: {
  candidato: CandidatoCompleto
  categoriaFilter: string
  textFilter: string
  onRemove: () => void
}) {
  const [expandedDecl, setExpandedDecl] = useState(false)
  const [expandedPromesas, setExpandedPromesas] = useState(false)

  const { data: promesasCategoryResult, isLoading: loadingPromesas } = usePromesasByPartido(
    candidato.partido_id ?? undefined,
    categoriaFilter || undefined
  )

  const promesasListRaw = promesasCategoryResult?.data ?? []
  const promesasCount = promesasCategoryResult?.count ?? 0

  const apellido = candidato.apellido_paterno ?? candidato.nombre_completo?.split(' ').pop() ?? ''

  const { data: declResult, isLoading: loadingDecl } = useDeclaraciones({
    stakeholder: apellido,
    tipo: 'declaration',
    temaDeclaracion: categoriaFilter || undefined,
    offset: 0,
    limit: 50,
  })

  const declaracionesRaw = declResult?.data ?? []
  const declCount = declResult?.count ?? 0

  // Apply text filter
  const textLower = textFilter.toLowerCase()
  const declaraciones = textFilter
    ? declaracionesRaw.filter(d => d.contenido?.toLowerCase().includes(textLower) || d.tema_interaccion?.toLowerCase().includes(textLower))
    : declaracionesRaw
  const promesasList = textFilter
    ? promesasListRaw.filter(p => p.promesa?.toLowerCase().includes(textLower) || p.categoria?.toLowerCase().includes(textLower))
    : promesasListRaw

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Candidate Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <CandidatoAvatar
          nombre={candidato.nombre_completo || ''}
          fotoUrl={candidato.foto_url}
          size="lg"
          className="ring-2 ring-primary"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground truncate">{candidato.nombre_completo}</h4>
          <p className="text-sm text-muted-foreground truncate">{candidato.partido_nombre}</p>
          {candidato.cargo_postula && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
              {candidato.cargo_postula}
            </span>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={`Remover ${candidato.nombre_completo}`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <div className="font-bold text-foreground">{formatNumber(declCount)}</div>
          <div className="text-xs text-muted-foreground">Declaraciones</div>
        </div>
        <div className="text-center p-2 bg-primary/5 rounded-lg">
          <div className="font-bold text-primary">{formatNumber(promesasCount)}</div>
          <div className="text-xs text-muted-foreground">Propuestas</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {(loadingPromesas || loadingDecl) && <LoadingSpinner />}

        {/* Declaraciones - En Medios */}
        {!loadingDecl && (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquareQuote size={14} className="text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase">En Medios</span>
            </div>
            {declaraciones.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">
                {textFilter
                  ? `Sin declaraciones con la palabra "${textFilter}"`
                  : categoriaFilter
                    ? `Sin declaraciones sobre "${categoriaFilter}"`
                    : 'Sin declaraciones'}
              </p>
            ) : (
              <>
                {(expandedDecl ? declaraciones : declaraciones.slice(0, 3)).map((d, i) => (
                  <div
                    key={`${d.master_id}-${i}`}
                    className="p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {d.tema_interaccion && d.tema_interaccion.split(/[;,]/).map(t => t.trim()).filter(Boolean).map((tema) => (
                        <span key={tema} className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                          {tema}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                      {d.contenido}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                        <span>{d.canal}</span>
                      )}
                      {d.fecha && <span>{formatDate(d.fecha)}</span>}
                    </div>
                  </div>
                ))}
                {declaraciones.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setExpandedDecl(!expandedDecl)}
                    className="w-full text-center text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 py-2 border-t border-dashed border-amber-200 dark:border-amber-800 transition-colors"
                  >
                    {expandedDecl ? '▲ Ver menos' : `▼ +${declaraciones.length - 3} declaraciones más`}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Propuestas */}
        {!loadingPromesas && promesasList.length > 0 && (
          <>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={14} className="text-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Plan de Gobierno</span>
              </div>
            </div>
            {(expandedPromesas ? promesasList : promesasList.slice(0, 2)).map((p) => (
              <div
                key={p.id}
                className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200/50 dark:border-indigo-800/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <CategoryBadge categoria={p.categoria} />
                </div>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {p.resumen ?? p.texto_original}
                </p>
              </div>
            ))}
            {promesasList.length > 2 && (
              <button
                type="button"
                onClick={() => setExpandedPromesas(!expandedPromesas)}
                className="w-full text-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2 border-t border-dashed border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                {expandedPromesas ? '▲ Ver menos' : `▼ +${promesasList.length - 2} propuestas más`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function Comparar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCandidatos, setSelectedCandidatos] = useState<CandidatoCompleto[]>([])
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [cargoFilter, setCargoFilter] = useState('')
  const [showAllCandidatos, setShowAllCandidatos] = useState(false)
  const [textFilter, setTextFilter] = useState('')
  const [selectorHidden, setSelectorHidden] = useState(false)

  // Get partido IDs from selected candidates
  const selectedPartidoIds = useMemo(() =>
    selectedCandidatos.map(c => c.partido_id).filter((id): id is number => id != null),
    [selectedCandidatos]
  )

  // Get stakeholder names (apellidos) from selected candidates
  const selectedStakeholders = useMemo(() =>
    selectedCandidatos.map(c => c.apellido_paterno ?? c.nombre_completo?.split(' ').pop() ?? '').filter(Boolean),
    [selectedCandidatos]
  )

  // Get category counts for selected partidos AND declaration temas for selected stakeholders
  const { data: categoriaCounts } = useCategoriasByPartidos(selectedPartidoIds, selectedStakeholders)

  // Generate tema options dynamically from both plans AND declarations
  const temaOptions = useMemo(() => {
    const options = [{ value: '', label: 'Todas las categorías' }]
    if (categoriaCounts) {
      // Combine all categories/temas into a single sorted list
      const allEntries: { key: string; label: string; count: number; source: 'plan' | 'declaracion' }[] = []

      // Add plan categories
      for (const [key, count] of Object.entries(categoriaCounts.plans)) {
        if (count > 0) {
          allEntries.push({
            key,
            label: categoriaCounts.planLabels[key] || key,
            count,
            source: 'plan',
          })
        }
      }

      // Add declaration temas (if not already in plans)
      const planKeys = new Set(Object.keys(categoriaCounts.plans))
      for (const [key, count] of Object.entries(categoriaCounts.declarations || {})) {
        if (count > 0 && !planKeys.has(key)) {
          allEntries.push({
            key,
            label: categoriaCounts.declarationLabels?.[key] || key,
            count,
            source: 'declaracion',
          })
        }
      }

      // Sort alphabetically by label
      allEntries.sort((a, b) => a.label.localeCompare(b.label, 'es'))

      for (const entry of allEntries) {
        options.push({ value: entry.label, label: entry.label })
      }
    }
    return options
  }, [categoriaCounts])

  // Get candidates by selected cargo (only fetch when cargo is selected)
  const { data: candidatosData, isLoading: loadingCandidatos } = useCandidatosByCargo(
    cargoFilter || '',
    showAllCandidatos ? 100 : 11
  )
  const candidatos = candidatosData?.data ?? []
  const totalCandidatos = candidatosData?.count ?? 0

  const { data: searchResults, isLoading: searchLoading } = useSearchCandidatosByName(searchQuery)

  // Filter out already selected candidates
  const selectedIds = new Set(selectedCandidatos.map((c) => c.id))
  const firstTipo = selectedCandidatos[0]?.tipo_eleccion

  const filteredResults = (searchResults ?? []).filter((c) => {
    if (selectedIds.has(c.id)) return false
    if (firstTipo && c.tipo_eleccion !== firstTipo) return false
    return true
  })

  const availableCandidatos = useMemo(() => {
    return candidatos.filter(c => !selectedIds.has(c.id))
  }, [candidatos, selectedIds])

  function addCandidato(candidato: CandidatoCompleto) {
    if (selectedCandidatos.length >= 4) return
    if (selectedIds.has(candidato.id)) return
    if (firstTipo && candidato.tipo_eleccion !== firstTipo) return
    setSelectedCandidatos((prev) => [...prev, candidato])
    setSearchQuery('')
  }

  function removeCandidato(id: number) {
    setSelectedCandidatos((prev) => prev.filter((c) => c.id !== id))
  }

  const gridCols =
    selectedCandidatos.length === 1
      ? 'lg:grid-cols-1 max-w-xl mx-auto'
      : selectedCandidatos.length === 2
        ? 'lg:grid-cols-2'
        : selectedCandidatos.length === 3
          ? 'lg:grid-cols-3'
          : 'lg:grid-cols-4'

  return (
    <div className="min-h-screen -m-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-12 px-8">
        <div className="max-w-6xl mx-auto">
          <BackButton fallback="/" className="text-white/80 hover:text-white mb-6" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Comparar Candidatos</h1>
          <p className="text-lg text-white/90 mb-4">
            Compara las propuestas y declaraciones de hasta 4 candidatos
          </p>
          <div className="flex items-center gap-2 text-white/80">
            <TrendingUp size={20} />
            <span>Análisis comparativo en tiempo real</span>
          </div>
        </div>
      </section>

      {/* Candidate Selection Section */}
      <section className="bg-card border-b py-8 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Seleccionar Candidatos</h2>
            <p className="text-muted-foreground">
              Elige hasta 4 candidatos para comparar ({selectedCandidatos.length}/4 seleccionados)
            </p>
          </div>

          {/* Selected candidates chips */}
          {selectedCandidatos.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {selectedCandidatos.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-full"
                >
                  <CandidatoAvatar
                    nombre={c.nombre_completo || ''}
                    fotoUrl={c.foto_url}
                    size="sm"
                    className="h-6 w-6"
                  />
                  <span className="font-medium text-sm">{c.nombre_completo}</span>
                  <button
                    onClick={() => removeCandidato(c.id)}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    aria-label={`Remover ${c.nombre_completo}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {/* Comparar / Agregar button */}
              {selectedCandidatos.length >= 2 && (
                <button
                  onClick={() => setSelectorHidden(!selectorHidden)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    selectorHidden
                      ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  {selectorHidden ? (
                    <>
                      <Plus size={16} />
                      Agregar
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} />
                      Comparar
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Selection controls - only show if less than 4 selected and not hidden */}
          {selectedCandidatos.length < 4 && !selectorHidden && (
            <>
              {/* Step 1: Cargo selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  1. Elige el cargo
                </label>
                <FilterSelect
                  value={cargoFilter}
                  onChange={(v) => {
                    setCargoFilter(v)
                    setShowAllCandidatos(false)
                  }}
                  options={CARGO_OPTIONS}
                  placeholder="Elige el cargo"
                  className="max-w-xs"
                />
              </div>

              {/* Step 2: Search by name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  2. Buscar por nombre
                </label>
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar candidato por nombre..."
                  className="max-w-md"
                />
                {searchQuery.length >= 2 && (
                  <div className="mt-2 rounded-xl border bg-card shadow-lg max-h-60 overflow-y-auto max-w-md">
                    {searchLoading ? (
                      <div className="p-4"><LoadingSpinner /></div>
                    ) : filteredResults.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No se encontraron candidatos</div>
                    ) : (
                      <div className="divide-y">
                        {filteredResults.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => addCandidato(c)}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                          >
                            <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                              <p className="text-xs text-muted-foreground">{c.partido_nombre}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Candidate grid - only show when cargo is selected */}
              {searchQuery.length < 2 && cargoFilter && (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    O selecciona de la lista ({CARGO_OPTIONS.find(o => o.value === cargoFilter)?.label}):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {loadingCandidatos ? (
                      <div className="col-span-full"><LoadingSpinner /></div>
                    ) : (
                      <>
                        {availableCandidatos.slice(0, showAllCandidatos ? 100 : 11).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => addCandidato(c)}
                            disabled={selectedCandidatos.length >= 4}
                            className="p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
                          >
                            <CandidatoAvatar
                              nombre={c.nombre_completo || ''}
                              fotoUrl={c.foto_url}
                              size="lg"
                              className="mx-auto mb-2"
                            />
                            <div className="text-sm font-medium text-foreground truncate">{c.nombre_completo}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.partido_nombre}</div>
                          </button>
                        ))}
                        {/* Ver más button */}
                        {!showAllCandidatos && totalCandidatos > 11 && (
                          <button
                            onClick={() => setShowAllCandidatos(true)}
                            className="p-3 border-2 border-dashed rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-center flex flex-col items-center justify-center"
                          >
                            <Plus className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-sm text-muted-foreground">Ver más</span>
                            <span className="text-xs text-muted-foreground">+{totalCandidatos - 11}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Filter bar */}
      {selectedCandidatos.length > 0 && (
        <section className="bg-muted/30 border-b py-4 px-8">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-sm">Filtrar por categoría:</span>
              <FilterSelect
                value={categoriaFilter}
                onChange={setCategoriaFilter}
                options={temaOptions}
                placeholder="Todas las categorías"
                className="min-w-[200px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-sm">Buscar:</span>
              <SearchInput
                value={textFilter}
                onChange={setTextFilter}
                placeholder="Buscar en declaraciones..."
                className="min-w-[250px]"
              />
            </div>
          </div>
        </section>
      )}

      {/* Comparison Section */}
      <section className="py-8 px-8">
        <div className="max-w-6xl mx-auto">
          {selectedCandidatos.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Selecciona candidatos para comparar</h3>
              <p className="text-muted-foreground">
                Elige hasta 4 candidatos de la lista de arriba para ver sus propuestas y declaraciones
              </p>
            </div>
          ) : (
            <>
              {/* Section header */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 rounded-xl p-6 border mb-6">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  Comparación de Propuestas y Declaraciones
                </h3>
                <p className="text-muted-foreground">
                  Análisis detallado de las declaraciones y propuestas de los candidatos seleccionados
                </p>
              </div>

              {/* Comparison grid */}
              <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
                {selectedCandidatos.map((c) => (
                  <CandidatoColumn
                    key={c.id}
                    candidato={c}
                    categoriaFilter={categoriaFilter}
                    textFilter={textFilter}
                    onRemove={() => removeCandidato(c.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
