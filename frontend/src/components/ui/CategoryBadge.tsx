import { cn, getContrastColor } from '@/lib/utils'
import { CATEGORY_CONFIG } from '@/lib/constants'

interface CategoryBadgeProps {
  categoria: string
  className?: string
}

export function CategoryBadge({ categoria, className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[categoria]

  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground',
          className
        )}
      >
        {categoria}
      </span>
    )
  }

  const textColor = getContrastColor(config.color)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
      style={{ backgroundColor: config.color, color: textColor }}
    >
      {config.icon && <config.icon className="h-3 w-3" />}
      {config.label}
    </span>
  )
}
