import { useState } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSearchPromesas } from '@/hooks/useSearch'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { usePartidos } from '@/hooks/usePartidos'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { PLAN_CATEGORIES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

const SOURCE_OPTIONS = [
  { value: '', label: 'Ambos' },
  { value: 'plan', label: 'Plan de Gobierno' },
  { value: 'declaraciones', label: 'Declaraciones' },
]

export function BuscarPromesas() {
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const { data: partidos } = usePartidos()

  const {
    data: promesasResult,
    isLoading: loadingPromesas,
  } = useSearchPromesas(query, categoria || undefined, partidoId ? Number(partidoId) : undefined)

  const {
    data: declaracionesResult,
    isLoading: loadingDeclaraciones,
  } = useDeclaraciones({ search: query.length >= 3 ? query : undefined, offset: 0, limit: 10 })

  const categoriaOptions = PLAN_CATEGORIES.map((c) => ({
    value: c.key,
    label: c.label,
  }))

  const partidoOptions = (partidos ?? []).map((p) => ({
    value: String(p.id),
    label: p.nombre_oficial,
  }))

  const hasQuery = query.length >= 3
  const promesas = promesasResult?.data ?? []
  const promesasCount = promesasResult?.count ?? 0
  const declaraciones = declaracionesResult?.data ?? []
  const declaracionesCount = declaracionesResult?.count ?? 0
  const isLoading = loadingPromesas || loadingDeclaraciones

  const showPlanes = sourceFilter === '' || sourceFilter === 'plan'
  const showDeclaraciones = sourceFilter === '' || sourceFilter === 'declaraciones'

  // Hero layout when no query entered
  if (!hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Buscar en Planes</h1>
        <p className="text-muted-foreground mb-8">
          Busca en 22,000+ propuestas de planes de gobierno
        </p>
        <div className="w-full max-w-2xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Escribe al menos 3 caracteres para buscar..."
            className="[&_input]:h-14 [&_input]:text-base"
          />
        </div>
        {query.length > 0 && query.length < 3 && (
          <p className="text-sm text-muted-foreground mt-3">
            Escribe al menos 3 caracteres para iniciar la busqueda
          </p>
        )}
      </div>
    )
  }

  // Results layout
  return (
    <div className="space-y-8">
      {/* Search bar + filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar en planes..."
            className="flex-1"
          />
          <FilterSelect
            value={categoria}
            onChange={setCategoria}
            options={categoriaOptions}
            placeholder="Todas las categorias"
          />
          <FilterSelect
            value={partidoId}
            onChange={setPartidoId}
            options={partidoOptions}
            placeholder="Todos los partidos"
          />
          <FilterSelect
            value={sourceFilter}
            onChange={setSourceFilter}
            options={SOURCE_OPTIONS}
            placeholder="Fuente"
          />
        </div>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && (showPlanes ? promesas.length === 0 : true) && (showDeclaraciones ? declaraciones.length === 0 : true) && (
        <EmptyState
          message={`No se encontraron resultados para "${query}"`}
          icon={Search}
        />
      )}

      {/* Planes de Gobierno results */}
      {!isLoading && showPlanes && promesas.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <Search className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold">
              Planes de Gobierno ({promesasCount.toLocaleString()})
            </h2>
          </div>
          <div className="rounded-xl border bg-card divide-y">
            {promesas.map((p) => (
              <div key={p.id} className="p-4">
                <p className="text-sm leading-relaxed">{p.texto_original}</p>
                {p.resumen && (
                  <p className="mt-1 text-xs text-muted-foreground italic">
                    {p.resumen}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                    {p.partido}
                  </span>
                  <CategoryBadge categoria={p.categoria} />
                  <SourceBadge source="plan" />
                  {p.pagina_pdf && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      p. {p.pagina_pdf}
                    </span>
                  )}
                  {p.confianza_extraccion > 0 && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
                      {Math.round(p.confianza_extraccion * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Declaraciones / Medios results */}
      {!isLoading && showDeclaraciones && declaraciones.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Search className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">
              En Medios ({declaracionesCount.toLocaleString()})
            </h2>
          </div>
          <div className="space-y-3">
            {declaraciones.map((d, idx) => (
              <Link
                key={`${d.master_id}-${idx}`}
                to={`/declaraciones/${d.master_id}`}
                className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.stakeholder}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {d.contenido}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.canal && (
                      <SourceBadge
                        source={
                          d.canal.toLowerCase().includes('twitter') || d.canal.toLowerCase().includes('x')
                            ? 'twitter'
                            : d.canal.toLowerCase().includes('facebook')
                              ? 'facebook'
                              : 'prensa'
                        }
                      />
                    )}
                    {d.temas && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {d.temas}
                      </span>
                    )}
                    {d.fecha && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(d.fecha)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors mt-1" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
