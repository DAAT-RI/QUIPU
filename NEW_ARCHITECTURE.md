# Nueva Arquitectura de Datos - Quipu

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

## Problema: Arquitectura Actual

### Tablas Existentes

```
quipu_partidos (35)
quipu_candidatos (~6,400)
quipu_hojas_vida
quipu_promesas_planes (~22,000) ← tiene embeddings
quipu_categorias_promesas (15)
QUIPU_MASTER (inmutable, viene de pipeline externo)
```

### Limitaciones

| Gap | Impacto | Ejemplo |
|-----|---------|---------|
| **Sin vínculo declaración → candidato** | No puedo filtrar "qué dijo Forsyth" | `stakeholder` es texto libre |
| **Temas no normalizados** | No puedo filtrar "todo sobre pensiones" | `tema` tiene variantes: "AFP", "pensiones", "jubilación" |
| **Organizaciones como texto** | Gremios no pueden filtrar menciones | "APESEG" aparece en texto, no hay FK |
| **Sin embeddings en declaraciones** | Búsqueda semántica solo en promesas | Usuario busca "reforma tributaria" y no encuentra declaraciones relacionadas |
| **Sin link promesa ↔ declaración** | No puedo verificar coherencia | Objetivo clave del producto |

---

## Solución: Tablas de Normalización

### Principio de Diseño

> **QUIPU_MASTER es inmutable** - no lo tocamos.
> Creamos tablas auxiliares que extraen, normalizan y vinculan.

---

## Nuevas Tablas

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

#### `quipu_cliente_candidatos` - Candidatos que sigue cada cliente

```sql
CREATE TABLE quipu_cliente_candidatos (
    cliente_id INTEGER REFERENCES quipu_clientes(id),
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cliente_id, candidato_id)
);
```

**Beneficio:** Cliente paga por 15 candidatos → solo ve esos 15.

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

**Beneficio:** APESEG prioriza "pensiones" → dashboard ordena por relevancia.

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

---

### 1. `quipu_temas` - Catálogo Normalizado

**Por qué:** Permite filtrar declaraciones por sector/tema de interés del usuario.

```sql
CREATE TABLE quipu_temas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    nombre_normalizado VARCHAR(100),  -- 'pensiones' (sin tildes, lowercase)
    categoria VARCHAR(50),            -- 'economia', 'social', 'seguridad'
    sector VARCHAR(100),              -- 'seguros', 'mineria', 'salud' (para gremios)
    keywords TEXT[],                  -- ['AFP', 'ONP', 'jubilación', 'retiro']
    descripcion TEXT,
    color VARCHAR(20),
    orden INTEGER DEFAULT 0
);
```

**Beneficio:**
- Gremio de seguros filtra `sector = 'seguros'`
- Encuentra declaraciones sobre "AFP", "pensiones", "sistema previsional"
- Keywords permiten mapeo automático desde texto libre

---

### 2. `quipu_organizaciones` - Entidades Mencionadas

**Por qué:** Gremios quieren saber cuándo los mencionan (o a su sector).

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

**Beneficio:**
- APESEG ve todas las declaraciones donde mencionan seguros/aseguradoras
- Alertas cuando un candidato habla de su sector

---

### 3. `quipu_declaraciones` - Interacciones Aplanadas y Enriquecidas

**Por qué:** Extrae cada declaración de MASTER con vínculos reales a candidatos y temas.

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

    -- VÍNCULOS NORMALIZADOS (el valor real)
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    tema_id INTEGER REFERENCES quipu_temas(id),

    -- BÚSQUEDA SEMÁNTICA
    embedding vector(1536),

    -- Contexto temporal
    fecha DATE,
    canal VARCHAR(100),               -- Fuente: 'RPP', 'Facebook', etc.
    url_fuente TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (master_id, indice_interaccion)
);

-- Índices para filtrado rápido
CREATE INDEX idx_decl_candidato ON quipu_declaraciones(candidato_id);
CREATE INDEX idx_decl_tema ON quipu_declaraciones(tema_id);
CREATE INDEX idx_decl_fecha ON quipu_declaraciones(fecha DESC);
CREATE INDEX idx_decl_embedding ON quipu_declaraciones
    USING hnsw (embedding vector_cosine_ops);
