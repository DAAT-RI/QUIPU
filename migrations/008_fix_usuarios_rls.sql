-- =====================================================
-- FIX: RLS Policy for quipu_usuarios (v4)
-- Simplified: just let user read their own record
-- =====================================================

-- First, create a helper function that bypasses RLS to check superadmin status
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM quipu_usuarios
        WHERE auth_user_id = auth.uid()
        AND rol = 'superadmin'
    )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;

-- Drop ALL existing policies on quipu_usuarios
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario ve su propio registro" ON quipu_usuarios;
DROP POLICY IF EXISTS "Superadmin ve todos los usuarios" ON quipu_usuarios;

-- SIMPLE policy: User can see their own record (this is all we need for login!)
CREATE POLICY "Usuario ve su propio registro"
ON quipu_usuarios FOR SELECT
USING (auth_user_id = auth.uid());

-- Users see other users from same cliente  
CREATE POLICY "Usuario ve usuarios de su cliente"
ON quipu_usuarios FOR SELECT
USING (cliente_id IS NOT NULL AND cliente_id = get_current_cliente_id());

-- Superadmin sees all users
CREATE POLICY "Superadmin ve todos los usuarios"
ON quipu_usuarios FOR SELECT
USING (is_superadmin());
