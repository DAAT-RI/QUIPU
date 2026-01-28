import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = 'Ocurrio un error al cargar los datos',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-muted-foreground',
        className
      )}
    >
      <AlertTriangle className="h-12 w-12 mb-4 text-destructive" strokeWidth={1.5} />
      <p className="text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
