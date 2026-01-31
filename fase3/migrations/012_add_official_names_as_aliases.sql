-- =====================================================
-- ADD OFFICIAL NAMES AS ALIASES
-- Los nombres oficiales de quipu_candidatos también deben
-- funcionar como aliases para el matching
-- =====================================================

-- Insertar nombres oficiales de candidatos como aliases
-- con confidence 1.0 (son los nombres oficiales)
-- Usar subquery con DISTINCT ON para evitar duplicados
INSERT INTO quipu_stakeholder_aliases (alias, alias_normalized, candidato_id, confidence, match_method, verified)
SELECT alias, alias_normalized, candidato_id, confidence, match_method, verified
FROM (
    SELECT DISTINCT ON (normalize_stakeholder(c.nombre_completo))
        c.nombre_completo AS alias,
        normalize_stakeholder(c.nombre_completo) AS alias_normalized,
        c.id AS candidato_id,
        1.0::decimal AS confidence,
        'official_name'::varchar AS match_method,
        TRUE AS verified
    FROM quipu_candidatos c
    WHERE c.nombre_completo IS NOT NULL
      AND length(c.nombre_completo) >= 3
    ORDER BY normalize_stakeholder(c.nombre_completo), c.id
) sub
ON CONFLICT (alias_normalized)
DO UPDATE SET
    candidato_id = EXCLUDED.candidato_id,
    confidence = 1.0,
    match_method = 'official_name',
    verified = TRUE,
    updated_at = NOW();

-- Mostrar resumen
SELECT
    match_method,
    COUNT(*) as count,
    ROUND(AVG(confidence) * 100) as avg_confidence_pct
FROM quipu_stakeholder_aliases
GROUP BY match_method
ORDER BY count DESC;
