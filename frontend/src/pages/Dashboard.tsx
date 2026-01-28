import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  FileText,
  Users,
  MessageSquareQuote,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

import { useDashboardStats, usePromesasPorCategoria, useTopPartidos } from '@/hooks/useDashboardStats'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { useCandidatos } from '@/hooks/useCandidatos'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CATEGORY_CONFIG, CATEGORIES_LIST } from '@/lib/constants'
import { formatNumber, formatDate } from '@/lib/utils'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: porCategoria, isLoading: catLoading } = usePromesasPorCategoria()
  const { data: topPartidos, isLoading: partidosLoading } = useTopPartidos()
  const { data: declaracionesResult, isLoading: declLoading } = useDeclaraciones({
    offset: 0,
    limit: 5,
  })

  // Get presidential candidates
  const { data: topCandidatosData } = useCandidatos({
    tipo_eleccion: 'PRESIDENTE Y VICEPRESIDENTES',
    offset: 0,
    limit: 5,
  })

  const recentDeclaraciones = declaracionesResult?.data ?? []
  const topCandidatos = topCandidatosData?.data ?? []

  // Build topic cards — top 6 categories sorted by count, with percentage
  const topicCards = useMemo(() => {
    if (!porCategoria) return []
    const total = porCategoria.reduce((s, c) => s + c.count, 0)
    return porCategoria.slice(0, 6).map((item) => {
      const cfg = CATEGORY_CONFIG[item.categoria]
      return {
        key: item.categoria,
        label: cfg?.label ?? item.categoria,
        icon: cfg?.icon ?? FileText,
        color: cfg?.color ?? '#6B7280',
        count: item.count,
        pct: total > 0 ? (item.count / total) * 100 : 0,
      }
    })
  }, [porCategoria])

  // Build partido ranking
  const partidoRanking = useMemo(() => {
    if (!topPartidos) return []
    return topPartidos.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      nombre: p.nombre_oficial,
      candidato: p.candidato_presidencial,
      promesas: p.total_promesas,
      candidatos: p.total_candidatos,
    }))
  }, [topPartidos])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Inteligencia Electoral Peru 2026
        </p>
      </div>

      {/* Stats Strip */}
      {statsLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatPill
            label="Partidos"
            value={formatNumber(stats?.totalPartidos)}
            icon={Building2}
            href="/partidos"
          />
          <StatPill
            label="Promesas"
            value={formatNumber(stats?.totalPromesas)}
            icon={FileText}
            href="/buscar"
          />
          <StatPill
            label="Candidatos"
            value={formatNumber(stats?.totalCandidatos)}
            icon={Users}
            href="/candidatos"
          />
          <StatPill
            label="Declaraciones"
            value={formatNumber(declaracionesResult?.count ?? 0)}
            icon={MessageSquareQuote}
            href="/declaraciones"
          />
        </div>
      )}

      {/* Alertas Recientes — top priority for business clients */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">Alertas Recientes</h2>
          </div>
          <Link
            to="/declaraciones"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Ver todas
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {declLoading ? (
          <LoadingSpinner />
        ) : recentDeclaraciones.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No se encontraron declaraciones recientes.
          </div>
        ) : (
          <div className="space-y-2">
            {recentDeclaraciones.map((decl, idx) => (
              <Link
                key={`${decl.master_id}-${idx}`}
                to={`/declaraciones/${decl.master_id}`}
                className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{decl.stakeholder}</p>
                    {decl.canal && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {decl.canal}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {decl.contenido}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {decl.tema && (
                      <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                        {decl.tema}
                      </span>
                    )}
                    {decl.organizaciones && (
                      <span className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
                        {decl.organizaciones}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(decl.fecha)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Two-column: Topics + Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temas Mas Discutidos */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Temas Mas Discutidos</h2>
          </div>
          {catLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topicCards.map((topic) => {
                const Icon = topic.icon
                return (
                  <Link
                    key={topic.key}
                    to={`/categorias/${topic.key}`}
                    className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: topic.color + '14' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: topic.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{topic.label}</p>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-bold">{topic.count}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${topic.pct}%`,
                              backgroundColor: topic.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-14 text-right">
                          {topic.pct.toFixed(1)}% del total
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
          {!catLoading && (
            <Link
              to="/categorias"
              className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver las {CATEGORIES_LIST.length} categorias
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>

        {/* Candidatos Presidenciales */}
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold">Candidatos Presidenciales</h2>
          </div>
          <div className="rounded-xl border bg-card divide-y">
            {topCandidatos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Cargando candidatos...
              </div>
            ) : (
              topCandidatos.map((c, i) => (
                <Link
                  key={c.id}
                  to={`/candidatos/${c.id}`}
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {i + 1}
                  </span>
                  <CandidatoAvatar
                    nombre={c.nombre_completo || ''}
                    fotoUrl={c.foto_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.partido_nombre}
                      {c.departamento ? ` \u2022 ${c.departamento}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </Link>
              ))
            )}
          </div>
          <Link
            to="/candidatos"
            className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos los candidatos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      {/* Top Partidos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold">Top Partidos por Propuestas</h2>
          </div>
          <Link
            to="/partidos"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {partidosLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {partidoRanking.map((p) => {
              const maxPromesas = partidoRanking[0]?.promesas || 1
              const barPct = (p.promesas / maxPromesas) * 100
              return (
                <Link
                  key={p.rank}
                  to="/partidos"
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                    {p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{p.nombre}</p>
                      <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                        {formatNumber(p.promesas)} <span className="text-xs font-normal text-muted-foreground">promesas</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-700"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    {p.candidato && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {p.candidato}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Compact stat pill ──────────────────────────────────────────── */
function StatPill({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  href: string
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Link>
  )
}
