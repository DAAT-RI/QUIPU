-- =====================================================
-- FASE 3: Vistas para Frontend Multi-Tenant
-- =====================================================

-- Vista: Declaraciones con info completa (base para filtrar)
CREATE OR REPLACE VIEW v_quipu_declaraciones_completas AS
SELECT
    d.id,
    d.master_id,
    d.tipo,
    d.contenido,
    d.stakeholder_raw,
    d.tema_raw,
    d.fecha,
    d.canal,
    d.url_fuente,
    d.titulo_master,
    d.resumen_master,
    d.created_at,
    -- Candidato
    d.candidato_id,
    c.nombre_completo as candidato_nombre,
    c.partido_id,
    c.foto_url as candidato_foto,
    c.cargo_postula,
    -- Partido
    pp.nombre_oficial as partido_nombre,
    pp.candidato_presidencial,
    -- Tema
    d.tema_id,
    t.nombre as tema_nombre,
    t.categoria as tema_categoria,
    t.sector as tema_sector,
    t.icono as tema_icono,
    t.color as tema_color
FROM quipu_declaraciones d
LEFT JOIN quipu_candidatos c ON d.candidato_id = c.id
LEFT JOIN quipu_partidos pp ON c.partido_id = pp.id
LEFT JOIN quipu_categorias t ON d.tema_id = t.id;

-- Vista: Declaraciones filtradas por cliente (usa RLS internamente)
-- El frontend usa esta vista y RLS filtra automáticamente
CREATE OR REPLACE VIEW v_quipu_cliente_declaraciones AS
SELECT
    dc.*,
    cc.cliente_id,
    ct.prioridad as tema_prioridad
FROM v_quipu_declaraciones_completas dc
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = dc.candidato_id
JOIN quipu_cliente_categorias ct ON ct.tema_id = dc.tema_id AND ct.cliente_id = cc.cliente_id;

-- Vista: Candidatos del cliente con stats
CREATE OR REPLACE VIEW v_quipu_cliente_candidatos_stats AS
SELECT
    c.id,
    c.nombre_completo,
    c.foto_url,
    c.cargo_postula,
    c.tipo_eleccion,
    c.departamento,
    pp.nombre_oficial as partido_nombre,
    pp.candidato_presidencial,
    cc.cliente_id,
    cc.added_at,
    COUNT(DISTINCT d.id) as total_declaraciones,
    MAX(d.fecha) as ultima_declaracion
FROM quipu_candidatos c
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = c.id
LEFT JOIN quipu_partidos pp ON c.partido_id = pp.id
LEFT JOIN quipu_declaraciones d ON d.candidato_id = c.id
GROUP BY c.id, pp.id, cc.cliente_id, cc.added_at;

-- Vista: Temas del cliente con stats
CREATE OR REPLACE VIEW v_quipu_cliente_categorias_stats AS
SELECT
    t.id,
    t.nombre,
    t.nombre_normalizado,
    t.categoria,
    t.sector,
    t.icono,
    t.color,
    ct.cliente_id,
    ct.prioridad,
    ct.alertas_activas,
    COUNT(DISTINCT d.id) as total_declaraciones,
    COUNT(DISTINCT d.candidato_id) as candidatos_hablando
FROM quipu_categorias t
JOIN quipu_cliente_categorias ct ON ct.tema_id = t.id
LEFT JOIN quipu_declaraciones d ON d.tema_id = t.id
    AND d.candidato_id IN (
        SELECT candidato_id FROM quipu_cliente_candidatos
        WHERE cliente_id = ct.cliente_id
    )
GROUP BY t.id, ct.cliente_id, ct.prioridad, ct.alertas_activas;

-- Vista: Dashboard stats por cliente
CREATE OR REPLACE VIEW v_quipu_cliente_dashboard AS
SELECT
    cc.cliente_id,
    COUNT(DISTINCT cc.candidato_id) as total_candidatos,
    COUNT(DISTINCT ct.tema_id) as total_temas,
    COUNT(DISTINCT d.id) as total_declaraciones,
    COUNT(DISTINCT CASE WHEN d.fecha > CURRENT_DATE - INTERVAL '7 days' THEN d.id END) as declaraciones_semana,
    COUNT(DISTINCT CASE WHEN d.fecha > CURRENT_DATE - INTERVAL '1 day' THEN d.id END) as declaraciones_hoy,
    MAX(d.fecha) as ultima_actividad
FROM quipu_cliente_candidatos cc
JOIN quipu_cliente_categorias ct ON ct.cliente_id = cc.cliente_id
LEFT JOIN quipu_declaraciones d ON d.candidato_id = cc.candidato_id
    AND d.tema_id = ct.tema_id
GROUP BY cc.cliente_id;

-- Vista: Coherencia por cliente
CREATE OR REPLACE VIEW v_quipu_cliente_coherencia AS
SELECT
    pd.id,
    pd.similarity,
    pd.coherencia,
    pd.verificado,
    pd.notas,
    p.texto_original as promesa_texto,
    p.categoria as promesa_categoria,
    d.contenido as declaracion_texto,
    d.fecha as declaracion_fecha,
    d.canal,
    c.nombre_completo as candidato_nombre,
    pp.nombre_oficial as partido_nombre,
    t.nombre as tema_nombre,
    cc.cliente_id
FROM quipu_promesa_declaracion pd
JOIN quipu_promesas_planes p ON pd.promesa_id = p.id
JOIN quipu_declaraciones d ON pd.declaracion_id = d.id
JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
LEFT JOIN quipu_candidatos c ON d.candidato_id = c.id
LEFT JOIN quipu_partidos pp ON p.partido_id = pp.id
LEFT JOIN quipu_categorias t ON d.tema_id = t.id;
