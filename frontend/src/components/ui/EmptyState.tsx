import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  icon?: React.ElementType
  className?: string
}

export function EmptyState({
  message = 'No se encontraron resultados',
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-muted-foreground',
        className
      )}
    >
      <Icon className="h-12 w-12 mb-4" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
