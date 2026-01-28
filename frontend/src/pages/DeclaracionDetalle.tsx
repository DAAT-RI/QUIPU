import { useParams, Link } from 'react-router-dom'
import { useDeclaracionEntry } from '@/hooks/useDeclaraciones'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft,
  ExternalLink,
  Quote,
  FileText,
  MapPin,
  Building2,
  Hash,
  MessageSquareQuote,
} from 'lucide-react'
import type { Interaccion } from '@/types/database'

export function DeclaracionDetalle() {
  const { id } = useParams()
  const { data: entry, isLoading, isError, refetch } = useDeclaracionEntry(id)

  if (isLoading) return <LoadingSpinner />
  if (isError || !entry) {
    return <ErrorState message="No se pudo cargar la declaracion" onRetry={() => refetch()} />
  }

  const declarations: Interaccion[] =
    entry.interacciones?.filter((i) => i.type === 'declaration') ?? []

  const temasList = entry.temas
    ? entry.temas.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const keywordsList = entry.keywords
    ? entry.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : []

  const orgList = entry.organizaciones
    ? entry.organizaciones.split(',').map((o) => o.trim()).filter(Boolean)
    : []

  const ubiList = entry.ubicaciones
    ? entry.ubicaciones.split(',').map((u) => u.trim()).filter(Boolean)
    : []

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/declaraciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a declaraciones
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
            <MessageSquareQuote className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{entry.canal || 'Declaracion'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(entry.fecha)}</p>
            {entry.ruta && (
              <a
                href={entry.ruta}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink size={14} />
                Ver fuente original
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Resumen */}
      {entry.resumen && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Resumen</h2>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {entry.resumen}
            </p>
          </div>
        </section>
      )}

      {/* Declaraciones */}
      {declarations.length > 0 && (
        <section>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
              <Quote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold">
              Declaraciones ({declarations.length})
            </h2>
          </div>
          <div className="rounded-xl border bg-card divide-y">
            {declarations.map((d, idx) => (
              <div key={idx} className="p-5 space-y-2">
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Quote size={14} className="text-primary shrink-0" />
                  {d.stakeholder}
                </p>
                <blockquote className="text-sm text-muted-foreground border-l-2 border-primary pl-3 leading-relaxed">
                  &laquo;{d.content}&raquo;
                </blockquote>
                {d.tema && (
                  <span className="inline-block rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                    {d.tema}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {temasList.length > 0 && (
          <MetadataCard icon={Hash} color="bg-primary/10 text-primary" title="Temas" items={temasList} variant="default" />
        )}
        {keywordsList.length > 0 && (
          <MetadataCard icon={Hash} color="bg-muted text-muted-foreground" title="Keywords" items={keywordsList} variant="secondary" />
        )}
        {orgList.length > 0 && (
          <MetadataCard icon={Building2} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Organizaciones" items={orgList} variant="outline" />
        )}
        {ubiList.length > 0 && (
          <MetadataCard icon={MapPin} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Ubicaciones" items={ubiList} variant="outline" />
        )}
      </div>
    </div>
  )
}

function MetadataCard({
  icon: Icon,
  color,
  title,
  items,
  variant,
}: {
  icon: React.ElementType
  color: string
  title: string
  items: string[]
  variant: 'default' | 'secondary' | 'outline'
}) {
  const tagStyles = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-muted text-foreground',
    outline: 'border border-border text-foreground',
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${tagStyles[variant]}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
