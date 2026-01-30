import type { LucideIcon } from 'lucide-react'
import {
  Users, Megaphone, Flag, Eye, Heart, Vote, Building2, Rocket, Tag,
  Stethoscope, Activity, Pill, Syringe, HeartPulse, Brain, Baby,
  GraduationCap, BookOpen, School, Languages,
  TreePine, Leaf, Cloud, Droplets, Sun, Mountain, Fish, Recycle,
  Cpu, Monitor, Smartphone, Wifi, Globe, Database, Shield, Bot, Binary,
  DollarSign, TrendingUp, Briefcase, PiggyBank, LineChart, Receipt,
  Landmark, Scale, Gavel, FileText, ScrollText,
  Car, Plane, Train, Ship, Bus, Bike, Package,
  HandHeart, Home, UserCheck, UsersRound, Handshake,
  Music, Film, Palette, Theater, Newspaper, Tv, Compass, Star,
  Wheat, Apple, UtensilsCrossed, Wine,
  Factory, HardHat, Sparkles,
  Trophy, Dumbbell,
  ShieldAlert, Siren, AlertTriangle, Crosshair, MapPin,
  FlaskConical, Microscope, Atom, Telescope, Dna,
  BadgeCheck, ShieldCheck, Church, Lightbulb, Zap,
} from 'lucide-react'
import { normalizeKey } from './utils'

