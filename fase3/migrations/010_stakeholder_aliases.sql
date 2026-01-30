-- =====================================================
-- STAKEHOLDER ALIASES: Mapeo Media → Candidatos
-- =====================================================

-- Habilitar extensión unaccent si no existe
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- 1. TABLA: quipu_stakeholder_aliases
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_stakeholder_aliases (
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
CREATE INDEX IF NOT EXISTS idx_stakeholder_aliases_candidato ON quipu_stakeholder_aliases(candidato_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_aliases_verified ON quipu_stakeholder_aliases(verified);
CREATE INDEX IF NOT EXISTS idx_stakeholder_aliases_normalized ON quipu_stakeholder_aliases(alias_normalized);

-- =====================================================
-- 2. FUNCIÓN: normalize_stakeholder
-- =====================================================
CREATE OR REPLACE FUNCTION normalize_stakeholder(texto TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            unaccent(coalesce(texto, '')),
            '[^a-zA-Z0-9\s]', '', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 3. FUNCIÓN: auto_match_stakeholder
-- =====================================================
CREATE OR REPLACE FUNCTION auto_match_stakeholder(stakeholder_text TEXT)
RETURNS TABLE(candidato_id INTEGER, confidence DECIMAL, method TEXT) AS $$
DECLARE
    norm_text TEXT;
    result RECORD;
    apellidos_arr TEXT[];
    apellidos TEXT;
BEGIN
    norm_text := normalize_stakeholder(stakeholder_text);
    
    -- Skip empty or very short strings
    IF length(norm_text) < 3 THEN
        RETURN QUERY SELECT NULL::INTEGER, 0::DECIMAL, 'none'::TEXT;
        RETURN;
    END IF;

    -- 1. Match exacto en nombre_completo normalizado
    SELECT c.id, 1.0::DECIMAL, 'exact'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) = norm_text
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 2. Match por apellidos (últimas 2 palabras del stakeholder en nombre)
    apellidos_arr := string_to_array(norm_text, ' ');
    IF array_length(apellidos_arr, 1) >= 2 THEN
        apellidos := apellidos_arr[array_length(apellidos_arr, 1) - 1] || ' ' || apellidos_arr[array_length(apellidos_arr, 1)];
    ELSE
        apellidos := norm_text;
    END IF;

    SELECT c.id, 0.85::DECIMAL, 'apellidos'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) LIKE '%' || apellidos || '%'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 3. Match por apellido único (última palabra)
    SELECT c.id, 0.7::DECIMAL, 'apellido_unico'::TEXT INTO result
    FROM quipu_candidatos c
    WHERE normalize_stakeholder(c.nombre_completo) LIKE '%' || apellidos_arr[array_length(apellidos_arr, 1)] || '%'
      AND length(apellidos_arr[array_length(apellidos_arr, 1)]) >= 4
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT result.id, result.confidence, result.method;
        RETURN;
    END IF;

    -- 4. Sin match
    RETURN QUERY SELECT NULL::INTEGER, 0::DECIMAL, 'none'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGER: Auto-populate on QUIPU_MASTER insert
-- =====================================================
CREATE OR REPLACE FUNCTION process_new_master_stakeholders()
RETURNS TRIGGER AS $$
DECLARE
    inter JSONB;
    stakeholder_text TEXT;
    norm_text TEXT;
    match_result RECORD;
BEGIN
    -- Iterar sobre cada interacción
    IF NEW.interacciones IS NOT NULL AND jsonb_typeof(NEW.interacciones) = 'array' THEN
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
                     match_result.confidence, match_result.method)
                ON CONFLICT (alias_normalized) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_process_stakeholders ON "QUIPU_MASTER";

CREATE TRIGGER trigger_process_stakeholders
    AFTER INSERT ON "QUIPU_MASTER"
    FOR EACH ROW
    EXECUTE FUNCTION process_new_master_stakeholders();

-- =====================================================
-- 5. RLS for quipu_stakeholder_aliases
-- =====================================================
ALTER TABLE quipu_stakeholder_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read aliases"
ON quipu_stakeholder_aliases FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmin can modify aliases"
ON quipu_stakeholder_aliases FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol = 'superadmin'
    )
);

-- =====================================================
-- 6. GRANT permisos
-- =====================================================
GRANT SELECT ON quipu_stakeholder_aliases TO authenticated;
GRANT INSERT, UPDATE, DELETE ON quipu_stakeholder_aliases TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE quipu_stakeholder_aliases_id_seq TO authenticated;
