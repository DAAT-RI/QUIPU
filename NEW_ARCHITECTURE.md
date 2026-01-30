# Nueva Arquitectura de Datos - Quipu

> **Última actualización:** Enero 2026
> **Estado del proyecto:** ~45% implementado

---

## Resumen Ejecutivo

| Categoría | Estado | Progreso |
|-----------|--------|----------|
| Schema base | ✅ Deployado | 100% |
| Datos de promesas | ✅ 22,358 registros | 100% |
| Datos de candidatos | ✅ 6,438 registros | 100% |
| Hojas de vida | ✅ 8,116 registros (expandida) | 100% |
| Categorías | ✅ 247 categorías dinámicas | 100% |
| Multi-tenancy tables | ⏳ Diseñadas, sin deployar | 0% |
| Declaraciones normalizadas | ⏳ Diseñadas, sin sync | 0% |
| Búsqueda semántica en declaraciones | ⏳ Schema listo, sin embeddings | 0% |
| Coherencia promesa↔declaración | ⏳ Schema listo, sin links | 0% |
| RLS policies | ⏳ Diseñadas, sin deployar | 0% |
| Frontend dashboard | ✅ Funcional (sin auth) | 90% |
| Auth + multi-tenant UI | ⏳ No implementado | 0% |

---

## Modelo de Negocio

Quipu es **SaaS multi-tenant**:

| Concepto | Descripción |
|----------|-------------|
| **Cliente** | Gremio, empresa, consultora, medio |
| **Suscripción** | Paga por **N candidatos** a monitorear |
| **Temas prioritarios** | El cliente define qué temas le importan |
| **Dashboard personalizado** | Solo ve sus candidatos + sus temas |

### Ejemplo

```
APESEG contrata:
├── 15 candidatos presidenciales a seguir
├── Temas prioritarios: seguros, AFP, pensiones, salud
└── Dashboard muestra SOLO declaraciones de esos 15 sobre esos temas
```

---

## Estado Actual de Base de Datos

### Tablas Desplegadas (Producción) ✅

| Tabla | Registros | Notas |
|-------|-----------|-------|
| `quipu_partidos` | 35 | Completa |
| `quipu_candidatos` | ~6,438 | Completa |
| `quipu_hojas_vida` | 8,116 | **Expandida a 50+ campos** |
| `quipu_promesas_planes` | 22,358 | Con embeddings vector(1536) |
| `quipu_categorias_promesas` | 247 | **Migrado de 15 a 247 categorías** |
| `QUIPU_MASTER` | Variable | Inmutable, pipeline externo |

### Vistas Desplegadas ✅

```sql
v_quipu_promesas_planes_completas  -- promesas + partido + categoría
v_quipu_resumen_partidos           -- stats por partido
v_quipu_candidatos_completos       -- candidatos + partido
v_quipu_candidatos_unicos          -- deduplicado por DNI (85 tenían duplicados)
```

### Migraciones Aplicadas

```
frontend/migrations/
├── 001_schema_supabase.sql              ✅ Schema base
├── 004_reclassify_categories_gemini.py  ✅ Migración 15→247 categorías
├── 005_update_categorias_247.sql        ✅ Actualización categorías
├── 007_add_hojas_vida_columns.sql       ✅ Nuevos campos HV
└── 007_update_hojas_vida.py             ✅ Datos JNE 2026
```

---

## Expansión de `quipu_hojas_vida` (Nuevo)

La tabla fue significativamente ampliada respecto al plan original:

```sql
-- Campos de estado
estado_hv VARCHAR(50),
porcentaje_completitud DECIMAL,
fecha_termino_registro TIMESTAMPTZ,

-- Verificaciones (JSONB) - validaciones del JNE
verificaciones JSONB,  -- {sunedu, sunarp, minedu_tec, infogob, rop}

-- Indicadores booleanos (JSONB)
indicadores JSONB,     -- 15 booleanos:
                       -- tiene_experiencia_laboral
                       -- tiene_educacion_universitaria
                       -- tiene_educacion_tecnica
                       -- tiene_sentencias
                       -- etc.

-- Datos adicionales del JNE
cargos_postula TEXT,
titularidades TEXT,
declaraciones_juradas JSONB,
carne_extranjeria VARCHAR(50),
ubigeo_nacimiento VARCHAR(10),
ubigeo_domicilio VARCHAR(10)
```

---

## Tablas Pendientes (Fase 3)