```

**Beneficios:**
- `WHERE candidato_id = 123` → todas las declaraciones de Forsyth
- `WHERE tema_id = 5` → todo sobre pensiones
- Búsqueda semántica: "reforma del sistema previsional" encuentra declaraciones relacionadas
- Timeline por candidato para detectar cambios de postura

---

### 4. `quipu_declaracion_organizaciones` - Many-to-Many

**Por qué:** Una declaración puede mencionar múltiples organizaciones.

```sql
CREATE TABLE quipu_declaracion_organizaciones (
    declaracion_id INTEGER REFERENCES quipu_declaraciones(id),
    organizacion_id INTEGER REFERENCES quipu_organizaciones(id),
    tipo_mencion VARCHAR(30),         -- 'neutral', 'positiva', 'critica'
    PRIMARY KEY (declaracion_id, organizacion_id)
);
```

**Beneficio:**
- CONFIEP ve declaraciones donde los critican vs apoyan
- Dashboard de sentimiento por organización

---

### 5. `quipu_promesa_declaracion` - Verificación de Coherencia

**Por qué:** Objetivo clave del producto - contrastar plan vs lo que dicen.

```sql
CREATE TABLE quipu_promesa_declaracion (
    id SERIAL PRIMARY KEY,
    promesa_id INTEGER REFERENCES quipu_promesas_planes(id),
    declaracion_id INTEGER REFERENCES quipu_declaraciones(id),

    similarity REAL,                  -- Score de similitud semántica (0-1)
    coherencia VARCHAR(20),           -- 'confirma', 'contradice', 'amplia', 'matiza'

    verificado_por VARCHAR(100),      -- NULL = automático, o nombre de analista
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (promesa_id, declaracion_id)
);
```

**Beneficio:**
- Periodista ve: "En su plan dice X, pero en RPP dijo Y"
- Score automático de coherencia por candidato
- Fact-checking estructurado

---

## Diagrama Final

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA MULTI-TENANT                        │
│                                                                 │
│  ┌──────────────┐    ┌────────────────────┐    ┌─────────────┐ │
│  │   quipu_     │───►│ quipu_cliente_     │◄───│   quipu_    │ │
│  │   clientes   │    │    candidatos      │    │ candidatos  │ │
│  └──────┬───────┘    └────────────────────┘    └─────────────┘ │
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
│                    │    QUIPU_MASTER     │ (inmutable)          │
│                    │    (pipeline ext)   │                      │
│                    └──────────┬──────────┘                      │
│                               │ sync                            │
│                               ▼                                 │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │   quipu_     │◄─│  quipu_declaraciones │─►│   quipu_     │   │
│  │  candidatos  │  │   (con embeddings)  │  │    temas     │   │
│  └──────────────┘  └──────────┬──────────┘  └──────────────┘   │
│         │                     │                     │           │
│         ▼                     ▼                     ▼           │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│  │   quipu_     │  │ quipu_promesa_      │  │   quipu_     │   │
│  │  partidos    │  │   declaracion       │  │organizaciones│   │
│  └──────────────┘  │   (coherencia)      │  └──────────────┘   │
│         │          └─────────────────────┘                      │
│         ▼                     ▲                                 │
│  ┌──────────────┐             │                                 │
│  │   quipu_     │─────────────┘                                 │
│  │  promesas    │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. QUIPU_MASTER recibe declaración
         │
         ▼
2. Sync extrae → quipu_declaraciones (con candidato_id, tema_id)
         │
         ▼
3. Usuario de Cliente X hace login
         │
         ▼
4. Dashboard filtra:
   - Solo candidatos en quipu_cliente_candidatos WHERE cliente_id = X
   - Solo temas en quipu_cliente_temas WHERE cliente_id = X
```

---

## Queries Habilitadas (Filtradas por Cliente)

### Dashboard Principal del Cliente

```sql
-- Declaraciones de MIS candidatos sobre MIS temas
SELECT
    d.*,
    c.nombre_completo,
    c.partido_nombre,
    t.nombre as tema,
    ct.prioridad as tema_prioridad
FROM quipu_declaraciones d
JOIN quipu_candidatos c ON d.candidato_id = c.id
JOIN quipu_temas t ON d.tema_id = t.id
-- FILTRO POR CLIENTE
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
JOIN quipu_cliente_temas ct ON ct.tema_id = d.tema_id
WHERE cc.cliente_id = $cliente_id
  AND ct.cliente_id = $cliente_id
ORDER BY d.fecha DESC, ct.prioridad ASC;
```

### Vista: Declaraciones del Cliente (simplifica queries)

```sql
CREATE VIEW v_quipu_cliente_declaraciones AS
SELECT
    d.*,
    c.nombre_completo as candidato,
    c.partido_nombre as partido,
    t.nombre as tema,
    t.sector,
    cc.cliente_id
FROM quipu_declaraciones d
JOIN quipu_candidatos c ON d.candidato_id = c.id
JOIN quipu_temas t ON d.tema_id = t.id
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
JOIN quipu_cliente_temas ct ON ct.tema_id = d.tema_id AND ct.cliente_id = cc.cliente_id;

-- Uso simple:
SELECT * FROM v_quipu_cliente_declaraciones
WHERE cliente_id = $cliente_id
ORDER BY fecha DESC;
```

### Verificar Coherencia (Solo mis candidatos)

