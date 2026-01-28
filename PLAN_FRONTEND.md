# Plan: Quipu Frontend - Inteligencia Electoral Peru 2026

## Resumen

Frontend en `c:\Entornos\Quipu\frontend\` replicando el stack y estilo visual de PARLEY_CIJA_DASHBOARD. Dashboard multi-tenant con acceso por cliente (Supabase Auth + RLS).

**Fuentes de datos:**
- `quipu_promesas_planes` — 22,358 promesas de planes de gobierno (con embeddings)
- `quipu_candidatos` — 6,438 candidatos JNE
- `quipu_hojas_vida` — Hojas de vida completas
- `quipu_partidos` — 35 partidos politicos
- `quipu_categorias_promesas` — 15 categorias tematicas
- `QUIPU_MASTER` — Monitoreo de medios/RRSS en tiempo real (el equipo lo alimenta)

---

## QUIPU_MASTER — Tabla de Monitoreo de Medios

Tabla creada por el equipo con datos de monitoreo en tiempo real:

| Campo | Tipo | Contenido |
|-------|------|-----------|
| `id` | UUID | PK auto-generado |
| `canal` | text | Fuente/cuenta ("PODEMOS PERÚ", "RAFAEL LOPEZALIAGA") |
| `titulo` | text | Texto original del post/declaracion |
| `resumen` | text | Resumen AI |
| `temas` | text | Semicolon-separated ("Política; Partidos Políticos") |
| `personas` | text | "Nombre (descripcion del personaje)" |
| `keywords` | text | Comma-separated |
| `organizaciones` | text | Orgs mencionadas |
| `ubicaciones` | text | Lugares mencionados |
| `paises` | text | Paises mencionados |
| `productos` | text | Productos mencionados |
| `fecha` | timestamp | Fecha del contenido original |
| `ruta` | text | URL fuente (Twitter/X, Facebook, etc.) |
| `url_clip` | text | URL a GCS con texto completo |
| `interacciones` | JSONB[] | `[{type: "declaration"/"mention", content, stakeholder}]` |
| `processed_at` | timestamp | Cuando se proceso |

**Datos actuales:** 8 registros, 33 interacciones (24 declarations, 9 mentions), 4 canales, 8 temas, 5+ stakeholders.

**Temas de QUIPU_MASTER** (distintos a las 15 categorias de planes):
Política, Partidos Políticos, Corrupción y Transparencia, Derechos Humanos, Desarrollo Social, Elecciones y Sistemas Electorales, Gobierno y Administración Pública, Startups y Emprendimiento

**IMPORTANTE: La unidad principal de visualizacion es la DECLARACION.**
- `canal` es solo el perfil fuente (de donde viene la info)
- Lo que importa: cada interaccion con `type = "declaration"` dentro de `interacciones`
- `declaration` = cita textual de lo que dijo el stakeholder — **ESTO ES EL FOCO**
- `mention` = referencia a una persona — **SE MANEJA APARTE, fuera de scope del MVP**

**Vista SQL — solo declarations:**
```sql
CREATE OR REPLACE VIEW v_quipu_declaraciones AS
SELECT
    m.id as master_id,
    m.canal,
    m.resumen,
    m.temas,
    m.keywords,
    m.organizaciones,
    m.ubicaciones,
    m.fecha,
    m.ruta,
    (inter->>'content') as contenido,
    (inter->>'stakeholder') as stakeholder
