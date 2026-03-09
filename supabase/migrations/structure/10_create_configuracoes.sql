-- =====================================================
-- CONFIGURAÇÕES TABLE
-- =====================================================
-- Armazena configurações do sistema em formato chave-valor
-- Relacionado: Nenhuma
-- Dependências: Nenhuma (tabela standalone)

CREATE TABLE public.configuracoes (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Chave única da configuração
    chave TEXT UNIQUE NOT NULL,
    
    -- Valor em formato JSON (flexível)
    valor JSONB,
    
    -- Descrição da configuração
    descricao TEXT,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.configuracoes IS 'Configurações gerais do sistema';
COMMENT ON COLUMN public.configuracoes.chave IS 'Chave única da configuração (ex: horario_funcionamento)';
COMMENT ON COLUMN public.configuracoes.valor IS 'Valor em formato JSON para flexibilidade';
COMMENT ON COLUMN public.configuracoes.descricao IS 'Descrição do que a configuração controla';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_configuracoes_chave ON public.configuracoes(chave);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Todos os utilizadores autenticados podem ver configurações
CREATE POLICY "Anyone authenticated can view configuracoes"
    ON public.configuracoes FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admin pode gerir configurações
CREATE POLICY "Admin can manage configuracoes"
    ON public.configuracoes FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
