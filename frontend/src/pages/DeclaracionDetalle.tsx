import { useState } from 'react'
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
  ChevronDown,
  ChevronUp,
  Newspaper,
  Hash,
  Building2,
  MapPin,
  Globe,
  Users,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import type { Interaccion } from '@/types/database'

export function DeclaracionDetalle() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const idx = parseInt(searchParams.get('idx') ?? '0', 10)
  const { data: entry, isLoading, isError, refetch } = useDeclaracionEntry(id)

  const [showContexto, setShowContexto] = useState(false)
  const [showOtras, setShowOtras] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (isError || !entry) {
    return <ErrorState message="No se pudo cargar la declaración" onRetry={() => refetch()} />
  }

  // La declaración hero (la que el usuario clickeó)
  const heroDeclaration = entry.interacciones?.[idx]

  // Otras declaraciones del mismo artículo
  const otherDeclarations = (entry.interacciones ?? [])
    .map((i, i_idx) => ({ ...i, idx: i_idx }))
    .filter((i) => i.idx !== idx && i.type === 'declaration')

  // Parse comma/semicolon-separated fields
  const parseList = (str: string | null | undefined, separator = /[,;]/) =>
    str ? str.split(separator).map((s) => s.trim()).filter(Boolean).filter(s => s !== 'N/A') : []

  const keywordsList = parseList(entry.keywords, /,/)
  const orgList = parseList(entry.organizaciones)
  const ubiList = parseList(entry.ubicaciones)
  const paisesList = parseList(entry.paises)

  const hasContexto = keywordsList.length > 0 || orgList.length > 0 || ubiList.length > 0 || paisesList.length > 0

  // Si no hay declaración hero válida, mostrar error
  if (!heroDeclaration) {
    return <ErrorState message="Declaración no encontrada" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/declaraciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a declaraciones
      </Link>

      {/* Hero: LA DECLARACIÓN */}
      <HeroDeclaracion
        declaration={heroDeclaration}
        fecha={entry.fecha}
      />

      {/* Fuente */}
      <FuenteSection
        canal={entry.canal}
        titulo={entry.titulo}
        resumen={entry.resumen}
        ruta={entry.ruta}
        transcripcion={entry.transcripcion}
      />

      {/* Contexto (colapsable) */}
      {hasContexto && (
        <CollapsibleSection
          title="Contexto"
          icon={Hash}
          isOpen={showContexto}
          onToggle={() => setShowContexto(!showContexto)}
          count={keywordsList.length + orgList.length + ubiList.length + paisesList.length}
        >
          <ContextoContent
            keywordsList={keywordsList}
            orgList={orgList}
            ubiList={ubiList}
            paisesList={paisesList}
          />
        </CollapsibleSection>
      )}

      {/* Otras declaraciones del artículo (colapsable) */}
      {otherDeclarations.length > 0 && (
        <CollapsibleSection
          title="Otras declaraciones en este artículo"
          icon={Users}
          isOpen={showOtras}
          onToggle={() => setShowOtras(!showOtras)}
          count={otherDeclarations.length}
        >
          <OtrasDeclaraciones
            declarations={otherDeclarations}
            masterId={id!}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}

/* ── Hero: La declaración principal ─────────────────────────────── */
function HeroDeclaracion({
  declaration,
  fecha,
}: {
  declaration: Interaccion
  fecha: string | null
}) {
  const { data: candidato } = useStakeholderCandidato(declaration.stakeholder)

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {/* Stakeholder + Partido */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Quote className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {candidato ? (
              <Link
                to={`/candidatos/${candidato.id}`}
                className="text-xl font-bold tracking-tight text-primary hover:underline"
              >
                {declaration.stakeholder}
              </Link>
            ) : (
              <h1 className="text-xl font-bold tracking-tight">{declaration.stakeholder}</h1>
            )}
          </div>
          {candidato?.partido_nombre && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {candidato.partido_nombre}
            </p>
          )}
          {fecha && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
              <Calendar size={14} />
              {formatDate(fecha)}
            </div>
          )}
        </div>
      </div>

      {/* La cita */}
      <blockquote className="text-lg leading-relaxed border-l-4 border-primary/50 pl-4 py-2 bg-muted/30 rounded-r-lg">
        «{declaration.content}»
      </blockquote>

      {/* Tema */}
      {declaration.tema && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
            {declaration.tema}
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Fuente ─────────────────────────────────────────────────────── */
function FuenteSection({
  canal,
  titulo,
  resumen,
  ruta,
  transcripcion,
}: {
  canal: string | null
  titulo: string | null
  resumen: string | null
  ruta: string | null
  transcripcion: string | null
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper size={18} className="text-muted-foreground" />
        <h2 className="font-semibold">Fuente</h2>
      </div>

      {canal && (
        <p className="text-sm font-medium">{canal}</p>
      )}

      {titulo && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          "{titulo}"
        </p>
      )}

      {resumen && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {resumen}
        </p>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3 pt-2">
        {ruta && (
          <a
            href={ruta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/30 hover:bg-muted/30 transition-colors"
          >
            <ExternalLink size={14} className="text-primary" />
            Ver fuente original
          </a>
        )}
        {transcripcion && (
          <a
            href={transcripcion}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary/30 hover:bg-muted/30 transition-colors"
          >
            <ExternalLink size={14} className="text-muted-foreground" />
            Transcripción
          </a>
        )}
      </div>
    </div>
  )
}

/* ── Sección colapsable genérica ────────────────────────────────── */
function CollapsibleSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  count,
  children,
}: {
  title: string
  icon: React.ElementType
  isOpen: boolean
  onToggle: () => void
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Icon size={16} className="text-muted-foreground" />
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {count}
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && (
        <div className="border-t p-4">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Contenido del Contexto ─────────────────────────────────────── */
function ContextoContent({
  keywordsList,
  orgList,
  ubiList,
  paisesList,
}: {
  keywordsList: string[]
  orgList: string[]
  ubiList: string[]
  paisesList: string[]
}) {
  return (
    <div className="space-y-4">
      {keywordsList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Hash size={12} /> Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywordsList.map((k) => (
              <span key={k} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {orgList.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Building2 size={12} /> Organizaciones
          </p>
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
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <MapPin size={12} /> Ubicaciones
          </p>
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
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Globe size={12} /> Países
          </p>
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
  )
}

/* ── Otras declaraciones ────────────────────────────────────────── */
function OtrasDeclaraciones({
  declarations,
  masterId,
}: {
  declarations: (Interaccion & { idx: number })[]
  masterId: string
}) {
  return (
    <div className="space-y-2">
      {declarations.map((d) => (
        <Link
          key={d.idx}
          to={`/declaraciones/${masterId}?idx=${d.idx}`}
          className="group flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{d.stakeholder}</p>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              «{d.content}»
            </p>
            {d.tema && (
              <span className="inline-block mt-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                {d.tema}
              </span>
            )}
          </div>
          <ArrowRight size={16} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
        </Link>
      ))}
    </div>
  )
}
