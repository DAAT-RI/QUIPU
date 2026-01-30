import { Moon, Sun, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export function Header() {
  const { clienteNombre, signOut } = useAuth()
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
        {clienteNombre && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {clienteNombre}
          </span>
        )}
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => signOut()}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
