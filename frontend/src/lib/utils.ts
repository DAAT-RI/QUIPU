import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy', { locale: es })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "d MMM yyyy, HH:mm", { locale: es })
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0'
  return n.toLocaleString('es-PE')
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export function sourceFromUrl(url: string | null): 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'tv' | 'radio' | 'prensa' | 'plan' | 'otro' {
  if (!url) return 'otro'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  return 'prensa'
}

/** Detects source type from canal name (more comprehensive detection) */
export function sourceFromCanal(canal: string | null): 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'tv' | 'radio' | 'prensa' | 'otro' {
  if (!canal) return 'otro'
  const c = canal.toLowerCase()
  // Social media
  if (c.includes('twitter') || c.includes(' x ') || c === 'x' || c.endsWith('/x')) return 'twitter'
  if (c.includes('facebook') || c.includes('fb')) return 'facebook'
  if (c.includes('instagram') || c.includes('ig')) return 'instagram'
  if (c.includes('tiktok')) return 'tiktok'
  if (c.includes('youtube')) return 'youtube'
  // Traditional media
  if (c.includes('tv') || c.includes('canal') || c.includes('america') || c.includes('latina') || c.includes('willax') || c.includes('atv') || c.includes('panamericana')) return 'tv'
  if (c.includes('radio') || c.includes('rpp') || c.includes('exitosa') || c.includes('capital')) return 'radio'
  // Default to prensa for other news sources
  return 'prensa'
}

/** Strip accents, lowercase, trim, replace spaces with underscores */
export function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, '_')
}

/** Canal is the source account (uppercase); stakeholder is the speaker (mixed case).
 *  Returns true when both refer to the same person — used to avoid showing the name twice. */
export function isRedundantCanal(canal: string | null, stakeholder: string): boolean {
  if (!canal) return true
  const c = canal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const s = stakeholder.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return c === s || c.includes(s) || s.includes(c)
}

/** Returns 'white' or 'black' depending on which has better contrast with the given hex color. */
export function getContrastColor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  // W3C relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#000000' : '#ffffff'
}

const JNE_FOTO_BASE = 'https://plataformaelectoral.jne.gob.pe/Fotos/'

export function buildFotoUrl(fotoUrl: string | null | undefined): string | null {
  if (!fotoUrl) return null
  if (fotoUrl.startsWith('http')) return fotoUrl
  return JNE_FOTO_BASE + fotoUrl
}
