-- =====================================================
-- SCHEMA: Sistema Electoral Peru 2026 - Supabase
-- PostgreSQL + pgvector para busqueda semantica
-- =====================================================

-- Habilitar extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- TABLA: quipu_partidos
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_partidos (
    id SERIAL PRIMARY KEY,
    nombre_oficial VARCHAR(200) NOT NULL UNIQUE,
    nombre_corto VARCHAR(100),
    candidato_presidencial VARCHAR(200),
    pdf_plan_completo VARCHAR(500),
    pdf_resumen VARCHAR(500),
    total_candidatos INTEGER DEFAULT 0,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- =====================================================
-- TABLA: quipu_categorias_promesas
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_categorias_promesas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    nombre_display VARCHAR(100),
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20),
    orden INTEGER DEFAULT 0
);

-- Insertar categorias predefinidas
INSERT INTO quipu_categorias_promesas (nombre, nombre_display, icono, color, orden) VALUES
('educacion', 'Educacion', 'graduation-cap', '#3B82F6', 1),
('salud', 'Salud', 'heartbeat', '#EF4444', 2),
('economia', 'Economia', 'chart-line', '#10B981', 3),
('seguridad', 'Seguridad Ciudadana', 'shield-alt', '#6366F1', 4),
('empleo', 'Empleo y Trabajo', 'briefcase', '#F59E0B', 5),
('infraestructura', 'Infraestructura', 'road', '#8B5CF6', 6),
('agricultura', 'Agricultura', 'seedling', '#22C55E', 7),
('medio_ambiente', 'Medio Ambiente', 'leaf', '#14B8A6', 8),
('justicia', 'Justicia y Anticorrupcion', 'balance-scale', '#EC4899', 9),
('tecnologia', 'Tecnologia e Innovacion', 'microchip', '#06B6D4', 10),
('vivienda', 'Vivienda', 'home', '#F97316', 11),
('transporte', 'Transporte', 'bus', '#84CC16', 12),
('cultura', 'Cultura y Deporte', 'palette', '#A855F7', 13),
('social', 'Programas Sociales', 'users', '#F43F5E', 14),
('reforma_estado', 'Reforma del Estado', 'landmark', '#64748B', 15)
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- TABLA: quipu_promesas_planes
-- Con embedding vector(1536) para busqueda semantica
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_promesas_planes (
    id SERIAL PRIMARY KEY,
    partido_id INTEGER NOT NULL REFERENCES quipu_partidos(id),

    -- Contenido
    texto_original TEXT NOT NULL,
    texto_normalizado TEXT,
    resumen VARCHAR(1000),

    -- Clasificacion
    categoria VARCHAR(50) NOT NULL,
    subcategoria VARCHAR(100),
    ambito VARCHAR(50) DEFAULT 'nacional',

    -- Metadatos de extraccion
    pagina_pdf INTEGER,
    seccion_pdf VARCHAR(100),
    confianza_extraccion REAL DEFAULT 0.0,

    -- Embedding para busqueda semantica (Gemini: 1536 dims)
    embedding vector(1536),

    -- Auditoria
    fecha_extraccion TIMESTAMPTZ DEFAULT NOW(),
    version_extraccion INTEGER DEFAULT 1,

    -- Constraint de unicidad
    UNIQUE (partido_id, texto_original)
);

-- =====================================================
-- TABLA: quipu_candidatos
-- Datos de candidatos del JNE
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_candidatos (
    id SERIAL PRIMARY KEY,
    id_hoja_vida VARCHAR(20),
    dni VARCHAR(15),

    -- Datos personales
    nombres VARCHAR(200),
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    nombre_completo VARCHAR(300),
    sexo VARCHAR(20),
    fecha_nacimiento DATE,

    -- Organizacion politica (vinculo a partidos)
    partido_id INTEGER REFERENCES quipu_partidos(id),
    organizacion_politica VARCHAR(200),

    -- Cargo al que postula
    tipo_eleccion VARCHAR(100),
    cargo_postula VARCHAR(200),
    cargo_eleccion INTEGER,
    designacion VARCHAR(200),

    -- Ubicacion
    ubigeo VARCHAR(20),
    departamento VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),

    -- Foto
    foto_url TEXT,
    foto_local VARCHAR(200),

    -- Datos adicionales
    email VARCHAR(200),
    estado VARCHAR(50),

    -- Auditoria
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,

    -- Un candidato puede postular a multiples cargos (ej: presidente + senador)
    UNIQUE (dni, cargo_eleccion)
);

-- =====================================================
-- TABLA: quipu_hojas_vida
-- Informacion detallada de candidatos
-- =====================================================
CREATE TABLE IF NOT EXISTS quipu_hojas_vida (
    id SERIAL PRIMARY KEY,
    candidato_id INTEGER REFERENCES quipu_candidatos(id),
    id_hoja_vida VARCHAR(20),

    -- Educacion (JSONB array)
    educacion_basica JSONB,
    educacion_tecnica JSONB,
    educacion_universitaria JSONB,
    posgrado JSONB,

    -- Experiencia
    experiencia_laboral JSONB,
    cargos_partidarios JSONB,
    cargos_eleccion JSONB,
    renuncias_partidos JSONB,

    -- Legal
    sentencias_penales JSONB,
    sentencias_obligaciones JSONB,
    procesos_penales JSONB,

    -- Patrimonio
    bienes_muebles JSONB,
    bienes_inmuebles JSONB,
    ingresos JSONB,

    -- Auditoria
    fecha_extraccion TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (id_hoja_vida)
);

