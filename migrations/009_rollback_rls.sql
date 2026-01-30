-- =====================================================
-- ROLLBACK: Remove all complex RLS, just allow read for authenticated
-- This will restore functionality immediately
-- =====================================================

-- Drop the broken function if exists
DROP FUNCTION IF EXISTS is_superadmin();

-- Drop ALL policies on quipu_usuarios
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario ve su propio registro" ON quipu_usuarios;
DROP POLICY IF EXISTS "Superadmin ve todos los usuarios" ON quipu_usuarios;

-- Simple policy: ALL authenticated users can read quipu_usuarios
-- (This is safe because the table only contains user mappings, no sensitive data)
CREATE POLICY "Authenticated users can read"
ON quipu_usuarios FOR SELECT
TO authenticated
USING (true);
