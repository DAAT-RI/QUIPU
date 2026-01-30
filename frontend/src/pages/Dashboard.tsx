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
  Globe,
} from 'lucide-react'

import { useDashboardStats, useDeclaracionesPorTema, useTopPartidosByDeclaraciones } from '@/hooks/useDashboardStats'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { useCandidatoCountByTipo, useCandidatosByCargo } from '@/hooks/useCandidatos'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { getDynamicCategoryConfig } from '@/lib/constants'
import { formatNumber, formatDate, isRedundantCanal } from '@/lib/utils'
import type { CandidatoCompleto } from '@/types/database'

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: porTema, isLoading: catLoading } = useDeclaracionesPorTema()
  const { data: topPartidos, isLoading: partidosLoading } = useTopPartidosByDeclaraciones()
  const { data: declaracionesResult, isLoading: declLoading } = useDeclaraciones({
    offset: 0,
    limit: 5,
  })

  // Get presidential candidates by cargo type (separated)
  const { data: presidentesData } = useCandidatosByCargo('PRESIDENTE DE LA REPÚBLICA', 50)
  const { data: vice1Data } = useCandidatosByCargo('PRIMER VICEPRESIDENTE DE LA REPÚBLICA', 50)
  const { data: vice2Data } = useCandidatosByCargo('SEGUNDO VICEPRESIDENTE DE LA REPÚBLICA', 50)

  // Get candidate counts by cargo type
  const { data: cargoCountsData } = useCandidatoCountByTipo()
  const cargoCounts = cargoCountsData ?? {}

  const recentDeclaraciones = declaracionesResult?.data ?? []
  const presidentes = presidentesData?.data ?? []
  const vice1 = vice1Data?.data ?? []
  const vice2 = vice2Data?.data ?? []

  // Build topic cards — top 6 topics from declarations, sorted by count
  const topicCards = useMemo(() => {
    if (!porTema) return []
    const total = porTema.reduce((s, c) => s + c.count, 0)
    return porTema.slice(0, 6).map((item, index) => {
      const cfg = getDynamicCategoryConfig(item.tema, index, 'declaracion')
      return {
        key: cfg.key,
        label: item.tema, // Keep original tema label for filtering
        icon: cfg.icon,
        color: cfg.color,
        count: item.count,
        pct: total > 0 ? (item.count / total) * 100 : 0,
      }
    })
  }, [porTema])

  // Build partido ranking by declarations
  const partidoRanking = useMemo(() => {
    if (!topPartidos) return []
    return topPartidos.slice(0, 5).map((p, i) => ({
      rank: i + 1,
      id: p.id,
      nombre: p.nombre_oficial,
      candidato: p.candidato_presidencial,
      declaraciones: p.total_declaraciones,
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

      {/* Categorías Más Discutidas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Categorías Más Discutidas</h2>
          </div>
          <Link
            to="/declaraciones"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Ver todas las declaraciones
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
                  to={`/declaraciones?tema=${encodeURIComponent(topic.label)}`}
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
        ) : partidoRanking.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No se encontraron declaraciones vinculadas a partidos.
          </div>
        ) : (
          <div className="rounded-xl border bg-card divide-y">
            {partidoRanking.map((p) => {
              const maxDecl = partidoRanking[0]?.declaraciones || 1
              const barPct = (p.declaraciones / maxDecl) * 100
              return (
                <Link
                  key={p.rank}
                  to={`/partidos/${p.id}`}
                  className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/30"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                    {p.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate">{p.nombre}</p>
                      <span className="text-sm font-bold shrink-0 ml-2 tabular-nums">
                        {formatNumber(p.declaraciones)} <span className="text-xs font-normal text-muted-foreground">declaraciones</span>
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
            <h2 className="text-lg font-semibold">Feed de declaraciones recientes</h2>
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
                  // Extraer categorías únicas de las declaraciones (tema_interaccion puede tener múltiples separadas por ;)
                  const categoryMap = new Map<string, number>()
                  recentDeclaraciones.forEach((decl) => {
                    if (decl.tema_interaccion) {
                      // Separar por ; y contar cada categoría individualmente
                      const cats = decl.tema_interaccion.split(';').map(c => c.trim()).filter(c => c)
                      cats.forEach(cat => {
                        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1)
                      })
                    }
                  })
                  const categories = Array.from(categoryMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10) // Limitar a top 10 categorías

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

      {/* Candidatos Presidenciales - Full width expanded */}
      <CandidatosPresidencialesSection
        presidentes={presidentes}
        vice1={vice1}
        vice2={vice2}
      />

      {/* Two-column: Candidatos por Cargo + Estadística General */}
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
            <Link
              to="/candidatos?tipo=PARLAMENTO_ANDINO"
              className="group rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight">
                    {formatNumber(cargoCounts['PARLAMENTO_ANDINO'] || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Parlamento Andino</p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Estadística General */}
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
            <div className="grid grid-cols-2 gap-3">
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

/* ── Candidatos Presidenciales expandido ─────────────────────── */
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

      {/* Presidentes - Grid expandido */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Presidente de la República</p>
          <span className="text-xs text-muted-foreground">{presidentes.length} candidatos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {presidentes.slice(0, 12).map((c, i) => (
            <Link
              key={c.id}
              to={`/candidatos/${c.id}`}
              className="group rounded-xl border bg-card p-3 transition-all hover:shadow-sm hover:border-primary/30 text-center"
            >
              <div className="relative">
                <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                  {i + 1}
                </span>
                <CandidatoAvatar
                  nombre={c.nombre_completo || ''}
                  fotoUrl={c.foto_url}
                  size="lg"
                  className="mx-auto mb-2"
                />
              </div>
              <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
              <p className="text-xs text-muted-foreground truncate">{c.partido_nombre}</p>
            </Link>
          ))}
          {presidentes.length > 12 && (
            <Link
              to="/candidatos?tipo=PRESIDENCIAL"
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-3 transition-all hover:border-primary hover:bg-primary/5"
            >
              <span className="text-lg font-bold text-muted-foreground">+{presidentes.length - 12}</span>
              <span className="text-xs text-muted-foreground">más</span>
            </Link>
          )}
        </div>
      </div>

      {/* Acordeón para Vicepresidentes */}
      <div className="rounded-xl border border-l-4 border-l-violet-500 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowVices(!showVices)}
          className="w-full flex items-center gap-2 p-3 text-sm font-medium bg-gradient-to-r from-violet-500/10 to-transparent hover:from-violet-500/20 transition-all"
        >
          <ChevronDown
            className={`h-4 w-4 text-violet-500 transition-transform duration-200 ${showVices ? 'rotate-180' : ''}`}
          />
          <Users className="h-4 w-4 text-violet-700 dark:text-violet-300" />
          <span className="text-violet-700 dark:text-violet-300">
            Vicepresidentes ({vice1.length + vice2.length})
          </span>
        </button>
        {showVices && (
          <div className="border-t p-4 space-y-6">
            <CandidatoCargoSection
              title="Primer Vicepresidente"
              candidatos={vice1}
              color="violet"
              expanded={true}
            />
            <CandidatoCargoSection
              title="Segundo Vicepresidente"
              candidatos={vice2}
              color="blue"
              expanded={true}
            />
            {/* Botón colapsar en esquina inferior izquierda */}
            <button
              type="button"
              onClick={() => setShowVices(false)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="h-4 w-4 rotate-180" />
              Colapsar
            </button>
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
  expanded = false,
}: {
  title: string
  candidatos: CandidatoCompleto[]
  color: keyof typeof COLOR_CLASSES
  expanded?: boolean
}) {
  const colors = COLOR_CLASSES[color]
  const displayCount = expanded ? 12 : 5
  const displayList = candidatos.slice(0, displayCount)
  const remaining = candidatos.length - displayCount

  if (expanded) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span className="text-xs text-muted-foreground">{candidatos.length} candidatos</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {displayList.map((c, i) => (
            <Link
              key={c.id}
              to={`/candidatos/${c.id}`}
              className="group rounded-xl border bg-muted/30 p-3 transition-all hover:shadow-sm hover:border-primary/30 text-center"
            >
              <div className="relative">
                <span className={`absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full ${colors.bg} ${colors.text} text-[10px] font-bold`}>
                  {i + 1}
                </span>
                <CandidatoAvatar
                  nombre={c.nombre_completo || ''}
                  fotoUrl={c.foto_url}
                  size="lg"
                  className="mx-auto mb-2"
                />
              </div>
              <p className="text-sm font-medium truncate">{c.nombre_completo}</p>
              <p className="text-xs text-muted-foreground truncate">{c.partido_nombre}</p>
            </Link>
          ))}
          {remaining > 0 && (
            <Link
              to="/candidatos?tipo=PRESIDENCIAL"
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 p-3 transition-all hover:border-primary hover:bg-primary/5"
            >
              <span className="text-lg font-bold text-muted-foreground">+{remaining}</span>
              <span className="text-xs text-muted-foreground">más</span>
            </Link>
          )}
        </div>
      </div>
    )
  }

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
