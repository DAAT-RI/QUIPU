# Fase 3: Impacto en Frontend y Guía de Migración

## Resumen de Cambios

La Fase 3 introduce **multi-tenant** y **normalización de datos**. Esto afecta:

1. **Auth**: Nuevo flujo de login con Supabase Auth
2. **Queries**: Todas las queries deben filtrar por cliente
3. **Hooks**: Nuevos hooks + modificación de existentes
4. **Componentes**: Login, contexto de cliente, filtros adaptados
5. **Rutas**: Proteger rutas, redirect a login

---

## Impacto por Archivo

### Hooks Afectados

| Hook Actual | Cambio Requerido | Prioridad |
|-------------|------------------|-----------|
| `useDeclaraciones.ts` | Usar `v_quipu_cliente_declaraciones` en vez de `v_quipu_declaraciones` | 🔴 Alta |
| `useCandidatos.ts` | Filtrar por `quipu_cliente_candidatos` | 🔴 Alta |
| `usePromesas.ts` | Filtrar por partidos de candidatos del cliente | 🟡 Media |
| `useDashboardStats.ts` | Usar `v_quipu_cliente_dashboard` | 🔴 Alta |
| `useStakeholderCandidato.ts` | Usar `candidato_id` directo de `quipu_declaraciones` | 🟢 Simplifica |
| `useCategorias.ts` | Reemplazar por `useClienteTemas.ts` | 🔴 Alta |

### Nuevos Hooks Necesarios

```
src/hooks/
├── useAuth.ts              # Login, logout, session
├── useCliente.ts           # Datos del cliente actual
├── useClienteCandidatos.ts # Candidatos asignados al cliente
├── useClienteTemas.ts      # Temas prioritarios del cliente
└── useCoherencia.ts        # Verificación promesa vs declaración
```

---

## Cambios Detallados por Hook

### 1. `useDeclaraciones.ts`

**Antes:**
```typescript
supabase.from('v_quipu_declaraciones')
  .select('*')
  .order('fecha', { ascending: false })
```

**Después:**
```typescript
// RLS filtra automáticamente por cliente
supabase.from('v_quipu_cliente_declaraciones')
  .select('*')
  .order('fecha', { ascending: false })
```

**Campos nuevos disponibles:**
- `candidato_id` (FK real, no texto)
- `candidato_nombre`, `candidato_foto`
- `tema_id`, `tema_nombre`, `tema_icono`, `tema_color`
- `tema_prioridad` (del cliente)
- `partido_nombre`

### 2. `useCandidatos.ts`

**Antes:**
```typescript
supabase.from('v_quipu_candidatos_unicos')
  .select('*')
  .ilike('nombre_completo', `%${search}%`)
```

**Después:**
```typescript
// Solo candidatos asignados al cliente
supabase.from('v_quipu_cliente_candidatos_stats')
  .select('*')
  .ilike('nombre_completo', `%${search}%`)
```

**Nota:** El cliente solo ve sus candidatos asignados (15-20 típicamente), no los 6,400.

### 3. `useDashboardStats.ts`

**Antes:**
```typescript
const [partidos, promesas, candidatos] = await Promise.all([
  supabase.from('quipu_partidos').select('*', { count: 'exact', head: true }),
  supabase.from('quipu_promesas_planes').select('*', { count: 'exact', head: true }),
  supabase.from('quipu_candidatos').select('*', { count: 'exact', head: true }),
])
```

**Después:**
```typescript
// Stats filtradas por cliente
const { data } = await supabase
  .from('v_quipu_cliente_dashboard')
  .select('*')
  .single()

// Retorna:
// - total_candidatos (los que sigue)
// - total_temas (sus temas prioritarios)
// - total_declaraciones (de sus candidatos)
// - declaraciones_semana
// - declaraciones_hoy
```

### 4. `useCategorias.ts` → `useClienteTemas.ts`

**Antes:** Mostraba 15 categorías fijas de planes de gobierno.

**Después:** Muestra los temas prioritarios del cliente.

```typescript
export function useClienteTemas() {
  return useQuery({
    queryKey: ['cliente-temas'],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_quipu_cliente_temas_stats')
        .select('*')
        .order('prioridad', { ascending: true })
      return data
    },
  })
}
```

---

