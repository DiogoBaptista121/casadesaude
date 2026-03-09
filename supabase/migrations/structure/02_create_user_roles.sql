-- =====================================================
-- USER ROLES TABLE
-- =====================================================
-- Armazena os roles (permissões) dos utilizadores
-- Relacionado: auth.users (N:1) - um user pode ter um role
-- Dependências: Requer ENUM app_role

CREATE TABLE public.user_roles (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referência ao utilizador
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Role atribuído (admin, staff, viewer)
    role app_role NOT NULL DEFAULT 'staff',
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garante que um user não tem roles duplicados
    UNIQUE (user_id, role)
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.user_roles IS 'Roles/permissões dos utilizadores';
COMMENT ON COLUMN public.user_roles.user_id IS 'Referência ao utilizador';
COMMENT ON COLUMN public.user_roles.role IS 'Role atribuído: admin, staff ou viewer';

-- =====================================================
-- INDEXES
-- =====================================================
-- Index na coluna user_id para lookups rápidos
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Utilizadores podem ver o próprio role
CREATE POLICY "Users can view own role"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Admins podem ver todos os roles
CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Apenas admins podem gerir roles
CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
