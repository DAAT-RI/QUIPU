import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useCandidato, useCandidatoSiblings, useHojaVida } from '@/hooks/useCandidatos'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatDate, isRedundantCanal } from '@/lib/utils'
import {
  ArrowLeft,
  User,
  GraduationCap,
  Briefcase,
  Scale,
  Wallet,
  MessageSquareQuote,
  ArrowRight,
  Quote,
} from 'lucide-react'

// Human-readable labels for raw DB field names
const FIELD_LABELS: Record<string, string> = {
  anio_desde: 'Año desde',
  anio_hasta: 'Año hasta',
  anio: 'Año',
  centro_estudio: 'Centro de estudio',
  grado: 'Grado',
  concluyo: 'Concluyó',
  carrera: 'Carrera',
  especialidad: 'Especialidad',
  pais: 'País',
  ciudad: 'Ciudad',
  nombre_entidad: 'Entidad',
  cargo: 'Cargo',
  descripcion: 'Descripción',
  materia: 'Materia',
  fallo: 'Fallo',
  tipo: 'Tipo',
  tipo_bien: 'Tipo de bien',
  bien: 'Bien',
  valor: 'Valor',
  moneda: 'Moneda',
  ingreso: 'Ingreso',
  monto: 'Monto',
  nombre: 'Nombre',
  organizacion_politica: 'Organización política',
  fecha_inicio: 'Fecha inicio',
  fecha_fin: 'Fecha fin',
  expediente: 'Expediente',
  juzgado: 'Juzgado',
  delito: 'Delito',
  sentencia: 'Sentencia',
  modalidad: 'Modalidad',
  cumplimiento: 'Cumplimiento',
  demandante: 'Demandante',
  observacion: 'Observación',
  observaciones: 'Observaciones',
  departamento: 'Departamento',
  provincia: 'Provincia',
  distrito: 'Distrito',
  direccion: 'Dirección',
  ruc: 'RUC',
  sector: 'Sector',
  nivel: 'Nivel',
  partida_registral: 'Partida registral',
  sunarp: 'SUNARP',
  marca: 'Marca',
  modelo: 'Modelo',
  placa: 'Placa',
  caracteristicas: 'Características',
  remuneracion: 'Remuneración',
  renta: 'Renta',
  otros_ingresos: 'Otros ingresos',
  total_ingresos: 'Total ingresos',
}

function formatFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Cargo importance: lower number = more important */
function cargoPriority(cargo: string | null): number {
  if (!cargo) return 99
  const c = cargo.toUpperCase()
  if (c.includes('PRESIDENTE DE LA REP')) return 1
  if (c.includes('PRIMER VICEPRESIDENTE') || c.includes('PRIMERA VICEPRESIDENTA')) return 2
  if (c.includes('SEGUNDO VICEPRESIDENTE') || c.includes('SEGUNDA VICEPRESIDENTA')) return 3
  if (c.includes('VICEPRESIDENTE') || c.includes('VICEPRESIDENTA')) return 4
  if (c.includes('SENADOR') || c.includes('SENADORA')) return 5
  if (c.includes('DIPUTADO') || c.includes('DIPUTADA')) return 6
  return 10
}

const tabs = [
  { key: 'resumen', label: 'Resumen', icon: User },
  { key: 'educacion', label: 'Educacion', icon: GraduationCap },
  { key: 'experiencia', label: 'Experiencia', icon: Briefcase },
  { key: 'legal', label: 'Legal', icon: Scale },
  { key: 'patrimonio', label: 'Patrimonio', icon: Wallet },
  { key: 'declaraciones', label: 'Declaraciones', icon: MessageSquareQuote },
]

function renderJsonArray(data: unknown[] | null | undefined, label: string) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Sin registros de {label}
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card divide-y">
      {data.map((item, i) => (
        <div key={i} className="p-4 text-sm">
          {typeof item === 'object' && item !== null
            ? Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                <p key={k}>
                  <span className="font-medium text-muted-foreground">{formatFieldLabel(k)}:</span>{' '}
                  {String(v)}
                </p>
              ))
            : String(item)}
        </div>
      ))}
    </div>
  )
}

