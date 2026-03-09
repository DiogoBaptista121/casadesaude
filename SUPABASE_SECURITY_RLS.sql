-- =========================================================================
-- SCRIPT DE AUDITORIA DE SEGURANÇA E RLS (ROW LEVEL SECURITY) SUPABASE
-- =========================================================================
-- Alvo: Permissões baseadas na tabela `user_roles(user_id, role)`
-- Para correr no SQL Editor do Supabase.
-- =========================================================================

-- 1. Habilitar RLS em todas as tabelas Críticas
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios_mt ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- TABELA: user_roles
-- =========================================================================
-- Leitura aberta para que as policies o possam consultar,
-- mas a edição é estritamente reservada a admins.

DROP POLICY IF EXISTS "UserRoles - Lido por User ou Admins" ON user_roles;
DROP POLICY IF EXISTS "UserRoles - Apenas Admins Modificam" ON user_roles;
DROP POLICY IF EXISTS "UserRoles - Admins gerem tudo" ON user_roles;

-- Admins podem gerir tudo em user_roles
CREATE POLICY "UserRoles - Admins gerem tudo" 
ON user_roles FOR ALL 
USING (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Um utilizador pode ler o seu próprio role (evita recursão pesada e garante isolamento caso queiras)
-- Porém, para que as restrições nas outras tabelas funcionem de forma cruzada em visualizações globais,
-- por vezes é recomendável leitura livre (SELECT) na user_roles.
CREATE POLICY "UserRoles - Lido por todos autenticados" 
ON user_roles FOR SELECT 
USING ( auth.uid() IS NOT NULL );

-- =========================================================================
-- TABELA: consultas
-- =========================================================================
DROP POLICY IF EXISTS "Consultas - Admins podem tudo" ON consultas;
DROP POLICY IF EXISTS "Consultas - Staff pode Inserir/Ler/Atualizar" ON consultas;
DROP POLICY IF EXISTS "Consultas - Staff Update" ON consultas;
DROP POLICY IF EXISTS "Consultas - Staff Insert" ON consultas;
DROP POLICY IF EXISTS "Consultas - Viewers apenas Leitura" ON consultas;

-- Admins podem fazer tudo:
CREATE POLICY "Consultas - Admins podem tudo" 
ON consultas FOR ALL 
USING (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
)
WITH CHECK (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Staff ('medico', 'enfermeiro', 'staff') pode Ler, Inserir e Atualizar, mas NÃO pode Apagar (DELETE)
CREATE POLICY "Consultas - Staff pode Inserir/Ler/Atualizar" 
ON consultas FOR SELECT
USING (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('staff', 'medico', 'enfermeiro')
);

CREATE POLICY "Consultas - Staff Update" 
ON consultas FOR UPDATE 
USING (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('staff', 'medico', 'enfermeiro')
);

CREATE POLICY "Consultas - Staff Insert" 
ON consultas FOR INSERT 
WITH CHECK (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('staff', 'medico', 'enfermeiro')
);

-- Viewers apenas Leitura:
CREATE POLICY "Consultas - Viewers apenas Leitura" 
ON consultas FOR SELECT
USING (
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'viewer'
);


-- =========================================================================
-- TABELA: funcionarios_mt
-- =========================================================================
DROP POLICY IF EXISTS "MT - Admins podem tudo" ON funcionarios_mt;
DROP POLICY IF EXISTS "MT - Staff" ON funcionarios_mt;

CREATE POLICY "MT - Admins podem tudo" 
ON funcionarios_mt FOR ALL 
USING ( (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin' );

CREATE POLICY "MT - Staff" 
ON funcionarios_mt FOR SELECT 
USING ( (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('staff', 'medico', 'enfermeiro', 'viewer') );


-- =========================================================================
-- TABELA: profiles (Users)
-- =========================================================================
DROP POLICY IF EXISTS "Profiles - Admins gerem todos" ON profiles;
DROP POLICY IF EXISTS "Profiles - Ver todos para referências" ON profiles;
DROP POLICY IF EXISTS "Profiles - Atualizar apenas o seu próprio" ON profiles;

-- Admins podem fazer tudo:
CREATE POLICY "Profiles - Admins gerem todos" 
ON profiles FOR ALL 
USING ( (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin' );

-- Todos partilham a leitura (necessário para ver nomes em tabelas cruzadas)
CREATE POLICY "Profiles - Ver todos para referências" 
ON profiles FOR SELECT 
USING ( auth.uid() IS NOT NULL );

-- Um Utilizador Normal apenas pode Modificar (Update) a sua própria linha (O seu Nome, etc)
CREATE POLICY "Profiles - Atualizar apenas o seu próprio" 
ON profiles FOR UPDATE 
USING ( id = auth.uid() ) 
WITH CHECK ( id = auth.uid() );


-- =========================================================================
-- TABELA: configuracoes (inclui notificações e opções globais)
-- =========================================================================
DROP POLICY IF EXISTS "Configs - Global lido por todos" ON configuracoes;
DROP POLICY IF EXISTS "Configs - Lido por todos" ON configuracoes;
DROP POLICY IF EXISTS "Configs - Global modificado por Admins" ON configuracoes;
DROP POLICY IF EXISTS "Configs - User gere as suas próprias UPDATE" ON configuracoes;
DROP POLICY IF EXISTS "Configs - User gere as suas próprias INSERT" ON configuracoes;

-- Ler tudo (para que a app possa ler o "global" do Dashboard logo no arranque)
CREATE POLICY "Configs - Lido por todos" 
ON configuracoes FOR SELECT 
USING ( auth.uid() IS NOT NULL );

-- Apenas admins podem alterar as Definições Globais de sistema (ex: nome_clinica). Protege chaves sem notification_
CREATE POLICY "Configs - Global modificado por Admins" 
ON configuracoes FOR UPDATE 
USING ( 
  (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin' 
  AND (chave NOT LIKE 'notifications_%') 
);

-- Qualquer pessoa pode inserir ou alterar AS SUAS próprias notificações
CREATE POLICY "Configs - User gere as suas próprias UPDATE" 
ON configuracoes FOR UPDATE 
USING ( chave = 'notifications_' || auth.uid() );

CREATE POLICY "Configs - User gere as suas próprias INSERT" 
ON configuracoes FOR INSERT 
WITH CHECK ( chave = 'notifications_' || auth.uid() );
