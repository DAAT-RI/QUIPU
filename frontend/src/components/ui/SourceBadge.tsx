import { cn, sourceFromUrl, getContrastColor } from '@/lib/utils'
import { SOURCE_CONFIG } from '@/lib/constants'

interface SourceBadgeProps {
  url?: string | null
  source?: keyof typeof SOURCE_CONFIG
  className?: string
}

export function SourceBadge({ url, source, className }: SourceBadgeProps) {
  const resolvedSource = source ?? sourceFromUrl(url ?? null)
  const config = SOURCE_CONFIG[resolvedSource]

  const textColor = getContrastColor(config.color)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
      style={{ backgroundColor: config.color, color: textColor }}
    >
      {config.label}
    </span>
  )
}
