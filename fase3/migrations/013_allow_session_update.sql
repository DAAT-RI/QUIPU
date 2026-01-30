-- Allow authenticated users to update ONLY their 'current_session_id' column
-- This prevents them from escalating privileges (changing role)

-- 1. Ensure RLS is enabled (already done)

-- 2. Create Policy for UPDATE
-- Note: Postgres column-level permissions are cleaner than triggers here.
-- We will GRANT UPDATE on specific columns and REVOKE UPDATE on the table level (default might be granted).

REVOKE UPDATE ON quipu_usuarios FROM authenticated;
GRANT UPDATE (current_session_id) ON quipu_usuarios TO authenticated;

DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;

CREATE POLICY "Usuario modifica sus propios datos"
ON quipu_usuarios FOR UPDATE
TO authenticated
USING (
    auth_user_id = auth.uid()
)
WITH CHECK (
    auth_user_id = auth.uid()
);
