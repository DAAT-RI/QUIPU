# Plan: Stakeholder Alias Table (Mapeo Media → Candidatos)

## Problema
- **QUIPU_MASTER** tiene stakeholders como: `"López Aliaga"`, `"Rafael López Aliaga"`
- **quipu_candidatos** tiene: `"RAFAEL BERNARDO LOPEZ ALIAGA CAZORLA"`
- No hay forma de conectarlos automáticamente
- El multi-tenant no funciona porque no puede filtrar por candidatos del cliente

## Solución
Tabla de aliases que mapea nombres de medios a candidato_id, auto-poblada cuando llegan datos nuevos.

---

## Arquitectura

### 1. Nueva Tabla: `quipu_stakeholder_aliases`

```sql
CREATE TABLE quipu_stakeholder_aliases (
    id SERIAL PRIMARY KEY,
    alias TEXT NOT NULL,                  -- "López Aliaga" (original)
    alias_normalized TEXT NOT NULL,       -- "lopez aliaga" (para matching)
    candidato_id INTEGER REFERENCES quipu_candidatos(id),  -- NULL = sin match
    confidence DECIMAL(3,2) DEFAULT 0,    -- 0.00-1.00
    match_method VARCHAR(50),             -- 'exact', 'apellidos', 'manual', 'none'
    verified BOOLEAN DEFAULT FALSE,       -- Verificado manualmente
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(alias_normalized)              -- Un alias normalizado = un registro
);

-- Índices
CREATE INDEX idx_stakeholder_aliases_candidato ON quipu_stakeholder_aliases(candidato_id);
CREATE INDEX idx_stakeholder_aliases_verified ON quipu_stakeholder_aliases(verified);
CREATE INDEX idx_stakeholder_aliases_normalized ON quipu_stakeholder_aliases(alias_normalized);
```

### 2. Función de Normalización

```sql
CREATE OR REPLACE FUNCTION normalize_stakeholder(texto TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        translate(
            unaccent(coalesce(texto, '')),
            'áéíóúñ',
            'aeioun'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### 3. Función de Auto-Match

```sql
CREATE OR REPLACE FUNCTION auto_match_stakeholder(stakeholder_text TEXT)
RETURNS TABLE(candidato_id INTEGER, confidence DECIMAL, method TEXT) AS $$
DECLARE
    norm_text TEXT;
    apellidos TEXT;
    result RECORD;
BEGIN
    norm_text := normalize_stakeholder(stakeholder_text);

    -- 1. Match exacto en nombre_completo normalizado
    SELECT c.id, 1.0::DECIMAL, 'exact'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) = norm_text
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 2. Match por apellidos (últimas 2 palabras del stakeholder)
    apellidos := (SELECT string_agg(word, ' ') FROM (
        SELECT unnest(string_to_array(norm_text, ' ')) AS word
        ORDER BY ordinality DESC LIMIT 2
    ) sub);

    SELECT c.id, 0.85::DECIMAL, 'apellidos'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) LIKE '%' || apellidos || '%'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 3. Match por apellido_paterno
    SELECT c.id, 0.7::DECIMAL, 'apellido_paterno'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.apellido_paterno) =
          (SELECT unnest(string_to_array(norm_text, ' ')) ORDER BY ordinality DESC LIMIT 1)
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 4. Sin match
    RETURN QUERY SELECT NULL::INTEGER, 0::DECIMAL, 'none'::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### 4. Trigger en QUIPU_MASTER

```sql
CREATE OR REPLACE FUNCTION process_new_master_stakeholders()
RETURNS TRIGGER AS $$
DECLARE
    inter JSONB;
    stakeholder_text TEXT;
    norm_text TEXT;
    match_result RECORD;
BEGIN
    -- Iterar sobre cada interacción
    FOR inter IN SELECT jsonb_array_elements(NEW.interacciones)
    LOOP
        stakeholder_text := inter->>'stakeholder';
        IF stakeholder_text IS NULL OR stakeholder_text = '' THEN
            CONTINUE;
        END IF;

        norm_text := normalize_stakeholder(stakeholder_text);

        -- Si no existe, intentar match y agregar
        IF NOT EXISTS (
            SELECT 1 FROM quipu_stakeholder_aliases
            WHERE alias_normalized = norm_text
        ) THEN
            SELECT * INTO match_result FROM auto_match_stakeholder(stakeholder_text);

            INSERT INTO quipu_stakeholder_aliases
                (alias, alias_normalized, candidato_id, confidence, match_method)
            VALUES
                (stakeholder_text, norm_text, match_result.candidato_id,
                 match_result.confidence, match_result.method);
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_stakeholders
    AFTER INSERT ON "QUIPU_MASTER"
    FOR EACH ROW
    EXECUTE FUNCTION process_new_master_stakeholders();
```