### Migraciones Definidas (Sin Deployar)

```
fase3/migrations/
├── 001_quipu_clientes.sql           ⏳ Multi-tenant (clientes, usuarios, cliente_candidatos)
├── 002_quipu_temas.sql              ⏳ Catálogo normalizado (~40 temas seedeados)
├── 003_quipu_organizaciones.sql     ⏳ Gremios/empresas (15 orgs seedeadas)
├── 004_quipu_declaraciones.sql      ⏳ Declaraciones flattened + embeddings
├── 005_quipu_coherencia.sql         ⏳ Promesa↔declaración + funciones
├── 006_quipu_views.sql              ⏳ 5 vistas client-filtered
└── 007_quipu_rls.sql                ⏳ Row Level Security policies
```

---

### 0. Modelo Multi-Tenant (Clientes)

#### `quipu_clientes` - Organizaciones que contratan

```sql
CREATE TABLE quipu_clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(50),                 -- 'gremio', 'empresa', 'consultora', 'medio'
    sector VARCHAR(100),              -- 'seguros', 'mineria', 'banca'
    contacto_email VARCHAR(200),
    logo_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `quipu_usuarios` - Usuarios de cada cliente

```sql
CREATE TABLE quipu_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id INTEGER REFERENCES quipu_clientes(id),
    email VARCHAR(200) NOT NULL UNIQUE,
    nombre VARCHAR(200),
    rol VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'analyst', 'viewer'
    auth_user_id UUID,                -- FK a Supabase Auth
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `quipu_cliente_candidatos` - Candidatos por cliente

```sql
CREATE TABLE quipu_cliente_candidatos (
    cliente_id INTEGER REFERENCES quipu_clientes(id),
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cliente_id, candidato_id)
);
```

#### `quipu_cliente_temas` - Temas prioritarios del cliente

```sql
CREATE TABLE quipu_cliente_temas (
    cliente_id INTEGER REFERENCES quipu_clientes(id),
    tema_id INTEGER REFERENCES quipu_temas(id),
    prioridad INTEGER DEFAULT 1,      -- 1=alta, 2=media, 3=baja
    alertas_activas BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (cliente_id, tema_id)
);
```

---

### 1. `quipu_temas` - Catálogo Normalizado

```sql
CREATE TABLE quipu_temas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    nombre_normalizado VARCHAR(100),  -- 'pensiones' (sin tildes, lowercase)
    categoria VARCHAR(50),            -- 'economia', 'social', 'seguridad'
    sector VARCHAR(100),              -- 'seguros', 'mineria', 'salud'
    keywords TEXT[],                  -- ['AFP', 'ONP', 'jubilación', 'retiro']
    descripcion TEXT,
    color VARCHAR(20),
    orden INTEGER DEFAULT 0
);
```

**Seed incluido:** ~40 temas con keywords para auto-mapping.

---

### 2. `quipu_organizaciones` - Entidades Mencionadas

```sql
CREATE TABLE quipu_organizaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    aliases TEXT[],                   -- ['APESEG', 'Asociación Peruana de Seguros']
    tipo VARCHAR(50),                 -- 'gremio', 'empresa', 'regulador', 'ong'
    sector VARCHAR(100),              -- 'seguros', 'banca', 'mineria'
    descripcion TEXT,
    website VARCHAR(500)
);
```

**Seed incluido:** 15 gremios principales (APESEG, CONFIEP, SNI, SNMPE, etc.)

---

### 3. `quipu_declaraciones` - Interacciones Normalizadas

```sql
CREATE TABLE quipu_declaraciones (
    id SERIAL PRIMARY KEY,
    master_id UUID NOT NULL,          -- FK lógico a QUIPU_MASTER.id
    indice_interaccion INTEGER,       -- Posición en array interacciones

    -- Contenido original
    tipo VARCHAR(20) NOT NULL,        -- 'declaration' | 'mention'
    contenido TEXT NOT NULL,
    stakeholder_raw VARCHAR(200),     -- Texto original para debug
    tema_raw VARCHAR(200),

    -- VÍNCULOS NORMALIZADOS
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    tema_id INTEGER REFERENCES quipu_temas(id),

    -- BÚSQUEDA SEMÁNTICA
    embedding vector(1536),

    -- Contexto temporal
    fecha DATE,
    canal VARCHAR(100),               -- Fuente: 'RPP', 'Facebook', etc.
    url_fuente TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (master_id, indice_interaccion)
);

-- Índices
CREATE INDEX idx_decl_candidato ON quipu_declaraciones(candidato_id);
CREATE INDEX idx_decl_tema ON quipu_declaraciones(tema_id);
CREATE INDEX idx_decl_fecha ON quipu_declaraciones(fecha DESC);
CREATE INDEX idx_decl_embedding ON quipu_declaraciones
    USING hnsw (embedding vector_cosine_ops);
```

