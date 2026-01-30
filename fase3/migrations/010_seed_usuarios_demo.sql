-- =====================================================
-- FASE 3: Vincular Usuarios Demo a Clientes
-- Ejecutar DESPUÉS de crear usuarios en Supabase Auth
-- =====================================================

-- IMPORTANTE: Reemplaza [UUID_APESEG] y [UUID_NEWLINK] con los UUIDs
-- que obtienes de Supabase Auth después de crear los usuarios

-- Usuario APESEG
INSERT INTO quipu_usuarios (cliente_id, email, nombre, rol, auth_user_id)
VALUES (
    (SELECT id FROM quipu_clientes WHERE nombre = 'APESEG'),
    'alejandro@daat.cloud',
    'Alejandro (APESEG Demo)',
    'admin',
    'c1312c18-5c1c-4c53-b29f-5fc6f364b649'
);

-- Usuario NEWLINK
INSERT INTO quipu_usuarios (cliente_id, email, nombre, rol, auth_user_id)
VALUES (
    (SELECT id FROM quipu_clientes WHERE nombre = 'NEWLINK'),
    'alexander@daat.cloud',
    'Alexander (NEWLINK Demo)',
    'admin',
    'f7b3c107-d65b-414b-8d44-aa9b8e28fff3'
);

-- Verificar usuarios creados
-- SELECT u.email, u.nombre, u.rol, c.nombre as cliente
-- FROM quipu_usuarios u
-- JOIN quipu_clientes c ON u.cliente_id = c.id;
