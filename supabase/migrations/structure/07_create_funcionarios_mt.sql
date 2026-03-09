-- =====================================================
-- FUNCIONÁRIOS MEDICINA DO TRABALHO TABLE
-- =====================================================
-- Armazena informação dos funcionários (para Medicina do Trabalho)
-- Relacionado: consultas_mt (1:N)
-- Dependências: Requer ENUM estado_registo

CREATE TABLE public.funcionarios_mt (
    -- Chave primária
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação única
    numero_funcionario TEXT UNIQUE NOT NULL,
    
    -- Dados pessoais
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    
    -- Informação laboral
    departamento TEXT,
    posicao TEXT,
    
    -- Estado do funcionário
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
COMMENT ON TABLE public.funcionarios_mt IS 'Funcionários para Medicina do Trabalho';
COMMENT ON COLUMN public.funcionarios_mt.numero_funcionario IS 'Número único do funcionário';
COMMENT ON COLUMN public.funcionarios_mt.nome IS 'Nome completo do funcionário';
COMMENT ON COLUMN public.funcionarios_mt.departamento IS 'Departamento/setor onde trabalha';
COMMENT ON COLUMN public.funcionarios_mt.posicao IS 'Cargo/função do funcionário';
COMMENT ON COLUMN public.funcionarios_mt.estado IS 'Estado: ativo ou inativo';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_funcionarios_mt_numero ON public.funcionarios_mt(numero_funcionario);
CREATE INDEX idx_funcionarios_mt_nome ON public.funcionarios_mt(nome);
CREATE INDEX idx_funcionarios_mt_estado ON public.funcionarios_mt(estado);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.funcionarios_mt ENABLE ROW LEVEL SECURITY;

-- Staff e admin podem ver funcionários
CREATE POLICY "Staff and admin can view funcionarios_mt"
    ON public.funcionarios_mt FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Viewers podem ver funcionários (read-only)
CREATE POLICY "Viewers can view funcionarios_mt (read-only)"
    ON public.funcionarios_mt FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'viewer'));

-- Staff e admin podem inserir funcionários
CREATE POLICY "Staff and admin can insert funcionarios_mt"
    ON public.funcionarios_mt FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff e admin podem atualizar funcionários
CREATE POLICY "Staff and admin can update funcionarios_mt"
    ON public.funcionarios_mt FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_staff(auth.uid()));

-- Apenas admin pode apagar funcionários
CREATE POLICY "Admin can delete funcionarios_mt"
    ON public.funcionarios_mt FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
