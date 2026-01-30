import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDeclaraciones, useCanales, useOrganizacionesMencionadas } from '@/hooks/useDeclaraciones'
import { useDeclaracionesPorTema } from '@/hooks/useDashboardStats'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, isRedundantCanal } from '@/lib/utils'
import {
  ExternalLink,
  Quote,
  ChevronLeft,
  ChevronRight,
  MessageSquareQuote,
  ArrowRight,
  AtSign,
  X,
} from 'lucide-react'

const PAGE_LIMIT = 20

// Tipo de interacción - default 'declaration' (mentions tienen ruido)
const TIPO_OPTIONS = [
  { value: 'declaration', label: 'Declaraciones' },
  { value: 'mention', label: 'Menciones' },
]

export function Declaraciones() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Leer TODOS los filtros desde URL (no local state)
  const tipo = searchParams.get('tipo') || 'declaration'
  const search = searchParams.get('search') || ''
  const stakeholder = searchParams.get('stakeholder') || ''
  const canal = searchParams.get('canal') || ''
  const tema = searchParams.get('tema') || ''
  const organizacion = searchParams.get('organizacion') || ''
  const producto = searchParams.get('producto') || ''
  const page = parseInt(searchParams.get('page') || '0', 10)

  // Helper para actualizar URL params
  const updateParams = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === 0 || (key === 'tipo' && value === 'declaration')) {
        params.delete(key)
      } else {
        params.set(key, String(value))
      }
    })
    // Reset page when changing filters (except when changing page itself)
    if (!('page' in updates)) {
      params.delete('page')
    }
    setSearchParams(params, { replace: true })
  }

  // Obtener canales, organizaciones y temas dinámicamente
  const { data: canalesData } = useCanales()
  const { data: orgsData } = useOrganizacionesMencionadas()
  const { data: temasData } = useDeclaracionesPorTema()

  const canalOptions = canalesData ?? []
  const orgOptions = orgsData ?? []

  // Generar opciones de tema dinámicamente desde la BD
  const temaOptions = useMemo(() => {
    if (!temasData) return []
    return temasData.map((t) => ({ value: t.tema, label: t.tema }))
  }, [temasData])

  const offset = page * PAGE_LIMIT

  const { data, isLoading, isError } = useDeclaraciones({
    tipo: tipo as 'declaration' | 'mention' | undefined || undefined,
    search: search || undefined,
    stakeholder: stakeholder || undefined,
    canal: canal || undefined,
    categoriaDeclaracion: tema || undefined, // Filter by categorias_interaccion (declaration category)
    organizacion: organizacion || undefined,
    producto: producto || undefined,
    offset,
    limit: PAGE_LIMIT,
  })

  const declarations = data?.data ?? []
  const count = data?.count ?? 0
  const totalPages = Math.ceil(count / PAGE_LIMIT)
  const hasNext = page < totalPages - 1
  const hasPrev = page > 0

  // Crear handlers para cada filtro
  const setTipo = (v: string) => updateParams({ tipo: v })
  const setSearch = (v: string) => updateParams({ search: v })
  const setStakeholder = (v: string) => updateParams({ stakeholder: v })
  const setCanal = (v: string) => updateParams({ canal: v })
  const setTema = (v: string) => updateParams({ tema: v })
  const setOrganizacion = (v: string) => updateParams({ organizacion: v })
  const setProducto = (v: string) => updateParams({ producto: v })
  const setPage = (v: number | ((p: number) => number)) => {
    const newPage = typeof v === 'function' ? v(page) : v
    updateParams({ page: newPage })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <MessageSquareQuote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Declaraciones</h1>
          <p className="text-sm text-muted-foreground">
            Citas textuales de candidatos — detecta las que afectan a tu sector
          </p>
        </div>
      </div>

      {/* Active filter indicator - follows dropdown state, not just URL */}
      {tema && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm text-muted-foreground">Filtrando por categoría:</span>
          <span className="font-semibold text-primary">{tema}</span>
          <button
            type="button"
            onClick={() => setTema('')}
            className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Filters Card */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        {/* Row 1: Search + Stakeholder + Tipo + Canal */}
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar en lo que dijeron..."
            className="flex-1"
          />
          <SearchInput
            value={stakeholder}
            onChange={setStakeholder}
            placeholder="Quién dijo..."
            className="sm:w-48"
          />
          <FilterSelect
            value={tipo}
            onChange={setTipo}
            options={TIPO_OPTIONS}
            placeholder="Todos"
          />
          <FilterSelect
            value={canal}
            onChange={setCanal}
            options={canalOptions}
            placeholder="Fuente"
          />
        </div>

        {/* Row 2: Tema + Organización + Sector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <FilterSelect
            value={tema}
            onChange={setTema}
            options={temaOptions}
            placeholder="Categoría"
          />
          <FilterSelect
            value={organizacion}
            onChange={setOrganizacion}
            options={orgOptions}
            placeholder="Organización mencionada"
          />
          <SearchInput
            value={producto}
            onChange={setProducto}
            placeholder="Buscar sector/industria..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          {count} {tipo === 'declaration' ? 'declaraciones' : tipo === 'mention' ? 'menciones' : 'resultados'}
        </p>
        {tipo === 'mention' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Las menciones pueden contener ruido
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-destructive">
          Ocurrió un error al cargar las declaraciones
        </div>
      ) : declarations.length === 0 ? (
        <EmptyState
          message="No se encontraron declaraciones"
          icon={Quote}
        />
      ) : (
        <>
          {/* Declaration Cards */}
          <div className="space-y-3">
            {declarations.map((d) => (
              <Link
                key={`${d.master_id}-${d.idx}`}
                to={`/declaraciones/${d.master_id}?idx=${d.idx}`}
                state={{ from: `/declaraciones${searchParams.toString() ? `?${searchParams.toString()}` : ''}` }}
                className="group block rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
              >
                {/* Header: Stakeholder + Canal (si diferente) + Fecha */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {d.tipo === 'mention' ? (
                      <AtSign className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <Quote className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="font-semibold text-sm truncate">{d.stakeholder}</span>
                    {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                        vía {d.canal}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                    {d.fecha && <span>{formatDate(d.fecha)}</span>}
                    {d.ruta && (
                      <a
                        href={d.ruta}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-foreground transition-colors"
                        title="Ver fuente"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Contenido (lo que dijo) */}
                <blockquote className="text-sm text-foreground border-l-2 border-primary/50 pl-3 leading-relaxed mb-3">
                  «{d.contenido}»
                </blockquote>

                {/* Tags: Categorías de la interacción + Canal */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.categorias_interaccion &&
                    d.categorias_interaccion
                      .split(';')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t) => (
                        <span key={t} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                          {t}
                        </span>
                      ))}
                  {d.canal && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-medium">
                      {d.canal}
                    </span>
                  )}
                </div>

                {/* Arrow indicator */}
                <div className="flex justify-end mt-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrev}
                className="inline-flex items-center gap-1 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                Página {page + 1} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="inline-flex items-center gap-1 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
