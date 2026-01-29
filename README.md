# Quipu - Sistema Electoral Peru 2026

Base de datos consolidada de candidatos, hojas de vida, promesas electorales y monitoreo de medios para las elecciones Peru 2026.

## Demo en Vivo

**https://frontend-alpha-five-25.vercel.app**

## Estructura del Proyecto

```
Quipu/
├── frontend/                      # Dashboard React (Vite + TypeScript + Tailwind)
│   ├── src/
│   │   ├── components/            # UI components (layout, ui, features)
│   │   ├── hooks/                 # React Query hooks (useCandidatos, usePromesas, etc.)
│   │   ├── pages/                 # Rutas (Dashboard, Candidatos, Partidos, etc.)
│   │   ├── lib/                   # Supabase client, utils, constants
│   │   └── types/                 # TypeScript types
│   └── public/                    # Assets (logos, fonts)
│
├── data/                          # Datos procesados
│   ├── promesas_v2.db             # SQLite: 22,358 promesas con embeddings
│   ├── hojas_vida_completas.json  # 6,438 hojas de vida
│   ├── candidatos_jne_2026.json   # Datos básicos candidatos
│   ├── partido_pdf_map.json       # Mapeo partidos → PDFs
│   └── schema_sqlite.sql          # Schema SQLite original
│
├── fotos/                         # 8,109 fotos de candidatos
├── pdfs/                          # 70 PDFs planes de gobierno
│
└── migrations/                    # Scripts migración a Supabase
    ├── 001_schema_supabase.sql    # Schema PostgreSQL + pgvector
    └── 002_migrate_to_supabase.py # Script de migración
```

## Stack Técnico

### Frontend
- **React 19** + TypeScript + Vite
- **Tailwind CSS v4** con tema PARLEY (Arboria font, Navy/Gold palette)
- **React Query** para data fetching
- **Recharts** para visualizaciones
- **Lucide** para iconos
- **Supabase JS** cliente directo (sin backend adicional)

### Base de Datos (Supabase)
- **PostgreSQL** + pgvector para búsqueda semántica
- **Tablas principales:**
  - `quipu_partidos` — 35 partidos políticos
  - `quipu_candidatos` — 6,438 candidatos JNE
  - `quipu_hojas_vida` — Hojas de vida completas
  - `quipu_promesas_planes` — 22,358 promesas (con embeddings 1536d)
  - `quipu_categorias_promesas` — 15 categorías temáticas
  - `QUIPU_MASTER` — Monitoreo de medios/RRSS en tiempo real

### Vistas SQL
- `v_quipu_candidatos_unicos` — Candidatos con partido y orden_cargo
- `v_quipu_candidatos_completos` — Candidatos con hoja de vida
- `v_quipu_promesas_planes_completas` — Promesas con partido y categoría
- `v_quipu_declaraciones` — Declaraciones aplanadas de QUIPU_MASTER

## Datos Disponibles

### 1. Promesas Electorales
- **22,358 promesas** extraídas de planes de gobierno
- **35 partidos** con promesas procesadas
- **Embeddings** de 1536 dimensiones (Gemini) para búsqueda semántica
- **15 categorías**: educacion, salud, economia, seguridad, empleo, infraestructura, agricultura, medio_ambiente, justicia, tecnologia, vivienda, transporte, cultura, social, reforma_estado

### 2. Candidatos y Hojas de Vida
- **6,438 candidatos** (presidente, vicepresidentes, senadores, diputados)
- Información personal, educación, experiencia, patrimonio
- Sentencias y procesos judiciales

### 3. Monitoreo de Medios (QUIPU_MASTER)
- Declaraciones de candidatos en RRSS y prensa
- Temas, organizaciones, ubicaciones mencionadas
- Interacciones tipo `declaration` (citas textuales) y `mention`

### 4. Fotos y PDFs
- **8,109 fotos** de candidatos (JNE)
- **70 PDFs** de planes de gobierno (completos + resúmenes)

---

## Estado del Desarrollo

