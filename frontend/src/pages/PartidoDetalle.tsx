import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePartido } from '@/hooks/usePartidos'
import { usePromesasByPartido } from '@/hooks/usePromesas'
import { useCandidatos } from '@/hooks/useCandidatos'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { CATEGORY_CONFIG, PLAN_CATEGORIES } from '@/lib/constants'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Users,
  FileText,
  Building2,
  Tags,
  ChevronDown,
  MessageSquareQuote,
  ExternalLink,
} from 'lucide-react'

export function PartidoDetalle() {
  const { id } = useParams()
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [temasOpen, setTemasOpen] = useState(true)
  const [declaracionesOpen, setDeclaracionesOpen] = useState(true)
  const [candidatosOpen, setCandidatosOpen] = useState(true)
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [propuestasOpen, setPropuestasOpen] = useState(false)

  const {
    data: partido,
    isLoading: loadingPartido,
    error: errorPartido,
  } = usePartido(id)

  const {
    data: promesas,
    isLoading: loadingPromesas,
  } = usePromesasByPartido(
    id ? Number(id) : undefined,
    categoriaFilter || undefined,
  )

  const { data: candidatosData } = useCandidatos({
    partido_id: id ? Number(id) : undefined,
    offset: 0,
    limit: 12,
  })

  const candidatos = candidatosData?.data ?? []
  const totalCandidatos = candidatosData?.count ?? 0

  // Fetch all declarations and filter by partido name / candidate
  const { data: declData, isLoading: loadingDecl } = useDeclaraciones({
    offset: 0,
    limit: 500,
  })

  const partidoDeclaraciones = useMemo(() => {
    if (!declData?.data || !partido) return []
    const nombre = partido.nombre_oficial.toLowerCase()
    const candidato = partido.candidato_presidencial?.toLowerCase()
    return declData.data.filter((d) => {
      const canalLower = d.canal?.toLowerCase() || ''
      const canalMatch =
        canalLower.includes(nombre) || nombre.includes(canalLower)
      const stakeholderMatch = candidato
        ? d.stakeholder.toLowerCase().includes(candidato)
        : false
      return canalMatch || stakeholderMatch
    })
  }, [declData, partido])

  // Build tema chart: group declarations by tema
  const temaChartData = useMemo(() => {
    if (!partidoDeclaraciones.length) return []
    const counts: Record<string, number> = {}
    for (const d of partidoDeclaraciones) {
      // Use individual declaration tema first, then fall back to entry-level temas
      const temas: string[] = []
      if (d.tema) {
        temas.push(d.tema)
      } else if (d.temas) {
        temas.push(...d.temas.split(';').map((t) => t.trim()).filter(Boolean))
      }
      if (temas.length === 0) temas.push('Sin tema')
      for (const t of temas) {
        counts[t] = (counts[t] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([tema, count]) => ({ tema, count }))
      .sort((a, b) => b.count - a.count)
  }, [partidoDeclaraciones])

  const maxTemaCount = temaChartData[0]?.count || 1

  // Build chart data: group all promesas (unfiltered) by categoria
  const { data: allPromesas } = usePromesasByPartido(
    id ? Number(id) : undefined,
  )

  const chartData = useMemo(() => {
    if (!allPromesas) return []
    const counts: Record<string, number> = {}
    for (const p of allPromesas) {
      counts[p.categoria] = (counts[p.categoria] || 0) + 1
    }
    return Object.entries(counts)
      .map(([categoria, count]) => ({
        categoria,
        label: CATEGORY_CONFIG[categoria]?.label ?? categoria,
        count,
        color: CATEGORY_CONFIG[categoria]?.color ?? '#94a3b8',
        icon: CATEGORY_CONFIG[categoria]?.icon,
      }))
      .sort((a, b) => b.count - a.count)
  }, [allPromesas])

  const totalPromesas = allPromesas?.length ?? 0
  const maxCount = chartData[0]?.count || 1

  const categoriaOptions = PLAN_CATEGORIES.map((c) => ({
    value: c.key,
    label: c.label,
  }))

  if (loadingPartido) return <LoadingSpinner />
  if (errorPartido) return <ErrorState onRetry={() => window.location.reload()} />
  if (!partido) return <EmptyState message="Partido no encontrado" />

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/partidos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a partidos
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
            <Building2 className="h-7 w-7 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{partido.nombre_oficial}</h1>
            {partido.candidato_presidencial && (
              <p className="text-sm text-primary mt-1">{partido.candidato_presidencial}</p>
            )}
            <div className="mt-3 flex gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquareQuote size={15} /> {formatNumber(partidoDeclaraciones.length)} declaraciones
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={15} /> {formatNumber(totalCandidatos)} candidatos
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={15} /> {formatNumber(totalPromesas)} propuestas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Declaraciones por Tema — progress bars */}
      {temaChartData.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setTemasOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Tags className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Declaraciones por Tema</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(partidoDeclaraciones.length)} declaraciones en {temaChartData.length} temas
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                temasOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
          {temasOpen && (
            <div className="rounded-xl border bg-card divide-y mt-4">
              {temaChartData.map((item) => {
                const barPct = (item.count / maxTemaCount) * 100
                return (
                  <div
                    key={item.tema}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{item.tema}</p>
                        <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-amber-500"
                          style={{ width: `${barPct}%` }}
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

      {/* Declaraciones en Medios */}
      <section>
        <button
          type="button"
          onClick={() => setDeclaracionesOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <MessageSquareQuote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Declaraciones en Medios</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(partidoDeclaraciones.length)} declaraciones en medios y RRSS
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              declaracionesOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>
        {declaracionesOpen && (
          <div className="mt-4">
            {loadingDecl ? (
              <LoadingSpinner />
            ) : partidoDeclaraciones.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No se encontraron declaraciones para este partido
              </div>
            ) : (
              <div className="space-y-3">
                {partidoDeclaraciones.map((d, idx) => (
                  <Link
                    key={`${d.master_id}-${idx}`}
                    to={`/declaraciones/${d.master_id}`}
                    className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{d.stakeholder}</p>
                        {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
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
                              <span
                                key={t}
                                className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                              >
                                {t}
                              </span>
                            ))}
                        {d.fecha && (
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(d.fecha)}
                          </span>
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
            )}
          </div>
        )}
      </section>

      {/* Candidatos grid */}
      {candidatos.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCandidatosOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Candidatos</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalCandidatos)} candidatos del partido
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                candidatosOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
          {candidatosOpen && (
            <div className="mt-4">
              {totalCandidatos > 12 && (
                <div className="flex justify-end mb-3">
                  <Link
                    to={`/candidatos?partido=${id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    Ver todos
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {candidatos.map((c) => (
                  <Link
                    key={c.id}
                    to={`/candidatos/${c.id}`}
                    className="group rounded-xl border bg-card p-3 transition-all hover:shadow-sm hover:border-primary/30 flex flex-col items-center text-center"
                  >
                    <CandidatoAvatar nombre={c.nombre_completo || ''} fotoUrl={c.foto_url} size="lg" />
                    <p className="mt-2 text-xs font-medium leading-tight group-hover:text-primary transition-colors">
                      {c.nombre_completo}
                    </p>
                    {c.cargo_postula && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.cargo_postula}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Propuestas por Categoria — CSS progress bars */}
      {chartData.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCategoriasOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Tags className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Propuestas por Categoria</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalPromesas)} propuestas en {chartData.length} categorias
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                categoriasOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
          {categoriasOpen && (
            <div className="rounded-xl border bg-card divide-y mt-4">
              {chartData.map((item) => {
                const barPct = (item.count / maxCount) * 100
                const Icon = item.icon
                return (
                  <Link
                    key={item.categoria}
                    to={`/categorias/${item.categoria}`}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: item.color + '14' }}
                    >
                      {Icon && <Icon className="h-4 w-4" style={{ color: item.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${barPct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Propuestas list */}
      <section>
        <button
          type="button"
          onClick={() => setPropuestasOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Propuestas</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(promesas?.length ?? 0)} propuestas del plan de gobierno
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              propuestasOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>
        {propuestasOpen && (
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <FilterSelect
                value={categoriaFilter}
                onChange={setCategoriaFilter}
                options={categoriaOptions}
                placeholder="Todas las categorias"
              />
            </div>
            {loadingPromesas ? (
              <LoadingSpinner />
            ) : !promesas || promesas.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No se encontraron propuestas
              </div>
            ) : (
              <div className="rounded-xl border bg-card divide-y">
                {promesas.map((p) => (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-relaxed">{p.resumen ?? p.texto_original}</p>
                      <CategoryBadge categoria={p.categoria} />
                    </div>
                    {p.subcategoria && (
                      <p className="text-xs text-muted-foreground">{p.subcategoria}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="outline">{p.ambito}</Badge>
                      {p.pagina_pdf && <span>Pag. {p.pagina_pdf}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
