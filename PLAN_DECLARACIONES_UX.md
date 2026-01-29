# Plan: Mejoras Declaraciones - UX Completa

## Contexto del Usuario

**Estratega de Partido:** ¿Qué dijeron los rivales? ¿Hay contradicciones plan vs medios?
**Presidente de Gremio:** ¿Qué dicen sobre MI sector? ¿Mencionaron a mi organización?

---

## ✅ Paso 1: Vistas SQL (COMPLETADO)

```sql
-- Vista principal: Flatten interacciones
CREATE OR REPLACE VIEW v_quipu_declaraciones AS
SELECT
  m.id as master_id, m.canal, m.titulo, m.resumen, m.temas, m.personas,
  m.keywords, m.organizaciones, m.ubicaciones, m.paises, m.productos,
  m.fecha, m.ruta, m.transcripcion,
  (inter->>'type') as tipo,
  (inter->>'stakeholder') as stakeholder,
  (inter->>'content') as contenido,
  (inter->>'tema') as tema_interaccion
FROM "QUIPU_MASTER" m,
LATERAL jsonb_array_elements(m.interacciones) as inter;

-- Vista: Temas normalizados
CREATE OR REPLACE VIEW v_quipu_master_temas AS
SELECT m.id as master_id, trim(unnest(string_to_array(m.temas, ';'))) as tema
FROM "QUIPU_MASTER" m WHERE m.temas IS NOT NULL AND m.temas != '';

-- Vista: Keywords normalizados
CREATE OR REPLACE VIEW v_quipu_master_keywords AS
SELECT m.id as master_id, trim(unnest(string_to_array(m.keywords, ','))) as keyword
FROM "QUIPU_MASTER" m WHERE m.keywords IS NOT NULL AND m.keywords != '';

-- Índices
CREATE INDEX IF NOT EXISTS idx_master_fecha ON "QUIPU_MASTER"(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_master_canal ON "QUIPU_MASTER"(canal);
CREATE INDEX IF NOT EXISTS idx_master_interacciones ON "QUIPU_MASTER" USING GIN(interacciones);
```

---

## Paso 2: Types (database.ts)

```typescript
export interface DeclaracionView {
  master_id: string
  canal: string | null
  titulo: string | null
  resumen: string | null  // NOTA: es del ARTÍCULO, no de la declaración
  temas: string | null
  personas: string | null
  keywords: string | null
  organizaciones: string | null
  ubicaciones: string | null
  paises: string | null
  productos: string | null
  fecha: string | null
  ruta: string | null
  transcripcion: string | null
  tipo: 'declaration' | 'mention'
  stakeholder: string
  contenido: string  // LO QUE DIJO - esto es lo importante
  tema_interaccion: string | null
}

export interface DeclaracionFilters {
  tipo?: 'declaration' | 'mention'  // Default: 'declaration'
  stakeholder?: string
  canal?: string
  tema?: string
  organizacion?: string  // NUEVO: filtrar por org mencionada
  search?: string  // Busca en CONTENIDO, no keywords
  offset: number
  limit: number
}
```

---

## Paso 3: Hook useDeclaraciones.ts

```typescript
export function useDeclaraciones(filters: DeclaracionFilters) {
  return useQuery({
    queryKey: ['declaraciones', filters],
    queryFn: async () => {
      let query = supabase
        .from('v_quipu_declaraciones')
        .select('*', { count: 'exact' })

      // Default: solo declarations (mentions tienen ruido)
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo)
      }
      if (filters.stakeholder) {
        query = query.ilike('stakeholder', `%${filters.stakeholder}%`)
      }
      if (filters.canal) {
        query = query.eq('canal', filters.canal)
      }
      if (filters.organizacion) {
        query = query.ilike('organizaciones', `%${filters.organizacion}%`)
      }
      // IMPORTANTE: buscar en CONTENIDO, no en keywords/titulo
      if (filters.search) {
        query = query.or(`contenido.ilike.%${filters.search}%,stakeholder.ilike.%${filters.search}%`)
      }

      query = query
        .order('fecha', { ascending: false, nullsFirst: false })
        .range(filters.offset, filters.offset + filters.limit - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data as DeclaracionView[], count: count ?? 0 }
    },
  })
}
```

---

## Paso 4: Declaraciones.tsx - Cards con Orgs Destacadas

**Consideraciones clave:**
- `resumen` = resumen del ARTÍCULO (no mostrar en card, solo en detalle)
- Default: `tipo = 'declaration'` (mentions tienen basura)
- Destacar organizaciones mencionadas (para gremios)
- Búsqueda por `contenido` (lo que dijo), NO keywords