---

### 4. `quipu_promesa_declaracion` - Verificación de Coherencia

```sql
CREATE TABLE quipu_promesa_declaracion (
    id SERIAL PRIMARY KEY,
    promesa_id INTEGER REFERENCES quipu_promesas_planes(id),
    declaracion_id INTEGER REFERENCES quipu_declaraciones(id),

    similarity REAL,                  -- Score 0-1
    coherencia VARCHAR(20),           -- 'confirma', 'contradice', 'amplia', 'matiza'

    verificado_por VARCHAR(100),      -- NULL = automático
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (promesa_id, declaracion_id)
);
```

---

## Frontend Implementado ✅

### Hooks de Datos (src/hooks/)

| Hook | Función | Estado |
|------|---------|--------|
| `useCandidatos.ts` | Fetch candidatos con filtros | ✅ |
| `useCategorias.ts` | Fetch 247 categorías + conteo | ✅ |
| `useDashboardStats.ts` | Stats del dashboard + useDeclaracionesPorTema | ✅ |
| `useDeclaraciones.ts` | Fetch declaraciones + filtros + normalización acentos | ✅ |
| `usePartidos.ts` | Fetch partidos | ✅ |
| `usePromesas.ts` | Fetch promesas con búsqueda | ✅ |
| `useSearch.ts` | Búsqueda semántica | ✅ |
| `useStakeholderCandidato.ts` | Mapeo stakeholder→candidato | ✅ |

### Páginas (src/pages/)

| Página | Función | Estado |
|--------|---------|--------|
| `Dashboard.tsx` | Stats generales | ✅ |
| `Declaraciones.tsx` | Listado con filtros dinámicos | ✅ |
| `DeclaracionDetalle.tsx` | Detalle de declaración | ✅ |
| `Candidatos.tsx` | Listado de candidatos | ✅ |
| `CandidatoDetalle.tsx` | Timeline de candidato | ✅ |
| `Categorias.tsx` / `CategoriaDetalle.tsx` | Por categoría | ✅ |
| `Partidos.tsx` / `PartidoDetalle.tsx` | Por partido | ✅ |
| `BuscarPromesas.tsx` | Búsqueda semántica | ✅ |
| `Comparar.tsx` | Comparación candidatos | ✅ |
| `MapaElectoral.tsx` | Distribución geográfica | ✅ |

### Types (src/types/database.ts)

```typescript
✅ Partido, CategoriaPromesa, Promesa, Candidato
✅ HojaVida (expandido con verificaciones, indicadores)
✅ QuipuMasterEntry, Interaccion { type, content, stakeholder, tema }
✅ Declaracion, DeclaracionView
✅ PromesaCompleta, ResumenPartido, CandidatoCompleto
✅ DeclaracionFilters, CandidatoFilters, PromesaFilters
✅ SearchResult
```

---

## Arquitectura Actual vs Planeada

### Flujo Actual (Sin multi-tenancy)

```
QUIPU_MASTER (inmutable)
    ↓
v_quipu_declaraciones (Vista que flatten interacciones)
    ↓
Frontend hooks (useDeclaraciones, useDashboardStats)
    ↓
React components (sin filtro por cliente)
```

### Flujo Planeado (Multi-tenant completo)

