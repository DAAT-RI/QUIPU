-- =====================================================
-- POPULATE: Initial aliases from existing QUIPU_MASTER data
-- Run this AFTER 010_stakeholder_aliases.sql
-- =====================================================

-- Populate from existing stakeholders in QUIPU_MASTER
INSERT INTO quipu_stakeholder_aliases (alias, alias_normalized, candidato_id, confidence, match_method)
SELECT DISTINCT ON (normalize_stakeholder(inter.value->>'stakeholder'))
    inter.value->>'stakeholder' AS alias,
    normalize_stakeholder(inter.value->>'stakeholder') AS alias_normalized,
    (auto_match_stakeholder(inter.value->>'stakeholder')).candidato_id,
    (auto_match_stakeholder(inter.value->>'stakeholder')).confidence,
    (auto_match_stakeholder(inter.value->>'stakeholder')).method
FROM "QUIPU_MASTER" m
CROSS JOIN LATERAL jsonb_array_elements(m.interacciones) AS inter(value)
WHERE inter.value->>'stakeholder' IS NOT NULL
  AND inter.value->>'stakeholder' != ''
  AND length(inter.value->>'stakeholder') >= 3
ON CONFLICT (alias_normalized) DO NOTHING;

-- Show summary
SELECT 
    match_method,
    COUNT(*) as count,
    ROUND(AVG(confidence) * 100) as avg_confidence_pct
FROM quipu_stakeholder_aliases
GROUP BY match_method
ORDER BY count DESC;
