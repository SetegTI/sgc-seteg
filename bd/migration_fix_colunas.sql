-- ============================================================
-- SGC SETEG - MIGRAÇÃO: Correção de colunas faltantes
-- Execute este script no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar colunas faltantes na tabela solicitacoes
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS tecnico_responsavel TEXT DEFAULT 'PENDENTE',
  ADD COLUMN IF NOT EXISTS data_conclusao_prevista DATE,
  ADD COLUMN IF NOT EXISTS data_conclusao_real DATE;

-- 2. Sincronizar dados já existentes (pegar do JSON das versões)
UPDATE public.solicitacoes s
SET
  tecnico_responsavel = COALESCE(
    (
      SELECT v.dados->>'tecnicoResponsavel'
      FROM public.solicitacao_versoes v
      WHERE v.solicitacao_id = s.id
      ORDER BY v.numero_versao DESC
      LIMIT 1
    ),
    'PENDENTE'
  ),
  data_conclusao_prevista = (
    SELECT (v.dados->>'dataConclusaoPrevista')::DATE
    FROM public.solicitacao_versoes v
    WHERE v.solicitacao_id = s.id
      AND v.dados->>'dataConclusaoPrevista' IS NOT NULL
      AND v.dados->>'dataConclusaoPrevista' != ''
    ORDER BY v.numero_versao DESC
    LIMIT 1
  ),
  data_conclusao_real = (
    SELECT (v.dados->>'dataConclusaoReal')::DATE
    FROM public.solicitacao_versoes v
    WHERE v.solicitacao_id = s.id
      AND v.dados->>'dataConclusaoReal' IS NOT NULL
      AND v.dados->>'dataConclusaoReal' != ''
    ORDER BY v.numero_versao DESC
    LIMIT 1
  )
WHERE s.deletado_em IS NULL;

-- 3. Verificar resultado
SELECT
  id,
  cliente,
  status,
  tecnico_responsavel,
  data_conclusao_prevista,
  data_conclusao_real
FROM public.solicitacoes
WHERE deletado_em IS NULL
ORDER BY id;
