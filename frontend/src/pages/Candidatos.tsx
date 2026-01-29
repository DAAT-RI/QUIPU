import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCandidatos } from '@/hooks/useCandidatos'
import { usePartidos } from '@/hooks/usePartidos'
import { SearchInput } from '@/components/ui/SearchInput'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber } from '@/lib/utils'
import { Users, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { PAGE_SIZE } from '@/lib/constants'

const TIPO_ELECCION_OPTIONS = [
  { value: 'PRESIDENCIAL', label: 'Presidencial' },
  { value: 'DIPUTADOS', label: 'Diputados' },
  { value: 'SENADORES DISTRITO ÚNICO', label: 'Senadores (Distrito Único)' },
  { value: 'SENADORES DISTRITO MÚLTIPLE', label: 'Senadores (Distrito Múltiple)' },
]

const DEPARTAMENTO_OPTIONS = [
  'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO',
  'CAJAMARCA', 'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO',
  'ICA', 'JUNIN', 'LA LIBERTAD', 'LAMBAYEQUE', 'LIMA',
  'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA',
  'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI',
].map((d) => ({ value: d, label: d }))

export function Candidatos() {
  const [searchParams] = useSearchParams()
  const tipoFromUrl = searchParams.get('tipo') || ''

  const [search, setSearch] = useState('')
  const [tipoEleccion, setTipoEleccion] = useState(tipoFromUrl)
  const [departamento, setDepartamento] = useState('')
  const [partidoId, setPartidoId] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(0)

  // Sync tipoEleccion with URL param when it changes
  useEffect(() => {
    setTipoEleccion(tipoFromUrl)
    setPage(0)
  }, [tipoFromUrl])

  const { data: partidos } = usePartidos()

  const { data, isLoading, error } = useCandidatos({
    search: search || undefined,
    tipo_eleccion: tipoEleccion || undefined,
    departamento: departamento || undefined,
    partido_id: partidoId ? Number(partidoId) : undefined,
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  })

  const candidatos = data?.data ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const partidoOptions = (partidos ?? []).map((p) => ({
    value: String(p.id),
    label: p.nombre_oficial,
  }))

  function handleFilterChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value)
      setPage(0)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Candidatos</h1>
          <p className="text-sm text-muted-foreground">
            {formatNumber(totalCount)} candidatos registrados
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SearchInput
            value={search}
            onChange={handleFilterChange(setSearch)}
            placeholder="Buscar candidato..."
            className="sm:w-64"
          />
          <FilterSelect
            value={tipoEleccion}
            onChange={handleFilterChange(setTipoEleccion)}
            options={TIPO_ELECCION_OPTIONS}
            placeholder="Tipo de Elección"
          />
          <FilterSelect
            value={departamento}
            onChange={handleFilterChange(setDepartamento)}
            options={DEPARTAMENTO_OPTIONS}
            placeholder="Departamento"
          />
          <FilterSelect
            value={partidoId}
            onChange={handleFilterChange(setPartidoId)}
            options={partidoOptions}
            placeholder="Partido"
          />
          <div className="sm:ml-auto">
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-destructive">
          Error al cargar candidatos
        </div>
      ) : candidatos.length === 0 ? (
        <EmptyState message="No se encontraron candidatos con los filtros seleccionados" />
      ) : view === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {candidatos.map((c) => (
            <Link
              key={c.id}
              to={`/candidatos/${c.id}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex flex-col items-center text-center">
                <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="lg" />
                <h3 className="mt-3 font-semibold text-sm group-hover:text-primary transition-colors">
                  {c.nombre_completo}
                </h3>
                {c.partido_nombre && (
                  <span className="mt-1.5 inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                    {c.partido_nombre}
                  </span>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{c.cargo_postula}</p>
                {c.departamento && (
                  <p className="text-xs text-muted-foreground">{c.departamento}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="rounded-xl border bg-card divide-y">
          {candidatos.map((c) => (
            <Link
              key={c.id}
              to={`/candidatos/${c.id}`}
              className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
            >
              <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {c.nombre_completo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.cargo_postula}
                  {c.departamento ? ` \u2022 ${c.departamento}` : ''}
                </p>
              </div>
              {c.partido_nombre && (
                <span className="hidden sm:inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                  {c.partido_nombre}
                </span>
              )}
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 rounded-xl border bg-card px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <span className="text-xs sm:text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {page + 1} / {formatNumber(totalPages)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="inline-flex items-center gap-1 rounded-xl border bg-card px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