FROM "QUIPU_MASTER" m,
jsonb_array_elements(m.interacciones) as inter
WHERE (inter->>'type') = 'declaration';
```

Queries ejemplo:
```sql
-- Todas las declaraciones de López Aliaga
SELECT * FROM v_quipu_declaraciones
WHERE stakeholder ILIKE '%López Aliaga%'
ORDER BY fecha DESC;
```

---

## Decisiones Arquitectonicas

| Decision | Eleccion |
|----------|----------|
| Ubicacion | `c:\Entornos\Quipu\frontend\` (subcarpeta) |
| Stack | React 19 + TypeScript + Vite + Tailwind + Lucide + Recharts |
| DB client | Supabase JS (directo, sin backend adicional) |
| Auth | Supabase Auth con RLS multi-tenant |
| Busqueda semantica | Supabase Edge Function (Gemini API server-side) |
| Fotos candidatos | Supabase Storage bucket (migracion separada) |
| Mapa Peru | SVG inline (sin Leaflet/Mapbox) |
| UI library | Ninguna - componentes custom con Tailwind (igual que PARLEY) |

---

## Fases de Implementacion

### FASE 1: Scaffold + Layout (prioridad inmediata)

**1.1 Crear proyecto**
- `npm create vite@latest frontend -- --template react-ts`
- Instalar deps: `@supabase/supabase-js @tanstack/react-query react-router-dom recharts lucide-react clsx tailwind-merge date-fns`
- Dev deps: `tailwindcss postcss autoprefixer`
- Copiar config de PARLEY: `tailwind.config.js`, `postcss.config.js`, `globals.css` (tema HSL)

**1.2 Archivos base**
- `src/lib/supabase.ts` - Cliente Supabase tipado
- `src/lib/utils.ts` - `cn()`, `formatDate()`, `formatNumber()`
- `src/lib/constants.ts` - Mapeo 15 categorias (icono Lucide + color + label) + temas QUIPU_MASTER
- `src/types/database.ts` - Tipos Supabase (todas las tablas + vistas + funciones + QUIPU_MASTER)

**1.3 Layout shell** (replicar PARLEY exacto)
- `src/components/layout/Layout.tsx` - flex h-screen, sidebar + header + content
- `src/components/layout/Sidebar.tsx` - w-64 fijo, 8 nav items, mobile toggle
- `src/components/layout/Header.tsx` - h-16 sticky, search, dark mode toggle
- `src/App.tsx` - Router + QueryClient + Layout + 12 rutas placeholder

**Navegacion sidebar:**
```
Dashboard        /                  LayoutDashboard
Declaraciones    /declaraciones     MessageSquareQuote  ← NUEVO (QUIPU_MASTER)
Buscar Promesas  /buscar            Search
Candidatos       /candidatos        Users
Partidos         /partidos          Building2
Categorias       /categorias        Tags
Comparar         /comparar          GitCompare
Mapa Electoral   /mapa              Map
```

**1.4 Componentes UI compartidos**
- `StatsCard.tsx` - Icono + valor + descripcion + trend
- `Badge.tsx` - Partido badge, categoria badge, fuente badge
- `CategoryBadge.tsx` - Usa CATEGORY_CONFIG para color/icono
- `SourceBadge.tsx` - Distingue "Plan de Gobierno" vs "Twitter/X" vs "Facebook" vs "Prensa"
- `SearchInput.tsx` - Input con icono overlay
- `ViewToggle.tsx` - Grid/list toggle
- `FilterSelect.tsx` - Select estilizado
- `CandidatoAvatar.tsx` - Foto con fallback a iniciales
- `LoadingSpinner.tsx`, `EmptyState.tsx`, `ErrorState.tsx`

---

### FASE 2: Paginas Core (sin auth)

**2.1 Dashboard (`/`)**
- 5 StatsCards: Candidatos, Partidos, Promesas (planes), Declarations (QUIPU_MASTER), Categorias
- BarChart: Promesas por categoria (15 barras, colores del schema)
- PieChart: Candidatos por tipo eleccion (Presidencial/Senado/Diputados)
- BarChart horizontal: Top 10 partidos por promesas
- **Feed reciente**: Ultimas declarations de v_quipu_declaraciones (stakeholder + cita + fecha)
- Links rapidos a Buscar, Candidatos, Declaraciones

**2.2 Declaraciones (`/declaraciones`)** ← NUEVO — Feed de DECLARACIONES
- **Unidad principal: la declaracion** (cita textual de un stakeholder)
- Usa la vista `v_quipu_declaraciones` (solo type='declaration')
- Cada declaracion como card:
  - **Stakeholder** (nombre prominente, avatar si es candidato conocido)
  - **Contenido**: la cita textual (icono comillas)
  - Metadata: canal fuente, temas (badges), fecha, link a ruta original
- Filtros: stakeholder, tema, canal, rango de fechas
- Search por contenido/stakeholder
- Stats panel: total declaraciones, top stakeholders, actividad por dia

**2.3 Declaracion Detalle (`/declaraciones/:id`)** ← NUEVO
- Vista completa de la entry QUIPU_MASTER que contiene la declaracion
- Resumen AI del contexto
- Todas las declaraciones de esa entry
- Metadata: organizaciones, ubicaciones, keywords
- Link a fuente original (ruta)
- Sidebar: otras declaraciones del mismo stakeholder

**2.4 Categorias (`/categorias`)**
- Grid 15 cards con icono, color, nombre, total promesas
- Click -> `/categorias/:nombre`

**2.5 Categoria Detalle (`/categorias/:nombre`)**
- Header con icono + stats
- Chart: partidos con mas promesas en esa categoria
- Lista de promesas con badge de partido

**2.6 Candidatos (`/candidatos`)**
- Replica PARLEY Parliamentarians.tsx:
  - Search + filtro tipo_eleccion + filtro partido + filtro departamento
  - Toggle grid/list
  - Paginacion (50 por pagina, 6,438 total)
- `CandidatoCard.tsx` (grid) - Foto, nombre, partido badge, cargo, departamento
- `CandidatoListItem.tsx` (list) - Fila horizontal compacta

**2.7 Candidato Detalle (`/candidatos/:id`)**
- Header: foto grande + nombre + partido + cargo + departamento
- Tabs:
  1. Resumen - Info basica, partido, tipo eleccion
  2. Educacion - Timeline de educacion_basica, universitaria, posgrado
  3. Experiencia - Laboral + cargos partidarios
  4. Legal - Sentencias penales, obligaciones, procesos (highlight si existen)
  5. Patrimonio - Bienes + ingresos
  6. Promesas - Lista de promesas del partido del candidato (de quipu_promesas_planes)
  7. **Declaraciones** - Citas textuales de v_quipu_declaraciones donde `stakeholder` coincide con el candidato

**2.8 Partidos (`/partidos`)**
- Grid de PartidoCard: nombre, candidato presidencial, total candidatos, total promesas
- Search por nombre

**2.9 Partido Detalle (`/partidos/:id`)**
- Header + stats
- BarChart distribucion promesas por categoria
- Lista promesas filtrable por categoria
- **Declaraciones del partido**: declaraciones de v_quipu_declaraciones filtradas por canal del partido
- Grid de candidatos del partido

**2.10 Buscar Promesas (`/buscar`)**
- Search bar grande (hero style cuando vacio)
- Filtros: categoria dropdown + partido dropdown + **fuente** (Plan/Medios)
- Resultados: PromesaCard con texto, partido, categoria badge, score similitud
- **Incluye resultados de QUIPU_MASTER** (search por keywords/titulo)
- Cada resultado con SourceBadge indicando si viene de plan o de medios
- Debounce 300ms, minimo 3 caracteres
- Busqueda semantica para planes (Edge Function), texto para QUIPU_MASTER

**2.11 Comparar (`/comparar`)**
- Seleccionar 2-4 partidos (pills/checkboxes)
- Seleccionar categoria o buscar tema
- Tabla comparativa: columnas = partidos, filas = promesas por tema
- Vista lado a lado de lo que dice cada partido sobre el mismo tema
- **Dos secciones**: "En sus planes" (quipu_promesas_planes) vs "En medios" (QUIPU_MASTER)

**2.12 Mapa Electoral (`/mapa`)**
- SVG inline de Peru (25 departamentos como paths)
- Color por densidad de candidatos o cobertura
- Click departamento -> sidebar con stats + lista candidatos
- Hover -> tooltip con nombre + total candidatos

---

### FASE 3: Auth Multi-Tenant

**3.1 Tablas nuevas en Supabase**
```sql
-- Clientes (empresas/gremios)
CREATE TABLE quipu_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    plan VARCHAR(50) DEFAULT 'basico',
    activo BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Configuracion de acceso por cliente
