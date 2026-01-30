-- URGENT RESTORE (Script 020)
-- Reverts JWT changes and 018 policies.
-- Restores the "Old Reliable" read policies.

-- 1. CLEANUP (Drop 019 and 018 policies)
DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario ve/modifica sus propios datos" ON quipu_usuarios; -- 019
DROP POLICY IF EXISTS "Users see their client peers" ON quipu_usuarios; -- 019
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios; -- Dropped by 019, need to restore

-- 2. RESTORE SAFE READ POLICIES (From 007/012 era)

-- A. Users see their own client's users
-- Uses get_current_cliente_id (Security Definer - Safe)
CREATE POLICY "Usuario ve usuarios de su cliente"
ON quipu_usuarios FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);

-- B. User can update their own session (Vital for Logout/Refresh)
-- (Simple auth.uid check, no recursion)
CREATE POLICY "Usuario modifica sus propios datos"
ON quipu_usuarios FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- C. Superadmin Read Access (Safe Select)
-- Uses get_my_rol (Security Definer - Safe for Select)
CREATE POLICY "Superadmin view all users"
ON quipu_usuarios FOR SELECT
USING (
    get_my_rol() = 'superadmin'
);
