-- DIAGNOSTIC ROLLBACK
-- Remove the new policies causing issues to verify if system unblocks.
-- This will temporarily disable "Create User" functionality but should restore Dashboard access.

DROP POLICY IF EXISTS "Superadmin manage all users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Client Admin manage their users" ON quipu_usuarios;
DROP POLICY IF EXISTS "Usuario modifica sus propios datos" ON quipu_usuarios;

-- Restore simple safe reading policy if missing (from 007)
-- (We don't drop existing ones, just ensuring we are back to base state)
