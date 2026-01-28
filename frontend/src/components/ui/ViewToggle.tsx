import { cn } from '@/lib/utils'
import { LayoutGrid, List } from 'lucide-react'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      <button
        type="button"
        onClick={() => onViewChange('grid')}
        className={cn(
          'inline-flex items-center justify-center rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
          view === 'grid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Vista de cuadricula"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onViewChange('list')}
        className={cn(
          'inline-flex items-center justify-center rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
          view === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label="Vista de lista"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  )
}
