-- =====================================================
-- AUDITORIA LOGS TABLE
-- =====================================================
-- Armazena logs de auditoria de ações no sistema
-- Relacionado: auth.users (N:1)
-- Dependências: Nenhuma (tabela de auditoria)

CREATE TABLE public.auditoria_logs (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quem fez a ação
    user_id UUID REFERENCES auth.users(id),
    
    -- Detalhes da ação
    acao TEXT NOT NULL,                 -- Tipo de ação (CREATE, UPDATE, DELETE, etc)
    entidade TEXT NOT NULL,             -- Tabela/entidade afetada
    entidade_id UUID,                   -- ID do registo afetado
    
    -- Dados before/after
    dados_anteriores JSONB,             -- Estado antes da alteração
    dados_novos JSONB,                  -- Estado depois da alteração
    
    -- Informação adicional
    ip_address TEXT,                    -- IP de onde veio a ação
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.auditoria_logs IS 'Logs de auditoria de ações no sistema';
COMMENT ON COLUMN public.auditoria_logs.user_id IS 'Utilizador que executou a ação';
COMMENT ON COLUMN public.auditoria_logs.acao IS 'Tipo de ação: CREATE, UPDATE, DELETE, etc';
COMMENT ON COLUMN public.auditoria_logs.entidade IS 'Nome da tabela/entidade afetada';
COMMENT ON COLUMN public.auditoria_logs.entidade_id IS 'ID do registo afetado';
COMMENT ON COLUMN public.auditoria_logs.dados_anteriores IS 'Snapshot dos dados antes da ação';
COMMENT ON COLUMN public.auditoria_logs.dados_novos IS 'Snapshot dos dados após a ação';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_auditoria_logs_user_id ON public.auditoria_logs(user_id);
CREATE INDEX idx_auditoria_logs_entidade ON public.auditoria_logs(entidade);
CREATE INDEX idx_auditoria_logs_created_at ON public.auditoria_logs(created_at DESC);
CREATE INDEX idx_auditoria_logs_acao ON public.auditoria_logs(acao);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admin pode ver logs de auditoria
CREATE POLICY "Admin can view auditoria_logs"
    ON public.auditoria_logs FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

-- Utilizadores autenticados podem inserir logs (sistema)
CREATE POLICY "Authenticated can insert auditoria_logs"
    ON public.auditoria_logs FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