### 5. Script Inicial: Poblar desde datos existentes

```sql
-- Ejecutar una vez para poblar con stakeholders existentes
INSERT INTO quipu_stakeholder_aliases (alias, alias_normalized, candidato_id, confidence, match_method)
SELECT DISTINCT ON (normalize_stakeholder(inter.value->>'stakeholder'))
    inter.value->>'stakeholder' AS alias,
    normalize_stakeholder(inter.value->>'stakeholder') AS alias_normalized,
    (auto_match_stakeholder(inter.value->>'stakeholder')).candidato_id,
    (auto_match_stakeholder(inter.value->>'stakeholder')).confidence,
    (auto_match_stakeholder(inter.value->>'stakeholder')).method
FROM "QUIPU_MASTER" m
CROSS JOIN LATERAL jsonb_array_elements(m.interacciones) AS inter(value)
WHERE inter.value->>'stakeholder' IS NOT NULL
  AND inter.value->>'stakeholder' != ''
ON CONFLICT (alias_normalized) DO NOTHING;
```

---

## Frontend: Admin UI

### Nueva Ruta
```
/admin/aliases → Gestión de aliases de stakeholders
```

### Componentes
```
frontend/src/
├── pages/admin/
│   └── StakeholderAliases.tsx    # Tabla con filtros
├── hooks/
│   └── useAdminAliases.ts        # CRUD aliases
```

### Vista Principal

| Alias | Candidato | Confianza | Método | Verificado | Acciones |
|-------|-----------|-----------|--------|------------|----------|
| López Aliaga | RAFAEL BERNARDO LOPEZ ALIAGA CAZORLA | 85% | apellidos | ❌ | [Verificar] [Cambiar] |
| Vladimir Cerrón | VLADIMIR ROY CERRON ROJAS | 85% | apellidos | ❌ | [Verificar] [Cambiar] |
| Antauro Humala | ❌ Sin match | 0% | none | ❌ | [Asignar] |

### Filtros
- Estado: Todos / Sin match / Sin verificar / Baja confianza (<70%)
- Búsqueda por alias

---

## Modificar Frontend: useDeclaraciones.ts

Cambiar de matching por apellidos a lookup en tabla de aliases:

```typescript
// ANTES (no funciona bien):
const uniqueTerms = [...new Set(searchTerms)].slice(0, 100)
query = query.or(uniqueTerms.map(term => `stakeholder.ilike.%${term}%`).join(','))

// DESPUÉS (usa tabla de aliases):
// 1. Obtener candidato_ids del cliente
const clienteCandidatoIds = candidatosData?.map(c => c.candidato_id) ?? []

// 2. Obtener aliases que mapean a esos candidatos
const { data: aliases } = await supabase
    .from('quipu_stakeholder_aliases')
    .select('alias_normalized')
    .in('candidato_id', clienteCandidatoIds)

// 3. Filtrar declaraciones por esos aliases
const aliasConditions = aliases
    ?.map(a => `stakeholder.ilike.%${a.alias_normalized}%`)
    .join(',')
query = query.or(aliasConditions)
```

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| `fase3/migrations/009_stakeholder_aliases.sql` | Crear tabla + funciones + trigger |
| `frontend/src/pages/admin/StakeholderAliases.tsx` | UI de gestión |
| `frontend/src/hooks/useAdminAliases.ts` | CRUD hooks |
| `frontend/src/hooks/useDeclaraciones.ts` | Usar aliases para filtrar |
| `frontend/src/hooks/useDashboardStats.ts` | Usar aliases para stats |
| `frontend/src/App.tsx` | Agregar ruta /admin/aliases |

---

## Orden de Implementación

1. **SQL Migration** - Crear tabla, funciones, trigger
2. **Poblar datos iniciales** - Script para stakeholders existentes
3. **Verificar en Supabase** - Revisar matches automáticos
4. **Frontend hooks** - useAdminAliases
5. **Admin UI** - Página de gestión
6. **Integrar en filtros** - Modificar useDeclaraciones y useDashboardStats

---

## Verificación

1. Insertar nuevo registro en QUIPU_MASTER → debe crear alias automáticamente
2. Ver tabla de aliases → debe mostrar matches con confianza
3. Login como cliente → debe ver solo declaraciones de sus candidatos
4. Dashboard → stats deben reflejar solo candidatos del cliente
