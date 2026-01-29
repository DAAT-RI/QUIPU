-- =====================================================
-- FASE 3: Verificación de Coherencia
-- Link entre promesas de planes y declaraciones públicas
-- =====================================================

-- Relación promesa ↔ declaración con score de coherencia
CREATE TABLE IF NOT EXISTS quipu_promesa_declaracion (
    id SERIAL PRIMARY KEY,
    promesa_id INTEGER NOT NULL REFERENCES quipu_promesas_planes(id) ON DELETE CASCADE,
    declaracion_id INTEGER NOT NULL REFERENCES quipu_declaraciones(id) ON DELETE CASCADE,

    -- Análisis
    similarity REAL,                  -- Score de similitud semántica (0-1)
    coherencia VARCHAR(20),           -- 'confirma', 'contradice', 'amplia', 'matiza', 'no_relacionado'

    -- Verificación manual (opcional)
    verificado BOOLEAN DEFAULT FALSE,
    verificado_por UUID REFERENCES quipu_usuarios(id),
    verificado_at TIMESTAMPTZ,
    notas TEXT,

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (promesa_id, declaracion_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prom_decl_promesa ON quipu_promesa_declaracion(promesa_id);
CREATE INDEX IF NOT EXISTS idx_prom_decl_declaracion ON quipu_promesa_declaracion(declaracion_id);
CREATE INDEX IF NOT EXISTS idx_prom_decl_coherencia ON quipu_promesa_declaracion(coherencia);
CREATE INDEX IF NOT EXISTS idx_prom_decl_similarity ON quipu_promesa_declaracion(similarity DESC);

-- Vista: Contradicciones detectadas (para alertas)
CREATE OR REPLACE VIEW v_quipu_contradicciones AS
SELECT
    pd.id,
    pd.similarity,
    pd.coherencia,
    pd.notas,
    -- Promesa
    p.texto_original as promesa_texto,
    p.categoria as promesa_categoria,
    pp.nombre_oficial as partido,
    pp.candidato_presidencial,
    -- Declaración
    d.contenido as declaracion_texto,
    d.fecha as declaracion_fecha,
    d.canal as declaracion_fuente,
    d.url_fuente,
    c.nombre_completo as candidato_nombre,
    t.nombre as tema
FROM quipu_promesa_declaracion pd
JOIN quipu_promesas_planes p ON pd.promesa_id = p.id
JOIN quipu_partidos pp ON p.partido_id = pp.id
JOIN quipu_declaraciones d ON pd.declaracion_id = d.id
LEFT JOIN quipu_candidatos c ON d.candidato_id = c.id
LEFT JOIN quipu_temas t ON d.tema_id = t.id
WHERE pd.coherencia = 'contradice'
ORDER BY pd.similarity DESC;

-- Función: Buscar promesas similares a una declaración
CREATE OR REPLACE FUNCTION buscar_promesas_para_declaracion(
    p_declaracion_id INTEGER,
    p_threshold REAL DEFAULT 0.7,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    promesa_id INTEGER,
    texto_original TEXT,
    categoria VARCHAR,
    partido VARCHAR,
    similarity REAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_embedding vector(1536);
    v_candidato_id INTEGER;
BEGIN
    -- Obtener embedding y candidato de la declaración
    SELECT d.embedding, d.candidato_id
    INTO v_embedding, v_candidato_id
    FROM quipu_declaraciones d
    WHERE d.id = p_declaracion_id;

    IF v_embedding IS NULL THEN
        RETURN;
    END IF;

    -- Buscar promesas similares del mismo partido
    RETURN QUERY
    SELECT
        p.id,
        p.texto_original,
        p.categoria,
        pp.nombre_oficial as partido,
        1 - (p.embedding <=> v_embedding) as similarity
    FROM quipu_promesas_planes p
    JOIN quipu_partidos pp ON p.partido_id = pp.id
    WHERE p.embedding IS NOT NULL
      AND 1 - (p.embedding <=> v_embedding) > p_threshold
      -- Filtrar por partido del candidato si está vinculado
      AND (v_candidato_id IS NULL OR p.partido_id = (
          SELECT c.partido_id FROM quipu_candidatos c WHERE c.id = v_candidato_id
      ))
    ORDER BY p.embedding <=> v_embedding
    LIMIT p_limit;
END;
$$;