**Card mejorado:**
```
┌─────────────────────────────────────────────────────────┐
│ 📺 FB - Vladimir Cerrón              26 Ene 2026       │
│ ─────────────────────────────────────────────────────── │
│ 👤 Vladimir Cerrón  [Perú Libre]                       │
│                                                        │
│ «Nuestra apuesta va por la minería, que tiene más de   │
│  60 mil millones en proyectos esperando...»            │
│                                                        │
│ 🏷️ Tema: Minería                                       │
│ 🏢 Orgs: [SNMPE] [Doe Run]  ← DESTACAR para gremios   │
│                                                        │
│ [Ver fuente] [Comparar con plan →]                     │
└─────────────────────────────────────────────────────────┘
```

**Filtros:**
```typescript
const [tipo, setTipo] = useState('declaration')  // DEFAULT
const TIPO_OPTIONS = [
  { value: 'declaration', label: 'Declaraciones' },
  { value: 'mention', label: 'Menciones' },
  { value: '', label: 'Todos' },
]
```

---

## Paso 5: DeclaracionDetalle.tsx - Tabs

| Tab | Contenido |
|-----|-----------|
| **Declaraciones** | Lista de lo que DIJERON (tipo=declaration) - PRINCIPAL |
| **Fuente** | titulo, resumen del ARTÍCULO, fecha, ruta, transcripcion |
| **Contexto** | personas (descripciones), organizaciones, ubicaciones |
| Menciones | tipo=mention - SECUNDARIO, puede tener ruido |

---

## Paso 6: Comparar.tsx - REWRITE: Por Tema

**Nuevo diseño orientado a tema:**

```
┌─────────────────────────────────────────────────────────────┐
│ Comparar Posiciones sobre:                                  │
│ [Minería ▾]  o  Buscar: [impuestos a la minería]           │
│                                                             │
│ Candidatos: [López Aliaga ×] [Cerrón ×] [+ Agregar]        │
└─────────────────────────────────────────────────────────────┘

┌─ López Aliaga ─────────────────┐ ┌─ Vladimir Cerrón ────────┐
│ 📋 EN SU PLAN:                 │ │ 📋 EN SU PLAN:           │
│ "Promoveremos la inversión    │ │ "Nacionalización de los  │
│  minera responsable..."       │ │  recursos naturales..."  │
│                               │ │                          │
│ 📢 EN MEDIOS (3):             │ │ 📢 EN MEDIOS (5):        │
│ «La minería es clave...»      │ │ «60 mil millones en      │
│  — 26 Ene, FB                 │ │  proyectos esperando»    │
│                               │ │  — 25 Ene, Twitter       │
│ ✅ Coherente                  │ │ ⚠️ Matizado              │
└───────────────────────────────┘ └──────────────────────────┘
```

**Implementación:**
1. Selector de tema (categoría) o búsqueda libre
2. Selector de candidatos (max 4)
3. Para cada candidato:
   - Promesas del plan (buscar por tema)
   - Declaraciones en medios (buscar en contenido)
4. Mostrar lado a lado

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/types/database.ts` | DeclaracionView, DeclaracionFilters actualizado |
| `src/hooks/useDeclaraciones.ts` | Server-side, default declaration, filtro org |
| `src/hooks/useStakeholderCandidato.ts` | NUEVO: link stakeholder → candidato |
| `src/pages/Declaraciones.tsx` | Cards con orgs, filtro org, default declaration |
| `src/pages/DeclaracionDetalle.tsx` | Tabs (Declaraciones/Fuente/Contexto) |
| `src/pages/Comparar.tsx` | REWRITE: por tema, Plan vs Medios |
| `src/pages/BuscarPromesas.tsx` | Buscar declaraciones por contenido |

---

## Verificación

1. ✅ Vistas SQL creadas
2. `npm run dev` → `/declaraciones`
   - Default: solo declarations
   - Cards con 🏢 organizaciones
   - Filtro por organización funciona
3. `/declaraciones/:id` → tabs funcionan
4. `/comparar` → tema + candidatos → Plan vs Medios
5. `/buscar` → busca en contenido de declaración
6. `npm run build` sin errores
7. `npx vercel --prod --yes`

---

## Orden de Ejecución

1. ✅ Vistas SQL
2. Types (database.ts)
3. Hook useDeclaraciones.ts
4. Declaraciones.tsx (cards, filtros)
5. DeclaracionDetalle.tsx (tabs)
6. Comparar.tsx (rewrite completo)
7. BuscarPromesas.tsx
8. Test + Deploy
