# Quipu - Sistema Electoral Peru 2026

Base de datos consolidada de candidatos, hojas de vida y promesas electorales para las elecciones Peru 2026.

## Estructura del Proyecto

```
Quipu/
├── data/                          # Datos procesados
│   ├── promesas_v2.db             # SQLite: 22,358 promesas con embeddings
│   ├── hojas_vida_completas.json  # 6,438 hojas de vida
│   ├── candidatos_jne_2026.json   # Datos básicos candidatos
│   ├── partido_pdf_map.json       # Mapeo partidos → PDFs
│   ├── schema_sqlite.sql          # Schema SQLite original
│   └── ESTADISTICAS_CANDIDATOS.json
│
├── fotos/                         # 8,109 fotos de candidatos
│
├── pdfs/                          # 70 PDFs planes de gobierno
│
├── migrations/                    # Scripts migración a Supabase
│   ├── 001_schema_supabase.sql    # Schema PostgreSQL + pgvector
│   └── 002_migrate_to_supabase.py # Script de migración
│
└── excel/                         # Reportes Excel (referencia)
    ├── CANDIDATOS_JNE_2026.xlsx
    └── HOJAS_VIDA_JNE_2026.xlsx
```

## Datos Disponibles

### 1. Promesas Electorales (promesas_v2.db)
- **22,358 promesas** extraídas de planes de gobierno
- **35 partidos** con promesas procesadas
- **Embeddings** de 1536 dimensiones (Gemini) para búsqueda semántica
- **15 categorías**: educacion, salud, economia, seguridad, empleo, infraestructura, agricultura, medio_ambiente, justicia, tecnologia, vivienda, transporte, cultura, social, reforma_estado

### 2. Candidatos y Hojas de Vida
- **6,438 candidatos** (presidente, senadores, diputados)
- Información personal, educación, experiencia, patrimonio
- Sentencias y procesos judiciales

### 3. Fotos y PDFs
- **8,109 fotos** de candidatos
- **70 PDFs** de planes de gobierno (completos + resúmenes JNE)

## Migración a Supabase

### 1. Crear proyecto en Supabase
- Ir a https://supabase.com
- Crear nuevo proyecto
- Habilitar extensión pgvector en SQL Editor

### 2. Ejecutar schema
```sql
-- En Supabase SQL Editor, ejecutar:
-- migrations/001_schema_supabase.sql
```

### 3. Configurar variables de entorno
```bash
# .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
```

### 4. Ejecutar migración
```bash
pip install supabase python-dotenv
python migrations/002_migrate_to_supabase.py
```

## Fuentes de Datos Pendientes

| Fuente | Estado |
|--------|--------|
| Candidatos JNE | ✅ Listo |
| Hojas de vida | ✅ Listo |
| Promesas en papel (PDFs) | ✅ Listo (22,358) |
| Promesas en medios/RRSS | ⏳ Pendiente |

## Consultas Útiles (SQLite)

```sql
-- Promesas por partido
SELECT pp.nombre_oficial, COUNT(*) as total
FROM promesas p
JOIN partidos_politicos pp ON p.partido_id = pp.id
GROUP BY pp.id ORDER BY total DESC;

-- Promesas por categoría
SELECT categoria, COUNT(*) as total
FROM promesas GROUP BY categoria ORDER BY total DESC;

-- Buscar promesas (texto)
SELECT texto_original, resumen, categoria
FROM promesas
WHERE texto_normalizado LIKE '%educacion%';
```

## Búsqueda Semántica (Supabase)

```sql
-- Usando la función RPC
SELECT * FROM buscar_promesas_similares(
    '[0.123, -0.456, ...]'::vector,  -- embedding de la query
    0.7,    -- threshold similitud
    10,     -- max resultados
    'salud' -- filtro categoría (opcional)
);
```

## Tecnologías Usadas

- **Extracción PDF**: PyMuPDF
- **LLM**: Gemini 2.5 Flash
- **Embeddings**: Gemini Embedding (1536 dims)
- **Base de datos**: SQLite → Supabase (PostgreSQL + pgvector)

---

Proyecto para análisis electoral Peru 2026.
