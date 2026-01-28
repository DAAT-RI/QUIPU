-- =====================================================
-- 005: Create v_quipu_candidatos_unicos view
-- Run this in Supabase SQL Editor
--
-- Purpose: Deduplicate candidatos by DNI, keeping the
-- record with the most important cargo.
-- 85 candidates have multiple candidacy records
-- (e.g. Presidente + Senador for the same person).
-- =====================================================

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
