import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  clienteId: number | null
  clienteNombre: string | null
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
  const [loading, setLoading] = useState(true)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Cargar sesión inicial
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadClienteData(session.user.id)
        registerSession(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadClienteData(session.user.id)
          await registerSession(session.user.id)
        } else {
          setClienteId(null)
          setClienteNombre(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Validación de sesión exclusiva (cada 30 segundos)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('quipu_usuarios')
        .select('current_session_id')
        .eq('auth_user_id', user.id)
        .single()

      if (data && data.current_session_id !== sessionId) {
        // Otra sesión tomó el control
        await supabase.auth.signOut()
        alert('Sesión cerrada: iniciaste sesión en otro dispositivo')
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user, sessionId])

  async function loadClienteData(authUserId: string) {
    const { data } = await supabase
      .from('quipu_usuarios')
      .select('cliente_id, quipu_clientes(nombre)')
      .eq('auth_user_id', authUserId)
      .single()

    if (data) {
      setClienteId(data.cliente_id)
      setClienteNombre((data.quipu_clientes as any)?.nombre ?? null)
    }
    setLoading(false)
  }

  async function registerSession(authUserId: string) {
    await supabase
      .from('quipu_usuarios')
      .update({ current_session_id: sessionId })
      .eq('auth_user_id', authUserId)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    if (user) {
      await supabase
        .from('quipu_usuarios')
        .update({ current_session_id: null })
        .eq('auth_user_id', user.id)
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, session, clienteId, clienteNombre, loading, signIn, signOut
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
