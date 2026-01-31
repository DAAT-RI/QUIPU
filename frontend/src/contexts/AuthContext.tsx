import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

interface AuthContextType {
  user: User | null
  session: Session | null
  clienteId: number | null
  clienteNombre: string | null
  isSuperadmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
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

  // Cargar sesión inicial - usando solo onAuthStateChange (patrón recomendado por Supabase)
  useEffect(() => {
    console.log('[Auth] Initializing auth...')
    queryClient.clear()

    let isMounted = true

    // Safety timeout - never stay in loading state for more than 10 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.log('[Auth] Safety timeout triggered')
        setLoading(false)
      }
    }, 10000)

    // Usar SOLO onAuthStateChange como fuente de verdad
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        console.log('[Auth] onAuthStateChange:', event, session?.user?.id)
        clearTimeout(safetyTimeout)

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Usar setTimeout para evitar deadlock con Supabase
          // Las queries dentro de onAuthStateChange pueden bloquearse
          setTimeout(async () => {
            if (!isMounted) return
            try {
              await loadClienteData(session.user.id)
              if (isMounted) await registerSession(session.user.id)
            } catch (error) {
              console.error('[Auth] Error on auth state change:', error)
              if (isMounted) setLoading(false)
            }
          }, 0)
        } else {
          setClienteId(null)
          setClienteNombre(null)
          setIsSuperadmin(false)
          setLoading(false)
        }
      }
    )

    // Trigger initial session check (no esperamos el resultado)
    supabase.auth.getSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(safetyTimeout)
    }
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
          console.warn('[Auth] Session mismatch detected (Remote: ' + data.current_session_id + ' vs Local: ' + sessionId + ')')
          // TEMPORARY FIX: Disable auto-logout to debug RLS/Update issue
          // await supabase.auth.signOut()
          // alert('Sesión cerrada: iniciaste sesión en otro dispositivo')
        }
      } catch (error) {
        console.error('Exception in session validation:', error)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user, sessionId])

  async function loadClienteData(authUserId: string) {
    console.log('[Auth DEBUG] loadClienteData called for:', authUserId)
    try {
      // NO llamar getSession() aquí - causa deadlock si onAuthStateChange
      // se dispara mientras getSession() inicial aún está en progreso
      const { data, error } = await supabase
        .from('quipu_usuarios')
        .select('cliente_id, rol, quipu_clientes(nombre)')
        .eq('auth_user_id', authUserId)
        .single()

      console.log('[Auth DEBUG] quipu_usuarios query result:', { data, error })

      if (error) {
        console.error('[Auth] Error fetching usuario:', error)
      } else if (data) {
        console.log('[Auth DEBUG] Setting auth state:', { clienteId: data.cliente_id, rol: data.rol })
        setClienteId(data.cliente_id)
        setClienteNombre((data.quipu_clientes as any)?.nombre ?? null)
        setIsSuperadmin(data.rol === 'superadmin')
      } else {
        console.warn('[Auth DEBUG] No data returned for user - check RLS policies')
      }
    } catch (error) {
      console.error('[Auth] Exception in loadClienteData:', error)
    } finally {
      console.log('[Auth DEBUG] loadClienteData finished, setting loading=false')
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
    // Clear React Query cache to prevent stale data on next login
    queryClient.clear()

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

      // Clear local storage to prevent stale cache issues
      localStorage.removeItem('sb-pjhnmjcwliqhjntcgood-auth-token')

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

  // Force refresh auth state - useful after permission changes
  async function refreshAuth() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        setSession(session)
        await loadClienteData(session.user.id)
      } else {
        setUser(null)
        setSession(null)
        setClienteId(null)
        setClienteNombre(null)
        setIsSuperadmin(false)
      }
    } catch (error) {
      console.error('[Auth] Error refreshing auth:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, session, clienteId, clienteNombre, isSuperadmin, loading, signIn, signOut, refreshAuth
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