### Completado (FASE 1-2)

| Módulo | Estado |
|--------|--------|
| Scaffold + Layout | ✅ |
| Dashboard con stats | ✅ |
| Candidatos (grid/list, filtros, paginación) | ✅ |
| Candidato Detalle (hoja de vida, tabs) | ✅ |
| Partidos (grid, detalle) | ✅ |
| Categorías (grid, detalle con promesas) | ✅ |
| Declaraciones (feed, filtros) | ✅ |
| Comparar Candidatos | ✅ |
| Buscar Promesas | ✅ |
| Dark Mode | ✅ |
| Mobile Responsive | ✅ |
| Deploy Vercel | ✅ |

### Pendiente

#### FASE 3: Auth Multi-Tenant
- [ ] Tabla `quipu_clientes` (empresas/gremios)
- [ ] Tabla `quipu_clientes_config` (filtros de acceso por cliente)
- [ ] RLS Policies vinculadas a `auth.uid()`
- [ ] Página de Login (`/login`)
- [ ] Hook `useAuth` (login, logout, session)
- [ ] `ProtectedRoute` component
- [ ] Header: user menu con nombre cliente + logout
- [ ] Sidebar: ocultar items según permisos

#### FASE 4: Edge Function (Búsqueda Semántica)
- [ ] Supabase Edge Function `search-promises`
- [ ] Integración con Gemini Embedding API
- [ ] Llamada a `quipu_buscar_promesas_similares(embedding, ...)`
- [ ] UI de búsqueda semántica en `/buscar`

#### FASE 5: Análisis de Coherencia
- [ ] Cruzar promesas de planes con declaraciones en medios
- [ ] Score de coherencia (plan vs discurso público)
- [ ] Alertas de contradicción
- [ ] Timeline de evolución del discurso

#### Mejoras UI/UX
- [ ] Mapa Electoral SVG (`/mapa`) — Peru por departamentos
- [ ] Code splitting para reducir bundle size (601KB → chunks)
- [ ] Skeleton loaders en lugar de spinner
- [ ] Infinite scroll como alternativa a paginación

#### Data Pipeline
- [ ] Migrar fotos a Supabase Storage
- [ ] Automatizar ingesta de QUIPU_MASTER desde n8n
- [ ] Webhook para notificaciones de nuevas declaraciones

---

## Desarrollo Local

```bash
# Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Variables de entorno
cp .env.example .env
# Editar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
```

## Deploy

```bash
# Vercel CLI
cd frontend
npx vercel --prod --yes
```

---

## Consultas Útiles (Supabase)

```sql
-- Candidatos presidenciales ordenados
SELECT * FROM v_quipu_candidatos_unicos
WHERE tipo_eleccion = 'PRESIDENCIAL'
ORDER BY orden_cargo, partido_nombre;

-- Promesas por categoría
SELECT categoria, COUNT(*) as total
FROM quipu_promesas_planes
GROUP BY categoria
ORDER BY total DESC;

-- Declaraciones recientes
SELECT * FROM v_quipu_declaraciones
ORDER BY fecha DESC
LIMIT 50;

-- Buscar declaraciones por stakeholder
SELECT * FROM v_quipu_declaraciones
WHERE stakeholder ILIKE '%López Aliaga%';
```

## Búsqueda Semántica

```sql
-- Usando la función RPC (requiere Edge Function)
SELECT * FROM quipu_buscar_promesas_similares(
    '[0.123, -0.456, ...]'::vector,  -- embedding de la query
    0.7,    -- threshold similitud
    10,     -- max resultados
    'salud' -- filtro categoría (opcional)
);
```

---

## Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **UI**: Lucide icons, Recharts, PARLEY design system
- **Backend**: Supabase (PostgreSQL + pgvector + Auth + Storage)
- **Extracción PDF**: PyMuPDF
- **LLM**: Gemini 2.5 Flash
- **Embeddings**: Gemini Embedding (1536 dims)
- **Deploy**: Vercel

---

Proyecto para análisis electoral Peru 2026.
