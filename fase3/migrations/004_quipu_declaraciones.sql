-- =====================================================
-- FASE 3: Declaraciones Normalizadas
-- Extrae interacciones de QUIPU_MASTER con FKs reales
-- =====================================================

-- Habilitar pgvector si no está
CREATE EXTENSION IF NOT EXISTS vector;

-- Declaraciones extraídas y enriquecidas
CREATE TABLE IF NOT EXISTS quipu_declaraciones (
    id SERIAL PRIMARY KEY,
    master_id UUID NOT NULL,          -- FK lógico a QUIPU_MASTER.id
    indice_interaccion INTEGER,       -- Posición en array interacciones

    -- Contenido original
    tipo VARCHAR(20) NOT NULL,        -- 'declaration' | 'mention'
    contenido TEXT NOT NULL,
    stakeholder_raw VARCHAR(200),     -- Texto original para debug
    tema_raw VARCHAR(200),            -- Tema original de la interacción

    -- VÍNCULOS NORMALIZADOS
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    tema_id INTEGER REFERENCES quipu_categorias(id),

    -- BÚSQUEDA SEMÁNTICA
    embedding vector(1536),

    -- Contexto
    fecha DATE,
    canal VARCHAR(200),               -- Fuente: 'RPP', 'Facebook', etc.
    url_fuente TEXT,                  -- URL original (ruta de MASTER)

    -- Metadata de MASTER
    titulo_master TEXT,               -- Título del artículo/post
    resumen_master TEXT,              -- Resumen AI del contexto

    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (master_id, indice_interaccion)
);

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_decl_master ON quipu_declaraciones(master_id);
CREATE INDEX IF NOT EXISTS idx_decl_candidato ON quipu_declaraciones(candidato_id);
CREATE INDEX IF NOT EXISTS idx_decl_tema ON quipu_declaraciones(tema_id);
CREATE INDEX IF NOT EXISTS idx_decl_fecha ON quipu_declaraciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_decl_tipo ON quipu_declaraciones(tipo);
CREATE INDEX IF NOT EXISTS idx_decl_canal ON quipu_declaraciones(canal);

-- Índice vectorial para búsqueda semántica
CREATE INDEX IF NOT EXISTS idx_decl_embedding ON quipu_declaraciones
    USING hnsw (embedding vector_cosine_ops);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_declaraciones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_declaraciones_updated ON quipu_declaraciones;
CREATE TRIGGER trigger_declaraciones_updated
    BEFORE UPDATE ON quipu_declaraciones
    FOR EACH ROW
    EXECUTE FUNCTION update_declaraciones_timestamp();