import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategoriaCounts } from '@/hooks/useCategorias'
import { getDynamicCategoryConfig } from '@/lib/constants'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatNumber } from '@/lib/utils'
import { Tags, ArrowRight, FileText, MessageSquareQuote, ChevronDown } from 'lucide-react'
import type { CategoryConfig } from '@/lib/constants'

function CategoryCard({
  cat,
  count,
  total,
}: {
  cat: CategoryConfig
  count: number
  total: number
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const Icon = cat.icon
  return (
    <Link
      to={`/categorias/${cat.key}`}
      className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-all hover:shadow-sm hover:border-primary/30"
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: cat.color + '14' }}
      >
        <Icon className="h-6 w-6" style={{ color: cat.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
            {cat.label}
          </p>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-sm font-bold tabular-nums">{formatNumber(count)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: cat.color,
              }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-14 text-right tabular-nums">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  )
}

export function Categorias() {
  const { data: counts, isLoading } = useCategoriaCounts()
  const [declOpen, setDeclOpen] = useState(true)
  const [plansOpen, setPlansOpen] = useState(true)

  const totalPlans = useMemo(() => {
    if (!counts) return 0
    return Object.values(counts.plans).reduce((s, c) => s + c, 0)
  }, [counts])

  const totalDeclarations = useMemo(() => {
    if (!counts) return 0
    return Object.values(counts.declarations).reduce((s, c) => s + c, 0)
  }, [counts])

  // Generar categorías de planes dinámicamente basado en los datos
  const sortedPlanCats = useMemo(() => {
    if (!counts) return []
    // Crear configs dinámicos para todas las categorías encontradas en planes
    return Object.entries(counts.plans)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([key], index) => {
        const label = counts.planLabels[key] || key
        return getDynamicCategoryConfig(label, index, 'plan')
      })
  }, [counts])

  // Generar temas de declaraciones dinámicamente basado en los datos
  const sortedDeclTemas = useMemo(() => {
    if (!counts) return []
    // Crear configs dinámicos para todos los temas encontrados
    return Object.entries(counts.declarations)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([key], index) => {
        const label = counts.declarationLabels[key] || key
        return getDynamicCategoryConfig(label, index)
      })
  }, [counts])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Tags className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Categorías de planes de gobierno y declaraciones en medios
          </p>
        </div>
      </div>

      {/* Declaration temas — on top */}
      {sortedDeclTemas.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setDeclOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
          >
            <ChevronDown
              className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                declOpen ? 'rotate-0' : '-rotate-90'
              }`}
            />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <MessageSquareQuote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">Categorías en Medios o RRSS</h2>
              <p className="text-xs text-muted-foreground">
                {formatNumber(totalDeclarations)} declaraciones por categoría
              </p>
            </div>
          </button>
          {declOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {sortedDeclTemas.map((cat) => (
                <CategoryCard
                  key={cat.key}
                  cat={cat}
                  count={counts?.declarations[cat.key] || 0}
                  total={totalDeclarations}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Plan de Gobierno categories */}
      <section>
        <button
          type="button"
          onClick={() => setPlansOpen((v) => !v)}
          className="w-full flex items-center gap-2.5 rounded-xl border bg-card px-5 py-4 text-left transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer"
        >
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
              plansOpen ? 'rotate-0' : '-rotate-90'
            }`}
          />
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold">Planes de Gobierno</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumber(totalPlans)} propuestas en {sortedPlanCats.length} categorías
            </p>
          </div>
        </button>
        {plansOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {sortedPlanCats.map((cat) => (
              <CategoryCard
                key={cat.key}
                cat={cat}
                count={counts?.plans[cat.key] || 0}
                total={totalPlans}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
