import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbBackProps {
  to: string
  label: string
  className?: string
}

/**
 * Componente reutilizable para "Volver a X" en la parte superior de las páginas.
 * Se coloca encima del título de la sección.
 */
export function BreadcrumbBack({ to, label, className }: BreadcrumbBackProps) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2',
        className
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}
