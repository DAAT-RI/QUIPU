-- =====================================================
-- FASE 3: Organizaciones Mencionadas
-- =====================================================

-- Catálogo de organizaciones (gremios, empresas, reguladores)
CREATE TABLE IF NOT EXISTS quipu_organizaciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    aliases TEXT[],                   -- ['APESEG', 'Asociación Peruana de Seguros']
    tipo VARCHAR(50),                 -- 'gremio', 'empresa', 'regulador', 'ong', 'gobierno'
    sector VARCHAR(100),              -- 'seguros', 'banca', 'mineria'
    descripcion TEXT,
    website VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_orgs_tipo ON quipu_organizaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_orgs_sector ON quipu_organizaciones(sector);
CREATE INDEX IF NOT EXISTS idx_orgs_aliases ON quipu_organizaciones USING GIN(aliases);

-- Seed de organizaciones principales
INSERT INTO quipu_organizaciones (nombre, aliases, tipo, sector, descripcion) VALUES
-- Gremios empresariales
('APESEG', ARRAY['Asociación Peruana de Empresas de Seguros', 'gremio de seguros'], 'gremio', 'seguros', 'Asociación Peruana de Empresas de Seguros'),
('CONFIEP', ARRAY['Confederación Nacional de Instituciones Empresariales Privadas'], 'gremio', NULL, 'Principal gremio empresarial del Perú'),
('SNI', ARRAY['Sociedad Nacional de Industrias'], 'gremio', 'industria', 'Gremio de industriales'),
('SNMPE', ARRAY['Sociedad Nacional de Minería, Petróleo y Energía'], 'gremio', 'mineria', 'Gremio minero-energético'),
('CCL', ARRAY['Cámara de Comercio de Lima'], 'gremio', 'comercio', 'Cámara de Comercio de Lima'),
('ASBANC', ARRAY['Asociación de Bancos del Perú'], 'gremio', 'banca', 'Gremio bancario'),

-- Reguladores
('SBS', ARRAY['Superintendencia de Banca, Seguros y AFP'], 'regulador', 'financiero', 'Regulador financiero'),
('SUNAT', ARRAY['Superintendencia Nacional de Aduanas y de Administración Tributaria'], 'regulador', NULL, 'Administración tributaria'),
('OSCE', ARRAY['Organismo Supervisor de las Contrataciones del Estado'], 'regulador', NULL, 'Contrataciones públicas'),
('JNE', ARRAY['Jurado Nacional de Elecciones'], 'regulador', NULL, 'Justicia electoral'),
('ONPE', ARRAY['Oficina Nacional de Procesos Electorales'], 'regulador', NULL, 'Procesos electorales'),

-- Empresas relevantes
('AFP Integra', ARRAY['Integra AFP'], 'empresa', 'seguros', 'Administradora de fondos de pensiones'),
('Prima AFP', ARRAY['AFP Prima'], 'empresa', 'seguros', 'Administradora de fondos de pensiones'),
('Profuturo AFP', ARRAY['AFP Profuturo'], 'empresa', 'seguros', 'Administradora de fondos de pensiones'),
('Rímac Seguros', ARRAY['Rímac', 'Rimac'], 'empresa', 'seguros', 'Compañía de seguros'),
('Pacífico Seguros', ARRAY['Pacífico', 'Pacifico'], 'empresa', 'seguros', 'Compañía de seguros')

ON CONFLICT (nombre) DO NOTHING;
