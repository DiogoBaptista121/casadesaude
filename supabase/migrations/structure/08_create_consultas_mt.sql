-- =====================================================
-- CONSULTAS MEDICINA DO TRABALHO TABLE
-- =====================================================
-- Armazena consultas/exames de Medicina do Trabalho
-- Relacionado: funcionarios_mt (N:1), auth.users (N:1)
-- Dependências: funcionarios_mt, ENUM consulta_status

CREATE TABLE public.consultas_mt (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relacionamento (Foreign Key)
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios_mt(id) ON DELETE RESTRICT,
    
    -- Informação da consulta MT
    tipo_exame TEXT DEFAULT 'periódico', -- admissão, periódico, ocasional
    data DATE NOT NULL,
    hora TIME NOT NULL,
    status consulta_status DEFAULT 'agendada',
    
    -- Observações e resultados
    notas TEXT,
    resultado TEXT,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON TABLE public.consultas_mt IS 'Consultas/Exames de Medicina do Trabalho';
COMMENT ON COLUMN public.consultas_mt.funcionario_id IS 'Referência ao funcionário';
COMMENT ON COLUMN public.consultas_mt.tipo_exame IS 'Tipo: admissão, periódico ou ocasional';
COMMENT ON COLUMN public.consultas_mt.data IS 'Data do exame';
COMMENT ON COLUMN public.consultas_mt.hora IS 'Hora do exame';
COMMENT ON COLUMN public.consultas_mt.status IS 'Estado atual do exame';
COMMENT ON COLUMN public.consultas_mt.resultado IS 'Resultado/conclusões do exame';
COMMENT ON COLUMN public.consultas_mt.created_by IS 'Utilizador que criou o registo';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_consultas_mt_data ON public.consultas_mt(data);
CREATE INDEX idx_consultas_mt_status ON public.consultas_mt(status);
CREATE INDEX idx_consultas_mt_funcionario ON public.consultas_mt(funcionario_id);
CREATE INDEX idx_consultas_mt_tipo_exame ON public.consultas_mt(tipo_exame);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.consultas_mt ENABLE ROW LEVEL SECURITY;

-- Staff e admin podem ver consultas MT
CREATE POLICY "Staff and admin can view consultas_mt"
    ON public.consultas_mt FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Viewers podem ver consultas MT (read-only)
CREATE POLICY "Viewers can view consultas_mt (read-only)"
    ON public.consultas_mt FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'viewer'));

-- Staff e admin podem inserir consultas MT
CREATE POLICY "Staff and admin can insert consultas_mt"
    ON public.consultas_mt FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff e admin podem atualizar consultas MT
CREATE POLICY "Staff and admin can update consultas_mt"
    ON public.consultas_mt FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Apenas admin pode apagar consultas MT
CREATE POLICY "Admin can delete consultas_mt"
    ON public.consultas_mt FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
