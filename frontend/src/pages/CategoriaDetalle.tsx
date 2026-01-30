import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePromesas } from '@/hooks/usePromesas'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { usePartidos } from '@/hooks/usePartidos'
import { useCategoriaCounts } from '@/hooks/useCategorias'
import { CATEGORY_CONFIG, PLAN_CATEGORIES, getDynamicCategoryConfig } from '@/lib/constants'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BackButton } from '@/components/ui/BackButton'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import {
  ArrowRight,
  Building2,
  Quote,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AtSign,
} from 'lucide-react'

const TIPO_ELECCION_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'PRESIDENCIAL', label: 'Presidencial' },
  { value: 'DIPUTADOS', label: 'Diputados' },
  { value: 'SENADORES', label: 'Senadores' },
  { value: 'PARLAMENTO_ANDINO', label: 'Parlamento Andino' },
]

const LIMIT = 50

// Keys de categorías de plan (para determinar si es plan o declaración)
const PLAN_KEYS = new Set(PLAN_CATEGORIES.map(c => c.key))

export function CategoriaDetalle() {
  const { nombre } = useParams()
  const [page, setPage] = useState(0)
  const [partidoFilter, setPartidoFilter] = useState('')
  const [stakeholderFilter, setStakeholderFilter] = useState('')
  const [topPartidosOpen, setTopPartidosOpen] = useState(false)

  // Obtener labels dinámicos para categorías de declaraciones
  const { data: counts } = useCategoriaCounts()

  // Determinar si es categoría de plan o declaración
  const isPlanCategory = PLAN_KEYS.has(nombre || '')
  const isDeclaracion = !isPlanCategory

  // Obtener config: usar CATEGORY_CONFIG si existe, sino generar dinámico
  const config = useMemo(() => {
    if (CATEGORY_CONFIG[nombre || '']) {
      return CATEGORY_CONFIG[nombre || '']
    }
    // Para categorías dinámicas de declaraciones, usar el label original
    const label = counts?.declarationLabels[nombre || ''] || nombre || ''
    return getDynamicCategoryConfig(label, 0)
  }, [nombre, counts])

  // Obtener el label correcto para filtrar (puede ser diferente de config.label mientras counts carga)
  // Para planes: usar planLabels[key] || CATEGORY_CONFIG[key].label (disponible inmediatamente)
  // Para declaraciones: usar declarationLabels[key] (necesita esperar a counts)
  const filterLabel = useMemo(() => {
    if (!nombre) return ''
    if (isPlanCategory) {
      // Para planes, CATEGORY_CONFIG tiene el label original
      return counts?.planLabels[nombre] || CATEGORY_CONFIG[nombre]?.label || nombre
    }
    // Para declaraciones, necesitamos counts para obtener el label original
    return counts?.declarationLabels[nombre] || ''
  }, [nombre, isPlanCategory, counts])

  // Indicar si el filterLabel está listo para hacer queries
  // Para planes: siempre listo (CATEGORY_CONFIG tiene el label)
  // Para declaraciones: solo cuando counts ha cargado
  const filterLabelReady = isPlanCategory
    ? !!CATEGORY_CONFIG[nombre || '']?.label || !!counts?.planLabels[nombre || '']
    : !!counts?.declarationLabels[nombre || '']

  // Get partidos for filter dropdown
  const { data: partidos } = usePartidos()
  const partidoOptions = useMemo(() => {
    if (!partidos) return []
    return partidos.map((p) => ({ value: p.nombre_oficial, label: p.nombre_oficial }))
  }, [partidos])

  // --- Plan category data ---
  // Usar filterLabel (el label original con tildes) para filtrar, no la key normalizada
  // Solo ejecutar query cuando filterLabelReady para evitar buscar con key normalizada
  const { data: planData, isLoading: loadingPlan } = usePromesas({
    categoria: !isDeclaracion && filterLabelReady ? filterLabel : undefined,
    partido: partidoFilter || undefined,
    offset: page * LIMIT,
    limit: LIMIT,
  })

  const { data: allPlanData } = usePromesas({
    categoria: !isDeclaracion && filterLabelReady ? filterLabel : undefined,
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
  // Usar filterLabel (el label original con tildes) para filtrar
  // Solo ejecutar query cuando filterLabelReady para evitar buscar con key normalizada
  const { data: declData, isLoading: loadingDecl } = useDeclaraciones({
    temaDeclaracion: isDeclaracion && filterLabelReady ? filterLabel : undefined,
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

  // Filter by stakeholder if selected
  const filteredDeclarations = useMemo(() => {
    if (!stakeholderFilter) return declarations
    return declarations.filter((d) => d.stakeholder === stakeholderFilter)
  }, [declarations, stakeholderFilter])

  const paginatedDecl = useMemo(() => {
    const start = page * LIMIT
    return filteredDeclarations.slice(start, start + LIMIT)
  }, [filteredDeclarations, page])

  // --- Common ---
  // For declarations, use filtered count when stakeholder filter is active
  const filteredDeclCount = stakeholderFilter ? filteredDeclarations.length : declCount
  const totalCount = isDeclaracion ? filteredDeclCount : (planData?.count ?? 0)
  const totalPages = Math.ceil(totalCount / LIMIT)
  const promesas = planData?.data ?? []
  const maxPlanCount = planChart[0]?.count || 1
  const maxStakeholder = stakeholderChart[0]?.count || 1

  // Validar que la categoría existe: para planes debe estar en CATEGORY_CONFIG,
  // para declaraciones se genera dinámicamente
  const categoryExists = isPlanCategory
    ? !!CATEGORY_CONFIG[nombre || '']
    : true // Las declaraciones se generan dinámicamente

  if (!categoryExists) {
    return (
      <div className="space-y-4">
        <BackButton fallback="/categorias" label="Volver a categorias" />
        <EmptyState message={`Categoria "${nombre}" no encontrada`} />
      </div>
    )
  }

  const Icon = config.icon

  return (
    <div className="space-y-8">
      {/* Back link */}
      <BackButton fallback="/categorias" label="Volver a categorias" />

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
          {/* Top partidos chart - accordion */}
          {planChart.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setTopPartidosOpen((v) => !v)}
                className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-violet-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${topPartidosOpen ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-200/50 dark:border-violet-800/30' : 'bg-card hover:border-violet-300/50'}`}
              >
                <ChevronDown
                  className={`h-5 w-5 text-violet-500 transition-transform duration-200 ${
                    topPartidosOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold flex-1">Top partidos en {config.label}</h2>
              </button>
              {topPartidosOpen && (
                <div className="rounded-xl border bg-card divide-y mt-2">
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
              )}
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
          {loadingPlan || !filterLabelReady ? (
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
          {/* Top stakeholders chart - clickeable to filter */}
          {stakeholderChart.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold">Principales actores en {config.label}</h2>
                </div>
                {stakeholderFilter && (
                  <button
                    type="button"
                    onClick={() => { setStakeholderFilter(''); setPage(0); }}
                    className="text-sm text-primary hover:underline"
                  >
                    × Quitar filtro
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Haz clic en un actor para filtrar las declaraciones
              </p>
              <div className="rounded-xl border bg-card divide-y">
                {stakeholderChart.map((item, i) => {
                  const barPct = (item.count / maxStakeholder) * 100
                  const isSelected = stakeholderFilter === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setStakeholderFilter(isSelected ? '' : item.name)
                        setPage(0)
                      }}
                      className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
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
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Declarations list */}
          {stakeholderFilter && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
              <span className="text-sm">
                Mostrando {formatNumber(filteredDeclCount)} declaraciones de <strong>{stakeholderFilter}</strong>
              </span>
            </div>
          )}
          {loadingDecl || !filterLabelReady ? (
            <LoadingSpinner />
          ) : paginatedDecl.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No se encontraron declaraciones en esta categoría
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
                    {d.tipo === 'mention' ? (
                      <AtSign className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    ) : (
                      <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{d.stakeholder}</p>
                        {d.tipo === 'mention' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 text-[11px] font-medium">
                            <AtSign className="h-3 w-3" />
                            Mención
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[11px] font-medium">
                            <Quote className="h-3 w-3" />
                            Declaración
                          </span>
                        )}
                      </div>
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
