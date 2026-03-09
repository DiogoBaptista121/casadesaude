-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Armazena informações de perfil dos utilizadores
-- Relacionado: auth.users (1:1)
-- Dependências: Nenhuma (tabela base)

CREATE TABLE public.profiles (
    -- Chave primária: ID do utilizador (mesmo ID do auth.users)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informação básica
    email TEXT NOT NULL,
    nome TEXT,
    avatar_url TEXT,
    
    -- Estado do utilizador
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.profiles IS 'Perfil estendido dos utilizadores do sistema';
COMMENT ON COLUMN public.profiles.id IS 'UUID do utilizador (mesmo que auth.users)';
COMMENT ON COLUMN public.profiles.email IS 'Email do utilizador (copiado de auth.users)';
COMMENT ON COLUMN public.profiles.nome IS 'Nome completo do utilizador';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da foto de perfil';
COMMENT ON COLUMN public.profiles.ativo IS 'Se o utilizador está ativo no sistema';

-- =====================================================
-- INDEXES
-- =====================================================
-- Não há indexes adicionais necessários nesta tabela
-- (a PK já cria index no id)

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Utilizadores podem ver o próprio perfil
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Utilizadores podem atualizar o próprio perfil
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admins podem atualizar todos os perfis
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()));
