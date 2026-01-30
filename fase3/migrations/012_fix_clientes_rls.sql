-- Fix RLS policy for quipu_clientes to allow superadmin to see all clients
-- Previously only 'admin' was allowed, locking out 'superadmin'

DROP POLICY IF EXISTS "Admin ve todos los clientes" ON quipu_clientes;
DROP POLICY IF EXISTS "Usuario ve su cliente" ON quipu_clientes;

-- Superadmin y Admin ven todos los clientes
CREATE POLICY "Superusers ven todos los clientes"
ON quipu_clientes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('superadmin', 'admin') -- Expanded role check
    )
);

-- Usuario ve su propio cliente (si no es super/admin)
CREATE POLICY "Usuario ve su cliente asignado"
ON quipu_clientes FOR SELECT
USING (
    id = get_current_cliente_id()
);
