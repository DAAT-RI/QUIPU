import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function parseCSV(text: string): string[][] {
  const delimiter = text.includes(';') ? ';' : ','
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, '')))
}

export function extractDNIs(rows: string[][]): string[] {
  if (rows.length < 1) return []

  // Buscar columna DNI en el header
  const header = rows[0].map(h => h.toLowerCase())
  let dniIndex = header.findIndex(h => h === 'dni' || h === 'documento' || h === 'doc')

  // Si no hay header, asumir primera columna
  if (dniIndex === -1) dniIndex = 0

  // Extraer DNIs (ignorando header si existe)
  const startRow = header.some(h => h === 'dni' || h === 'documento' || h === 'doc') ? 1 : 0

  return rows
    .slice(startRow)
    .map(row => row[dniIndex]?.trim())
    .filter(dni => dni && /^\d{7,8}$/.test(dni)) // Solo DNIs válidos (7-8 dígitos)
}

export function useValidateCandidatosCSV() {
  return useMutation({
    mutationFn: async (dnis: string[]) => {
      // Buscar candidatos por DNI
      const { data, error } = await supabase
        .from('quipu_candidatos')
        .select('id, dni, nombre_completo')
        .in('dni', dnis)

      if (error) throw error

      const found = data ?? []
      const foundDNIs = new Set(found.map(c => c.dni))
      const notFound = dnis.filter(dni => !foundDNIs.has(dni))

      return { found, notFound, total: dnis.length }
    },
  })
}
