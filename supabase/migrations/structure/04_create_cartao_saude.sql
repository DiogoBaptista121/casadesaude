-- =====================================================
-- CARTÃO DE SAÚDE TABLE
-- =====================================================
-- Armazena informação dos aderentes (pacientes)
-- Relacionado: consultas (1:N)
-- Dependências: Requer ENUM estado_registo

CREATE TABLE public.cartao_saude (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação única
    numero_cartao TEXT UNIQUE NOT NULL,
    
    -- Dados pessoais
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    nif TEXT,
    data_nascimento DATE,
    morada TEXT,
    
    -- Estado do cartão
    estado estado_registo DEFAULT 'ativo',
    
    -- Observações
    notas TEXT,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.cartao_saude IS 'Registo de aderentes/pacientes da Casa de Saúde';
COMMENT ON COLUMN public.cartao_saude.numero_cartao IS 'Número único do cartão de saúde';
COMMENT ON COLUMN public.cartao_saude.nome IS 'Nome completo do aderente';
COMMENT ON COLUMN public.cartao_saude.estado IS 'Estado do cartão: ativo ou inativo';
COMMENT ON COLUMN public.cartao_saude.notas IS 'Observações/notas sobre o aderente';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_cartao_saude_numero ON public.cartao_saude(numero_cartao);
CREATE INDEX idx_cartao_saude_nome ON public.cartao_saude(nome);
CREATE INDEX idx_cartao_saude_estado ON public.cartao_saude(estado);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.cartao_saude ENABLE ROW LEVEL SECURITY;

-- Staff e admin podem ver cartões
CREATE POLICY "Staff and admin can view cartao_saude"
    ON public.cartao_saude FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Viewers podem ver cartões (read-only)
CREATE POLICY "Viewers can view cartao_saude (read-only)"
    ON public.cartao_saude FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'viewer'));

-- Staff e admin podem inserir cartões
CREATE POLICY "Staff and admin can insert cartao_saude"
    ON public.cartao_saude FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff e admin podem atualizar cartões
CREATE POLICY "Staff and admin can update cartao_saude"
    ON public.cartao_saude FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Apenas admin pode apagar cartões
CREATE POLICY "Admin can delete cartao_saude"
    ON public.cartao_saude FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
