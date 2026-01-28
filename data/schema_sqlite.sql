-- =====================================================
-- ESQUEMA: Sistema de Promesas Electorales Peru 2026
-- Base: SQLite (migracion futura a Supabase/PostgreSQL)
-- =====================================================

-- Tabla: partidos_politicos
-- Catalogo maestro de partidos
CREATE TABLE IF NOT EXISTS partidos_politicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_oficial TEXT NOT NULL UNIQUE,           -- Nombre como en Firebase
    nombre_corto TEXT,                             -- Abreviatura
    candidato_presidencial TEXT,                   -- Nombre del candidato
    pdf_plan_completo TEXT,                        -- Ruta al PDF completo
    pdf_resumen TEXT,                              -- Ruta al resumen JNE
    total_candidatos INTEGER DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT                                  -- JSON con info adicional
);

-- Tabla: categorias_promesas
-- Catalogo de categorias tematicas
CREATE TABLE IF NOT EXISTS categorias_promesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    nombre_display TEXT,
    descripcion TEXT,
    icono TEXT,                                    -- Para UI: "graduation-cap"
    color TEXT,                                    -- Para UI: "#3B82F6"
    orden INTEGER DEFAULT 0
);

-- Insertar categorias predefinidas
INSERT OR IGNORE INTO categorias_promesas (nombre, nombre_display, icono, color, orden) VALUES
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
('reforma_estado', 'Reforma del Estado', 'landmark', '#64748B', 15);

-- Tabla: promesas
-- Promesas extraidas de planes de gobierno
CREATE TABLE IF NOT EXISTS promesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partido_id INTEGER NOT NULL,

    -- Contenido de la promesa
    texto_original TEXT NOT NULL,                  -- Texto exacto del PDF
    texto_normalizado TEXT,                        -- Texto limpio para busqueda
    resumen TEXT,                                  -- Resumen generado por LLM

    -- Clasificacion
    categoria TEXT NOT NULL,                       -- educacion, salud, economia, etc.
    subcategoria TEXT,                             -- educacion_superior, salud_mental
    ambito TEXT DEFAULT 'nacional',                -- nacional, regional, local

    -- Metadatos de extraccion
    pagina_pdf INTEGER,                            -- Pagina donde aparece
    seccion_pdf TEXT,                              -- Seccion del documento
    confianza_extraccion REAL DEFAULT 0.0,         -- Score de confianza del LLM

    -- Embedding para busqueda semantica (JSON array)
    embedding TEXT,                                -- JSON: [0.123, -0.456, ...]

    -- Auditoria
    fecha_extraccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_extraccion INTEGER DEFAULT 1,

    FOREIGN KEY (partido_id) REFERENCES partidos_politicos(id),
    UNIQUE (partido_id, texto_original)
);

-- Tabla: cumplimiento_promesas (FUTURA - para contrastar promesas vs acciones)
CREATE TABLE IF NOT EXISTS cumplimiento_promesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promesa_id INTEGER NOT NULL,

    -- Estado de cumplimiento
    estado TEXT NOT NULL DEFAULT 'sin_evaluar',    -- cumplida, parcial, incumplida, en_proceso, sin_evaluar
    porcentaje_cumplimiento INTEGER DEFAULT 0,     -- 0-100

    -- Evidencia
    descripcion_avance TEXT,
    fecha_evaluacion DATE,
    fuente_verificacion TEXT,                      -- URL o referencia
    documento_evidencia TEXT,                      -- Archivo adjunto

    -- Auditoria
    evaluador TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,

    FOREIGN KEY (promesa_id) REFERENCES promesas(id)
);

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_promesas_partido ON promesas(partido_id);
CREATE INDEX IF NOT EXISTS idx_promesas_categoria ON promesas(categoria);
CREATE INDEX IF NOT EXISTS idx_promesas_ambito ON promesas(ambito);
CREATE INDEX IF NOT EXISTS idx_cumplimiento_promesa ON cumplimiento_promesas(promesa_id);
CREATE INDEX IF NOT EXISTS idx_cumplimiento_estado ON cumplimiento_promesas(estado);

-- Vista: promesas con partido
CREATE VIEW IF NOT EXISTS v_promesas_completas AS
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
FROM promesas p
JOIN partidos_politicos pp ON p.partido_id = pp.id
LEFT JOIN categorias_promesas c ON p.categoria = c.nombre;

-- Vista: resumen por partido
CREATE VIEW IF NOT EXISTS v_resumen_partidos AS
SELECT
    pp.id,
    pp.nombre_oficial,
    pp.candidato_presidencial,
    pp.total_candidatos,
    COUNT(p.id) as total_promesas,
    GROUP_CONCAT(DISTINCT p.categoria) as categorias
FROM partidos_politicos pp
LEFT JOIN promesas p ON pp.id = p.partido_id
GROUP BY pp.id;
