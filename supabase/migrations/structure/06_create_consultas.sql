-- =====================================================
-- CONSULTAS TABLE
-- =====================================================
-- Armazena as marcações/consultas regulares
-- Relacionado: cartao_saude (N:1), servicos (N:1), auth.users (N:1)
-- Dependências: cartao_saude, servicos, ENUMS (consulta_origem, consulta_status)

CREATE TABLE public.consultas (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamentos (Foreign Keys)
    cartao_saude_id UUID NOT NULL REFERENCES public.cartao_saude(id) ON DELETE RESTRICT,
    servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
    
    -- Informação da consulta
    origem consulta_origem NOT NULL,  -- casa_saude ou unidade_movel
    data DATE NOT NULL,
    hora TIME NOT NULL,
    status consulta_status DEFAULT 'agendada',
    
    -- Observações
    notas TEXT,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.consultas IS 'Marcações/Consultas regulares (não MT)';
COMMENT ON COLUMN public.consultas.cartao_saude_id IS 'Referência ao aderente/paciente';
COMMENT ON COLUMN public.consultas.servico_id IS 'Referência ao serviço/especialidade';
COMMENT ON COLUMN public.consultas.origem IS 'Local: casa_saude ou unidade_movel';
COMMENT ON COLUMN public.consultas.data IS 'Data da consulta';
COMMENT ON COLUMN public.consultas.hora IS 'Hora da consulta';
COMMENT ON COLUMN public.consultas.status IS 'Estado atual da consulta';
COMMENT ON COLUMN public.consultas.created_by IS 'Utilizador que criou a marcação';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_consultas_data ON public.consultas(data);
CREATE INDEX idx_consultas_status ON public.consultas(status);
CREATE INDEX idx_consultas_origem ON public.consultas(origem);
CREATE INDEX idx_consultas_cartao ON public.consultas(cartao_saude_id);
CREATE INDEX idx_consultas_servico ON public.consultas(servico_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.consultas ENABLE ROW LEVEL SECURITY;

-- Staff e admin podem ver consultas
CREATE POLICY "Staff and admin can view consultas"
    ON public.consultas FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Viewers podem ver consultas (read-only)
CREATE POLICY "Viewers can view consultas (read-only)"
    ON public.consultas FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'viewer'));

-- Staff e admin podem inserir consultas
CREATE POLICY "Staff and admin can insert consultas"
    ON public.consultas FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff e admin podem atualizar consultas
CREATE POLICY "Staff and admin can update consultas"
    ON public.consultas FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Apenas admin pode apagar consultas
CREATE POLICY "Admin can delete consultas"
    ON public.consultas FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