```
QUIPU_MASTER (inmutable)
    ↓ (sync script)
quipu_declaraciones (tabla física con embeddings + FKs)
    ↓
RLS filtra por cliente
    ↓
v_quipu_cliente_declaraciones (Vista filtrada)
    ↓
Frontend hooks + Auth
    ↓
React components (datos del usuario autenticado)
```

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA MULTI-TENANT (⏳)                       │
│                                                                 │
│  ┌──────────────┐    ┌────────────────────┐    ┌─────────────┐ │
│  │   quipu_     │───►│ quipu_cliente_     │◄───│   quipu_    │ │
│  │   clientes   │    │    candidatos      │    │ candidatos  │ │
│  └──────┬───────┘    └────────────────────┘    └──────✅──────┘ │
│         │                                                       │
│         │            ┌────────────────────┐    ┌─────────────┐ │
│         └───────────►│ quipu_cliente_     │◄───│   quipu_    │ │
│                      │      temas         │    │    temas    │ │
│  ┌──────────────┐    └────────────────────┘    └─────────────┘ │
│  │   quipu_     │                                               │
│  │   usuarios   │ (auth)                                        │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE DATOS                            │
│                                                                 │
│                    ┌─────────────────────┐                      │
│                    │    QUIPU_MASTER     │ ✅ (inmutable)       │
│                    │    (pipeline ext)   │                      │
│                    └──────────┬──────────┘                      │
│                               │ sync ⏳                         │
│                               ▼                                 │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │   quipu_     │◄─│  quipu_declaraciones │─►│   quipu_     │   │
│  │  candidatos  │  │   (con embeddings)  │  │    temas     │   │
│  │      ✅      │  │        ⏳           │  │      ⏳      │   │
│  └──────────────┘  └──────────┬──────────┘  └──────────────┘   │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │   quipu_     │  │ quipu_promesa_      │  │   quipu_     │   │
│  │  partidos ✅ │  │   declaracion ⏳    │  │organizaciones│   │
│  └──────────────┘  │   (coherencia)      │  │      ⏳      │   │
│         │          └─────────────────────┘  └──────────────┘   │
│         ▼                     ▲                                 │
│  ┌──────────────┐             │                                 │
│  │   quipu_     │─────────────┘                                 │
│  │  promesas ✅ │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

Leyenda: ✅ = Deployado | ⏳ = Definido, sin deployar
```

---

## Vistas Planeadas (fase3/migrations/006)

```sql
⏳ v_quipu_declaraciones_completas   -- declaraciones + candidato + partido + tema
⏳ v_quipu_cliente_declaraciones     -- filtered by cliente + prioridad
⏳ v_quipu_cliente_candidatos_stats  -- stats de candidatos por cliente
⏳ v_quipu_cliente_temas_stats       -- stats de temas por cliente
⏳ v_quipu_cliente_dashboard         -- dashboard stats por cliente
⏳ v_quipu_cliente_coherencia        -- coherencia promesas/declaraciones
```

---

## RLS Policies Planeadas (fase3/migrations/007)

```sql
-- Función helper
CREATE FUNCTION get_current_cliente_id() RETURNS INTEGER AS $$
    SELECT cliente_id FROM quipu_usuarios WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Política por tabla
ALTER TABLE quipu_declaraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente ve sus declaraciones"
ON quipu_declaraciones FOR SELECT
USING (
    candidato_id IN (
        SELECT candidato_id FROM quipu_cliente_candidatos
        WHERE cliente_id = get_current_cliente_id()
    )
);
```

---

## Pipeline de Sincronización (Pendiente)

Cuando llega un registro nuevo a QUIPU_MASTER:

1. **Extraer** cada interacción del array `interacciones`
2. **Resolver candidato**: buscar `stakeholder` en `quipu_candidatos.nombre_completo`
3. **Resolver tema**: mapear `tema` a `quipu_temas` (fuzzy match + keywords)
4. **Generar embedding** del `contenido` (vector 1536)
5. **Buscar promesas similares** y crear links en `quipu_promesa_declaracion`
6. **Extraer organizaciones** mencionadas en el contenido

---

## Próximos Pasos (Orden de Ejecución)

### Fase 3.1: Capa de Datos (sin multi-tenancy)

**Objetivo:** Normalizar declaraciones y habilitar búsqueda semántica. Funciona independiente de clientes.

```bash
# 1. Crear tablas de normalización
psql -f fase3/migrations/002_quipu_temas.sql         # Catálogo de ~40 temas
psql -f fase3/migrations/003_quipu_organizaciones.sql # 15 gremios seedeados
psql -f fase3/migrations/004_quipu_declaraciones.sql  # Tabla principal + índices
psql -f fase3/migrations/005_quipu_coherencia.sql     # Links promesa↔declaración
```

```bash
# 2. Poblar datos
python sync_master_to_declaraciones.py   # Extrae interacciones de QUIPU_MASTER
```

**Resultado:**
- `quipu_declaraciones` con `candidato_id`, `tema_id` resueltos
- Embeddings generados para búsqueda semántica
- Links de coherencia promesa↔declaración creados
- Dashboard actual puede usar datos normalizados (sin filtro por cliente)

---

### Fase 3.2: Capa Multi-Tenant

**Objetivo:** Segmentar datos por cliente. Requiere Fase 3.1 completada.

```bash
# 1. Crear tablas de clientes
psql -f fase3/migrations/001_quipu_clientes.sql  # clientes, usuarios, cliente_candidatos

