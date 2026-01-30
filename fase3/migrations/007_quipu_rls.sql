-- =====================================================
-- FASE 3: Row Level Security (RLS) para Multi-Tenant
-- =====================================================

-- =====================================================
-- POLÍTICAS PARA quipu_clientes
-- =====================================================
ALTER TABLE quipu_clientes ENABLE ROW LEVEL SECURITY;

-- Admin puede ver todos los clientes
CREATE POLICY "Admin ve todos los clientes"
ON quipu_clientes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol = 'admin'
    )
);

-- Usuario solo ve su propio cliente
CREATE POLICY "Usuario ve su cliente"
ON quipu_clientes FOR SELECT
USING (
    id = get_current_cliente_id()
);

-- =====================================================
-- POLÍTICAS PARA quipu_usuarios
-- =====================================================
ALTER TABLE quipu_usuarios ENABLE ROW LEVEL SECURITY;

-- Usuario ve usuarios de su mismo cliente
CREATE POLICY "Usuario ve usuarios de su cliente"
ON quipu_usuarios FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);

-- =====================================================
-- POLÍTICAS PARA quipu_cliente_candidatos
-- =====================================================
ALTER TABLE quipu_cliente_candidatos ENABLE ROW LEVEL SECURITY;

-- Usuario ve solo candidatos de su cliente
CREATE POLICY "Cliente ve sus candidatos asignados"
ON quipu_cliente_candidatos FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);

-- Admin de cliente puede modificar
CREATE POLICY "Admin cliente modifica candidatos"
ON quipu_cliente_candidatos FOR ALL
USING (
    cliente_id = get_current_cliente_id()
    AND EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('admin', 'analyst')
    )
);

-- =====================================================
-- POLÍTICAS PARA quipu_cliente_categorias
-- =====================================================
ALTER TABLE quipu_cliente_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente ve sus categorias"
ON quipu_cliente_categorias FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);

CREATE POLICY "Admin cliente modifica categorias"
ON quipu_cliente_categorias FOR ALL
USING (
    cliente_id = get_current_cliente_id()
    AND EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('admin', 'analyst')
    )
);

-- =====================================================
-- POLÍTICAS PARA quipu_declaraciones
-- =====================================================
ALTER TABLE quipu_declaraciones ENABLE ROW LEVEL SECURITY;

-- Usuario ve declaraciones de sus candidatos
CREATE POLICY "Cliente ve declaraciones de sus candidatos"
ON quipu_declaraciones FOR SELECT
USING (
    candidato_id IN (
        SELECT candidato_id FROM quipu_cliente_candidatos
        WHERE cliente_id = get_current_cliente_id()
    )
);

-- =====================================================
-- POLÍTICAS PARA quipu_promesa_declaracion
-- =====================================================
ALTER TABLE quipu_promesa_declaracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente ve coherencia de sus candidatos"
ON quipu_promesa_declaracion FOR SELECT
USING (
    declaracion_id IN (
        SELECT d.id FROM quipu_declaraciones d
        JOIN quipu_cliente_candidatos cc ON cc.candidato_id = d.candidato_id
        WHERE cc.cliente_id = get_current_cliente_id()
    )
);

-- =====================================================
-- TABLAS PÚBLICAS (sin RLS o lectura libre)
-- =====================================================

-- Categorías: todos pueden leer el catálogo
ALTER TABLE quipu_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorias son publicas"
ON quipu_categorias FOR SELECT
USING (true);

-- Candidatos: público (el filtro es por quipu_cliente_candidatos)
-- No aplicamos RLS directo para permitir búsqueda
-- El filtro real se hace via JOINs con quipu_cliente_candidatos

-- Partidos: público
-- Promesas: público (vienen de planes de gobierno públicos)

-- =====================================================
-- BYPASS PARA SERVICE ROLE
-- =====================================================
-- El service_role de Supabase bypasea RLS automáticamente
-- Esto permite que los scripts de sync funcionen sin restricciones

-- =====================================================
-- GRANT PERMISOS
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON quipu_cliente_candidatos TO authenticated;
GRANT INSERT, UPDATE ON quipu_cliente_categorias TO authenticated;
GRANT UPDATE ON quipu_promesa_declaracion TO authenticated;