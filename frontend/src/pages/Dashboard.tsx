import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  FileText,
  Users,
  MessageSquareQuote,
  ArrowRight,
  TrendingUp,
  Crown,
  UserCheck,
  Vote,
  ChevronDown,
  Quote,
  AtSign,
} from 'lucide-react'

import { useDashboardStats, usePromesasPorCategoria, useTopPartidos } from '@/hooks/useDashboardStats'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { useCandidatoCountByTipo, useCandidatosByCargo } from '@/hooks/useCandidatos'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CATEGORY_CONFIG, CATEGORIES_LIST } from '@/lib/constants'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import type { CandidatoCompleto } from '@/types/database'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: porCategoria, isLoading: catLoading } = usePromesasPorCategoria()
  const { data: topPartidos, isLoading: partidosLoading } = useTopPartidos()
  const { data: declaracionesResult, isLoading: declLoading } = useDeclaraciones({
    offset: 0,
    limit: 5,
  })

  // Get presidential candidates by cargo type (separated)
  const { data: presidentesData } = useCandidatosByCargo('PRESIDENTE DE LA REP', 50)
  const { data: vice1Data } = useCandidatosByCargo('PRIMER VICEPRESIDENTE', 50)
  const { data: vice2Data } = useCandidatosByCargo('SEGUNDO VICEPRESIDENTE', 50)

  // Get candidate counts by cargo type
  const { data: cargoCountsData } = useCandidatoCountByTipo()
  const cargoCounts = cargoCountsData ?? {}

  const recentDeclaraciones = declaracionesResult?.data ?? []
  const presidentes = presidentesData?.data ?? []
  const vice1 = vice1Data?.data ?? []
  const vice2 = vice2Data?.data ?? []

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

      {/* Temas Más Discutidos */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Temas Más Discutidos</h2>
          </div>
          <Link
            to="/categorias"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Ver las {CATEGORIES_LIST.length} categorías
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {catLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topicCards.map((topic) => {
              const Icon = topic.icon
              return (
                <Link
                  key={topic.key}
                  to={`/categorias/${topic.key}`}
                  className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30 text-center"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: topic.color + '14' }}
                  >
                    <Icon className="h-5 w-5" style={{ color: topic.color }} />
                  </div>
                  <div className="min-w-0 w-full">
                    <p className="text-sm font-medium truncate">{topic.label}</p>
                    <p className="text-lg font-bold" style={{ color: topic.color }}>{topic.count}</p>
                    <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${topic.pct}%`,
                          backgroundColor: topic.color,
                        }}
                      />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Top Partidos por Declaraciones */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold">Top Partidos por Declaraciones</h2>
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
                        {formatNumber(p.promesas)} <span className="text-xs font-normal text-muted-foreground">declaraciones</span>
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

      {/* Declaraciones Recientes — two columns: feed + categories */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquareQuote className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Declaraciones Recientes</h2>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Feed de declaraciones - columna principal */}
            <div className="lg:col-span-2 space-y-2">
              {recentDeclaraciones.map((decl) => (
                <Link
                  key={`${decl.master_id}-${decl.idx}`}
                  to={`/declaraciones/${decl.master_id}?idx=${decl.idx}`}
                  className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{decl.stakeholder}</p>
                      {decl.canal && !isRedundantCanal(decl.canal, decl.stakeholder) && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {decl.canal}
                        </span>
                      )}
                      {decl.tipo === 'mention' ? (
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
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {decl.contenido}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {decl.tema_interaccion &&
                        decl.tema_interaccion
                          .split(';')
                          .map((t) => t.trim())
                          .filter(Boolean)
                          .map((t) => (
                            <span key={t} className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                              {t}
                            </span>
                          ))}
                      {decl.canal && (
                        <span className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
                          {decl.canal}
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

            {/* Categorías del feed - columna lateral */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Categorías en el feed</p>
              <div className="rounded-xl border bg-card divide-y">
                {(() => {
                  // Extraer categorías únicas de las declaraciones
                  const categoryMap = new Map<string, number>()
                  recentDeclaraciones.forEach((decl) => {
                    if (decl.tema_interaccion) {
                      categoryMap.set(
                        decl.tema_interaccion,
                        (categoryMap.get(decl.tema_interaccion) || 0) + 1
                      )
                    }
                  })
                  const categories = Array.from(categoryMap.entries())
                    .sort((a, b) => b[1] - a[1])

                  if (categories.length === 0) {
                    return (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Sin categorías
                      </div>
                    )
                  }

                  return categories.map(([cat, count]) => (
                    <Link
                      key={cat}
                      to={`/declaraciones?tema=${encodeURIComponent(cat)}`}
                      className="group flex items-center justify-between p-3 transition-colors hover:bg-muted/30"
                    >
                      <span className="text-sm font-medium truncate">{cat}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                          {count}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Two-column: Candidatos por Cargo + Candidatos Presidenciales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Candidatos por Cargo */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold">Candidatos por Cargo</h2>
            </div>
            <Link
              to="/candidatos"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/candidatos?tipo=PRESIDENCIAL"
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">
                    {formatNumber(cargoCounts['PRESIDENCIAL'] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Presidencial</p>
                </div>
              </div>
            </Link>
            <Link
              to="/candidatos?tipo=DIPUTADOS"
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <UserCheck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">
                    {formatNumber(cargoCounts['DIPUTADOS'] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Diputados</p>
                </div>
              </div>
            </Link>
            <Link
              to="/candidatos?tipo=SENADORES%20DISTRITO%20%C3%9ANICO"
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Vote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">
                    {formatNumber(cargoCounts['SENADORES DISTRITO ÚNICO'] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Senadores (D.Único)</p>
                </div>
              </div>
            </Link>
            <Link
              to="/candidatos?tipo=SENADORES%20DISTRITO%20M%C3%9ALTIPLE"
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <Vote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">
                    {formatNumber(cargoCounts['SENADORES DISTRITO MÚLTIPLE'] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Senadores (D.Múltiple)</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Candidatos Presidenciales */}
        <CandidatosPresidencialesSection
          presidentes={presidentes}
          vice1={vice1}
          vice2={vice2}
        />
      </div>

      {/* Estadística General - Stats Strip */}
      <section>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Estadística General</h2>
        </div>
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

/* ── Candidatos Presidenciales con acordeón ─────────────────────── */
function CandidatosPresidencialesSection({
  presidentes,
  vice1,
  vice2,
}: {
  presidentes: CandidatoCompleto[]
  vice1: CandidatoCompleto[]
  vice2: CandidatoCompleto[]
}) {
  const [showVices, setShowVices] = useState(false)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold">Candidatos Presidenciales</h2>
        </div>
        <Link
          to="/candidatos?tipo=PRESIDENCIAL"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Presidentes - siempre visible */}
      <CandidatoCargoSection
        title="Presidente de la República"
        candidatos={presidentes}
        color="amber"
      />

      {/* Acordeón para Vicepresidentes */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVices(!showVices)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vicepresidentes ({vice1.length + vice2.length})
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${showVices ? 'rotate-180' : ''}`}
          />
        </button>
        {showVices && (
          <div className="border-t p-3 space-y-4">
            <CandidatoCargoSection
              title="Primer Vicepresidente"
              candidatos={vice1}
              color="violet"
            />
            <CandidatoCargoSection
              title="Segundo Vicepresidente"
              candidatos={vice2}
              color="blue"
            />
          </div>
        )}
      </div>
    </section>
  )
}

/* ── Candidato section by cargo ──────────────────────────────────── */
const COLOR_CLASSES = {
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
} as const

function CandidatoCargoSection({
  title,
  candidatos,
  color,
}: {
  title: string
  candidatos: CandidatoCompleto[]
  color: keyof typeof COLOR_CLASSES
}) {
  const colors = COLOR_CLASSES[color]
  const displayList = candidatos.slice(0, 5)
  const remaining = candidatos.length - 5

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">{candidatos.length} candidatos</span>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {displayList.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Cargando...
          </div>
        ) : (
          displayList.map((c, i) => (
            <Link
              key={c.id}
              to={`/candidatos/${c.id}`}
              className="group flex items-center gap-3 p-3 transition-colors hover:bg-muted/30"
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.bg} ${colors.text} text-[10px] font-bold`}>
                {i + 1}
              </span>
              <CandidatoAvatar
                nombre={c.nombre_completo || ''}
                fotoUrl={c.foto_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
                <p className="text-xs text-muted-foreground truncate">{c.partido_nombre}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </Link>
          ))
        )}
        {remaining > 0 && (
          <Link
            to="/candidatos?tipo=PRESIDENCIAL"
            className="block p-2.5 text-center text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            +{remaining} más →
          </Link>
        )}
      </div>
    </div>
  )
}