/** Maps category labels to semantic icons based on keywords */
function getCategoryIcon(label: string): LucideIcon {
  const l = label.toLowerCase()
  // Health
  if (l.includes('salud') || l.includes('médic') || l.includes('medic')) return HeartPulse
  if (l.includes('mental') || l.includes('psicolog')) return Brain
  if (l.includes('vacuna') || l.includes('antibiótico')) return Syringe
  if (l.includes('farmacéutic')) return Pill
  if (l.includes('epidemia') || l.includes('pandemia')) return Activity
  if (l.includes('reproduc') || l.includes('aborto') || l.includes('maternidad')) return Baby
  if (l.includes('trasplante') || l.includes('enfermedad')) return Stethoscope
  // Education
  if (l.includes('educación') || l.includes('educacion') || l.includes('escolar')) return GraduationCap
  if (l.includes('aprendizaje') || l.includes('formación')) return BookOpen
  if (l.includes('infantil') || l.includes('infancia')) return School
  if (l.includes('idioma')) return Languages
  if (l.includes('literatura')) return BookOpen
  // Environment
  if (l.includes('clima')) return Cloud
  if (l.includes('medio ambiente') || l.includes('contaminación')) return Leaf
  if (l.includes('biodiversidad') || l.includes('deforestación')) return TreePine
  if (l.includes('agua') || l.includes('saneamiento') || l.includes('oceanograf')) return Droplets
  if (l.includes('energía') || l.includes('renovable') || l.includes('eléctric')) return Zap
  if (l.includes('reciclaje') || l.includes('residuo') || l.includes('circular')) return Recycle
  if (l.includes('pesca') || l.includes('marítim')) return Fish
  if (l.includes('minería') || l.includes('geolog')) return Mountain
  if (l.includes('parque nacional') || l.includes('ecoturismo')) return TreePine
  if (l.includes('desertificación')) return Sun
  // Technology
  if (l.includes('inteligencia artificial') || l.includes('machine learning') || l.includes('robótica')) return Bot
  if (l.includes('ciberseguridad') || l.includes('cibercrimen') || l.includes('privacidad')) return Shield
  if (l.includes('blockchain') || l.includes('criptomoneda')) return Binary
  if (l.includes('big data') || l.includes('analítica de datos')) return Database
  if (l.includes('computación')) return Cpu
  if (l.includes('internet') || l.includes('iot') || l.includes('5g') || l.includes('telecomunicacion')) return Wifi
  if (l.includes('tecnología') || l.includes('digital')) return Monitor
  if (l.includes('aplicacion') || l.includes('plataforma')) return Smartphone
  if (l.includes('videojuego') || l.includes('esport') || l.includes('realidad virtual')) return Monitor
  if (l.includes('redes sociales')) return Globe
  if (l.includes('innovación')) return Lightbulb
  // Economy
  if (l.includes('economía') || l.includes('económic')) return TrendingUp
  if (l.includes('financier') || l.includes('banca') || l.includes('bolsa')) return LineChart
  if (l.includes('microfinanza') || l.includes('crowdfunding') || l.includes('pensión')) return PiggyBank
  if (l.includes('impuesto') || l.includes('fiscal')) return Receipt
  if (l.includes('inflación') || l.includes('monetaria')) return DollarSign
  if (l.includes('seguro')) return ShieldCheck
  if (l.includes('comercio') || l.includes('retail') || l.includes('consumo')) return Briefcase
  if (l.includes('inmobiliario') || l.includes('bienes raíces') || l.includes('vivienda')) return Home
  // Politics
  if (l.includes('gobierno') || l.includes('administración pública')) return Landmark
  if (l.includes('política') || l.includes('partido')) return Flag
  if (l.includes('elección') || l.includes('electoral') || l.includes('voto')) return Vote
  if (l.includes('corrupción') || l.includes('transparencia')) return Eye
  if (l.includes('legislación') || l.includes('regulación')) return ScrollText
  if (l.includes('justicia') || l.includes('judicial') || l.includes('derecho')) return Scale
  if (l.includes('reforma') || l.includes('penitenciar')) return Gavel
  if (l.includes('diplomátic')) return Globe
  if (l.includes('lobby')) return Megaphone
  // Security
  if (l.includes('seguridad nacional') || l.includes('defensa') || l.includes('fuerzas armadas')) return ShieldAlert
  if (l.includes('seguridad pública') || l.includes('policía')) return Siren
  if (l.includes('terrorismo') || l.includes('narcotráfico') || l.includes('crimen organizado')) return AlertTriangle
  if (l.includes('espionaje') || l.includes('inteligencia')) return Crosshair
  if (l.includes('frontera') || l.includes('territorio')) return MapPin
  // Transportation
  if (l.includes('aviación') || l.includes('aéreo')) return Plane
  if (l.includes('ferroviari') || l.includes('tren')) return Train
  if (l.includes('marítimo') || l.includes('portuari') || l.includes('naval')) return Ship
  if (l.includes('transporte público') || l.includes('movilidad urbana')) return Bus
  if (l.includes('vehículo') || l.includes('automotriz') || l.includes('autónomo')) return Car
  if (l.includes('bicicleta') || l.includes('movilidad sostenible')) return Bike
  if (l.includes('infraestructura vial')) return Car
  if (l.includes('logística') || l.includes('transporte')) return Package
  // Social
  if (l.includes('derechos humanos') || l.includes('lgbtq')) return Heart
  if (l.includes('igualdad') || l.includes('género') || l.includes('diversidad') || l.includes('inclusión')) return UsersRound
  if (l.includes('migración') || l.includes('refugiado')) return Users
  if (l.includes('pobreza') || l.includes('desigualdad') || l.includes('desarrollo social')) return HandHeart
  if (l.includes('violencia') || l.includes('acoso') || l.includes('abuso') || l.includes('bullying')) return ShieldAlert
  if (l.includes('trabajo infantil') || l.includes('explotación laboral') || l.includes('trata de personas')) return AlertTriangle
  if (l.includes('ayuda humanitaria') || l.includes('filantropía') || l.includes('voluntariado') || l.includes('ong')) return HandHeart
  if (l.includes('familia') || l.includes('crianza') || l.includes('adopción')) return Home
  if (l.includes('matrimonio') || l.includes('divorcio') || l.includes('sexualidad')) return Heart
  if (l.includes('tercera edad') || l.includes('juventud')) return Users
  // Labor
  if (l.includes('laboral') || l.includes('empleo')) return Briefcase
  if (l.includes('sindicato') || l.includes('huelga') || l.includes('negociacion')) return Users
  if (l.includes('teletrabajo')) return Monitor
  if (l.includes('reclutamiento') || l.includes('contratación')) return UserCheck
  if (l.includes('automatización') || l.includes('futuro del trabajo')) return Bot
  // Culture
  if (l.includes('cultura') || l.includes('patrimonio cultural') || l.includes('arte') || l.includes('diseño') || l.includes('arquitectura')) return Palette
  if (l.includes('música')) return Music
  if (l.includes('cine') || l.includes('audiovisual') || l.includes('streaming')) return Film
  if (l.includes('teatro') || l.includes('escénic')) return Theater
  if (l.includes('festival')) return Star
  if (l.includes('turismo') || l.includes('viaje') || l.includes('hotelería')) return Compass
  if (l.includes('gastronomía') || l.includes('restaurant') || l.includes('alimento')) return UtensilsCrossed
  if (l.includes('religión') || l.includes('espiritualidad')) return Church
  // Agriculture & Industry
  if (l.includes('agricultura') || l.includes('agroindustria')) return Wheat
  if (l.includes('bebida') || l.includes('alcohol')) return Wine
  if (l.includes('industria')) return Factory
  if (l.includes('construcción')) return HardHat
  if (l.includes('cosmética') || l.includes('higiene') || l.includes('limpieza')) return Sparkles
  if (l.includes('hidrocarburos') || l.includes('petróleo')) return Factory
  // Science
  if (l.includes('investigación') || l.includes('científic')) return FlaskConical
  if (l.includes('biología') || l.includes('genética') || l.includes('biotecnología')) return Dna
  if (l.includes('química')) return FlaskConical
  if (l.includes('física') || l.includes('matemática')) return Atom
  if (l.includes('astronomía') || l.includes('espacial')) return Telescope
  if (l.includes('nanotecnología')) return Microscope
  if (l.includes('antropología') || l.includes('sociología') || l.includes('arqueología') || l.includes('historia') || l.includes('filosofía')) return BookOpen
  if (l.includes('meteorología')) return Cloud
  if (l.includes('geopolítica')) return Globe
  // Business
  if (l.includes('startup') || l.includes('emprendimiento')) return Rocket
  if (l.includes('corporativ') || l.includes('empresarial') || l.includes('consultoría')) return Briefcase
  if (l.includes('cooperativa') || l.includes('cooperación')) return Handshake
  if (l.includes('responsabilidad social') || l.includes('sostenibilidad')) return BadgeCheck
  if (l.includes('propiedad intelectual')) return FileText
  if (l.includes('comunicación') || l.includes('relaciones públicas')) return Megaphone
  if (l.includes('blanqueo') || l.includes('paraíso fiscal') || l.includes('evasión')) return AlertTriangle
  // Media
  if (l.includes('prensa') || l.includes('periodismo')) return Newspaper
  if (l.includes('televisión') || l.includes('tv') || l.includes('radio')) return Tv
  // Sports
  if (l.includes('deporte')) return Trophy
  if (l.includes('fitness') || l.includes('bienestar')) return Dumbbell
  if (l.includes('nutrición') || l.includes('dieta')) return Apple
  // Other
  if (l.includes('desastre') || l.includes('emergencia') || l.includes('prevención')) return AlertTriangle
  if (l.includes('activismo') || l.includes('movimiento social') || l.includes('protesta')) return Megaphone
  if (l.includes('conflicto') || l.includes('guerra')) return AlertTriangle
  if (l.includes('urbanismo') || l.includes('urbano') || l.includes('ciudad') || l.includes('smart cities')) return Building2
  if (l.includes('globalización')) return Globe
  if (l.includes('nacionalismo')) return Flag
  return Tag
}

