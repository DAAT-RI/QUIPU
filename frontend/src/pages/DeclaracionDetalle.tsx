import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useDeclaracionEntry } from '@/hooks/useDeclaraciones'
import { useStakeholderCandidato } from '@/hooks/useStakeholderCandidato'
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
  Users,
  Globe,
  AtSign,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react'
import type { Interaccion } from '@/types/database'

type TabKey = 'declaraciones' | 'fuente' | 'contexto' | 'menciones'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'declaraciones', label: 'Declaraciones', icon: Quote },
  { key: 'fuente', label: 'Fuente', icon: FileText },
  { key: 'contexto', label: 'Contexto', icon: Users },
  { key: 'menciones', label: 'Menciones', icon: AtSign },
]

export function DeclaracionDetalle() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const highlightIdx = parseInt(searchParams.get('idx') ?? '-1', 10)
  const { data: entry, isLoading, isError, refetch } = useDeclaracionEntry(id)
  const [activeTab, setActiveTab] = useState<TabKey>('declaraciones')

  if (isLoading) return <LoadingSpinner />
  if (isError || !entry) {
    return <ErrorState message="No se pudo cargar la declaración" onRetry={() => refetch()} />
  }

  // Preserve original index for highlighting from URL param
  const declarationsWithIdx = (entry.interacciones ?? [])
    .map((i, idx) => ({ ...i, originalIdx: idx }))
    .filter((i) => i.type === 'declaration')

  const mentionsWithIdx = (entry.interacciones ?? [])
    .map((i, idx) => ({ ...i, originalIdx: idx }))
    .filter((i) => i.type === 'mention')

  // For counting (legacy)
  const declarations = declarationsWithIdx
  const mentions = mentionsWithIdx

  // Parse comma/semicolon-separated fields
  const parseList = (str: string | null | undefined, separator = /[,;]/) =>
    str ? str.split(separator).map((s) => s.trim()).filter(Boolean).filter(s => s !== 'N/A') : []

  const temasList = parseList(entry.temas, /;/)
  const keywordsList = parseList(entry.keywords, /,/)
  const orgList = parseList(entry.organizaciones)
  const ubiList = parseList(entry.ubicaciones)
  const paisesList = parseList(entry.paises)

  // Parse personas (format: "Nombre (descripción)")
  const personasList = entry.personas
    ? entry.personas.split(/(?<=\))\s*[;,]\s*(?=[A-Z])/).map((p) => {
        const match = p.match(/^([^(]+)\s*\(([^)]+)\)$/)
        if (match) {
          return { nombre: match[1].trim(), descripcion: match[2].trim() }
        }
        return { nombre: p.trim(), descripcion: null }
      }).filter(p => p.nombre)
    : []

  return (
    <div className="space-y-6">
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
            <h1 className="text-xl font-bold tracking-tight">{entry.canal || 'Declaración'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(entry.fecha)}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Quote size={14} className="text-primary" />
                {declarations.length} declaraciones
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AtSign size={14} />
                {mentions.length} menciones
              </span>
              {entry.ruta && (
                <a
                  href={entry.ruta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink size={14} />
                  Ver fuente
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const count = tab.key === 'declaraciones' ? declarations.length :
                       tab.key === 'menciones' ? mentions.length : null
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {count !== null && count > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'declaraciones' && (
          <TabDeclaraciones declarations={declarationsWithIdx} highlightIdx={highlightIdx} />
        )}
        {activeTab === 'fuente' && (
          <TabFuente entry={entry} temasList={temasList} keywordsList={keywordsList} />
        )}
        {activeTab === 'contexto' && (
          <TabContexto
            personasList={personasList}
            orgList={orgList}
            ubiList={ubiList}
            paisesList={paisesList}
          />
        )}
        {activeTab === 'menciones' && (
          <TabMenciones mentions={mentions} />
        )}
      </div>
    </div>
  )
}

// Tab: Declaraciones (PRINCIPAL)
type InteraccionWithIdx = Interaccion & { originalIdx: number }

function TabDeclaraciones({
  declarations,
  highlightIdx,
}: {
  declarations: InteraccionWithIdx[]
  highlightIdx: number
}) {
  const highlightRef = useRef<HTMLDivElement>(null)

  // Scroll to highlighted item when loaded
  useEffect(() => {
    if (highlightRef.current && highlightIdx >= 0) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [highlightIdx])

  if (declarations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        No hay declaraciones en esta entrada
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card divide-y">
      {declarations.map((d) => (
        <div
          key={d.originalIdx}
          ref={d.originalIdx === highlightIdx ? highlightRef : null}
          className={d.originalIdx === highlightIdx ? 'ring-2 ring-primary bg-primary/5 rounded-lg' : ''}
        >
          <DeclarationItem declaration={d} />
        </div>
      ))}
    </div>
  )
}

function DeclarationItem({ declaration }: { declaration: Interaccion }) {
  // Try to link stakeholder to candidato
  const { data: candidato } = useStakeholderCandidato(declaration.stakeholder)

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Quote size={14} className="text-primary shrink-0" />
        {candidato ? (
          <Link
            to={`/candidatos/${candidato.id}`}
            className="font-semibold text-sm text-primary hover:underline"
          >
            {declaration.stakeholder}
          </Link>
        ) : (
          <span className="font-semibold text-sm">{declaration.stakeholder}</span>
        )}
        {candidato && (
          <span className="text-xs text-muted-foreground">
            ({candidato.partido_nombre})
          </span>
        )}
      </div>
      <blockquote className="text-sm text-foreground border-l-2 border-primary/50 pl-3 leading-relaxed">
        «{declaration.content}»
      </blockquote>
      {declaration.tema && (
        <span className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
          {declaration.tema}
        </span>
      )}
    </div>
  )
}

// Tab: Fuente (resumen del ARTÍCULO)
function TabFuente({
  entry,
  temasList,
  keywordsList,
}: {
  entry: { titulo?: string | null; resumen?: string | null; fecha?: string | null; ruta?: string | null; transcripcion?: string | null }
  temasList: string[]
  keywordsList: string[]
}) {
  return (
    <div className="space-y-4">
      {/* Título */}
      {entry.titulo && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Título del artículo/post</h3>
          <p className="text-sm leading-relaxed">{entry.titulo}</p>
        </div>
      )}

      {/* Resumen */}
      {entry.resumen && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Resumen (generado por IA)</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{entry.resumen}</p>
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        {entry.ruta && (
          <a
            href={entry.ruta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm hover:border-primary/30 transition-colors"
          >
            <ExternalLink size={16} className="text-primary" />
            Fuente original
          </a>
        )}
        {entry.transcripcion && (
          <a
            href={entry.transcripcion}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm hover:border-primary/30 transition-colors"
          >
            <LinkIcon size={16} className="text-muted-foreground" />
            Transcripción completa
          </a>
        )}
      </div>

      {/* Temas y Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {temasList.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={16} className="text-primary" />
              <h3 className="text-sm font-semibold">Temas</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {temasList.map((t) => (
                <span key={t} className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {keywordsList.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hash size={16} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold">Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {keywordsList.map((k) => (
                <span key={k} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Tab: Contexto
function TabContexto({
  personasList,
  orgList,
  ubiList,
  paisesList,
}: {
  personasList: { nombre: string; descripcion: string | null }[]
  orgList: string[]
  ubiList: string[]
  paisesList: string[]
}) {
  const hasContent = personasList.length > 0 || orgList.length > 0 || ubiList.length > 0 || paisesList.length > 0

  if (!hasContent) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        No hay información de contexto disponible
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Personas mencionadas con descripciones */}
      {personasList.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">Personas mencionadas</h3>
          </div>
          <div className="space-y-3">
            {personasList.map((p, idx) => (
              <div key={idx} className="border-l-2 border-muted pl-3">
                <p className="font-medium text-sm">{p.nombre}</p>
                {p.descripcion && (
                  <p className="text-xs text-muted-foreground mt-0.5">{p.descripcion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Orgs, Ubicaciones, Países */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orgList.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold">Organizaciones</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {orgList.map((o) => (
                <span key={o} className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-medium">
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}
        {ubiList.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold">Ubicaciones</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ubiList.map((u) => (
                <span key={u} className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-medium">
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}
        {paisesList.length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold">Países</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {paisesList.map((p) => (
                <span key={p} className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-0.5 text-[11px] font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Tab: Menciones (SECUNDARIO - puede tener ruido)
function TabMenciones({ mentions }: { mentions: Interaccion[] }) {
  if (mentions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
        No hay menciones en esta entrada
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle size={16} />
        Las menciones pueden contener ruido o información no relevante
      </div>

      <div className="rounded-xl border bg-card divide-y">
        {mentions.map((m, idx) => (
          <div key={idx} className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AtSign size={14} className="text-muted-foreground shrink-0" />
              <span className="font-medium text-sm">{m.stakeholder}</span>
            </div>
            <p className="text-sm text-muted-foreground pl-6">{m.content}</p>
            {m.tema && (
              <span className="ml-6 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                {m.tema}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
