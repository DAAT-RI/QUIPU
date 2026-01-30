import { useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useCandidato, useCandidatoSiblings, useHojaVida } from '@/hooks/useCandidatos'
import { useDeclaraciones } from '@/hooks/useDeclaraciones'
import { CandidatoAvatar } from '@/components/ui/CandidatoAvatar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { BackButton } from '@/components/ui/BackButton'
import { formatDate } from '@/lib/utils'
import type { DeclaracionView } from '@/types/database'
import {
  User,
  GraduationCap,
  Briefcase,
  Scale,
  Wallet,
  MessageSquareQuote,
  ArrowRight,
  Quote,
  Hash,
  Newspaper,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  CircleCheck,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

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

function formatFieldValue(value: unknown): string {
  const str = String(value)
  // Replace "0000" year with "Actualidad"
  if (str === '0000' || str === '0') return 'Actualidad'
  return str
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
  { key: 'perfil-mediatico', label: 'Perfil Mediático', icon: BarChart3 },
  { key: 'declaraciones', label: 'Declaraciones', icon: MessageSquareQuote },
  { key: 'resumen', label: 'Bio', icon: User },
  { key: 'educacion', label: 'Educacion', icon: GraduationCap },
  { key: 'experiencia', label: 'Experiencia', icon: Briefcase },
  { key: 'legal', label: 'Legal', icon: Scale },
  { key: 'patrimonio', label: 'Patrimonio', icon: Wallet },
]

// Colors for pie chart
const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(221, 83%, 53%)',    // blue
  'hsl(142, 71%, 45%)',    // green
  'hsl(45, 93%, 47%)',     // amber
  'hsl(0, 84%, 60%)',      // red
  'hsl(280, 65%, 60%)',    // purple
  'hsl(200, 95%, 50%)',    // cyan
  'hsl(340, 82%, 52%)',    // pink
]

// Campos a ocultar en educación y otras secciones
const HIDDEN_FIELDS = ['titulado', 'egresado', 'bachiller', 'anio_titulo', 'anio_bachiller']


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
            ? Object.entries(item as Record<string, unknown>)
                .filter(([k]) => !HIDDEN_FIELDS.includes(k.toLowerCase()))
                .map(([k, v]) => (
                <p key={k}>
                  <span className="font-medium text-muted-foreground">{formatFieldLabel(k)}:</span>{' '}
                  {formatFieldValue(v)}
                </p>
              ))
            : formatFieldValue(item)}
        </div>
      ))}
    </div>
  )
}

function renderExperienciaLaboral(data: unknown[] | null | undefined) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Sin registros de experiencia laboral
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-card divide-y">
      {data.map((item, i) => {
        if (typeof item !== 'object' || item === null) return null
        const exp = item as Record<string, unknown>
        const entidad = String(exp.nombre_entidad || exp.centro_trabajo || exp.empresa || 'Sin especificar')
        const cargo = exp.cargo ? String(exp.cargo) : null
        const desde = exp.anio_desde
        const hasta = exp.anio_hasta
        const periodo = desde && hasta
          ? `${formatFieldValue(desde)} - ${formatFieldValue(hasta)}`
          : hasta
          ? `Hasta ${formatFieldValue(hasta)}`
          : desde
          ? `Desde ${formatFieldValue(desde)}`
          : null
        return (
          <div key={i} className="p-4 text-sm">
            <p className="font-medium">{entidad}</p>
            {cargo && <p className="text-muted-foreground">{cargo}</p>}
            {periodo && <p className="text-xs text-muted-foreground mt-1">{periodo}</p>}
          </div>
        )
      })}
    </div>
  )
}

