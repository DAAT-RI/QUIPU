-- =====================================================
-- 006: Fix v_quipu_resumen_partidos view
-- Run this in Supabase SQL Editor
--
-- Problem: total_candidatos used the stale static field
-- from quipu_partidos (most showing 191). Now it computes
-- the actual count of unique DNIs per partido.
-- =====================================================

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
