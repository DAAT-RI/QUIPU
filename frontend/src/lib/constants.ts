import type { LucideIcon } from 'lucide-react'
import {
  GraduationCap,
  HeartPulse,
  TrendingUp,
  Shield,
  Briefcase,
  Building,
  Sprout,
  Leaf,
  Scale,
  Cpu,
  Home,
  Bus,
  Palette,
  Users,
  Landmark,
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

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  // --- Plan de Gobierno categories (15) ---
  educacion: { key: 'educacion', label: 'Educacion', icon: GraduationCap, color: '#3B82F6', order: 1, source: 'plan' },
  salud: { key: 'salud', label: 'Salud', icon: HeartPulse, color: '#EF4444', order: 2, source: 'plan' },
  economia: { key: 'economia', label: 'Economia', icon: TrendingUp, color: '#10B981', order: 3, source: 'plan' },
  seguridad: { key: 'seguridad', label: 'Seguridad Ciudadana', icon: Shield, color: '#6366F1', order: 4, source: 'plan' },
  empleo: { key: 'empleo', label: 'Empleo y Trabajo', icon: Briefcase, color: '#F59E0B', order: 5, source: 'plan' },
  infraestructura: { key: 'infraestructura', label: 'Infraestructura', icon: Building, color: '#8B5CF6', order: 6, source: 'plan' },
  agricultura: { key: 'agricultura', label: 'Agricultura', icon: Sprout, color: '#22C55E', order: 7, source: 'plan' },
  medio_ambiente: { key: 'medio_ambiente', label: 'Medio Ambiente', icon: Leaf, color: '#14B8A6', order: 8, source: 'plan' },
  justicia: { key: 'justicia', label: 'Justicia y Anticorrupcion', icon: Scale, color: '#EC4899', order: 9, source: 'plan' },
  tecnologia: { key: 'tecnologia', label: 'Tecnologia e Innovacion', icon: Cpu, color: '#06B6D4', order: 10, source: 'plan' },
  vivienda: { key: 'vivienda', label: 'Vivienda', icon: Home, color: '#F97316', order: 11, source: 'plan' },
  transporte: { key: 'transporte', label: 'Transporte', icon: Bus, color: '#84CC16', order: 12, source: 'plan' },
  cultura: { key: 'cultura', label: 'Cultura y Deporte', icon: Palette, color: '#A855F7', order: 13, source: 'plan' },
  social: { key: 'social', label: 'Programas Sociales', icon: Users, color: '#F43F5E', order: 14, source: 'plan' },
  reforma_estado: { key: 'reforma_estado', label: 'Reforma del Estado', icon: Landmark, color: '#64748B', order: 15, source: 'plan' },
  // --- Declaration temas (from QUIPU_MASTER) ---
  politica: { key: 'politica', label: 'Politica', icon: Megaphone, color: '#6366F1', order: 101, source: 'declaracion' },
  partidos_politicos: { key: 'partidos_politicos', label: 'Partidos Politicos', icon: Flag, color: '#8B5CF6', order: 102, source: 'declaracion' },
  corrupcion_y_transparencia: { key: 'corrupcion_y_transparencia', label: 'Corrupcion y Transparencia', icon: Eye, color: '#F43F5E', order: 103, source: 'declaracion' },
  derechos_humanos: { key: 'derechos_humanos', label: 'Derechos Humanos', icon: Heart, color: '#EC4899', order: 104, source: 'declaracion' },
  desarrollo_social: { key: 'desarrollo_social', label: 'Desarrollo Social', icon: Users, color: '#F97316', order: 105, source: 'declaracion' },
  elecciones_y_sistemas_electorales: { key: 'elecciones_y_sistemas_electorales', label: 'Elecciones y Sistemas Electorales', icon: Vote, color: '#3B82F6', order: 106, source: 'declaracion' },
  gobierno_y_administracion_publica: { key: 'gobierno_y_administracion_publica', label: 'Gobierno y Administracion Publica', icon: Building2, color: '#64748B', order: 107, source: 'declaracion' },
  startups_y_emprendimiento: { key: 'startups_y_emprendimiento', label: 'Startups y Emprendimiento', icon: Rocket, color: '#06B6D4', order: 108, source: 'declaracion' },
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
 * Genera un CategoryConfig para temas de declaraciones que no tienen config explícito.
 * Usa el label original (con tildes) y genera una key normalizada.
 */
export function getDynamicCategoryConfig(label: string, index: number = 0): CategoryConfig {
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
    order: 200 + index,
    source: 'declaracion',
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
