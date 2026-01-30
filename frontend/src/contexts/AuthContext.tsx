import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  clienteId: number | null
  clienteNombre: string | null
  isSuperadmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [clienteNombre, setClienteNombre] = useState<string | null>(null)
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Cargar sesión inicial
  useEffect(() => {
    // Safety timeout - never stay in loading state for more than 10 seconds
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 10000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        try {
          await loadClienteData(session.user.id)
          await registerSession(session.user.id)
        } catch (error) {
          console.error('Error loading cliente data:', error)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
      clearTimeout(safetyTimeout)
    }).catch((error) => {
      console.error('Error getting session:', error)
      setLoading(false)
      clearTimeout(safetyTimeout)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          try {
            await loadClienteData(session.user.id)
            await registerSession(session.user.id)
          } catch (error) {
            console.error('Error on auth state change:', error)
          }
        } else {
          setClienteId(null)
          setClienteNombre(null)
          setIsSuperadmin(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Validación de sesión exclusiva (cada 30 segundos)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('quipu_usuarios')
          .select('current_session_id')
          .eq('auth_user_id', user.id)
          .single()

        if (error) {
          console.error('Error checking session:', error)
          return // Don't sign out on error, just skip this check
        }

        if (data && data.current_session_id && data.current_session_id !== sessionId) {
          // Otra sesión tomó el control
          await supabase.auth.signOut()
          alert('Sesión cerrada: iniciaste sesión en otro dispositivo')
        }
      } catch (error) {
        console.error('Exception in session validation:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user, sessionId])

  async function loadClienteData(authUserId: string) {
    try {
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .select('cliente_id, rol, quipu_clientes(nombre)')
        .eq('auth_user_id', authUserId)
        .single()

      if (error) {
        console.error('Error fetching usuario:', error)
      } else if (data) {
        setClienteId(data.cliente_id)
        setClienteNombre((data.quipu_clientes as any)?.nombre ?? null)
        setIsSuperadmin(data.rol === 'superadmin')
      }
    } catch (error) {
      console.error('Exception in loadClienteData:', error)
    } finally {
      setLoading(false)
    }
  }

  async function registerSession(authUserId: string) {
    try {
      const { error } = await supabase
        .from('quipu_usuarios')
        .update({ current_session_id: sessionId })
        .eq('auth_user_id', authUserId)

      if (error) {
        console.error('Error registering session:', error)
      }
    } catch (error) {
      console.error('Exception in registerSession:', error)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    // Clear state first (don't wait for DB)
    setUser(null)
    setSession(null)
    setClienteId(null)
    setClienteNombre(null)
    setIsSuperadmin(false)
    setLoading(false)

    try {
      // Sign out from Supabase Auth first
      await supabase.auth.signOut()

      // Try to clear session in DB (non-blocking, ignore errors)
      if (user) {
        try {
          await supabase
            .from('quipu_usuarios')
            .update({ current_session_id: null })
            .eq('auth_user_id', user.id)
        } catch {
          // Ignore RLS errors
        }
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, session, clienteId, clienteNombre, isSuperadmin, loading, signIn, signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
