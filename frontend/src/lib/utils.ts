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

export function sourceFromUrl(url: string | null): 'twitter' | 'facebook' | 'prensa' | 'plan' | 'otro' {
  if (!url) return 'otro'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook'
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

const JNE_FOTO_BASE = 'https://mpesije.jne.gob.pe/apidocs/'

export function buildFotoUrl(fotoUrl: string | null | undefined): string | null {
  if (!fotoUrl) return null
  if (fotoUrl.startsWith('http')) return fotoUrl
  return JNE_FOTO_BASE + fotoUrl
}
