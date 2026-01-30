import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BackButtonProps {
  fallback?: string
  label?: string
  className?: string
}

/**
 * Smart back button that uses browser history when available,
 * or falls back to a specified route.
 * Also respects location.state.from if set.
 */
export function BackButton({ fallback = '/', label = 'Volver', className }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    // Check if we have a specific "from" route in location state
    const fromRoute = (location.state as { from?: string })?.from
    if (fromRoute) {
      navigate(fromRoute)
      return
    }

    // If there's browser history, go back
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      // Otherwise, go to fallback route
      navigate(fallback)
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}
