# Estrutura SQL - Casa de Saúde Connect

Esta pasta contém a estrutura SQL completa do banco de dados, organizada em arquivos individuais por tabela.

## 📋 Ordem de Execução

Execute os arquivos **na ordem numérica** para respeitar as dependências:

1. **`00_enums.sql`** - Tipos enumerados (devem ser criados primeiro)
2. **`01_create_profiles.sql`** - Perfis dos utilizadores
3. **`02_create_user_roles.sql`** - Roles/permissões
4. **`03_create_servicos.sql`** - Catálogo de serviços
5. **`04_create_cartao_saude.sql`** - Aderentes/Pacientes
6. **`05_create_cartao_saude_numero_livre.sql`** - Gerador de números de cartão
7. **`06_create_consultas.sql`** - Consultas regulares
8. **`07_create_funcionarios_mt.sql`** - Funcionários (Medicina do Trabalho)
9. **`08_create_consultas_mt.sql`** - Consultas de Medicina do Trabalho
10. **`09_create_auditoria_logs.sql`** - Logs de auditoria
11. **`10_create_configuracoes.sql`** - Configurações do sistema

## 🔗 Diagrama de Relacionamentos

```
auth.users (Supabase Auth)
    ├─→ profiles (1:1)
    ├─→ user_roles (1:N)
    └─→ consultas.created_by (1:N)

servicos
    └─→ consultas (1:N)

cartao_saude
    └─→ consultas (1:N)

funcionarios_mt
    └─→ consultas_mt (1:N)

configuracoes (standalone)
auditoria_logs (standalone)
cartao_saude_numero_livre (standalone)
```

## 📊 Tabelas

### Tabelas Base (sem FK externas)
- **profiles** - Informação de perfil dos utilizadores
- **servicos** - Catálogo de serviços/especialidades
- **configuracoes** - Configurações sistema (key-value)
- **cartao_saude_numero_livre** - Contador de números de cartão

### Tabelas de Dados Principais
- **user_roles** - Roles dos utilizadores (admin/staff/viewer)
- **cartao_saude** - Aderentes/Pacientes
- **funcionarios_mt** - Funcionários para Medicina do Trabalho

### Tabelas de Marcações
- **consultas** - Consultas regulares (Casa de Saúde + Unidade Móvel)
- **consultas_mt** - Exames de Medicina do Trabalho

### Tabelas de Auditoria
- **auditoria_logs** - Histórico de ações no sistema

## 🔐 Row Level Security (RLS)

Todas as tabelas têm RLS ativado com políticas baseadas em roles:

- **Admin** - Acesso total (CRUD)
- **Staff** - Leitura e escrita (exceto eliminar em algumas tabelas)
- **Viewer** - Apenas leitura (SELECT)

## 🏷️ ENUMS

- **app_role**: `admin`, `staff`, `viewer`
- **consulta_status**: `agendada`, `confirmada`, `concluida`, `cancelada`, `falta`, `remarcada`
- **consulta_origem**: `casa_saude`, `unidade_movel`
- **estado_registo**: `ativo`, `inativo`

## 📝 Notas Importantes

1. **Funções Helper Necessárias**: Os arquivos assumem que as seguintes funções já existem:
   - `public.is_admin(uuid)` - Verifica se user é admin
   - `public.is_admin_or_staff(uuid)` - Verifica se user é admin ou staff
   - `public.has_role(uuid, app_role)` - Verifica se user tem role específico

2. **Triggers de Updated_at**: Cada tabela com `updated_at` precisa de um trigger para atualizar automaticamente

3. **Seed Data**: `servicos` tem dados iniciais (Psicologia, Neurologia, etc)

## 🚀 Como Usar

### Opção 1: Executar arquivo por arquivo no Supabase SQL Editor
```sql
-- Copiar e colar cada arquivo na ordem
```

### Opção 2: Criar arquivo único consolidado
```bash
cat 00_*.sql 01_*.sql 02_*.sql ... > complete_schema.sql
```

### Opção 3: Usar Supabase CLI
```bash
supabase db reset  # Reset local database
supabase db push   # Push para produção
```