CREATE TABLE quipu_clientes_config (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES quipu_clientes(id),
    -- Filtros de acceso (NULL = sin restriccion / acceso total)
    partidos_ids INTEGER[],        -- Partidos que puede ver
    candidatos_ids INTEGER[],      -- Candidatos especificos
    categorias VARCHAR(50)[],      -- Temas permitidos
    departamentos VARCHAR(100)[],  -- Regiones
    tipos_eleccion VARCHAR(100)[], -- Tipos de eleccion
    canales_master VARCHAR(200)[], -- Canales de QUIPU_MASTER permitidos
    UNIQUE(cliente_id)
);
```

**3.2 RLS Policies**
- Vincular `auth.uid()` con `quipu_clientes.id`
- Policies en todas las tablas quipu_* y QUIPU_MASTER que filtren segun config
- Si el array de config es NULL -> acceso total a esa dimension

**3.3 Frontend Auth**
- Pagina de Login (`/login`)
- `src/hooks/useAuth.ts` - login, logout, session
- `src/components/layout/ProtectedRoute.tsx` - redirect a login si no auth
- Header: user menu con nombre cliente + logout
- Sidebar: ocultar items segun permisos

---

### FASE 4: Edge Function (Busqueda Semantica)

```typescript
// supabase/functions/search-promises/index.ts
// 1. Recibe: { query, match_threshold, match_count, filter_categoria, filter_partido_id }
// 2. Llama Gemini Embedding API (1536 dims)
// 3. Ejecuta quipu_buscar_promesas_similares(embedding, ...)
// 4. Retorna resultados
```

- Deploy: `supabase functions deploy search-promises`
- Secrets: `supabase secrets set GEMINI_API_KEY=xxx`

---

### FASE 5: Analisis de Coherencia (futuro)

- Cruzar promesas de planes (quipu_promesas_planes) con declaraciones en medios (QUIPU_MASTER)
- Score de coherencia: lo que dijeron en el plan vs lo que dicen publicamente
- Alertas de contradiccion
- Timeline de evolucion del discurso por candidato/partido

---

## Estructura de Archivos

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── .env.example
│
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/globals.css
    │
    ├── lib/
    │   ├── supabase.ts
    │   ├── utils.ts
    │   └── constants.ts          # 15 categorias + temas QUIPU_MASTER + config canales
    │
    ├── types/
    │   └── database.ts           # Tipos Supabase completos (incl QUIPU_MASTER)
    │
    ├── hooks/
    │   ├── useDashboardStats.ts
    │   ├── useCandidatos.ts
    │   ├── usePartidos.ts
    │   ├── usePromesas.ts
    │   ├── useCategorias.ts
    │   ├── useDeclaraciones.ts   # v_quipu_declaraciones queries (feed principal)
    │   ├── useSearch.ts
    │   └── useAuth.ts            # Fase 3
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.tsx
    │   │   ├── Sidebar.tsx
    │   │   └── Header.tsx
    │   │
    │   ├── ui/
    │   │   ├── StatsCard.tsx
    │   │   ├── Badge.tsx
    │   │   ├── CategoryBadge.tsx
    │   │   ├── SourceBadge.tsx   # Plan vs Twitter vs Facebook vs Prensa
    │   │   ├── SearchInput.tsx
    │   │   ├── ViewToggle.tsx
    │   │   ├── FilterSelect.tsx
    │   │   ├── CandidatoAvatar.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── ErrorState.tsx
    │   │
    │   └── features/
    │       ├── candidatos/       # CandidatoCard, ListItem, HojaVidaSection
    │       ├── partidos/         # PartidoCard, PromesasChart, CandidatosList
    │       ├── promesas/         # PromesaCard, List, SearchResults, CompareTable
    │       ├── declaraciones/    # DeclaracionCard, DeclaracionFeed, StakeholderChip
    │       ├── categorias/       # CategoriaCard, Grid
    │       ├── dashboard/        # Charts (Recharts) + DeclaracionesRecientes
    │       └── mapa/             # ElectoralMap (SVG Peru)
    │
    └── pages/
        ├── Dashboard.tsx
        ├── Declaraciones.tsx     # Feed declaraciones
        ├── DeclaracionDetalle.tsx # Detalle entry
        ├── BuscarPromesas.tsx
        ├── Candidatos.tsx
        ├── CandidatoDetalle.tsx
        ├── Partidos.tsx
        ├── PartidoDetalle.tsx
        ├── Categorias.tsx
        ├── CategoriaDetalle.tsx
        ├── Comparar.tsx
        └── MapaElectoral.tsx
```

