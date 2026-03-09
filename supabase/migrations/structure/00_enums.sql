-- =====================================================
-- ENUMS - Tipos Enumerados
-- =====================================================
-- Devem ser criados primeiro, pois são usados pelas tabelas

-- Tipo de role do utilizador no sistema
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- Status possíveis para consultas (regular e medicina do trabalho)
CREATE TYPE public.consulta_status AS ENUM (
    'agendada',    -- Consulta agendada/marcada
    'confirmada',  -- Paciente confirmou presença
    'concluida',   -- Consulta já realizada
    'cancelada',   -- Consulta cancelada
    'falta',       -- Paciente não compareceu
    'remarcada'    -- Consulta foi remarcada
);

-- Origem/Local da consulta
CREATE TYPE public.consulta_origem AS ENUM (
    'casa_saude',     -- Consulta na Casa de Saúde
    'unidade_movel'   -- Consulta na Unidade Móvel
);

-- Estado geral de registos (cartões, funcionários)
CREATE TYPE public.estado_registo AS ENUM (
    'ativo',    -- Registo ativo/válido
    'inativo'   -- Registo desativado/arquivado
);
