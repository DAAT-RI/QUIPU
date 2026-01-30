# Plan: Demo Multi-Tenant para el Lunes

> **Fecha:** Enero 2026
> **Estado:** Aprobado para ejecución

## Objetivo
Demo funcional con:
- ✅ Login real (Supabase Auth)
- ✅ Cliente demo configurado
- ✅ Usuario ve solo "sus" candidatos
- ✅ RLS activo
- ✅ **Sesiones exclusivas** (un usuario = un dispositivo, si entra en otro lado te cierra)

---

## Fase 1: Backend (Supabase)

### 1.1 Deploy Migraciones [CRÍTICO]
Ejecutar en Supabase SQL Editor en orden:

| Archivo | Prioridad | Contenido |
|---------|-----------|-----------|
| `001_quipu_clientes.sql` | 🔴 CRÍTICO | Clientes, usuarios, cliente_candidatos |
| `002_quipu_temas.sql` | 🟡 Opcional | Catálogo temas (frontend no lo usa aún) |
| `003_quipu_organizaciones.sql` | 🟡 Opcional | Catálogo gremios |
| `004_quipu_declaraciones.sql` | 🟡 Opcional | Tabla normalizada (pendiente sync) |
| `005_quipu_coherencia.sql` | 🟡 Opcional | Links promesa↔declaración |
| `006_quipu_views.sql` | ⚠️ Depende | Vistas multi-tenant (requiere 004) |
| `007_quipu_rls.sql` | 🔴 CRÍTICO | Políticas RLS |

**Ruta elegida:** Completa (7 archivos)

### 1.2 Crear Cliente Demo [CRÍTICO]

**Archivo fuente:** `CANDIDATOS_JNE_2026_APESEG.csv` (193 candidatos)

```sql
-- 1. Insertar cliente APESEG
INSERT INTO quipu_clientes (nombre, tipo, sector, plan, max_candidatos)
VALUES ('APESEG', 'gremio', 'seguros', 'enterprise', 200)
RETURNING id;
-- Guardar el ID retornado (probablemente 1)

-- 2. Insertar candidatos - usar DNI para match con quipu_candidatos
INSERT INTO quipu_cliente_candidatos (cliente_id, candidato_id)
SELECT
    1, -- cliente_id de APESEG
    c.id
FROM quipu_candidatos c
WHERE c.dni IN (
    -- Lista completa de 193 DNIs del CSV
    -- Ver script helper abajo para generar
);
```

**Alternativa:** Script Python para parsear CSV e insertar

### 1.3 Configurar Supabase Auth [CRÍTICO]
1. Dashboard Supabase → Authentication → Settings
2. Habilitar Email provider
3. Crear usuario de prueba manualmente o via API

### 1.4 Vincular Usuario a Cliente [CRÍTICO]
```sql
-- Después de crear usuario en Auth, vincular:
INSERT INTO quipu_usuarios (cliente_id, email, nombre, rol, auth_user_id)
VALUES (1, '[EMAIL]', '[NOMBRE]', 'admin', '[AUTH_USER_UUID]');
```

---

## Fase 2: Frontend

### 2.1 Crear AuthContext [CRÍTICO]
**Archivo:** `frontend/src/contexts/AuthContext.tsx`

```typescript
// Context que provee:
// - user: Usuario autenticado de Supabase
// - clienteId: ID del cliente del usuario
// - loading: Estado de carga
// - signIn(email, password): Login
// - signOut(): Logout
```

### 2.2 Crear Hook useAuth [CRÍTICO]
**Archivo:** `frontend/src/hooks/useAuth.ts`

```typescript
// Hook que consume AuthContext
// Expone: user, clienteId, isAuthenticated, signIn, signOut
```

### 2.3 Crear Página Login [CRÍTICO]
**Archivo:** `frontend/src/pages/Login.tsx`

- Form simple: email + password
- Llamada a signIn()
- Redirect a Dashboard on success
- Mostrar errores

### 2.4 Proteger Rutas [CRÍTICO]
**Archivo:** `frontend/src/App.tsx` o crear `ProtectedRoute.tsx`

- Si no autenticado → redirect a /login
- Si autenticado → mostrar app normal

### 2.5 Sesiones Exclusivas [CRÍTICO]
**Concepto:** Un usuario solo puede estar logueado en un dispositivo. Si inicia sesión en otro, el primero se cierra.

**Implementación:**

1. **En `quipu_usuarios`** agregar campo:
```sql
ALTER TABLE quipu_usuarios ADD COLUMN current_session_id UUID;
```

2. **Al hacer login** (en AuthContext):
```typescript
// Generar ID de sesión único
const sessionId = crypto.randomUUID()

// Guardar en DB
await supabase.from('quipu_usuarios')
  .update({ current_session_id: sessionId })
  .eq('auth_user_id', user.id)

// Guardar en localStorage
localStorage.setItem('quipu_session_id', sessionId)
```

3. **Validación periódica** (cada 30 segundos):
```typescript
// En AuthContext, useEffect con interval
const { data } = await supabase
  .from('quipu_usuarios')
  .select('current_session_id')
  .eq('auth_user_id', user.id)
  .single()

if (data.current_session_id !== localStorage.getItem('quipu_session_id')) {
  // Otra sesión tomó el control
  signOut()
  toast.error('Sesión cerrada: iniciaste sesión en otro dispositivo')
}
```

**Decisión:** Usar polling cada 30 segundos (más simple, suficiente para demo).

### 2.6 Crear Hook useClienteCandidatos [CRÍTICO]
**Archivo:** `frontend/src/hooks/useClienteCandidatos.ts`