---

## Rutas

```typescript
<Routes>
  <Route path="/"                    element={<Dashboard />} />
  <Route path="/declaraciones"        element={<Declaraciones />} />
  <Route path="/declaraciones/:id"   element={<DeclaracionDetalle />} />
  <Route path="/buscar"              element={<BuscarPromesas />} />
  <Route path="/candidatos"          element={<Candidatos />} />
  <Route path="/candidatos/:id"      element={<CandidatoDetalle />} />
  <Route path="/partidos"            element={<Partidos />} />
  <Route path="/partidos/:id"        element={<PartidoDetalle />} />
  <Route path="/categorias"          element={<Categorias />} />
  <Route path="/categorias/:nombre"  element={<CategoriaDetalle />} />
  <Route path="/comparar"            element={<Comparar />} />
  <Route path="/mapa"                element={<MapaElectoral />} />
</Routes>
```

---

## Data Hooks

Todos siguen el patron de PARLEY `useSupabaseData.ts` con React Query:

```typescript
// staleTime: 5min, gcTime: 10min (igual que PARLEY)

// Declaraciones hook (unidad principal):
export function useDeclaraciones(filters: DeclaracionFilters) {
  return useQuery({
    queryKey: ['declaraciones', filters],
    queryFn: async () => {
      let query = supabase.from('v_quipu_declaraciones')
        .select('*')
        .order('fecha', { ascending: false })
      if (filters.stakeholder) query = query.ilike('stakeholder', `%${filters.stakeholder}%`)
      if (filters.canal) query = query.eq('canal', filters.canal)
      if (filters.tema) query = query.ilike('temas', `%${filters.tema}%`)
      query = query.range(filters.offset, filters.offset + filters.limit - 1)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
```

