-- =====================================================
-- MIGRATION 007: Agregar nuevos campos a quipu_hojas_vida
-- Fuente: hojas_vida_jne_2026_20260129_143748.json (53.3MB)
-- Fecha: 2026-01-29
-- =====================================================

-- Nuevos campos de estado y completitud
ALTER TABLE quipu_hojas_vida
ADD COLUMN IF NOT EXISTS estado_hv VARCHAR(50),
ADD COLUMN IF NOT EXISTS porcentaje_completitud INTEGER,
ADD COLUMN IF NOT EXISTS fecha_termino_registro TIMESTAMPTZ;

-- Campos de verificacion agrupados en JSONB
-- Estructura: {sunedu, sunarp, minedu_tec, infogob, rop, rop_renuncia}
ALTER TABLE quipu_hojas_vida
ADD COLUMN IF NOT EXISTS verificaciones JSONB;

-- Indicadores booleanos agrupados en JSONB
-- Estructura: {tiene_experiencia_laboral, tiene_educacion_basica, tiene_educacion_tecnica, ...}
ALTER TABLE quipu_hojas_vida
ADD COLUMN IF NOT EXISTS indicadores JSONB;

-- Nuevas secciones de datos
ALTER TABLE quipu_hojas_vida
ADD COLUMN IF NOT EXISTS cargos_postula JSONB,
ADD COLUMN IF NOT EXISTS titularidades JSONB,
ADD COLUMN IF NOT EXISTS declaraciones_juradas JSONB;

-- Datos de ubicacion y extranjeria
ALTER TABLE quipu_hojas_vida
ADD COLUMN IF NOT EXISTS carne_extranjeria VARCHAR(20),
ADD COLUMN IF NOT EXISTS ubigeo_nacimiento VARCHAR(20),
ADD COLUMN IF NOT EXISTS ubigeo_domicilio VARCHAR(20);

-- =====================================================
-- INDICES para consultas frecuentes
-- =====================================================

-- Indice para filtrar por estado (CONFIRMADA, PENDIENTE, etc)
CREATE INDEX IF NOT EXISTS idx_quipu_hojas_vida_estado
ON quipu_hojas_vida(estado_hv);

-- Indice para filtrar por completitud (candidatos con HV completa)
CREATE INDEX IF NOT EXISTS idx_quipu_hojas_vida_completitud
ON quipu_hojas_vida(porcentaje_completitud);

-- Indice GIN para busquedas en indicadores (ej: tiene_sentencia_penal = true)
CREATE INDEX IF NOT EXISTS idx_quipu_hojas_vida_indicadores
ON quipu_hojas_vida USING GIN(indicadores);

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON COLUMN quipu_hojas_vida.estado_hv IS 'Estado de la hoja de vida: CONFIRMADA, PENDIENTE, etc';
COMMENT ON COLUMN quipu_hojas_vida.porcentaje_completitud IS 'Porcentaje de completitud de la HV (0-100)';
COMMENT ON COLUMN quipu_hojas_vida.verificaciones IS 'JSON con verificaciones: sunedu, sunarp, minedu_tec, infogob, rop, rop_renuncia';
COMMENT ON COLUMN quipu_hojas_vida.indicadores IS 'JSON con indicadores booleanos: tiene_experiencia_laboral, tiene_educacion_*, etc';
COMMENT ON COLUMN quipu_hojas_vida.cargos_postula IS 'Array de cargos a los que postula con estado';
COMMENT ON COLUMN quipu_hojas_vida.titularidades IS 'Array de titularidades declaradas';
COMMENT ON COLUMN quipu_hojas_vida.declaraciones_juradas IS 'Declaraciones juradas, renuncias adicionales, anotaciones marginales';