-- =====================================================
-- INDICES
-- =====================================================

-- Promesas
CREATE INDEX IF NOT EXISTS idx_quipu_promesas_planes_partido ON quipu_promesas_planes(partido_id);
CREATE INDEX IF NOT EXISTS idx_quipu_promesas_planes_categoria ON quipu_promesas_planes(categoria);
CREATE INDEX IF NOT EXISTS idx_quipu_promesas_planes_ambito ON quipu_promesas_planes(ambito);

-- Candidatos
CREATE INDEX IF NOT EXISTS idx_quipu_candidatos_partido ON quipu_candidatos(partido_id);
CREATE INDEX IF NOT EXISTS idx_quipu_candidatos_dni ON quipu_candidatos(dni);
CREATE INDEX IF NOT EXISTS idx_quipu_candidatos_tipo_eleccion ON quipu_candidatos(tipo_eleccion);
CREATE INDEX IF NOT EXISTS idx_quipu_candidatos_departamento ON quipu_candidatos(departamento);

-- Indice vectorial para busqueda semantica (HNSW)
CREATE INDEX IF NOT EXISTS idx_quipu_promesas_planes_embedding ON quipu_promesas_planes
    USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- FUNCION: Busqueda semantica de promesas
-- =====================================================
CREATE OR REPLACE FUNCTION quipu_buscar_promesas_similares(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10,
    filter_categoria text DEFAULT NULL,
    filter_partido_id int DEFAULT NULL
)
RETURNS TABLE (
    id int,
    texto_original text,
    resumen varchar,
    categoria varchar,
    partido varchar,
    candidato varchar,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.texto_original,
        p.resumen,
        p.categoria,
        pp.nombre_oficial as partido,
        pp.candidato_presidencial as candidato,
        1 - (p.embedding <=> query_embedding) as similarity
    FROM quipu_promesas_planes p
    JOIN quipu_partidos pp ON p.partido_id = pp.id
    WHERE
        p.embedding IS NOT NULL
        AND 1 - (p.embedding <=> query_embedding) > match_threshold
        AND (filter_categoria IS NULL OR p.categoria = filter_categoria)
        AND (filter_partido_id IS NULL OR p.partido_id = filter_partido_id)
    ORDER BY p.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =====================================================
-- VISTAS
-- =====================================================

-- Vista: promesas con info de partido
CREATE OR REPLACE VIEW v_quipu_promesas_planes_completas AS
SELECT
    p.id,
    p.texto_original,
    p.resumen,
    p.categoria,
    p.subcategoria,
    p.ambito,
    p.pagina_pdf,
    p.confianza_extraccion,
    pp.nombre_oficial as partido,
    pp.candidato_presidencial,
    c.nombre_display as categoria_display,
    c.icono as categoria_icono,
    c.color as categoria_color
FROM quipu_promesas_planes p
JOIN quipu_partidos pp ON p.partido_id = pp.id
LEFT JOIN quipu_categorias_promesas c ON p.categoria = c.nombre;

-- Vista: resumen por partido
-- total_candidatos computed from actual candidatos (unique DNIs), not stale static field
CREATE OR REPLACE VIEW v_quipu_resumen_partidos AS
SELECT
    pp.id,
    pp.nombre_oficial,
    pp.candidato_presidencial,
    (SELECT COUNT(DISTINCT c.dni)::int FROM quipu_candidatos c WHERE c.partido_id = pp.id) as total_candidatos,
    COUNT(p.id) as total_promesas,
    ARRAY_AGG(DISTINCT p.categoria) as categorias
FROM quipu_partidos pp
LEFT JOIN quipu_promesas_planes p ON pp.id = p.partido_id
GROUP BY pp.id;

-- Vista: candidatos con partido (incluye todas las postulaciones)
CREATE OR REPLACE VIEW v_quipu_candidatos_completos AS
SELECT
    c.*,
    pp.nombre_oficial as partido_nombre,
    pp.candidato_presidencial as candidato_presidente
FROM quipu_candidatos c
LEFT JOIN quipu_partidos pp ON c.partido_id = pp.id;

-- Vista: candidatos unicos (una fila por DNI, cargo mas importante)
-- Usada en listados y busqueda para evitar duplicados
CREATE OR REPLACE VIEW v_quipu_candidatos_unicos AS
SELECT DISTINCT ON (c.dni)
    c.*,
    pp.nombre_oficial as partido_nombre,
    pp.candidato_presidencial as candidato_presidente
FROM quipu_candidatos c
LEFT JOIN quipu_partidos pp ON c.partido_id = pp.id
ORDER BY c.dni,
    CASE
        WHEN c.cargo_postula ILIKE '%PRESIDENTE DE LA REP%' THEN 1
        WHEN c.cargo_postula ILIKE '%VICEPRESIDENTE%' THEN 2
        WHEN c.cargo_postula ILIKE '%SENADOR%' THEN 3
        WHEN c.cargo_postula ILIKE '%DIPUTADO%' THEN 4
        ELSE 5
    END;
