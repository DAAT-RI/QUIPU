import { useState, useRef, useEffect } from 'react'
import { Search, ArrowRight, FileText, MessageSquareQuote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSearchPromesas } from '@/hooks/useSearch'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { usePartidos } from '@/hooks/usePartidos'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PLAN_CATEGORIES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export function BuscarPromesas() {
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const prevHasQuery = useRef(false)

  const { data: partidos } = usePartidos()

  const {
    data: promesasResult,
    isLoading: loadingPromesas,
  } = useSearchPromesas(query, categoria || undefined, partidoId ? Number(partidoId) : undefined)

  const {
    data: declaracionesResult,
    isLoading: loadingDeclaraciones,
  } = useDeclaraciones({
    search: query.length >= 3 ? query : undefined,
    tipo: 'declaration',
    offset: 0,
    limit: 20,
  })

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

  // Keep focus when transitioning from hero to results
  useEffect(() => {
    if (hasQuery && !prevHasQuery.current) {
      // Just transitioned to results view, restore focus
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
    }
    prevHasQuery.current = hasQuery
  }, [hasQuery])

  // Hero layout when no query entered
  if (!hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <Search className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Buscar Promesas</h1>
        <p className="text-muted-foreground mb-8">
          Busca en 22,000+ propuestas de planes de gobierno y declaraciones en medios
        </p>
        <div className="w-full max-w-2xl">
          <SearchInput
            ref={inputRef}
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

  // Results layout - Two columns
  return (
    <div className="space-y-6">
      {/* Search bar + filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            placeholder="Buscar promesas..."
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
        </div>
      </div>

      {/* Two column results - Declaraciones first (eje principal) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Declaraciones en Medios (PRIMERO - eje principal) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <MessageSquareQuote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-base font-semibold">
              Declaraciones en Medios
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({declaracionesCount.toLocaleString()})
              </span>
            </h2>
          </div>

          <div className="rounded-xl border bg-card divide-y max-h-[70vh] overflow-y-auto">
            {loadingDeclaraciones ? (
              <div className="p-8"><LoadingSpinner /></div>
            ) : declaraciones.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Sin resultados en medios
              </div>
            ) : (
              declaraciones.map((d, idx) => (
                <Link
                  key={`${d.master_id}-${idx}`}
                  to={`/declaraciones/${d.master_id}`}
                  className="group block p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{d.stakeholder}</p>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    «{d.contenido}»
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
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
                    {d.fecha && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(d.fecha)}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Column 2: Planes de Gobierno */}
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-base font-semibold">
              Planes de Gobierno
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({promesasCount.toLocaleString()})
              </span>
            </h2>
          </div>

          <div className="rounded-xl border bg-card divide-y max-h-[70vh] overflow-y-auto">
            {loadingPromesas ? (
              <div className="p-8"><LoadingSpinner /></div>
            ) : promesas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Sin resultados en planes
              </div>
            ) : (
              promesas.map((p) => (
                <div key={p.id} className="p-3">
                  <p className="text-sm leading-relaxed">{p.texto_original}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-medium">
                      {p.partido}
                    </span>
                    <CategoryBadge categoria={p.categoria} />
                    {p.pagina_pdf && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        p. {p.pagina_pdf}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
