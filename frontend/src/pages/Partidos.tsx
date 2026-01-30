import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePartidos } from '@/hooks/usePartidos'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { BackButton } from '@/components/ui/BackButton'
import { formatNumber } from '@/lib/utils'
import { Building2, Users, FileText, ArrowRight } from 'lucide-react'

export function Partidos() {
  const [search, setSearch] = useState('')

  const { data: partidos, isLoading, error } = usePartidos(search || undefined)

  const count = partidos?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Back to Dashboard */}
      <BackButton fallback="/" label="Volver al Dashboard" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Partidos Politicos</h1>
          <p className="text-sm text-muted-foreground">
            {formatNumber(count)} partidos registrados
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-card p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar partido..."
          className="sm:w-80"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-destructive">
          Error al cargar partidos
        </div>
      ) : count === 0 ? (
        <EmptyState
          message="No se encontraron partidos"
          icon={Building2}
        />
      ) : (
        <div className="rounded-xl border bg-card divide-y">
          {partidos!.map((p) => (
            <Link
              key={p.id}
              to={`/partidos/${p.id}`}
              className="group flex items-center gap-4 p-5 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                <Building2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {p.nombre_oficial}
                </p>
                {p.candidato_presidencial && (
                  <p className="text-xs text-primary mt-0.5 truncate">{p.candidato_presidencial}</p>
                )}
                <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {formatNumber(p.total_candidatos)} candidatos
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={12} /> {formatNumber(p.total_promesas)} propuestas
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
