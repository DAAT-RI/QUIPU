import type { LucideIcon } from 'lucide-react'
import {
  Users,
  Megaphone,
  Flag,
  Eye,
  Heart,
  Vote,
  Building2,
  Rocket,
  Tag,
} from 'lucide-react'
import { normalizeKey } from './utils'

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
      icon: Tag,
      color: PLAN_COLORS[index % PLAN_COLORS.length],
      order: index + 1,
      source: 'plan',
    }
  })
  return config
}

// Declaraciones (temas de QUIPU_MASTER)
const DECLARATION_CONFIG: Record<string, CategoryConfig> = {
  politica: { key: 'politica', label: 'Politica', icon: Megaphone, color: '#6366F1', order: 301, source: 'declaracion' },
  partidos_politicos: { key: 'partidos_politicos', label: 'Partidos Politicos', icon: Flag, color: '#8B5CF6', order: 302, source: 'declaracion' },
  corrupcion_y_transparencia: { key: 'corrupcion_y_transparencia', label: 'Corrupcion y Transparencia', icon: Eye, color: '#F43F5E', order: 303, source: 'declaracion' },
  derechos_humanos: { key: 'derechos_humanos', label: 'Derechos Humanos', icon: Heart, color: '#EC4899', order: 304, source: 'declaracion' },
  desarrollo_social: { key: 'desarrollo_social', label: 'Desarrollo Social', icon: Users, color: '#F97316', order: 305, source: 'declaracion' },
  elecciones_y_sistemas_electorales: { key: 'elecciones_y_sistemas_electorales', label: 'Elecciones y Sistemas Electorales', icon: Vote, color: '#3B82F6', order: 306, source: 'declaracion' },
  gobierno_y_administracion_publica: { key: 'gobierno_y_administracion_publica', label: 'Gobierno y Administracion Publica', icon: Building2, color: '#64748B', order: 307, source: 'declaracion' },
  startups_y_emprendimiento: { key: 'startups_y_emprendimiento', label: 'Startups y Emprendimiento', icon: Rocket, color: '#06B6D4', order: 308, source: 'declaracion' },
}

// Combinar todas las categorías
export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  ...generatePlanCategories(),
  ...DECLARATION_CONFIG,
}

export const CATEGORIES_LIST = Object.values(CATEGORY_CONFIG).sort((a, b) => a.order - b.order)
export const PLAN_CATEGORIES = CATEGORIES_LIST.filter((c) => c.source === 'plan')
export const DECLARATION_TEMAS = CATEGORIES_LIST.filter((c) => c.source === 'declaracion')

export const QUIPU_MASTER_TEMAS = [
  'Politica',
  'Partidos Politicos',
  'Corrupcion y Transparencia',
  'Derechos Humanos',
  'Desarrollo Social',
  'Elecciones y Sistemas Electorales',
  'Gobierno y Administracion Publica',
  'Startups y Emprendimiento',
] as const

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
    icon: Tag,
    color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length],
    order: source === 'plan' ? 100 + index : 200 + index,
    source,
  }
}

export const SOURCE_CONFIG = {
  twitter: { label: 'Twitter/X', color: '#1DA1F2' },
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', color: '#000000' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  prensa: { label: 'Prensa', color: '#6B7280' },
  tv: { label: 'TV', color: '#7C3AED' },
  radio: { label: 'Radio', color: '#F59E0B' },
  plan: { label: 'Plan de Gobierno', color: '#10B981' },
  otro: { label: 'Otro', color: '#9CA3AF' },
} as const

export const PAGE_SIZE = 50
