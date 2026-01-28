import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Users, X, ArrowRight, Map } from 'lucide-react'

import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatNumber, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO',
  'CAJAMARCA', 'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO',
  'ICA', 'JUNIN', 'LA LIBERTAD', 'LAMBAYEQUE', 'LIMA',
  'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA',
  'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI',
] as const

// ---------------------------------------------------------------------------
// Custom hooks
// ---------------------------------------------------------------------------

function useDepartmentStats() {
  return useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_candidatos')
        .select('departamento')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data) {
        if (row.departamento) {
          counts[row.departamento] = (counts[row.departamento] || 0) + 1
        }
      }
      return counts
    },
  })
}

function useDepartmentParties(departamento: string | null) {
  return useQuery({
    queryKey: ['department-parties', departamento],
    enabled: !!departamento,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quipu_candidatos')
        .select('organizacion_politica')
        .eq('departamento', departamento!)
      if (error) throw error

      const partyCounts: Record<string, number> = {}
      for (const row of data) {
        const party = row.organizacion_politica ?? 'Sin partido'
        partyCounts[party] = (partyCounts[party] || 0) + 1
      }

      return Object.entries(partyCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    },
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getHeatColor(count: number, max: number): string {
  if (max === 0) return 'hsl(var(--muted))'
  const intensity = count / max
  const h = 221
  const s = 83
  const l = Math.round(95 - intensity * 50) // 95% (light) to 45% (dark)
  return `hsl(${h}, ${s}%, ${l}%)`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapaElectoral() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null)

  const { data: counts = {}, isLoading } = useDepartmentStats()
  const { data: topParties, isLoading: partiesLoading } = useDepartmentParties(selectedDept)

  const maxCount = Math.max(...Object.values(counts), 1)

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
          <Map className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mapa Electoral</h1>
          <p className="text-sm text-muted-foreground">
            Distribucion de candidatos por departamento
          </p>
        </div>
      </div>

      {/* Main content: grid + sidebar */}
      <div className="flex gap-6">
        {/* Department grid */}
        <div className="flex-1 grid grid-cols-5 gap-2">
          {DEPARTMENTS.map((dept) => {
            const count = counts[dept] || 0
            const isSelected = selectedDept === dept
            const isDark = count > maxCount * 0.5

            return (
              <button
                key={dept}
                onClick={() =>
                  setSelectedDept(isSelected ? null : dept)
                }
                className={cn(
                  'rounded-xl p-4 text-center transition-all hover:scale-105 cursor-pointer border border-transparent',
                  isSelected && 'ring-2 ring-primary shadow-lg'
                )}
                style={{
                  backgroundColor: getHeatColor(count, maxCount),
                  color: isDark ? 'white' : 'inherit',
                }}
              >
                <p className="text-xs font-medium truncate">{dept}</p>
                <p className="text-lg font-bold tabular-nums">{formatNumber(count)}</p>
              </button>
            )
          })}
        </div>

        {/* Sidebar detail */}
        {selectedDept && (
          <div className="w-80 shrink-0 rounded-xl border bg-card p-6 space-y-5 self-start">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold">{selectedDept}</h3>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Total candidates */}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {formatNumber(counts[selectedDept] || 0)} candidatos
              </span>
            </div>

            {/* Top parties */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Principales partidos
              </h4>
              {partiesLoading ? (
                <LoadingSpinner className="py-4" />
              ) : topParties && topParties.length > 0 ? (
                <div className="rounded-xl border divide-y">
                  {topParties.map((party, i) => {
                    const barPct = (party.count / (topParties[0]?.count || 1)) * 100
                    return (
                      <div key={party.name} className="px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              {i + 1}
                            </span>
                            <span className="text-xs truncate">{party.name}</span>
                          </div>
                          <span className="text-xs font-bold shrink-0 ml-2 tabular-nums">{party.count}</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-muted overflow-hidden ml-7">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin datos de partidos
                </p>
              )}
            </div>

            {/* Link to candidatos filtered by department */}
            <Link
              to={`/candidatos?departamento=${encodeURIComponent(selectedDept)}`}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Ver candidatos
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>Menos candidatos</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => {
            const l = Math.round(95 - (i / 7) * 50)
            return (
              <div
                key={i}
                className="h-4 w-6 rounded-sm"
                style={{ backgroundColor: `hsl(221, 83%, ${l}%)` }}
              />
            )
          })}
        </div>
        <span>Mas candidatos</span>
      </div>
    </div>
  )
}
