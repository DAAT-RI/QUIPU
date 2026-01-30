-- =====================================================
-- FIX: RLS Policy for quipu_usuarios
-- Allows users to read their own record and superadmins to see all
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios;

-- Create new policy: User can always see their own record
CREATE POLICY "Usuario ve su propio registro"
ON quipu_usuarios FOR SELECT
USING (
    auth_user_id = auth.uid()
);

-- Create policy: Users see other users from same cliente
CREATE POLICY "Usuario ve usuarios de su cliente"
ON quipu_usuarios FOR SELECT
USING (
    cliente_id IS NOT NULL 
    AND cliente_id = get_current_cliente_id()
);

-- Create policy: Superadmin sees all users
CREATE POLICY "Superadmin ve todos los usuarios"
ON quipu_usuarios FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM quipu_usuarios u
        WHERE u.auth_user_id = auth.uid()
        AND u.rol = 'superadmin'
    )
);
