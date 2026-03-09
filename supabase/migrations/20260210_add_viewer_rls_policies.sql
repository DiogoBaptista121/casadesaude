-- =====================================================
-- ADICIONAR POLÍTICAS RLS PARA VIEWERS
-- Permite que utilizadores "viewer" vejam dados (READ-ONLY)
-- mas mantém bloqueio de criação/edição/remoção
-- =====================================================

-- CONSULTAS: Adicionar política SELECT para viewers
CREATE POLICY "Viewers can view consultas (read-only)"
    ON public.consultas FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'viewer')
    );

-- CARTAO_SAUDE: Adicionar política SELECT para viewers
CREATE POLICY "Viewers can view cartao_saude (read-only)"
    ON public.cartao_saude FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'viewer')
    );

-- FUNCIONARIOS_MT: Adicionar política SELECT para viewers
CREATE POLICY "Viewers can view funcionarios_mt (read-only)"
    ON public.funcionarios_mt FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'viewer')
    );

-- CONSULTAS_MT: Adicionar política SELECT para viewers (para ver no calendário)
CREATE POLICY "Viewers can view consultas_mt (read-only)"
    ON public.consultas_mt FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'viewer')
    );

-- NOTA: Viewers já têm acesso a servicos (linha 359-362 do schema principal)
-- NOTA: Viewers NÃO têm acesso a INSERT, UPDATE, DELETE - apenas SELECT (visualização)
