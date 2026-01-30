-- =====================================================
-- FASE 3: Multi-Tenant - Clientes y Usuarios
-- =====================================================

-- Clientes (gremios, empresas, consultoras, medios)
CREATE TABLE IF NOT EXISTS quipu_clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    tipo VARCHAR(50),                 -- 'gremio', 'empresa', 'consultora', 'medio'
    sector VARCHAR(100),              -- 'seguros', 'mineria', 'banca', 'salud'
    contacto_email VARCHAR(200),
    logo_url TEXT,
    plan VARCHAR(50) DEFAULT 'basico', -- 'basico', 'profesional', 'enterprise'
    max_candidatos INTEGER DEFAULT 15,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- Usuarios de cada cliente (múltiples usuarios por cliente)
CREATE TABLE IF NOT EXISTS quipu_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id INTEGER REFERENCES quipu_clientes(id) ON DELETE CASCADE,
    email VARCHAR(200) NOT NULL UNIQUE,
    nombre VARCHAR(200),
    rol VARCHAR(50) DEFAULT 'viewer', -- 'admin', 'analyst', 'viewer'
    auth_user_id UUID UNIQUE,         -- FK a Supabase Auth (auth.users.id)
    current_session_id UUID,          -- Para sesiones exclusivas (un dispositivo a la vez)
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidatos que sigue cada cliente
CREATE TABLE IF NOT EXISTS quipu_cliente_candidatos (
    cliente_id INTEGER REFERENCES quipu_clientes(id) ON DELETE CASCADE,
    candidato_id INTEGER REFERENCES quipu_candidatos(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES quipu_usuarios(id),
    PRIMARY KEY (cliente_id, candidato_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_cliente ON quipu_usuarios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_auth ON quipu_usuarios(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_cliente_candidatos_cliente ON quipu_cliente_candidatos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_candidatos_candidato ON quipu_cliente_candidatos(candidato_id);

-- Función helper: obtener cliente_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_cliente_id()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT cliente_id FROM quipu_usuarios WHERE auth_user_id = auth.uid()
$$;
