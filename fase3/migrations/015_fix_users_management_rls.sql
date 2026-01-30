-- Fix RLS for quipu_usuarios to allow creation and management of users
-- Previously only SELECT was allowed (read-only)

-- 1. Enable Superadmin to Manage All Users
CREATE POLICY "Superadmin manage all users"
ON quipu_usuarios FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol = 'superadmin'
    )
);

-- 2. Enable Client Admin to Manage THEIR Users
-- Can manage users where cliente_id matches their own
-- Note: Security consideration - Admin could try to change cliente_id to steal user?
-- Constraint: Can only operate on rows where cliente_id matches. Use WITH CHECK for inserts/updates.

CREATE POLICY "Client Admin manage their users"
ON quipu_usuarios FOR ALL
USING (
    -- Target User must belong to same client
    cliente_id = get_current_cliente_id()
    AND
    -- Actor must be admin/analyst of that client
    EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol IN ('admin')
    )
)
WITH CHECK (
    -- New/Updated state must still belong to same client
    cliente_id = get_current_cliente_id()
);
