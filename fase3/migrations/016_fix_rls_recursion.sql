-- EMERGENCY FIX: Infinite Recursion on quipu_usuarios RLS
-- Problem: Policy on quipu_usuarios queries quipu_usuarios, triggering itself infinitely.
-- Solution: Use SECURITY DEFINER functions to verify role/client without triggering RLS.

-- 1. Create Helper Function to get role safely
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
STABLE
AS $$
  SELECT rol FROM quipu_usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Create Helper Function to get client_id safely (ensure it exists)
CREATE OR REPLACE FUNCTION get_current_cliente_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER -- Bypass RLS
STABLE
AS $$
    SELECT cliente_id FROM quipu_usuarios WHERE auth_user_id = auth.uid()
$$;

-- 3. Replace Broken Policies on quipu_usuarios

DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;

-- New Policies using Safe Functions

CREATE POLICY "Superadmin manage all users"
ON quipu_usuarios FOR ALL
USING (
    get_my_rol() = 'superadmin'
);

CREATE POLICY "Client Admin manage their users"
ON quipu_usuarios FOR ALL
USING (
    cliente_id = get_current_cliente_id()
    AND
    get_my_rol() = 'admin'
)
WITH CHECK (
    cliente_id = get_current_cliente_id()
);