## Nuevos Hooks

### `useAuth.ts`

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { session, user: session?.user, loading, signIn, signOut }
}
```

### `useCliente.ts`

```typescript
export function useCliente() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['cliente', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('quipu_usuarios')
        .select(`
          *,
          cliente:quipu_clientes(*)
        `)
        .eq('auth_user_id', user!.id)
        .single()
      return data
    },
  })
}
```

---

## Componentes Nuevos

### 1. `src/pages/Login.tsx`

```typescript
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await signIn(email, password)
    if (!error) navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Quipu</h1>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Ingresar</button>
      </form>
    </div>
  )
}
```

### 2. `src/components/layout/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingSpinner />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
```

### 3. `src/components/layout/ClienteContext.tsx`

```typescript
const ClienteContext = createContext<ClienteContextType | null>(null)

export function ClienteProvider({ children }: { children: ReactNode }) {
  const { data: usuario } = useCliente()

  return (
    <ClienteContext.Provider value={{
      cliente: usuario?.cliente,
      usuario,
      clienteId: usuario?.cliente_id,
    }}>
      {children}
    </ClienteContext.Provider>
  )
}

export const useClienteContext = () => useContext(ClienteContext)
```

---

## Cambios en App.tsx

**Antes:**
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/declaraciones" element={<Declaraciones />} />
  ...
</Routes>
```

**Después:**
```typescript
<Routes>
  {/* Ruta pública */}
  <Route path="/login" element={<Login />} />

  {/* Rutas protegidas */}
  <Route element={<ProtectedRoute><ClienteProvider><Layout /></ClienteProvider></ProtectedRoute>}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/declaraciones" element={<Declaraciones />} />
    <Route path="/candidatos" element={<Candidatos />} />
    <Route path="/temas" element={<Temas />} />  {/* Antes: /categorias */}
    ...
  </Route>
</Routes>
```

---

## Cambios en UI

### Header

Agregar info del cliente y logout:

```typescript
// En Header.tsx
const { cliente } = useClienteContext()
const { signOut } = useAuth()

<div className="flex items-center gap-4">
  <span className="text-sm">{cliente?.nombre}</span>
  <Button variant="ghost" onClick={signOut}>Salir</Button>
</div>
```

### Sidebar

Cambiar "Categorías" por "Temas":

```typescript
// Antes
{ label: 'Categorías', path: '/categorias', icon: Tags }

// Después
{ label: 'Mis Temas', path: '/temas', icon: Tags }
```

### Dashboard

- Mostrar stats del cliente (no globales)
- Feed de declaraciones filtrado automáticamente
- Cards con candidatos que sigue

### Candidatos

- Ya no muestra 6,400 candidatos
- Muestra solo los asignados al cliente (15-20)
- Grid más compacto, sin paginación compleja

### Declaraciones

- Usa `candidato_id` directo para link a perfil
- Badge de tema con color del catálogo
- Ordenado por prioridad del cliente

---

## Orden de Migración

1. **Crear hooks de auth** (`useAuth.ts`, `useCliente.ts`)
2. **Crear Login.tsx y ProtectedRoute.tsx**
3. **Modificar App.tsx** con rutas protegidas
4. **Actualizar hooks existentes** uno por uno:
   - `useDashboardStats.ts`
   - `useDeclaraciones.ts`
   - `useCandidatos.ts`
   - `useCategorias.ts` → `useClienteTemas.ts`
5. **Actualizar componentes** que usan los hooks
6. **Actualizar Header** con cliente + logout
7. **Testing** con cliente APESEG de prueba

---

## Verificación

```bash
# 1. Login funciona
curl -X POST $SUPABASE_URL/auth/v1/token \
  -d '{"email":"demo@apeseg.org.pe","password":"test123"}'

# 2. Dashboard muestra stats de APESEG
# 3. Candidatos muestra solo los 15 asignados
# 4. Declaraciones filtradas por candidatos de APESEG
# 5. Temas muestra prioridades de APESEG
```

---

## Rollback

Si hay problemas, las vistas antiguas siguen funcionando:
- `v_quipu_declaraciones` (sin filtro de cliente)
- `v_quipu_candidatos_unicos` (todos los candidatos)

El RLS no afecta queries con `service_role` key.
