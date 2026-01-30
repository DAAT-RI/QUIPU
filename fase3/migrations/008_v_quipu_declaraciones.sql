-- =====================================================
-- FASE 3: Vista v_quipu_declaraciones
-- Aplana QUIPU_MASTER.interacciones para el frontend
-- =====================================================

-- DROP si existe (para re-crear)
DROP VIEW IF EXISTS v_quipu_declaraciones CASCADE;

-- Vista que aplana el array de interacciones de QUIPU_MASTER
-- El frontend necesita esta estructura específica
CREATE OR REPLACE VIEW v_quipu_declaraciones AS
SELECT
    m.id as master_id,
    (inter.ordinality - 1)::int as idx,  -- 0-based index
    m.canal,
    m.titulo,
    m.resumen,
    m.temas,
    m.personas,
    m.keywords,
    m.organizaciones,
    m.ubicaciones,
    m.paises,
    m.productos,
    m.fecha,
    m.ruta,
    m.transcripcion,
    -- Campos de la interacción
    inter.value->>'type' as tipo,
    inter.value->>'stakeholder' as stakeholder,
    inter.value->>'content' as contenido,
    inter.value->>'tema' as tema_interaccion
FROM "QUIPU_MASTER" m
CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(m.interacciones, '[]'::jsonb)
) WITH ORDINALITY AS inter(value, ordinality)
WHERE inter.value->>'content' IS NOT NULL
  AND inter.value->>'content' != '';

-- Comentario explicativo
COMMENT ON VIEW v_quipu_declaraciones IS
'Vista que aplana las interacciones de QUIPU_MASTER para el frontend.
Cada fila es una declaración o mención individual.
- master_id: ID del registro QUIPU_MASTER original
- idx: índice de la interacción (0-based)
- tema_interaccion: tema específico de esta declaración
- Campos como organizaciones, temas, etc. son del artículo completo';

-- Crear índice en QUIPU_MASTER para mejorar performance
-- (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_quipu_master_fecha'
    ) THEN
        CREATE INDEX idx_quipu_master_fecha ON "QUIPU_MASTER"(fecha DESC NULLS LAST);
    END IF;
END $$;

-- Verificar que la vista funciona
SELECT COUNT(*) as total_declaraciones FROM v_quipu_declaraciones;
