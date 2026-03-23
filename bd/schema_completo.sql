-- ============================================================
-- SGC SETEG - SCHEMA COMPLETO DAS TABELAS
-- Referência de todas as tabelas e colunas do sistema
-- ============================================================

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  codigo_acesso TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('gestor', 'tecnico')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: solicitacoes
-- Armazena o cabeçalho de cada solicitação cartográfica.
-- Campos que mudam com frequência ficam aqui como colunas reais
-- para garantir que nunca se percam.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitacoes (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente                 TEXT NOT NULL,
  empreendimento          TEXT,
  status                  TEXT NOT NULL DEFAULT 'fila'
                            CHECK (status IN ('fila','em_andamento','ajustes_pendentes','concluido')),
  tecnico_responsavel     TEXT DEFAULT 'PENDENTE',   -- coluna real, não só no JSON
  data_conclusao_prevista DATE,                       -- coluna real
  data_conclusao_real     DATE,                       -- coluna real
  criado_por              UUID REFERENCES public.usuarios(id),
  deletado_em             TIMESTAMPTZ,               -- soft delete
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: solicitacao_versoes
-- Armazena o snapshot completo de cada versão da solicitação.
-- O campo "dados" (JSONB) guarda todos os campos do formulário.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.solicitacao_versoes (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitacao_id  BIGINT NOT NULL REFERENCES public.solicitacoes(id),
  numero_versao   INT NOT NULL CHECK (numero_versao > 0),
  dados           JSONB NOT NULL,
  -- Campos do JSONB (documentação):
  -- solicitante          TEXT
  -- cliente              TEXT
  -- nomeEstudo           TEXT
  -- empreendimento       TEXT
  -- localidade           TEXT
  -- municipio            TEXT
  -- tipoMapa             TEXT  (TOPOGRAFICO, GEOLOGICO, PEDOLOGICO, HIDROGRAFICO,
  --                             VEGETACAO, FAUNA, FLORA, PLANTA_GEORREFERENCIADA,
  --                             USO_SOLO, GEOMORFOLOGICO, LOCALIZACAO, OUTROS)
  -- nomeTipoMapa         TEXT  (quando tipoMapa = OUTROS)
  -- finalidade           TEXT  (LICENCIAMENTO, ESTUDO_IMPACTO, PRE_CAMPO,
  --                             POS_CAMPO, PLANEJAMENTO, OUTROS)
  -- artNecessaria        TEXT  ('sim' | 'nao')
  -- artResponsavel       TEXT
  -- diretorioArquivos    TEXT
  -- diretorioSalvamento  TEXT
  -- observacoes          TEXT
  -- dataSolicitacao      TEXT  (YYYY-MM-DD)
  -- dataEntrega          TEXT  (YYYY-MM-DD)
  -- dataConclusaoPrevista TEXT (YYYY-MM-DD)
  -- dataConclusaoReal    TEXT  (YYYY-MM-DD)
  -- tecnicoResponsavel   TEXT
  -- status               TEXT
  -- produtos             JSONB { mapa, croqui, shapefile, kml }
  -- elementos            JSONB { localizacao, acessoLocal, acessoRegional,
  --                               areaAmostral, outros, outrosTexto }
  tipo            TEXT NOT NULL CHECK (tipo IN ('original', 'ajuste')),
  criado_por      UUID REFERENCES public.usuarios(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solicitacao_id, numero_versao)
);

-- ============================================================
-- TABELA: ajustes
-- Registra cada pedido de ajuste feito em uma solicitação.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ajustes (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  solicitacao_id       BIGINT NOT NULL REFERENCES public.solicitacoes(id),
  versao_origem        INT NOT NULL,
  descricao            TEXT,
  status               TEXT NOT NULL DEFAULT 'aguardando_aprovacao'
                         CHECK (status IN ('aguardando_aprovacao','aprovado','reprovado')),
  tecnico_responsavel  TEXT,
  prazo_final          DATE,
  dados                JSONB,
  -- Campos do JSONB (documentação):
  -- tipoAjuste           TEXT  (CORRECAO, ADICAO, REMOCAO, ATUALIZACAO, OUTROS)
  -- observacoes          TEXT
  -- diretorioReferencia  TEXT
  -- diretorioSalvamento  TEXT
  -- prazoFinal           TEXT  (YYYY-MM-DD)
  -- solicitadoPor        TEXT
  -- dataSolicitacao      TEXT  (ISO)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABELA: system_logs
-- Auditoria de todas as ações do sistema.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  acao        TEXT NOT NULL,
  -- Ações registradas: criar_solicitacao, excluir_solicitacao,
  --                    alterar_status, aprovar_ajuste, teste_log
  entidade    TEXT NOT NULL,
  entidade_id BIGINT,
  dados       JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status         ON public.solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_tecnico        ON public.solicitacoes(tecnico_responsavel);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_deletado       ON public.solicitacoes(deletado_em);
CREATE INDEX IF NOT EXISTS idx_versoes_solicitacao         ON public.solicitacao_versoes(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_solicitacao         ON public.ajustes(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_status              ON public.ajustes(status);
CREATE INDEX IF NOT EXISTS idx_logs_entidade               ON public.system_logs(entidade, entidade_id);
