-- Fix RLS for relation tables to allow Superadmin/Admin to managing them
-- Updated with correct table names from screenshot

-- 1. quipu_cliente_candidatos
DROP POLICY IF EXISTS "Cliente ve sus candidatos asignados" ON quipu_cliente_candidatos;
DROP POLICY IF EXISTS "Admin cliente modifica candidatos" ON quipu_cliente_candidatos;
DROP POLICY IF EXISTS "Superadmin manage all candidates" ON quipu_cliente_candidatos;
DROP POLICY IF EXISTS "Client users view assigned candidates" ON quipu_cliente_candidatos;

-- Superadmin/Admin Global view/manage ALL
CREATE POLICY "Superadmin manage all candidates"
ON quipu_cliente_candidatos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('superadmin', 'admin')
    )
);

-- Client Users view their own
CREATE POLICY "Client users view assigned candidates"
ON quipu_cliente_candidatos FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);


-- 2. quipu_cliente_categorias (Corrected Name)
DROP POLICY IF EXISTS "Cliente ve sus temas" ON quipu_cliente_categorias;
DROP POLICY IF EXISTS "Admin cliente modifica temas" ON quipu_cliente_categorias;
DROP POLICY IF EXISTS "Superadmin manage all temas" ON quipu_cliente_categorias;
DROP POLICY IF EXISTS "Client users view assigned temas" ON quipu_cliente_categorias;

-- Superadmin/Admin Global view/manage ALL
CREATE POLICY "Superadmin manage all temas"
ON quipu_cliente_categorias FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('superadmin', 'admin')
    )
);

-- Client Users view their own
CREATE POLICY "Client users view assigned temas"
ON quipu_cliente_categorias FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);