---

## Vinculacion Declaraciones ↔ Candidatos

No hay FK directa. La vinculacion es por **stakeholder** en la vista `v_quipu_declaraciones`:
- `v_quipu_declaraciones.stakeholder` contiene "Rafael López Aliaga"
- `quipu_candidatos.nombre_completo` contiene "RAFAEL LOPEZ ALIAGA"
- Match: `ilike` por apellido (case-insensitive)

Para el tab "Declaraciones" del candidato detalle:
```typescript
supabase.from('v_quipu_declaraciones')
  .select('*')
  .ilike('stakeholder', `%${candidato.apellido_paterno}%`)
  .order('fecha', { ascending: false })
```

Para el feed de Declaraciones:
```typescript
supabase.from('v_quipu_declaraciones')
  .select('*')
  .order('fecha', { ascending: false })
  .range(0, 49)
```

---

## Verificacion

1. `npm run dev` - Frontend carga sin errores
2. Dashboard muestra stats reales (22,358 promesas, 35 partidos, 6,438 candidatos)
3. Dashboard muestra feed reciente de declaraciones
4. Declaraciones page carga citas de v_quipu_declaraciones con filtros
5. Candidatos page carga con paginacion y filtros funcionales
6. Candidato detalle muestra hoja de vida + tab "En medios" con entries QUIPU_MASTER
7. Categorias muestra las 15 categorias con conteos correctos
8. Buscar combina resultados de planes + QUIPU_MASTER
9. Dark mode funciona en todas las paginas
10. Mobile responsive: sidebar colapsa, grids se adaptan

---

## Orden de Implementacion

1. Scaffold (config, deps, layout, rutas placeholder)
2. Dashboard (valida conexion Supabase + declaraciones)
3. Declaraciones + Detalle (valida v_quipu_declaraciones)
4. Categorias + Detalle (pagina simple, valida datos)
5. Candidatos + Detalle (pagina compleja, replica PARLEY, incluye tab medios)
6. Partidos + Detalle
7. Buscar Promesas (requiere Edge Function)
8. Comparar
9. Mapa Electoral
10. Auth multi-tenant (Fase 3)