export type CategorySource = 'plan' | 'declaracion'

export interface CategoryConfig {
  key: string
  label: string
  icon: LucideIcon
  color: string
  order: number
  source: CategorySource
}

// Colores para asignar cíclicamente a las categorías
const PLAN_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#6366F1', '#F59E0B',
  '#8B5CF6', '#22C55E', '#14B8A6', '#EC4899', '#06B6D4',
  '#F97316', '#84CC16', '#A855F7', '#F43F5E', '#64748B',
]

// 247 categorías de Planes de Gobierno (de docs/categorias.json)
export const PLAN_CATEGORY_LABELS = [
  'Aborto y Derechos Reproductivos',
  'Acoso y Abuso',
  'Activismo',
  'Acuerdos Comerciales',
  'Adopción',
  'Agricultura y Agroindustria',
  'Agua y Saneamiento',
  'Alcohol Ilegal y Actividades Ilícitas',
  'Analítica de Datos',
  'Antibióticos y Resistencia',
  'Antropología',
  'Aplicaciones de Transporte Urbano',
  'Aprendizaje en Línea',
  'Arqueología',
  'Arquitectura y Diseño',
  'Arrendamiento de Vehículos',
  'Arte Contemporáneo',
  'Artes y Cultura',
  'Astronomía y Exploración Espacial',
  'Automatización y Futuro del Trabajo',
  'Aviación',
  'Ayuda Humanitaria',
  'Banca Ética',
  'Bebidas',
  'Bienes Raíces',
  'Big Data',
  'Biodiversidad',
  'Biología y Genética',
  'Biotecnología',
  'Blanqueo de Capitales',
  'Blockchain y Criptomonedas',
  'Bullying y Acoso Escolar',
  'Cambio Climático y Medio Ambiente',
  'Cibercrimen',
  'Ciberseguridad',
  'Ciberseguridad Nacional',
  'Cine',
  'Clima',
  'Colonialismo y Postcolonialismo',
  'Comercio Electrónico',
  'Comercio Internacional',
  'Comercio Justo',
  'Computación Cuántica',
  'Comunicación Corporativa y Relaciones Públicas',
  'Conflictos Internacionales',
  'Conservación de Especies',
  'Construcción',
  'Consultoría Empresarial',
  'Consumo de Alcohol y Bebidas Alcohólicas',
  'Consumo Responsable',
  'Contaminación',
  'Cooperación con el Sector Privado',
  'Cooperación Internacional',
  'Cooperativas',
  'Corrupción y Transparencia',
  'Crianza',
  'Crimen Organizado',
  'Crowdfunding',
  'Deforestación',
  'Deportes',
  'Derecho Internacional',
  'Derechos Humanos',
  'Derechos LGBTQ+',
  'Desarrollo Social',
  'Desarrollo Urbano',
  'Desertificación',
  'Diversidad, Equidad e Inclusión (DEI)',
  'Diversificación Empresarial',
  'Economía Circular',
  'Economía Colaborativa',
  'Economía Digital',
  'Economía Informal',
  'Economía Local',
  'Economía Social',
  'Ecoturismo',
  'Educación Continua',
  'Educación Escolar',
  'Educación Especial',
  'Educación Infantil',
  'Educación Sexual',
  'Educación Superior',
  'Elecciones y Sistemas Electorales',
  'Energía Eléctrica',
  'Energías Renovables',
  'Enfermedades Raras',
  'Entretenimiento Audiovisual y Plataformas de Streaming',
  'Epidemias y Pandemias',
  'Espionaje y Inteligencia',
  'Evasión Fiscal',
  'Explotación Laboral',
  'Fabricación de Vehículos',
  'Familia y Relaciones',
  'Festivales Culturales',
  'Filantropía',
  'Filosofía y Ética',
  'Fitness y Bienestar',
  'Formación Profesional',
  'Fronteras y Territorios',
  'Fuerzas Armadas',
  'Física y Matemáticas',
  'Gastronomía',
  'Geología',
  'Geopolítica',
  'Gestión de Residuos Sólidos y Medio Ambiente',
  'Gestión Financiera',
  'Globalización',
  'Gobierno Corporativo',
  'Gobierno Regional y Local',
  'Gobierno y Administración Pública',
  'Hidrocarburos',
  'Higiene y Desinfección',
  'Historia',
  'Homeschooling',
  'Hotelería',
  'Huelgas y Protestas',
  'Idiomas y Multilingüismo',
  'Igualdad de Género',
  'Inclusión Financiera',
  'Industria 4.0',
  'Industria Alimentaria',
  'Industria Cosmética',
  'Industria de Alimentos y Restaurantes',
  'Industria de Defensa',
  'Industria de Entregas y Logística de Última Milla',
  'Industria Manufacturera',
  'Infancia y Derechos del Niño',
  'Inflación y Deflación',
  'Infraestructura Vial',
  'Infraestructura y Desarrollo Portuario',
  'Ingeniería Genética',
  'Inmobiliario',
  'Innovación Tecnológica',
  'Inteligencia Artificial',
  'Intercambio Cultural',
  'Internet de las Cosas (IoT)',
  'Inversión Socialmente Responsable',
  'Investigación Científica',
  'Justicia y Sistema Judicial',
  'Juventud',
  'Legislación de Transporte',
  'Literatura y Crítica Literaria',
  'Lobby y Grupos de Interés',
  'Logística Portuaria y Marítima',
  'Logística y Transporte',
  'Machine Learning',
  'Maternidad y Paternidad',
  'Matrimonio y Divorcio',
  'Medicina Alternativa',
  'Medicina Regenerativa',
  'Mercado Financiero y Bolsa de Valores',
  'Mercado Laboral',
  'Meteorología',
  'Microfinanzas',
  'Migración y Refugiados',
  'Minería',
  'Movilidad Sostenible',
  'Movimientos Sociales',
  'Música',
  'Nacionalismo',
  'Nanotecnología',
  'Narcotráfico',
  'Negociaciones Colectivas',
  'Nutrición y Alimentación Saludable',
  'Nutrición y Dietas',
  'Oceanografía',
  'ONG y Organizaciones Sin Fines de Lucro',
  'Otros',
  'Paraísos Fiscales',
  'Parques Nacionales',
  'Partidos Políticos',
  'Patrimonio Cultural',
  'Pensiones',
  'Pesca',
  'Planificación Familiar',
  'Pobreza y Desigualdad',
  'Política',
  'Política Internacional',
  'Política Monetaria',
  'Prevención y Gestión de Desastres',
  'Privacidad y Protección de Datos',
  'Productos de Limpieza e Higiene Personal',
  'Programas Sociales',
  'Propiedad Intelectual',
  'Prácticas Corporativas y Responsabilidad Empresarial',
  'Psicología',
  'Química',
  'Realidad Virtual y Aumentada',
  'Reciclaje',
  'Reclutamiento y Contratación de Personal',
  'Recursos Naturales',
  'Redes 5G',
  'Redes Sociales',
  'Reforma Penitenciaria',
  'Reformas Laborales',
  'Regulaciones Gubernamentales',
  'Regulaciones y Protección al Consumidor',
  'Regulación de Productos Alimenticios',
  'Relaciones Diplomáticas',
  'Religión y Espiritualidad',
  'Reparto de Alimentos y Bebidas',
  'Reproducción Asistida',
  'Responsabilidad Social Corporativa',
  'Retail',
  'Robótica',
  'Salud Mental',
  'Salud Pública y Sistema de Salud',
  'Salud Reproductiva',
  'Salud y Farmacéutica',
  'Saneamiento',
  'Seguridad Alimentaria',
  'Seguridad Laboral en la Industria de Restaurantes',
  'Seguridad Nacional',
  'Seguridad Pública',
  'Seguridad Vial',
  'Seguros',
  'Servicios Financieros',
  'Sexualidad',
  'Sindicalismo y Derechos Laborales',
  'Sindicatos',
  'Smart Cities',
  'Sociología',
  'Sostenibilidad Empresarial',
  'Startups y Emprendimiento',
  'Supercomputación',
  'Tabaco y Regulación',
  'Teatro y Artes Escénicas',
  'Tecnología y Transformación Digital',
  'Telecomunicaciones',
  'Teletrabajo',
  'Tercera Edad y Envejecimiento',
  'Terrorismo y Contrainsurgencia',
  'Trabajo Infantil',
  'Transporte Ferroviario',
  'Transporte Marítimo',
  'Transporte Público',
  'Transporte y Movilidad Urbana',
  'Trasplantes',
  'Trata de Personas',
  'Turismo y Viajes',
  'Urbanismo',
  'Vacunas',
  'Vehículos Autónomos',
  'Videojuegos y eSports',
  'Violencia de Género',
  'Vivienda Social',
  'Voluntariado',
  'Ética Empresarial',
] as const

