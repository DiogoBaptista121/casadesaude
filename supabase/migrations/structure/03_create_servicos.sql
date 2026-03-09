-- =====================================================
-- SERVIÇOS TABLE
-- =====================================================
-- Catálogo de serviços/especialidades oferecidos
-- Relacionado: consultas (1:N)
-- Dependências: Nenhuma (tabela de referência)

CREATE TABLE public.servicos (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Informação do serviço
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    
    -- Configurações
    categoria TEXT DEFAULT 'ambos', -- casa_saude, unidade_movel, ambos
    cor TEXT DEFAULT '#0d9488',     -- Cor para exibição no calendário (hex)
    duracao_minutos INTEGER DEFAULT 30,
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.servicos IS 'Catálogo de serviços/especialidades médicas';
COMMENT ON COLUMN public.servicos.nome IS 'Nome do serviço (ex: Psicologia, Neurologia)';
COMMENT ON COLUMN public.servicos.categoria IS 'Onde o serviço está disponível: casa_saude, unidade_movel ou ambos';
COMMENT ON COLUMN public.servicos.cor IS 'Cor em formato hexadecimal para calendário';
COMMENT ON COLUMN public.servicos.duracao_minutos IS 'Duração padrão da consulta em minutos';
COMMENT ON COLUMN public.servicos.ativo IS 'Se o serviço está ativo/disponível';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_servicos_nome ON public.servicos(nome);
CREATE INDEX idx_servicos_ativo ON public.servicos(ativo);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

-- Todos os utilizadores autenticados podem ver serviços
CREATE POLICY "Anyone authenticated can view servicos"
    ON public.servicos FOR SELECT
    TO authenticated
    USING (true);

-- Apenas admins podem gerir serviços
CREATE POLICY "Admin can manage servicos"
    ON public.servicos FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