export function CandidatoDetalle() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('resumen')

  const {
    data: candidato,
    isLoading: loadingCandidato,
    error: errorCandidato,
  } = useCandidato(id)

  const { data: siblings } = useCandidatoSiblings(candidato?.id, candidato?.dni)
  const { data: hojaVida, isLoading: loadingHoja } = useHojaVida(candidato?.id, candidato?.dni)

  const { data: declaracionesData, isLoading: loadingDeclaraciones } = useDeclaraciones({
    stakeholder: candidato?.apellido_paterno ?? undefined,
    offset: 0,
    limit: 50,
  })

  if (loadingCandidato) return <LoadingSpinner />
  if (errorCandidato)
    return <ErrorState message="No se pudo cargar el candidato" />
  if (!candidato) return <EmptyState message="Candidato no encontrado" />

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        to="/candidatos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a candidatos
      </Link>

      {/* Header Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-5">
          <CandidatoAvatar
            nombre={candidato.nombre_completo || ''}
            fotoUrl={candidato.foto_url}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {candidato.nombre_completo}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {candidato.partido_nombre && (
                <span className="inline-block rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium">
                  {candidato.partido_nombre}
                </span>
              )}
              {/* All candidacies sorted by importance (Presidente first) */}
              {[candidato, ...(siblings ?? [])]
                .sort((a, b) => cargoPriority(a.cargo_postula) - cargoPriority(b.cargo_postula))
                .map((c) => {
                  const isCurrent = c.id === candidato.id
                  return isCurrent ? (
                    <span
                      key={c.id}
                      className="inline-block rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {c.cargo_postula}
                    </span>
                  ) : (
                    <Link
                      key={c.id}
                      to={`/candidatos/${c.id}`}
                      className="inline-block rounded-md bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {c.cargo_postula}
                    </Link>
                  )
                })}
              {candidato.departamento && (
                <span className="text-sm text-muted-foreground">
                  {candidato.departamento}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b overflow-x-auto px-2">
          <div className="flex -mb-px" role="tablist">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.key}`}
                  id={`tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6" role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Informacion General</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Nombre completo" value={candidato.nombre_completo} />
                <InfoRow label="Sexo" value={candidato.sexo} />
                <InfoRow label="Organizacion politica" value={candidato.organizacion_politica} />
                <InfoRow label="Tipo de eleccion" value={candidato.tipo_eleccion} />
                <InfoRow label="Cargo que postula" value={candidato.cargo_postula} />
                <InfoRow label="Departamento" value={candidato.departamento} />
                <InfoRow label="Provincia" value={candidato.provincia} />
                <InfoRow label="Distrito" value={candidato.distrito} />
                <InfoRow label="Estado" value={candidato.estado} />
                <InfoRow
                  label="Fecha de nacimiento"
                  value={candidato.fecha_nacimiento ? formatDate(candidato.fecha_nacimiento) : null}
                />
              </div>
            </div>
          )}

          {activeTab === 'educacion' && (
            <div className="space-y-6">
              {loadingHoja ? (
                <LoadingSpinner />
              ) : (
                <>
                  <SectionHeader icon={GraduationCap} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" title="Educacion Basica" />
                  {hojaVida?.educacion_basica ? (
                    <div className="rounded-xl border bg-card p-4 text-sm">
                      {Object.entries(hojaVida.educacion_basica).map(([k, v]) => (
                        <p key={k}>
                          <span className="font-medium text-muted-foreground">{formatFieldLabel(k)}:</span> {String(v)}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Sin registros de educacion basica
                    </div>
                  )}
                  <SectionHeader icon={GraduationCap} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" title="Educacion Universitaria" />
                  {renderJsonArray(hojaVida?.educacion_universitaria, 'educacion universitaria')}
                  <SectionHeader icon={GraduationCap} color="bg-blue-500/10 text-blue-600 dark:text-blue-400" title="Posgrado" />
                  {renderJsonArray(hojaVida?.posgrado, 'posgrado')}
                </>
              )}
            </div>
          )}

          {activeTab === 'experiencia' && (
            <div className="space-y-6">
              {loadingHoja ? (
                <LoadingSpinner />
              ) : (
                <>
                  <SectionHeader icon={Briefcase} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Experiencia Laboral" />
                  {renderJsonArray(hojaVida?.experiencia_laboral, 'experiencia laboral')}
                  <SectionHeader icon={Briefcase} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Cargos Partidarios" />
                  {renderJsonArray(hojaVida?.cargos_partidarios, 'cargos partidarios')}
                  <SectionHeader icon={Briefcase} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="Cargos de Eleccion Popular" />
                  {renderJsonArray(hojaVida?.cargos_eleccion, 'cargos de eleccion popular')}
                </>
              )}
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="space-y-6">
              {loadingHoja ? (
                <LoadingSpinner />
              ) : (
                <>
                  <SectionHeader icon={Scale} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" title="Sentencias Penales" />
                  <LegalSection data={hojaVida?.sentencias_penales} label="sentencias penales" />
                  <SectionHeader icon={Scale} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" title="Sentencias por Obligaciones" />
                  <LegalSection data={hojaVida?.sentencias_obligaciones} label="sentencias por obligaciones" />
                  <SectionHeader icon={Scale} color="bg-rose-500/10 text-rose-600 dark:text-rose-400" title="Procesos Penales" />
                  <LegalSection data={hojaVida?.procesos_penales} label="procesos penales" />
                </>
              )}
            </div>
          )}

          {activeTab === 'patrimonio' && (
            <div className="space-y-6">
              {loadingHoja ? (
                <LoadingSpinner />
              ) : (
                <>
                  <SectionHeader icon={Wallet} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Bienes Muebles" />
                  {renderJsonArray(hojaVida?.bienes_muebles, 'bienes muebles')}
                  <SectionHeader icon={Wallet} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Bienes Inmuebles" />
                  {renderJsonArray(hojaVida?.bienes_inmuebles, 'bienes inmuebles')}
                  <SectionHeader icon={Wallet} color="bg-amber-500/10 text-amber-600 dark:text-amber-400" title="Ingresos" />
                  {renderJsonArray(hojaVida?.ingresos, 'ingresos')}
                </>
              )}
            </div>
          )}

          {activeTab === 'declaraciones' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <MessageSquareQuote className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">
                  Declaraciones
                  {candidato.apellido_paterno && (
                    <span className="font-normal text-muted-foreground text-sm ml-2">
                      menciones de &quot;{candidato.apellido_paterno}&quot;
                    </span>
                  )}
                </h2>
              </div>
              {loadingDeclaraciones ? (
                <LoadingSpinner />
              ) : !declaracionesData || declaracionesData.data.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No se encontraron declaraciones relacionadas
                </div>
              ) : (
                <div className="space-y-3">
                  {declaracionesData.data.map((d, i) => (
                    <Link
                      key={`${d.master_id}-${i}`}
                      to={`/declaraciones/${d.master_id}`}
                      className="group block rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
                    >
                      <div className="flex items-start gap-3">
                        <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-relaxed">{d.contenido}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">{d.stakeholder}</span>
                            {d.canal && !isRedundantCanal(d.canal, d.stakeholder) && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                                {d.canal}
                              </span>
                            )}
                            {d.tema && (
                              <span className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-medium">
                                {d.tema}
                              </span>
                            )}
                            {d.fecha && <span>{formatDate(d.fecha)}</span>}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors mt-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Helper components ───────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  color,
  title,
}: {
  icon: React.ElementType
  color: string
  title: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || '\u2014'}</p>
    </div>
  )
}

function LegalSection({
  data,
  label,
}: {
  data: unknown[] | null | undefined
  label: string
}) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700 dark:text-green-400">
        Sin registros de {label}
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-destructive/20 divide-y">
      {data.map((item, i) => (
        <div key={i} className="p-4 text-sm bg-destructive/5">
          {typeof item === 'object' && item !== null
            ? Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                <p key={k}>
                  <span className="font-medium">{formatFieldLabel(k)}:</span> {String(v)}
                </p>
              ))
            : String(item)}
        </div>
      ))}
    </div>
  )
}
