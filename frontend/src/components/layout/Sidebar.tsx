import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquareQuote,
  Search,
  Users,
  Building2,
  Tags,
  GitCompare,
  Menu,
  X,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Declaraciones', href: '/declaraciones', icon: MessageSquareQuote },
  { name: 'Buscar Promesas', href: '/buscar', icon: Search },
  { name: 'Candidatos', href: '/candidatos', icon: Users },
  { name: 'Partidos', href: '/partidos', icon: Building2 },
  { name: 'Categorias', href: '/categorias', icon: Tags },
  { name: 'Comparar', href: '/comparar', icon: GitCompare },
]

export function Sidebar() {
  const location = useLocation()
  const { isSuperadmin } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  // Close sidebar on Escape key
  useEffect(() => {
    if (!isMobileMenuOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobileMenu()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen, closeMobileMenu])

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-background border"
        aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-4 gap-3">
            <img src="/logo.png" alt="PARLEY" className="h-8 w-auto dark:hidden" />
            <img src="/Logo_blanco.png" alt="PARLEY" className="h-8 w-auto hidden dark:block" />
            <div>
              <h2 className="text-base font-semibold tracking-tight leading-tight">
                Quipu <span className="text-parley-gold">Electoral</span>
              </h2>
              <p className="text-[10px] text-muted-foreground">Peru 2026</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive =
                item.href === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.href)
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Admin Link */}
          {isSuperadmin && (
            <div className="px-3 pt-4 border-t">
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  location.pathname.startsWith('/admin')
                    ? 'bg-parley-gold text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
                Administración
              </Link>
            </div>
          )}

          {/* Footer */}
          <div className="border-t p-4 flex items-center gap-2">
            <img src="/daat-white.png" alt="DAAT" className="h-5 w-auto opacity-60 dark:opacity-80 dark:invert-0 invert" />
            <p className="text-[11px] text-muted-foreground">
              Inteligencia Electoral
            </p>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={closeMobileMenu}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') closeMobileMenu() }}
          role="button"
          tabIndex={0}
          aria-label="Cerrar menu"
        />
      )}
    </>
  )
}
