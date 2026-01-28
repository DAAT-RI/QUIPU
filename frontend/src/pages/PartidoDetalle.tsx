import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { usePartido } from '@/hooks/usePartidos'
import { usePromesasByPartido } from '@/hooks/usePromesas'
import { useCandidatos } from '@/hooks/useCandidatos'
import { CATEGORY_CONFIG, PLAN_CATEGORIES } from '@/lib/constants'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatNumber } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Users, FileText, Building2, Tags, ChevronDown } from 'lucide-react'

export function PartidoDetalle() {
  const { id } = useParams()
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [categoriasOpen, setCategoriasOpen] = useState(true)
  const [propuestasOpen, setPropuestasOpen] = useState(true)
  const [candidatosOpen, setCandidatosOpen] = useState(true)

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
                <Users size={15} /> {formatNumber(totalCandidatos)} candidatos
              </span>
              <span className="flex items-center gap-1.5">
                <FileText size={15} /> {formatNumber(totalPromesas)} propuestas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Propuestas por Categoria — CSS progress bars */}
      {chartData.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Tags className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Propuestas por Categoria</h2>
          </div>
          <div className="rounded-xl border bg-card divide-y">
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
        </section>
      )}

      {/* Promesas list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold">Propuestas</h2>
          </div>
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
      </section>

      {/* Candidatos grid */}
      {candidatos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Candidatos</h2>
            </div>
            {totalCandidatos > 12 && (
              <Link
                to={`/candidatos?partido=${id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
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
        </section>
      )}
    </div>
  )
}
