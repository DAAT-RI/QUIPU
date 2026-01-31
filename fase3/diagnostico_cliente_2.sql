-- =====================================================
-- DIAGNÓSTICO: ¿Por qué cliente 2 no ve declaraciones?
-- Ejecutar cada query por separado en Supabase SQL Editor
-- =====================================================

-- 1. ¿Qué candidatos tiene el cliente 2?
SELECT
    cc.cliente_id,
    cc.candidato_id,
    c.nombre_completo,
    c.cargo_postula
FROM quipu_cliente_candidatos cc
JOIN quipu_candidatos c ON c.id = cc.candidato_id
WHERE cc.cliente_id = 2;

-- 2. ¿Qué aliases tienen esos candidatos?
SELECT
    a.candidato_id,
    c.nombre_completo,
    a.alias,
    a.alias_normalized,
    a.match_method,
    a.confidence
FROM quipu_stakeholder_aliases a
JOIN quipu_candidatos c ON c.id = a.candidato_id
WHERE a.candidato_id IN (
    SELECT candidato_id
    FROM quipu_cliente_candidatos
    WHERE cliente_id = 2
)
ORDER BY a.candidato_id, a.confidence DESC;

-- 3. ¿Hay declaraciones con esos stakeholders? (muestra primeras 10)
SELECT DISTINCT stakeholder, COUNT(*) as total
FROM v_quipu_declaraciones
WHERE stakeholder ILIKE ANY(
    SELECT '%' || alias_normalized || '%'
    FROM quipu_stakeholder_aliases
    WHERE candidato_id IN (
        SELECT candidato_id
        FROM quipu_cliente_candidatos
        WHERE cliente_id = 2
    )
)
GROUP BY stakeholder
ORDER BY total DESC
LIMIT 20;

-- 4. Si no hay resultados arriba, veamos qué stakeholders existen
SELECT DISTINCT stakeholder, COUNT(*) as total
FROM v_quipu_declaraciones
GROUP BY stakeholder
ORDER BY total DESC
LIMIT 50;

-- 5. Verificar si hay match parcial con los nombres de candidatos del cliente 2
SELECT DISTINCT
    d.stakeholder,
    c.nombre_completo as candidato_nombre
FROM v_quipu_declaraciones d
CROSS JOIN (
    SELECT c.nombre_completo
    FROM quipu_cliente_candidatos cc
    JOIN quipu_candidatos c ON c.id = cc.candidato_id
    WHERE cc.cliente_id = 2
) c
WHERE d.stakeholder ILIKE '%' || split_part(c.nombre_completo, ' ', 1) || '%'
   OR d.stakeholder ILIKE '%' || split_part(c.nombre_completo, ' ', 2) || '%'
LIMIT 20;