```sql
SELECT
    c.nombre_completo as candidato,
    p.texto_original as promesa,
    d.contenido as declaracion,
    pd.coherencia,
    pd.similarity
FROM quipu_promesa_declaracion pd
JOIN quipu_promesas_planes p ON pd.promesa_id = p.id
JOIN quipu_declaraciones d ON pd.declaracion_id = d.id
JOIN quipu_candidatos c ON d.candidato_id = c.id
-- FILTRO POR CLIENTE
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
WHERE cc.cliente_id = $cliente_id
  AND pd.coherencia = 'contradice'
ORDER BY pd.similarity DESC;
```

### Timeline de un Candidato (que sigo)

```sql
SELECT
    d.fecha,
    d.contenido,
    d.canal,
    t.nombre as tema
FROM quipu_declaraciones d
JOIN quipu_temas t ON d.tema_id = t.id
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
WHERE cc.cliente_id = $cliente_id
  AND d.candidato_id = $candidato_id
ORDER BY d.fecha DESC;
```

### Búsqueda Semántica (Solo en mis candidatos/temas)

```sql
SELECT
    d.contenido,
    c.nombre_completo,
    t.nombre as tema,
    1 - (d.embedding <=> $query_embedding) as similarity
FROM quipu_declaraciones d
JOIN quipu_candidatos c ON d.candidato_id = c.id
JOIN quipu_temas t ON d.tema_id = t.id
-- FILTRO POR CLIENTE
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
JOIN quipu_cliente_temas ct ON ct.tema_id = d.tema_id AND ct.cliente_id = cc.cliente_id
WHERE cc.cliente_id = $cliente_id
  AND d.embedding IS NOT NULL
ORDER BY d.embedding <=> $query_embedding
LIMIT 20;
```

### Stats del Dashboard por Cliente

```sql
SELECT
    COUNT(DISTINCT d.candidato_id) as candidatos_activos,
    COUNT(d.id) as total_declaraciones,
    COUNT(DISTINCT d.tema_id) as temas_cubiertos,
    COUNT(CASE WHEN d.fecha > NOW() - INTERVAL '7 days' THEN 1 END) as declaraciones_semana
FROM quipu_declaraciones d
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
JOIN quipu_cliente_temas ct ON ct.tema_id = d.tema_id AND ct.cliente_id = cc.cliente_id
WHERE cc.cliente_id = $cliente_id;
```

---

## Pipeline de Sincronización

Cuando llega un registro nuevo a QUIPU_MASTER:

1. **Extraer** cada interacción del array `interacciones`
2. **Resolver candidato**: buscar `stakeholder` en `quipu_candidatos.nombre_completo`
3. **Resolver tema**: mapear `tema` a `quipu_temas` (fuzzy match o keywords)
4. **Generar embedding** del `contenido`
5. **Buscar promesas similares** y crear links en `quipu_promesa_declaracion`
6. **Extraer organizaciones** mencionadas en el contenido

---

## Migración Propuesta

```
migrations/
├── 007_create_quipu_clientes.sql           -- Clientes + usuarios
├── 008_create_quipu_temas.sql              -- Catálogo de temas
├── 009_create_quipu_organizaciones.sql     -- Gremios/empresas
├── 010_create_quipu_declaraciones.sql      -- Declaraciones normalizadas
├── 011_create_cliente_relaciones.sql       -- cliente_candidatos, cliente_temas
├── 012_create_quipu_promesa_declaracion.sql
├── 013_create_views.sql                    -- v_quipu_cliente_declaraciones
├── 014_setup_rls_policies.sql              -- Row Level Security
└── 015_sync_master_to_declaraciones.py     -- Script de sincronización
```

---

## Resumen de Beneficios

| Antes | Después |
|-------|---------|
| Sin modelo de clientes | Multi-tenant con suscripciones |
| Usuario ve todo | Usuario ve solo sus candidatos/temas |
| Declaraciones en JSON anidado | Tabla plana con FKs |
| Stakeholder = texto libre | `candidato_id` → consultas directas |
| Tema = texto inconsistente | `tema_id` → filtro por prioridad del cliente |
| Sin búsqueda semántica en declaraciones | Embeddings + HNSW index |
| Sin link promesa ↔ declaración | Tabla de coherencia |
| Organizaciones perdidas en texto | Tabla normalizada + menciones |

---

## Row Level Security (RLS) - Supabase

```sql
-- Política: usuarios solo ven datos de su cliente
ALTER TABLE quipu_declaraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente ve sus declaraciones"
ON quipu_declaraciones FOR SELECT
USING (
    candidato_id IN (
        SELECT candidato_id FROM quipu_cliente_candidatos
        WHERE cliente_id = (
            SELECT cliente_id FROM quipu_usuarios
            WHERE auth_user_id = auth.uid()
        )
    )
);
```

---

*Documento generado para justificar la evolución de arquitectura de datos de Quipu.*
