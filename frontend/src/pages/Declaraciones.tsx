import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { QUIPU_MASTER_TEMAS } from '@/lib/constants'
import {
  ExternalLink,
  Quote,
  ChevronLeft,
  ChevronRight,
  MessageSquareQuote,
  ArrowRight,
} from 'lucide-react'

const PAGE_LIMIT = 20

const CANAL_OPTIONS = [
  { value: 'TV', label: 'TV' },
  { value: 'Radio', label: 'Radio' },
  { value: 'Prensa', label: 'Prensa' },
  { value: 'Digital', label: 'Digital' },
  { value: 'Redes Sociales', label: 'Redes Sociales' },
]

const TEMA_OPTIONS = QUIPU_MASTER_TEMAS.map((t) => ({ value: t, label: t }))

export function Declaraciones() {
  const [search, setSearch] = useState('')
  const [canal, setCanal] = useState('')
  const [tema, setTema] = useState('')
  const [organizacion, setOrganizacion] = useState('')
  const [producto, setProducto] = useState('')
  const [page, setPage] = useState(0)

  const offset = page * PAGE_LIMIT

  const { data, isLoading, isError } = useDeclaraciones({
    search,
    canal,
    tema,
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

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  function handleCanalChange(value: string) {
    setCanal(value)
    setPage(0)
  }

  function handleTemaChange(value: string) {
    setTema(value)
    setPage(0)
  }

  function handleOrganizacionChange(value: string) {
    setOrganizacion(value)
    setPage(0)
  }

  function handleProductoChange(value: string) {
    setProducto(value)
    setPage(0)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
          <MessageSquareQuote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Declaraciones</h1>
          <p className="text-sm text-muted-foreground">
            Citas textuales de actores politicos — detecta las que afectan a tu sector
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por contenido o actor..."
            className="flex-1"
          />
          <FilterSelect
            value={canal}
            onChange={handleCanalChange}
            options={CANAL_OPTIONS}
            placeholder="Todos los canales"
          />
          <FilterSelect
            value={tema}
            onChange={handleTemaChange}
            options={TEMA_OPTIONS}
            placeholder="Todos los temas"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            value={organizacion}
            onChange={handleOrganizacionChange}
            placeholder="Filtrar por organizacion..."
            className="flex-1"
          />
          <SearchInput
            value={producto}
            onChange={handleProductoChange}
            placeholder="Filtrar por producto/sector..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Stats */}
      <p className="text-sm text-muted-foreground tabular-nums">
        {count} declaraciones encontradas
      </p>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : isError ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-destructive">
          Ocurrio un error al cargar las declaraciones
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
            {declarations.map((d, idx) => (
              <Link
                key={`${d.master_id}-${idx}`}
                to={`/declaraciones/${d.master_id}`}
                className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{d.stakeholder}</p>
                    {d.canal && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {d.canal}
                      </span>
                    )}
                  </div>
                  <blockquote className="mt-2 text-sm text-muted-foreground border-l-2 border-primary pl-3 leading-relaxed">
                    &laquo;{d.contenido}&raquo;
                  </blockquote>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {d.tema && (
                      <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                        {d.tema}
                      </span>
                    )}
                    {d.temas &&
                      d.temas
                        .split(';')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((t) => (
                          <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {t}
                          </span>
                        ))}
                    {d.organizaciones && (
                      <span className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
                        {d.organizaciones}
                      </span>
                    )}
                    {d.fecha && (
                      <span className="text-[11px] text-muted-foreground">{formatDate(d.fecha)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {d.ruta && (
                    <a
                      href={d.ruta}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Ver fuente"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
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
              <span className="text-sm text-muted-foreground tabular-nums">
                Pagina {page + 1} de {totalPages}
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