export function CandidatoDetalle() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('perfil-mediatico')

  const {
    data: candidato,
    isLoading: loadingCandidato,
    error: errorCandidato,
  } = useCandidato(id)

  const { data: siblings } = useCandidatoSiblings(candidato?.id, candidato?.dni)
  const { data: hojaVida, isLoading: loadingHoja } = useHojaVida(candidato?.id, candidato?.dni)

  // Buscar declaraciones donde el stakeholder contenga el apellido o nombres del candidato
  const { data: declaracionesData, isLoading: loadingDeclaraciones } = useDeclaraciones({
    stakeholder: candidato?.apellido_paterno ?? candidato?.nombres ?? undefined,
    offset: 0,
    limit: 100,
  })

  if (loadingCandidato) return <LoadingSpinner />
  if (errorCandidato)
    return <ErrorState message="No se pudo cargar el candidato" />
  if (!candidato) return <EmptyState message="Candidato no encontrado" />

  return (
    <div className="space-y-8">
      {/* Back link */}
      <BackButton fallback="/candidatos" label="Volver a candidatos" />

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
            {/* Estado de Hoja de Vida */}
            {hojaVida?.estado_hv && (
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  hojaVida.estado_hv === 'CONFIRMADA'
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {hojaVida.estado_hv === 'CONFIRMADA' ? <CircleCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {hojaVida.estado_hv}
                </span>
              </div>
            )}
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
          {activeTab === 'perfil-mediatico' && (
            <TabPerfilMediatico
              declaraciones={declaracionesData?.data ?? []}
              totalCount={declaracionesData?.count ?? 0}
              loading={loadingDeclaraciones}
              nombreCandidato={candidato.apellido_paterno ?? candidato.nombre_completo ?? ''}
              onVerDeclaraciones={() => setActiveTab('declaraciones')}
            />
          )}

          {activeTab === 'resumen' && (
            <div className="space-y-6">
              {/* Información General */}
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

              {/* Indicadores de Hoja de Vida */}
              {hojaVida?.indicadores && (
                <>
                  <div className="flex items-center gap-2.5 mt-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Indicadores de Hoja de Vida</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <IndicadorBadge label="Experiencia laboral" value={hojaVida.indicadores.tiene_experiencia_laboral} />
                    <IndicadorBadge label="Educación básica" value={hojaVida.indicadores.tiene_educacion_basica} />
                    <IndicadorBadge label="Educación técnica" value={hojaVida.indicadores.tiene_educacion_tecnica} />
                    <IndicadorBadge label="Educación universitaria" value={hojaVida.indicadores.tiene_educacion_universitaria} />
                    <IndicadorBadge label="Posgrado" value={hojaVida.indicadores.tiene_posgrado} />
                    <IndicadorBadge label="Cargo partidario" value={hojaVida.indicadores.tiene_cargo_partidario} />
                    <IndicadorBadge label="Cargo elección popular" value={hojaVida.indicadores.tiene_cargo_eleccion} />
                    <IndicadorBadge label="Sentencia penal" value={hojaVida.indicadores.tiene_sentencia_penal} negative />
                    <IndicadorBadge label="Sentencia obligación" value={hojaVida.indicadores.tiene_sentencia_obligacion} negative />
                    <IndicadorBadge label="Renuncia a partido" value={hojaVida.indicadores.tiene_renuncia_partido} />
                    <IndicadorBadge label="Declara ingresos" value={hojaVida.indicadores.tiene_ingresos} />
                    <IndicadorBadge label="Tiene inmuebles" value={hojaVida.indicadores.tiene_inmueble} />
                    <IndicadorBadge label="Tiene muebles" value={hojaVida.indicadores.tiene_mueble} />
                  </div>
                </>
              )}

              {/* Verificaciones */}
              {hojaVida?.verificaciones && (
                <>
                  <div className="flex items-center gap-2.5 mt-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-lg font-semibold">Verificaciones Oficiales</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <VerificacionBadge label="SUNEDU" value={hojaVida.verificaciones.sunedu} />
                    <VerificacionBadge label="SUNARP" value={hojaVida.verificaciones.sunarp} />
                    <VerificacionBadge label="MINEDU Técnico" value={hojaVida.verificaciones.minedu_tec} />
                    <VerificacionBadge label="InfoGob" value={hojaVida.verificaciones.infogob} />
                    <VerificacionBadge label="ROP" value={hojaVida.verificaciones.rop} />
                    <VerificacionBadge label="ROP Renuncia" value={hojaVida.verificaciones.rop_renuncia} />
                  </div>
                </>
              )}
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
                          <span className="font-medium text-muted-foreground">{formatFieldLabel(k)}:</span> {formatFieldValue(v)}
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
                  {renderExperienciaLaboral(hojaVida?.experiencia_laboral)}
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
            <TabDeclaracionesMejorado
              declaraciones={declaracionesData?.data ?? []}
              totalCount={declaracionesData?.count ?? 0}
              loading={loadingDeclaraciones}
              nombreCandidato={candidato.apellido_paterno ?? candidato.nombre_completo ?? ''}
            />
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

function IndicadorBadge({
  label,
  value,
  negative = false,
}: {
  label: string
  value: boolean
  negative?: boolean
}) {
  // For negative indicators (sentencias), true = bad, false = good
  const isPositive = negative ? !value : value
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
      isPositive
        ? 'border-green-500/20 bg-green-500/5'
        : 'border-muted bg-muted/30'
    }`}>
      {value ? (
        negative ? (
          <XCircle className="h-4 w-4 text-red-500" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )
      ) : (
        negative ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground/50" />
        )
      )}
      <span className={value && negative ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
        {label}
      </span>
    </div>
  )
}

function VerificacionBadge({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  const hasData = value === 'CON DATOS'
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
      hasData
        ? 'border-green-500/20 bg-green-500/5'
        : 'border-muted bg-muted/30'
    }`}>
      {hasData ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <AlertCircle className="h-4 w-4 text-muted-foreground/50" />
      )}
      <span>{label}</span>
      <span className={`ml-auto text-xs ${hasData ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
        {value || 'Sin datos'}
      </span>
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
                  <span className="font-medium">{formatFieldLabel(k)}:</span> {formatFieldValue(v)}
                </p>
              ))
            : formatFieldValue(item)}
        </div>
      ))}
    </div>
  )
}

/* ── Tab Declaraciones Mejorado ─────────────────────────────────── */
function TabDeclaracionesMejorado({
  declaraciones,
  totalCount,
  loading,
  nombreCandidato,
}: {
  declaraciones: DeclaracionView[]
  totalCount: number
  loading: boolean
  nombreCandidato: string
}) {
  const [filtroTema, setFiltroTema] = useState<string | null>(null)

  // Calcular estadísticas
  const stats = useMemo(() => {
    const temasMap = new Map<string, number>()
    const canalesSet = new Set<string>()

    declaraciones.forEach((d) => {
      if (d.tema_interaccion) {
        temasMap.set(d.tema_interaccion, (temasMap.get(d.tema_interaccion) || 0) + 1)
      }
      if (d.canal) {
        canalesSet.add(d.canal)
      }
    })

    const temasOrdenados = Array.from(temasMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    return {
      total: totalCount,
      temasUnicos: temasMap.size,
      canalesUnicos: canalesSet.size,
      topTemas: temasOrdenados,
    }
  }, [declaraciones, totalCount])

  // Filtrar declaraciones si hay filtro activo
  const declaracionesFiltradas = useMemo(() => {
    if (!filtroTema) return declaraciones
    return declaraciones.filter((d) => d.tema_interaccion === filtroTema)
  }, [declaraciones, filtroTema])

  if (loading) return <LoadingSpinner />

  if (declaraciones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No se encontraron declaraciones de {nombreCandidato}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Declaraciones en Medios</h2>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">declaraciones</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats.temasUnicos}</p>
          <p className="text-xs text-muted-foreground mt-1">categorías</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{stats.canalesUnicos}</p>
          <p className="text-xs text-muted-foreground mt-1">fuentes</p>
        </div>
      </div>

      {/* Categorías más frecuentes (clickeables para filtrar) */}
      {stats.topTemas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Hash size={14} /> Categorías más frecuentes
          </p>
          <div className="flex flex-wrap gap-2">
            {filtroTema && (
              <button
                type="button"
                onClick={() => setFiltroTema(null)}
                className="rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                × Quitar filtro
              </button>
            )}
            {stats.topTemas.map(([tema, count]) => (
              <button
                key={tema}
                type="button"
                onClick={() => setFiltroTema(filtroTema === tema ? null : tema)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filtroTema === tema
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {tema} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de declaraciones */}
      <div className="space-y-3">
        {filtroTema && (
          <p className="text-sm text-muted-foreground">
            Mostrando {declaracionesFiltradas.length} declaraciones sobre "{filtroTema}"
          </p>
        )}
        {declaracionesFiltradas.map((d) => (
          <Link
            key={`${d.master_id}-${d.idx}`}
            to={`/declaraciones/${d.master_id}?idx=${d.idx}`}
            className="group block rounded-xl border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/30"
          >
            <div className="flex items-start gap-3">
              <Quote className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed line-clamp-2">«{d.contenido}»</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {d.canal && (
                    <span className="flex items-center gap-1">
                      <Newspaper size={12} />
                      {d.canal}
                    </span>
                  )}
                  {d.tema_interaccion && d.tema_interaccion.split(/[;,]/).map(t => t.trim()).filter(Boolean).map((tema) => (
                    <span key={tema} className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[11px] font-medium">
                      {tema}
                    </span>
                  ))}
                  {d.fecha && <span>{formatDate(d.fecha)}</span>}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors mt-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ── Tab Perfil Mediático ──────────────────────────────────────────── */
function TabPerfilMediatico({
  declaraciones,
  totalCount,
  loading,
  nombreCandidato,
  onVerDeclaraciones,
}: {
  declaraciones: DeclaracionView[]
  totalCount: number
  loading: boolean
  nombreCandidato: string
  onVerDeclaraciones: () => void
}) {
  // Calcular estadísticas de temas y canales
  const stats = useMemo(() => {
    const temasMap = new Map<string, number>()
    const canalesMap = new Map<string, number>()

    declaraciones.forEach((d) => {
      if (d.tema_interaccion) {
        // Handle multiple topics separated by semicolon
        d.tema_interaccion.split(';').forEach((t) => {
          const tema = t.trim()
          if (tema) {
            temasMap.set(tema, (temasMap.get(tema) || 0) + 1)
          }
        })
      }
      if (d.canal) {
        canalesMap.set(d.canal, (canalesMap.get(d.canal) || 0) + 1)
      }
    })

    // Get top topics for charts
    const topTemas = Array.from(temasMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, fullMark: Math.max(...Array.from(temasMap.values())) }))

    const topCanales = Array.from(canalesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))

    return {
      total: totalCount,
      temasUnicos: temasMap.size,
      canalesUnicos: canalesMap.size,
      topTemas,
      topCanales,
    }
  }, [declaraciones, totalCount])

  if (loading) return <LoadingSpinner />

  if (declaraciones.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No se encontraron declaraciones de {nombreCandidato} en medios
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Perfil Mediático</h2>
        </div>
        <button
          type="button"
          onClick={onVerDeclaraciones}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Ver todas las declaraciones
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">declaraciones</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold">{stats.temasUnicos}</p>
          <p className="text-xs text-muted-foreground mt-1">categorías diferentes</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-3xl font-bold">{stats.canalesUnicos}</p>
          <p className="text-xs text-muted-foreground mt-1">fuentes de medios</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart - Topics */}
        {stats.topTemas.length >= 3 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Hash size={14} className="text-muted-foreground" />
              Categorías de las que más habla
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={stats.topTemas} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                  />
                  <Radar
                    name="Menciones"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value ?? 0} menciones`, '']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Pie Chart - Media Sources */}
        {stats.topCanales.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Newspaper size={14} className="text-muted-foreground" />
              Distribución por fuente
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topCanales}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stats.topCanales.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value ?? 0} declaraciones`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Topic Pills (for quick overview) */}
      {stats.topTemas.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Categorías principales</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topTemas.map(({ name, value }, idx) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
                style={{
                  backgroundColor: `${CHART_COLORS[idx % CHART_COLORS.length]}20`,
                  color: CHART_COLORS[idx % CHART_COLORS.length],
                }}
              >
                {name}
                <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-xs">{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA to see all declarations */}
      <button
        type="button"
        onClick={onVerDeclaraciones}
        className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-center text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        Ver las {stats.total} declaraciones completas →
      </button>
    </div>
  )
}
