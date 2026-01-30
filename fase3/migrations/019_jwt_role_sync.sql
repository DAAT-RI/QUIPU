-- JWT CLAIM SYNC & RLS FIX
-- The "Deep" Solution: Stop querying tables in RLS. Use JWT metadata.
-- 1. Create Sync Function
-- 2. Create Trigger
-- 3. Backfill Data
-- 4. Rewrite Policies to read JWT
-- 5. Disable Force RLS

-- A. SYNC FUNCTION (Security Definer)
CREATE OR REPLACE FUNCTION public.sync_user_role_to_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the auth.users table with role and client_id
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
        'rol', NEW.rol, 
        'cliente_id', NEW.cliente_id
    )
  WHERE id = NEW.auth_user_id;
  
  RETURN NEW;
END;
$$;

-- B. TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_updated ON public.quipu_usuarios;
CREATE TRIGGER on_auth_user_updated
AFTER INSERT OR UPDATE ON public.quipu_usuarios
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_jwt();

-- C. BACKFILL EXISTING USERS
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT * FROM public.quipu_usuarios LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
          'rol', u.rol, 
          'cliente_id', u.cliente_id
      )
    WHERE id = u.auth_user_id;
  END LOOP;
END;
$$;

-- D. DISABLE FORCE RLS (To prevent owner recursion just in case)
ALTER TABLE public.quipu_usuarios NO FORCE ROW LEVEL SECURITY;

-- E. NEW RLS POLICIES (Using JWT)

-- Helper to check JWT role
-- (Usage: auth.jwt() -> 'app_metadata' ->> 'rol')

DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario ve usuarios de su cliente" ON quipu_usuarios;

-- 1. Superadmin (Reads JWT)
CREATE POLICY "Superadmin manage all users"
ON quipu_usuarios FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'superadmin'
);

-- 2. Client Admin (Reads JWT)
CREATE POLICY "Client Admin manage their users"
ON quipu_usuarios FOR ALL
USING (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  AND
  ((auth.jwt() -> 'app_metadata' ->> 'cliente_id')::int) = cliente_id
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin'
  AND
  ((auth.jwt() -> 'app_metadata' ->> 'cliente_id')::int) = cliente_id
);

-- 3. Self (Standard)
CREATE POLICY "Usuario ve/modifica sus propios datos"
ON quipu_usuarios FOR ALL
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- 4. Global Read for Client Peers (Replacing old policy)
CREATE POLICY "Users see their client peers"
ON quipu_usuarios FOR SELECT
USING (
   cliente_id = ((auth.jwt() -> 'app_metadata' ->> 'cliente_id')::int)
);
