-- SAFE RE-APPLICATION OF USER MANAGEMENT RLS
-- Uses SECURITY DEFINER functions to prevent infinite recursion.

-- 1. Ensure Helper Functions are Safe and Exist
-- (These run as the owner, bypassing RLS checks on the table)

CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT rol FROM quipu_usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_cliente_id()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT cliente_id FROM quipu_usuarios WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- 2. Drop Safe Read-Only Policies (if any exist from rollback)
DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;
-- Note: We keep "Usuario ve usuarios de su cliente" from 007 if it exists, or we can redefine it safely.

-- 3. Define Write Policies using Safe Functions

-- SUPERADMIN: Full Access
CREATE POLICY "Superadmin manage all users"
ON quipu_usuarios FOR ALL
USING (
    get_my_rol() = 'superadmin'
);

-- CLIENT ADMIN: Manage users in their own client
CREATE POLICY "Client Admin manage their users"
ON quipu_usuarios FOR ALL
USING (
    get_my_rol() = 'admin' 
    AND cliente_id = get_current_cliente_id()
)
WITH CHECK (
    get_my_rol() = 'admin' 
    AND cliente_id = get_current_cliente_id()
);

-- 4. Allow users to update their own session (required for logout/refresh fix)
CREATE POLICY "Usuario modifica sus propios datos"
ON quipu_usuarios FOR UPDATE
USING (
    auth_user_id = auth.uid()
)
WITH CHECK (
    auth_user_id = auth.uid()
);
