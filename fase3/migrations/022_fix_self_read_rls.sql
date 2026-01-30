-- FIX: Allow users to read their OWN record without recursive RLS functions
-- This solves the chicken-and-egg problem where:
-- 1. User needs to read quipu_usuarios to know their role/cliente_id
-- 2. RLS policies use get_my_rol()/get_current_cliente_id() which query quipu_usuarios
-- 3. This creates infinite recursion or silent failures

-- Add policy: User can ALWAYS read their own record by auth_user_id
CREATE POLICY "Usuario lee su propio registro"
ON quipu_usuarios FOR SELECT
USING (auth_user_id = auth.uid());
