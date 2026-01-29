import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePromesas } from '@/hooks/usePromesas'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { usePartidos } from '@/hooks/usePartidos'
import { CATEGORY_CONFIG } from '@/lib/constants'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Quote,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const LIMIT = 50

export function CategoriaDetalle() {
  const { nombre } = useParams()
  const [page, setPage] = useState(0)
  const [partidoFilter, setPartidoFilter] = useState('')

  const config = CATEGORY_CONFIG[nombre || '']
  const isDeclaracion = config?.source === 'declaracion'

  // Get partidos for filter dropdown
  const { data: partidos } = usePartidos()
  const partidoOptions = useMemo(() => {
    if (!partidos) return []
    return partidos.map((p) => ({ value: p.nombre_oficial, label: p.nombre_oficial }))
  }, [partidos])

  // --- Plan category data ---
  const { data: planData, isLoading: loadingPlan } = usePromesas({
    categoria: !isDeclaracion ? nombre : undefined,
    partido: partidoFilter || undefined,
    offset: page * LIMIT,
    limit: LIMIT,
  })

  const { data: allPlanData } = usePromesas({
    categoria: !isDeclaracion ? nombre : undefined,
    offset: 0,
    limit: 5000,
  })

  const planChart = useMemo(() => {
    if (!allPlanData?.data) return []
    const grouped: Record<string, number> = {}
    for (const p of allPlanData.data) {
      grouped[p.partido] = (grouped[p.partido] || 0) + 1
    }
    return Object.entries(grouped)
      .map(([partido, count]) => ({ partido, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [allPlanData])

  // --- Declaration tema data ---
  const { data: declData, isLoading: loadingDecl } = useDeclaraciones({
    temaDeclaracion: isDeclaracion ? config?.label : undefined,
    offset: 0,
    limit: 200,
  })

  const declarations = isDeclaracion ? (declData?.data ?? []) : []
  const declCount = isDeclaracion ? (declData?.count ?? 0) : 0

  const stakeholderChart = useMemo(() => {
    if (!isDeclaracion || declarations.length === 0) return []
    const grouped: Record<string, number> = {}
    for (const d of declarations) {
      grouped[d.stakeholder] = (grouped[d.stakeholder] || 0) + 1
    }
    return Object.entries(grouped)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [isDeclaracion, declarations])

  const paginatedDecl = useMemo(() => {
    const start = page * LIMIT
    return declarations.slice(start, start + LIMIT)
  }, [declarations, page])

  // --- Common ---
  const totalCount = isDeclaracion ? declCount : (planData?.count ?? 0)
  const totalPages = Math.ceil(totalCount / LIMIT)
  const promesas = planData?.data ?? []
  const maxPlanCount = planChart[0]?.count || 1
  const maxStakeholder = stakeholderChart[0]?.count || 1

  if (!config) {
    return (
      <div className="space-y-4">
        <Link
          to="/categorias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a categorias
        </Link>
        <EmptyState message={`Categoria "${nombre}" no encontrada`} />
      </div>
    )
  }

  const Icon = config.icon

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/categorias"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a categorias
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: config.color + '14' }}
          >
            <Icon className="h-7 w-7" style={{ color: config.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">
                {formatNumber(totalCount)} {isDeclaracion ? 'declaraciones' : 'propuestas'}
              </p>
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                isDeclaracion
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
              }`}>
                {isDeclaracion ? 'Medios' : 'Plan de Gobierno'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PLAN CATEGORY CONTENT ── */}
      {!isDeclaracion && (
        <>
          {/* Top partidos chart */}
          {planChart.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Top partidos en {config.label}</h2>
              </div>
              <div className="rounded-xl border bg-card divide-y">
                {planChart.map((item, i) => {
                  const barPct = (item.count / maxPlanCount) * 100
                  return (
                    <div key={item.partido} className="flex items-center gap-4 p-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{item.partido}</p>
                          <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                            {formatNumber(item.count)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, backgroundColor: config.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Filter by partido */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Filtrar por partido politico
            </p>
            <FilterSelect
              value={partidoFilter}
              onChange={(v) => { setPartidoFilter(v); setPage(0) }}
              options={partidoOptions}
              placeholder="Todos los partidos"
            />
          </div>

          {/* Promesas list */}
          {loadingPlan ? (
            <LoadingSpinner />
          ) : promesas.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No se encontraron propuestas {partidoFilter ? `de ${partidoFilter} ` : ''}en esta categoria
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-card divide-y">
                {promesas.map((p) => (
                  <div key={p.id} className="p-4">
                    <p className="text-sm leading-relaxed">{p.texto_original}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                        {p.partido}
                      </span>
                      {p.resumen && (
                        <span className="text-muted-foreground italic">{p.resumen}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} totalCount={totalCount} setPage={setPage} />
              )}
            </>
          )}
        </>
      )}

      {/* ── DECLARATION TEMA CONTENT ── */}
      {isDeclaracion && (
        <>
          {/* Top stakeholders chart */}
          {stakeholderChart.length > 0 && (
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold">Principales actores en {config.label}</h2>
              </div>
              <div className="rounded-xl border bg-card divide-y">
                {stakeholderChart.map((item, i) => {
                  const barPct = (item.count / maxStakeholder) * 100
                  return (
                    <div key={item.name} className="flex items-center gap-4 p-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                            {formatNumber(item.count)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barPct}%`, backgroundColor: config.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Declarations list */}
          {loadingDecl ? (
            <LoadingSpinner />
          ) : paginatedDecl.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No se encontraron declaraciones en este tema
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedDecl.map((d, i) => (
                  <Link
                    key={`${d.master_id}-${i}`}
                    to={`/declaraciones/${d.master_id}`}
                    className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
                  >
                    <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.stakeholder}</p>
                      <blockquote className="mt-1 text-sm text-muted-foreground border-l-2 border-primary pl-3 leading-relaxed">
                        {d.contenido}
                      </blockquote>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {d.canal}
                          </span>
                        )}
                        {d.fecha && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(d.fecha)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors mt-0.5" />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} totalCount={totalCount} setPage={setPage} />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Pagination({
  page,
  totalPages,
  totalCount,
  setPage,
}: {
  page: number
  totalPages: number
  totalCount: number
  setPage: React.Dispatch<React.SetStateAction<number>>
}) {
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      <button
        type="button"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={page === 0}
        className="inline-flex items-center gap-1 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </button>
      <span className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        Pagina {page + 1} de {totalPages} ({formatNumber(totalCount)} resultados)
      </span>
      <button
        type="button"
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={page >= totalPages - 1}
        className="inline-flex items-center gap-1 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-all hover:shadow-sm hover:border-primary/30 disabled:opacity-50 disabled:pointer-events-none"
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
