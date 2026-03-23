-- ============================================================
-- SGC SETEG - ÍNDICES DE PERFORMANCE
-- Execute no Supabase SQL Editor
-- ============================================================

-- Índice para buscar versões por solicitacao_id (usado em todo carregamento)
CREATE INDEX IF NOT EXISTS idx_versoes_solicitacao_id_versao
  ON public.solicitacao_versoes(solicitacao_id, numero_versao DESC);

-- Índice para ajustes pendentes (usado no contador e modal)
CREATE INDEX IF NOT EXISTS idx_ajustes_status
  ON public.ajustes(status);

-- Índice para ajustes por solicitacao
CREATE INDEX IF NOT EXISTS idx_ajustes_solicitacao_status
  ON public.ajustes(solicitacao_id, status);

-- Índice para solicitações não deletadas (filtro mais comum)
CREATE INDEX IF NOT EXISTS idx_solicitacoes_deletado_created
  ON public.solicitacoes(deletado_em, created_at DESC);