```typescript
// Obtiene candidatos del cliente actual
// Usa RLS automáticamente (filtra por get_current_cliente_id())
export function useClienteCandidatos() {
  return useQuery({
    queryKey: ['cliente-candidatos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('quipu_cliente_candidatos')
        .select('candidato_id, quipu_candidatos(nombre_completo, dni)')
      return data
    }
  })
}
```

### 2.7 Modificar useDeclaraciones [CRÍTICO]
**Archivo:** `frontend/src/hooks/useDeclaraciones.ts`

Agregar filtro por stakeholder usando candidatos del cliente:

```typescript
// Antes de la query principal:
const { data: candidatos } = useClienteCandidatos()
const stakeholders = candidatos?.map(c => c.quipu_candidatos.nombre_completo)

// En el query:
if (stakeholders?.length) {
  query = query.or(
    stakeholders.map(s => `stakeholder.ilike.%${s}%`).join(',')
  )
}
```

---

## Fase 3: Testing

### 3.1 Verificación End-to-End
1. Abrir app → debe redirigir a /login
2. Login con usuario demo → debe entrar al dashboard
3. Ver declaraciones → debe mostrar solo candidatos del cliente
4. Ver otro browser sin login → debe pedir login

### 3.2 Verificar RLS
```sql
-- En Supabase, como usuario autenticado:
SELECT * FROM quipu_cliente_candidatos;
-- Debe retornar solo candidatos del cliente del usuario
```

---

## Archivos a Crear/Modificar

| Archivo | Acción | Prioridad |
|---------|--------|-----------|
| `frontend/src/contexts/AuthContext.tsx` | Crear (incluye sesiones exclusivas) | 🔴 |
| `frontend/src/hooks/useAuth.ts` | Crear | 🔴 |
| `frontend/src/hooks/useClienteCandidatos.ts` | Crear | 🔴 |
| `frontend/src/pages/Login.tsx` | Crear | 🔴 |
| `frontend/src/hooks/useDeclaraciones.ts` | Modificar | 🔴 |
| `frontend/src/App.tsx` | Modificar | 🔴 |
| `fase3/migrations/001_quipu_clientes.sql` | Modificar (agregar current_session_id) | 🔴 |

### Modificación a 001_quipu_clientes.sql

Agregar campo para sesiones exclusivas:
```sql
-- En la tabla quipu_usuarios, agregar:
current_session_id UUID,  -- Para validar sesión única por usuario
```

---

## Decisiones Confirmadas

| Decisión | Valor |
|----------|-------|
| Ruta migraciones | ✅ Completa (7 archivos) |
| Cliente demo | ✅ APESEG (gremio, seguros) |
| Candidatos | ✅ 193 candidatos (CANDIDATOS_JNE_2026_APESEG.csv) |
| Sesiones | ✅ Polling cada 30 segundos |
| Email usuario | ⏳ Pendiente (email personal del usuario) |

---

## Orden de Ejecución

### Bloque 1: Base de Datos (~1h)
1. Ejecutar 001_quipu_clientes.sql (con current_session_id)
2. Ejecutar 002_quipu_temas.sql
3. Ejecutar 003_quipu_organizaciones.sql
4. Ejecutar 004_quipu_declaraciones.sql
5. Ejecutar 005_quipu_coherencia.sql
6. Ejecutar 006_quipu_views.sql
7. Ejecutar 007_quipu_rls.sql

### Bloque 2: Datos Demo (~30min)
1. Insertar cliente APESEG
2. Insertar candidatos del cliente (193 DNIs)
3. Crear usuario en Supabase Auth
4. Vincular usuario a cliente

### Bloque 3: Frontend Auth (~2h)
1. Crear AuthContext.tsx (con sesiones exclusivas)
2. Crear useAuth.ts
3. Crear Login.tsx
4. Proteger rutas en App.tsx

### Bloque 4: Frontend Multi-tenant (~1h)
1. Crear useClienteCandidatos.ts
2. Modificar useDeclaraciones.ts
3. Testing

---

## Datos Confirmados

| Dato | Estado |
|------|--------|
| Lista candidatos | ✅ `CANDIDATOS_JNE_2026_APESEG.csv` (193 DNIs) |
| Email demo | ⏳ Email personal del usuario |

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| 007_quipu_rls.sql tiene RLS para tablas opcionales (temas, declaraciones) | Ejecutar migraciones en orden; si falla, comentar las policies de tablas faltantes |
| Match DNI puede fallar si candidatos no existen en quipu_candidatos | Verificar primero cuántos DNIs hacen match con `SELECT COUNT(*) FROM quipu_candidatos WHERE dni IN (...)` |
| Frontend puede tener errores de TypeScript por nuevos hooks | Definir tipos en `types/database.ts` |

---

## Archivos Generados

| Archivo | Descripción |
|---------|-------------|
| `fase3/scripts/extract_dnis.py` | Extrae DNIs del CSV y genera SQL |
| `fase3/migrations/008_seed_apeseg.sql` | Seed de cliente APESEG (162 DNIs únicos) |

---

## Verificación Final

1. **Login funciona:** Usuario puede autenticarse con email/password
2. **RLS activo:** Query `SELECT * FROM quipu_cliente_candidatos` retorna solo candidatos de APESEG
3. **Declaraciones filtradas:** Dashboard muestra solo declaraciones de los 193 candidatos
4. **Sin acceso sin login:** Rutas protegidas redirigen a /login
5. **Sesiones exclusivas:** Abrir en 2 browsers con mismo usuario → el primero se cierra automáticamente con mensaje "Sesión cerrada: iniciaste sesión en otro dispositivo"
