import { cn, getInitials, buildFotoUrl } from '@/lib/utils'

interface CandidatoAvatarProps {
  nombre: string
  fotoUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

export function CandidatoAvatar({
  nombre,
  fotoUrl,
  size = 'md',
  className,
}: CandidatoAvatarProps) {
  const fullUrl = buildFotoUrl(fotoUrl)
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full',
        sizeStyles[size],
        className
      )}
    >
      {fullUrl ? (
        <img
          src={fullUrl}
          alt={nombre}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling?.classList.remove('hidden')
          }}
        />
      ) : null}
      <div className={cn(
        'flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium absolute inset-0',
        fullUrl ? 'hidden' : ''
      )}>
        {getInitials(nombre)}
      </div>
    </div>
  )
}
