-- =====================================================
-- FASE 3: Catálogo Normalizado de Temas
-- =====================================================

-- Temas normalizados (reemplaza texto libre)
CREATE TABLE IF NOT EXISTS quipu_temas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    nombre_normalizado VARCHAR(100),  -- Sin tildes, lowercase para matching
    categoria VARCHAR(50),            -- 'economia', 'social', 'seguridad', 'politica'
    sector VARCHAR(100),              -- 'seguros', 'mineria', 'salud' (para filtrar por gremio)
    keywords TEXT[],                  -- ['AFP', 'ONP', 'jubilación'] para auto-mapping
    descripcion TEXT,
    icono VARCHAR(50),
    color VARCHAR(20),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temas prioritarios por cliente
CREATE TABLE IF NOT EXISTS quipu_cliente_temas (
    cliente_id INTEGER REFERENCES quipu_clientes(id) ON DELETE CASCADE,
    tema_id INTEGER REFERENCES quipu_temas(id) ON DELETE CASCADE,
    prioridad INTEGER DEFAULT 1,      -- 1=alta, 2=media, 3=baja
    alertas_activas BOOLEAN DEFAULT TRUE,
    keywords_custom TEXT[],           -- Keywords adicionales del cliente
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cliente_id, tema_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_temas_sector ON quipu_temas(sector);
CREATE INDEX IF NOT EXISTS idx_temas_categoria ON quipu_temas(categoria);
CREATE INDEX IF NOT EXISTS idx_temas_keywords ON quipu_temas USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_cliente_temas_cliente ON quipu_cliente_temas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_temas_prioridad ON quipu_cliente_temas(cliente_id, prioridad);

-- Seed inicial de temas (basado en QUIPU_MASTER + categorías de planes)
INSERT INTO quipu_temas (nombre, nombre_normalizado, categoria, sector, keywords, icono, color, orden) VALUES
-- Temas de QUIPU_MASTER
('Política', 'politica', 'politica', NULL, ARRAY['político', 'gobierno', 'estado'], 'landmark', '#64748B', 1),
('Partidos Políticos', 'partidos politicos', 'politica', NULL, ARRAY['partido', 'alianza', 'coalición'], 'building', '#6366F1', 2),
('Corrupción y Transparencia', 'corrupcion y transparencia', 'politica', NULL, ARRAY['corrupción', 'transparencia', 'fiscalización'], 'shield-alert', '#EF4444', 3),
('Elecciones y Sistemas Electorales', 'elecciones y sistemas electorales', 'politica', NULL, ARRAY['elección', 'voto', 'JNE', 'ONPE'], 'vote', '#8B5CF6', 4),
('Gobierno y Administración Pública', 'gobierno y administracion publica', 'politica', NULL, ARRAY['ministro', 'funcionario', 'decreto'], 'building-2', '#0EA5E9', 5),

-- Temas económicos (interés de gremios)
('Pensiones y AFP', 'pensiones y afp', 'economia', 'seguros', ARRAY['AFP', 'ONP', 'jubilación', 'pensión', 'retiro', 'fondo'], 'piggy-bank', '#F59E0B', 10),
('Seguros', 'seguros', 'economia', 'seguros', ARRAY['seguro', 'póliza', 'APESEG', 'aseguradora', 'siniestro'], 'shield-check', '#10B981', 11),
('Sistema Financiero', 'sistema financiero', 'economia', 'banca', ARRAY['banco', 'crédito', 'SBS', 'tasa', 'interés'], 'landmark', '#6366F1', 12),
('Minería', 'mineria', 'economia', 'mineria', ARRAY['mina', 'minero', 'canon', 'Southern', 'Las Bambas'], 'pickaxe', '#78716C', 13),
('Agricultura', 'agricultura', 'economia', 'agricultura', ARRAY['agro', 'campo', 'exportación', 'riego'], 'wheat', '#22C55E', 14),
('Tributación', 'tributacion', 'economia', NULL, ARRAY['impuesto', 'SUNAT', 'IGV', 'renta', 'tributario'], 'receipt', '#F97316', 15),

-- Temas sociales
('Salud', 'salud', 'social', 'salud', ARRAY['hospital', 'médico', 'SIS', 'EsSalud', 'vacuna'], 'heart-pulse', '#EF4444', 20),
('Educación', 'educacion', 'social', 'educacion', ARRAY['escuela', 'universidad', 'profesor', 'MINEDU'], 'graduation-cap', '#3B82F6', 21),
('Empleo', 'empleo', 'social', NULL, ARRAY['trabajo', 'sueldo', 'desempleo', 'laboral', 'CTS'], 'briefcase', '#F59E0B', 22),
('Programas Sociales', 'programas sociales', 'social', NULL, ARRAY['bono', 'Juntos', 'Pensión 65', 'subsidio'], 'users', '#EC4899', 23),

-- Seguridad
('Seguridad Ciudadana', 'seguridad ciudadana', 'seguridad', NULL, ARRAY['delincuencia', 'policía', 'crimen', 'robo'], 'shield', '#DC2626', 30),
('Narcotráfico', 'narcotrafico', 'seguridad', NULL, ARRAY['droga', 'VRAEM', 'coca', 'narcotráfico'], 'alert-triangle', '#7C3AED', 31),

-- Infraestructura
('Infraestructura', 'infraestructura', 'infraestructura', NULL, ARRAY['obra', 'carretera', 'puente', 'aeropuerto'], 'hard-hat', '#8B5CF6', 40),
('Transporte', 'transporte', 'infraestructura', NULL, ARRAY['metro', 'bus', 'tren', 'línea'], 'train', '#0891B2', 41)

ON CONFLICT (nombre) DO UPDATE SET
    keywords = EXCLUDED.keywords,
    sector = EXCLUDED.sector,
    categoria = EXCLUDED.categoria;
