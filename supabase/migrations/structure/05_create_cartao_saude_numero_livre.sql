-- =====================================================
-- CARTÃO DE SAÚDE NÚMERO LIVRE TABLE
-- =====================================================
-- Armazena apenas o número do próximo cartão disponível
-- Usada para gerar números sequenciais de cartões
-- Dependências: Nenhuma (tabela auxiliar standalone)

CREATE TABLE public.cartao_saude_numero_livre (
    -- Identificador único (sempre haverá apenas 1 linha)
    id INTEGER PRIMARY KEY DEFAULT 1,
    
    -- Próximo número de cartão disponível
    proximo_numero INTEGER NOT NULL DEFAULT 1,
    
    -- Constraint para garantir que só há uma linha
    CONSTRAINT single_row CHECK (id = 1)
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.cartao_saude_numero_livre IS 'Controla o próximo número de cartão de saúde disponível';
COMMENT ON COLUMN public.cartao_saude_numero_livre.proximo_numero IS 'Próximo número sequencial a ser usado';

-- =====================================================
-- SEED DATA
-- =====================================================
-- Inserir a única linha com valor inicial
INSERT INTO public.cartao_saude_numero_livre (id, proximo_numero) 
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.cartao_saude_numero_livre ENABLE ROW LEVEL SECURITY;

-- Staff e admin podem ver o próximo número
CREATE POLICY "Staff and admin can view numero_livre"
    ON public.cartao_saude_numero_livre FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Staff e admin podem atualizar (incrementar) o número
CREATE POLICY "Staff and admin can update numero_livre"
    ON public.cartao_saude_numero_livre FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));
