-- TOTAL RESET (Script 021)
-- Removes the JWT Sync Trigger and Function from 019 which might be blocking Login/Session Updates.
-- Re-establishes the "Old Reliable" Read Policies.

-- 1. DELETE TRIGGERS AND FUNCTIONS (The likely blockage)
DROP TRIGGER IF EXISTS on_auth_user_updated ON public.quipu_usuarios;
DROP FUNCTION IF EXISTS public.sync_user_role_to_jwt();

-- 2. CLEAR ALL POLICIES (Start Fresh)
DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario ve/modifica sus propios datos" ON quipu_usuarios; -- 019
DROP POLICY IF EXISTS "Users see their client peers" ON quipu_usuarios; -- 019
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios;
DROP POLICY IF EXISTS "Superadmin view all users" ON quipu_usuarios;

-- 3. RESTORE BASE POLICIES (Read Only + Session Update)

-- A. Users see their own client's users
-- Uses get_current_cliente_id (Security Definer - Safe)
CREATE POLICY "Usuario ve usuarios de su cliente"
ON quipu_usuarios FOR SELECT
USING (
    cliente_id = get_current_cliente_id()
);

-- B. User can update their own session (Vital for Logout/Login)
CREATE POLICY "Usuario modifica sus propios datos"
ON quipu_usuarios FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- C. Superadmin Read Access
CREATE POLICY "Superadmin view all users"
ON quipu_usuarios FOR SELECT
USING (
    get_my_rol() = 'superadmin'
);
