import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePartido } from '@/hooks/usePartidos'
import { usePromesasByPartido } from '@/hooks/usePromesas'
import { useCandidatos } from '@/hooks/useCandidatos'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { CATEGORY_CONFIG } from '@/lib/constants'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { BackButton } from '@/components/ui/BackButton'
import { formatNumber, formatDate, isRedundantCanal, normalizeKey } from '@/lib/utils'
import {
  ArrowRight,
  Users,
  FileText,
  Building2,
  Tags,
  ChevronDown,
  MessageSquareQuote,
  ExternalLink,
  AtSign,
} from 'lucide-react'

export function PartidoDetalle() {
  const { id } = useParams()
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [temasOpen, setTemasOpen] = useState(true)
  const [declaracionesOpen, setDeclaracionesOpen] = useState(true)
  const [mencionesOpen, setMencionesOpen] = useState(false)
  const [candidatosOpen, setCandidatosOpen] = useState(true)
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [propuestasOpen, setPropuestasOpen] = useState(false)

  const {
    data: partido,
    isLoading: loadingPartido,
    error: errorPartido,
  } = usePartido(id)

  const {
    data: promesasResult,
    isLoading: loadingPromesas,
  } = usePromesasByPartido(
    id ? Number(id) : undefined,
    categoriaFilter || undefined,
  )
  const promesas = promesasResult?.data ?? []

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

  const { declaraciones: partidoDeclaraciones, menciones: partidoMenciones } = useMemo(() => {
    if (!declData?.data || !partido) return { declaraciones: [], menciones: [] }
    const nombre = partido.nombre_oficial.toLowerCase()
    const candidato = partido.candidato_presidencial?.toLowerCase()
    const filtered = declData.data.filter((d) => {
      const canalLower = d.canal?.toLowerCase() || ''
      const canalMatch =
        canalLower.includes(nombre) || nombre.includes(canalLower)
      const stakeholderMatch = candidato
        ? d.stakeholder.toLowerCase().includes(candidato)
        : false
      return canalMatch || stakeholderMatch
    })
    // Separar declaraciones de menciones
    const declaraciones = filtered.filter((d) => d.tipo === 'declaration')
    const menciones = filtered.filter((d) => d.tipo === 'mention')
    return { declaraciones, menciones }
  }, [declData, partido])

  // Build tema chart: group declarations by tema
  const temaChartData = useMemo(() => {
    if (!partidoDeclaraciones.length) return []
    const counts: Record<string, number> = {}
    for (const d of partidoDeclaraciones) {
      // Use individual declaration tema first, then fall back to entry-level temas
      const temas: string[] = []
      if (d.tema_interaccion) {
        temas.push(...d.tema_interaccion.split(/[;,]/).map((t) => t.trim()).filter(Boolean))
      } else if (d.temas) {
        temas.push(...d.temas.split(/[;,]/).map((t) => t.trim()).filter(Boolean))
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
  const { data: allPromesasResult } = usePromesasByPartido(
    id ? Number(id) : undefined,
  )
  const allPromesas = allPromesasResult?.data ?? []
  const totalPromesas = allPromesasResult?.count ?? 0

  const chartData = useMemo(() => {
    if (!allPromesas.length) return []
    const counts: Record<string, number> = {}
    for (const p of allPromesas) {
      counts[p.categoria] = (counts[p.categoria] || 0) + 1
    }
    return Object.entries(counts)
      .map(([categoria, count]) => {
        const key = normalizeKey(categoria)
        return {
          categoria,
          key, // key normalizada para la URL
          label: CATEGORY_CONFIG[key]?.label ?? categoria,
          count,
          color: CATEGORY_CONFIG[key]?.color ?? '#94a3b8',
          icon: CATEGORY_CONFIG[key]?.icon,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [allPromesas])
  const maxCount = chartData[0]?.count || 1

  // Solo mostrar categorías que tienen propuestas para este partido
  const categoriaOptions = useMemo(() => {
    return chartData.map((c) => ({
      value: c.categoria,
      label: c.label,
    }))
  }, [chartData])

  if (loadingPartido) return <LoadingSpinner />
  if (errorPartido) return <ErrorState onRetry={() => window.location.reload()} />
  if (!partido) return <EmptyState message="Partido no encontrado" />

  return (
    <div className="space-y-8">
      {/* Back link */}
      <BackButton fallback="/partidos" label="Volver a partidos" />

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
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquareQuote size={15} /> {formatNumber(partidoDeclaraciones.length)} declaraciones
              </span>
              {partidoMenciones.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <MessageSquareQuote size={15} /> {formatNumber(partidoMenciones.length)} menciones
                </span>
              )}
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
            className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-amber-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${temasOpen ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30' : 'bg-card hover:border-amber-300/50'}`}
          >
            <ChevronDown
              className={`h-5 w-5 text-amber-500 transition-transform duration-200 ${
                temasOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Tags className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Declaraciones por Categoría</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(partidoDeclaraciones.length)} declaraciones en {temaChartData.length} categorías
              </p>
            </div>
          </button>
          {temasOpen && (
            <div className="rounded-xl border bg-card divide-y mt-2">
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
          className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-amber-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${declaracionesOpen ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30' : 'bg-card hover:border-amber-300/50'}`}
        >
          <ChevronDown
            className={`h-5 w-5 text-amber-500 transition-transform duration-200 ${
              declaracionesOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <MessageSquareQuote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Declaraciones en Medios</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(partidoDeclaraciones.length)} declaraciones en medios y RRSS
            </p>
          </div>
        </button>
        {declaracionesOpen && (
          <div className="mt-2">
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
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {d.canal}
                          </span>
                        )}
                      </div>
                      <blockquote className="mt-2 text-sm text-muted-foreground border-l-2 border-primary pl-3 leading-relaxed">
                        &laquo;{d.contenido}&raquo;
                      </blockquote>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {d.tema_interaccion && d.tema_interaccion.split(/[;,]/).map(t => t.trim()).filter(Boolean).map((tema) => (
                          <span key={tema} className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                            {tema}
                          </span>
                        ))}
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
                          aria-label="Ver fuente"
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

      {/* Menciones en Medios */}
      {partidoMenciones.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setMencionesOpen((v) => !v)}
            className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-orange-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${mencionesOpen ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/30' : 'bg-card hover:border-orange-300/50'}`}
          >
            <ChevronDown
              className={`h-5 w-5 text-orange-500 transition-transform duration-200 ${
                mencionesOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <AtSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Menciones en Medios</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(partidoMenciones.length)} menciones del partido en medios
              </p>
            </div>
          </button>
          {mencionesOpen && (
            <div className="mt-2">
              <div className="space-y-3">
                {partidoMenciones.map((d, idx) => (
                  <Link
                    key={`mencion-${d.master_id}-${idx}`}
                    to={`/declaraciones/${d.master_id}`}
                    className="group flex items-start gap-4 rounded-xl border border-orange-200/50 dark:border-orange-800/30 bg-orange-50/30 dark:bg-orange-950/20 p-4 transition-all hover:shadow-sm hover:border-orange-300/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 text-[11px] font-medium">
                          <AtSign className="h-3 w-3" />
                          Mención
                        </span>
                        {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {d.canal}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {d.contenido}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {d.tema_interaccion && d.tema_interaccion.split(/[;,]/).map(t => t.trim()).filter(Boolean).map((tema) => (
                          <span key={tema} className="rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 text-[11px] font-medium">
                            {tema}
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
                          aria-label="Ver fuente"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-orange-500 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Candidatos grid */}
      {candidatos.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setCandidatosOpen((v) => !v)}
            className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-primary px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${candidatosOpen ? 'bg-primary/5 border-primary/20' : 'bg-card hover:border-primary/30'}`}
          >
            <ChevronDown
              className={`h-5 w-5 text-primary transition-transform duration-200 ${
                candidatosOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Candidatos</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalCandidatos)} candidatos del partido
              </p>
            </div>
          </button>
          {candidatosOpen && (
            <div className="mt-2">
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
                      <p className="text-[11px] text-muted-foreground mt-0.5">{c.cargo_postula}</p>
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
            className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-emerald-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${categoriasOpen ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-card hover:border-emerald-300/50'}`}
          >
            <ChevronDown
              className={`h-5 w-5 text-emerald-500 transition-transform duration-200 ${
                categoriasOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Tags className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Propuestas por Categoria</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalPromesas)} propuestas en {chartData.length} categorias
              </p>
            </div>
          </button>
          {categoriasOpen && (
            <div className="rounded-xl border bg-card divide-y mt-2">
              {chartData.map((item) => {
                const barPct = (item.count / maxCount) * 100
                const Icon = item.icon
                return (
                  <Link
                    key={item.key}
                    to={`/categorias/${item.key}`}
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
          className={`w-full flex items-center gap-2.5 rounded-xl border border-l-4 border-l-indigo-500 px-5 py-4 text-left transition-all hover:shadow-sm cursor-pointer ${propuestasOpen ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-800/30' : 'bg-card hover:border-indigo-300/50'}`}
        >
          <ChevronDown
            className={`h-5 w-5 text-indigo-500 transition-transform duration-200 ${
              propuestasOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Propuestas</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(promesas?.length ?? 0)} propuestas del plan de gobierno
            </p>
          </div>
        </button>
        {propuestasOpen && (
          <div className="mt-2 space-y-4">
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