// Genera CATEGORY_CONFIG dinámicamente para las 247 categorías de planes
function generatePlanCategories(): Record<string, CategoryConfig> {
  const config: Record<string, CategoryConfig> = {}
  PLAN_CATEGORY_LABELS.forEach((label, index) => {
    const key = normalizeKey(label)
    config[key] = {
      key,
      label,
      icon: getCategoryIcon(label),
      color: PLAN_COLORS[index % PLAN_COLORS.length],
      order: index + 1,
      source: 'plan',
    }
  })
  return config
}

// Declaraciones (temas de QUIPU_MASTER) - labels con tildes como en la BD
const DECLARATION_CONFIG: Record<string, CategoryConfig> = {
  salud_publica_y_sistema_de_salud: { key: 'salud_publica_y_sistema_de_salud', label: 'Salud Pública y Sistema de Salud', icon: HeartPulse, color: '#EF4444', order: 301, source: 'declaracion' },
  seguridad_publica: { key: 'seguridad_publica', label: 'Seguridad Pública', icon: Siren, color: '#F97316', order: 302, source: 'declaracion' },
  desarrollo_economico: { key: 'desarrollo_economico', label: 'Desarrollo Económico', icon: TrendingUp, color: '#22C55E', order: 303, source: 'declaracion' },
  infraestructura: { key: 'infraestructura', label: 'Infraestructura', icon: Building2, color: '#64748B', order: 304, source: 'declaracion' },
  comercio_internacional: { key: 'comercio_internacional', label: 'Comercio Internacional', icon: Globe, color: '#06B6D4', order: 305, source: 'declaracion' },
  transporte_y_movilidad_urbana: { key: 'transporte_y_movilidad_urbana', label: 'Transporte y Movilidad Urbana', icon: Bus, color: '#8B5CF6', order: 306, source: 'declaracion' },
  turismo: { key: 'turismo', label: 'Turismo', icon: Compass, color: '#14B8A6', order: 307, source: 'declaracion' },
  gobierno_regional_y_local: { key: 'gobierno_regional_y_local', label: 'Gobierno Regional y Local', icon: Landmark, color: '#3B82F6', order: 308, source: 'declaracion' },
  politica: { key: 'politica', label: 'Política', icon: Megaphone, color: '#6366F1', order: 309, source: 'declaracion' },
  elecciones_y_sistemas_electorales: { key: 'elecciones_y_sistemas_electorales', label: 'Elecciones y Sistemas Electorales', icon: Vote, color: '#EC4899', order: 310, source: 'declaracion' },
  partidos_politicos: { key: 'partidos_politicos', label: 'Partidos Políticos', icon: Flag, color: '#A855F7', order: 311, source: 'declaracion' },
  corrupcion_y_transparencia: { key: 'corrupcion_y_transparencia', label: 'Corrupción y Transparencia', icon: Eye, color: '#F43F5E', order: 312, source: 'declaracion' },
  educacion_superior: { key: 'educacion_superior', label: 'Educación Superior', icon: GraduationCap, color: '#0EA5E9', order: 313, source: 'declaracion' },
  educacion_escolar: { key: 'educacion_escolar', label: 'Educación Escolar', icon: School, color: '#10B981', order: 314, source: 'declaracion' },
  inclusion_financiera: { key: 'inclusion_financiera', label: 'Inclusión Financiera', icon: PiggyBank, color: '#EAB308', order: 315, source: 'declaracion' },
  desarrollo_social: { key: 'desarrollo_social', label: 'Desarrollo Social', icon: Users, color: '#F97316', order: 316, source: 'declaracion' },
  mineria: { key: 'mineria', label: 'Minería', icon: Mountain, color: '#78716C', order: 317, source: 'declaracion' },
  justicia: { key: 'justicia', label: 'Justicia', icon: Scale, color: '#7C3AED', order: 318, source: 'declaracion' },
  gobierno_y_administracion_publica: { key: 'gobierno_y_administracion_publica', label: 'Gobierno y Administración Pública', icon: Landmark, color: '#64748B', order: 319, source: 'declaracion' },
  derechos_humanos: { key: 'derechos_humanos', label: 'Derechos Humanos', icon: Heart, color: '#EC4899', order: 320, source: 'declaracion' },
  movimientos_sociales: { key: 'movimientos_sociales', label: 'Movimientos Sociales', icon: Megaphone, color: '#F59E0B', order: 321, source: 'declaracion' },
}