# 2. Crear vistas filtradas
psql -f fase3/migrations/006_quipu_views.sql     # v_quipu_cliente_*

# 3. Activar seguridad
psql -f fase3/migrations/007_quipu_rls.sql       # Row Level Security
```

**Resultado:**
- Tabla `quipu_clientes` con suscripciones
- Tablas `quipu_cliente_candidatos` y `quipu_cliente_temas`
- RLS policies activas (usuarios solo ven sus datos)

---

### Fase 3.3: Cliente de Demostración

**Objetivo:** Validar que multi-tenancy funciona end-to-end.

1. Crear cliente APESEG:
   - 15 candidatos asignados
   - 5 temas prioritarios (seguros, AFP, pensiones, salud, regulación)
2. Crear usuario de prueba vinculado a APESEG
3. Verificar que RLS filtra correctamente
4. Probar vistas `v_quipu_cliente_*`

---

### Fase 3.4: Frontend con Auth

**Objetivo:** UI que respeta multi-tenancy.

1. Implementar login con Supabase Auth
2. Modificar hooks para usar vistas filtradas
3. Dashboard personalizado por cliente
4. Admin panel para gestionar candidatos/temas por cliente
5. Sistema de alertas y notificaciones

---

## Cambios Respecto al Plan Original

| Aspecto | Plan Original | Estado Actual |
|---------|---------------|---------------|
| Categorías | 15 fijas | **247 dinámicas** ✅ |
| Hojas de vida | ~20 campos | **50+ campos** con verificaciones JNE ✅ |
| Deduplicación | No planeado | Vista `v_quipu_candidatos_unicos` ✅ |
| Verificaciones JNE | No planeado | JSONB {sunedu, sunarp, minedu_tec, infogob, rop} ✅ |
| Indicadores candidato | No planeado | 15 booleanos en JSONB ✅ |
| Multi-tenancy | Planeado | Diseñado en fase3/, sin deployar ⏳ |
| Declaraciones normalizadas | Planeado | Diseñado, sin sync ⏳ |
| Embeddings declaraciones | Planeado | Schema listo, sin datos ⏳ |

---

## Queries de Ejemplo (Futuro Multi-Tenant)

### Dashboard Principal del Cliente

```sql
SELECT d.*, c.nombre_completo, c.partido_nombre, t.nombre as tema
FROM quipu_declaraciones d
JOIN quipu_candidatos c ON d.candidato_id = c.id
JOIN quipu_temas t ON d.tema_id = t.id
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
JOIN quipu_cliente_temas ct ON ct.tema_id = d.tema_id
WHERE cc.cliente_id = $cliente_id AND ct.cliente_id = $cliente_id
ORDER BY d.fecha DESC, ct.prioridad ASC;
```

### Búsqueda Semántica Filtrada

```sql
SELECT d.contenido, c.nombre_completo, t.nombre as tema,
       1 - (d.embedding <=> $query_embedding) as similarity
FROM quipu_declaraciones d
JOIN quipu_candidatos c ON d.candidato_id = c.id
JOIN quipu_temas t ON d.tema_id = t.id
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
WHERE cc.cliente_id = $cliente_id AND d.embedding IS NOT NULL
ORDER BY d.embedding <=> $query_embedding
LIMIT 20;
```

---

## Beneficios de la Arquitectura

| Antes | Después |
|-------|---------|
| Sin modelo de clientes | Multi-tenant con suscripciones |
| Usuario ve todo | Usuario ve solo sus candidatos/temas |
| Declaraciones en JSON anidado | Tabla plana con FKs |
| Stakeholder = texto libre | `candidato_id` → consultas directas |
| Tema = texto inconsistente | `tema_id` → filtro por prioridad |
| Sin búsqueda semántica en declaraciones | Embeddings + HNSW index |
| Sin link promesa ↔ declaración | Tabla de coherencia |
| Organizaciones en texto | Tabla normalizada + menciones |
| 15 categorías fijas | **247 categorías dinámicas** |
| Hojas de vida básicas | **50+ campos con verificaciones JNE** |

---

*Documento actualizado Enero 2026 para reflejar el estado real de implementación de Quipu.*
