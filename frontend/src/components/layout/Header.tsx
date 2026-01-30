import { Moon, Sun, LogOut, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const navigate = useNavigate()
  const { clienteNombre, isSuperadmin, signOut } = useAuth()
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') {
      setDark(true)
    } else if (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDark(true)
    }
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="lg:hidden w-10" />

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {isSuperadmin ? (
          <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium">
            <Shield className="h-4 w-4" />
            Superadmin
          </span>
        ) : clienteNombre ? (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {clienteNombre}
          </span>
        ) : null}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault()
            console.log('Logout clicked')
            try {
              await signOut()
              console.log('SignOut completed')
              navigate('/login')
            } catch (error) {
              console.error('SignOut error:', error)
              navigate('/login')
            }
          }}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