// Combinar todas las categorías
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ...generatePlanCategories(),
  ...DECLARATION_CONFIG,
}

export const CATEGORIES_LIST = Object.values(CATEGORY_CONFIG).sort((a, b) => a.order - b.order)
export const PLAN_CATEGORIES = CATEGORIES_LIST.filter((c) => c.source === 'plan')
export const DECLARATION_TEMAS = CATEGORIES_LIST.filter((c) => c.source === 'declaracion')

// Colores para temas dinámicos (se asignan cíclicamente)
const DYNAMIC_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316',
  '#EAB308', '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6',
]

/**
 * Genera un CategoryConfig para temas que no tienen config explícito.
 * Usa el label original (con tildes) y genera una key normalizada.
 * @param label - El nombre de la categoría
 * @param index - Índice para asignar color cíclicamente
 * @param source - Fuente de la categoría ('plan' o 'declaracion')
 */
export function getDynamicCategoryConfig(
  label: string,
  index: number = 0,
  source: CategorySource = 'declaracion'
): CategoryConfig {
  const key = normalizeKey(label)
  // Si ya existe en CATEGORY_CONFIG, devolverlo
  if (CATEGORY_CONFIG[key]) {
    return CATEGORY_CONFIG[key]
  }
  // Generar config dinámico
  return {
    key,
    label,
    icon: getCategoryIcon(label),
    color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length],
    order: source === 'plan' ? 100 + index : 200 + index,
    source,
  }
}

export const SOURCE_CONFIG = {
  twitter: { label: 'X', color: '#000000' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', color: '#000000' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  web: { label: 'Web', color: '#6B7280' },
  tradicional: { label: 'Medio Tradicional', color: '#7C3AED' },
  plan: { label: 'Plan de Gobierno', color: '#10B981' },
  otro: { label: 'Otro', color: '#9CA3AF' },
} as const

export const PAGE_SIZE = 50
