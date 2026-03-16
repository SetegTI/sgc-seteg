-- ============================================================
-- MIGRAÇÃO: Firebase → Supabase
-- SGC SETEG | Gerado em: 2026-03-16
-- ============================================================
-- INSTRUÇÕES:
-- 1. Execute no SQL Editor do Supabase
-- 2. Leia os comentários antes de executar cada bloco
-- 3. Execute os blocos em ordem
-- ============================================================

-- ============================================================
-- BLOCO 1: Soft delete nos dados de teste existentes
-- (Preserva os registros, apenas marca como deletados)
-- ============================================================
UPDATE solicitacoes
SET deletado_em = NOW()
WHERE deletado_em IS NULL
  AND id != 2; -- Preservar o #2 que já estava importado corretamente

-- ============================================================
-- BLOCO 2: Inserir solicitações com IDs originais do Firebase
-- ON CONFLICT (id) DO UPDATE garante que sobrepõe se já existir
-- ============================================================

INSERT INTO solicitacoes (id, cliente, empreendimento, status, criado_por, created_at, deletado_em)
VALUES
  (3,  ' #0006-6-2025',                       '',                                    'concluido',         NULL, '2026-03-11T18:38:20.988Z', NULL),
  (5,  'AUREN | #0223-2-2025',               'Usinas Hidrelétricas',                'em_andamento',      NULL, '2026-03-12T21:16:41.057Z', NULL),
  (6,  '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'ajustes_pendentes', NULL, '2026-03-13T14:56:41.339Z', NULL),
  (7,  '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'ajustes_pendentes', NULL, '2026-03-13T15:19:48.875Z', NULL),
  (8,  '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'em_andamento',      NULL, '2026-03-13T15:25:14.445Z', NULL),
  (9,  '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'fila',              NULL, '2026-03-13T15:37:16.162Z', NULL),
  (10, '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'fila',              NULL, '2026-03-13T15:41:51.274Z', NULL),
  (11, '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'fila',              NULL, '2026-03-13T15:48:22.953Z', NULL),
  (12, '#0221-3-2025',                        'Complexo Eólico Serra da Palmeira',   'fila',              NULL, '2026-03-13T15:51:44.793Z', NULL)
ON CONFLICT (id) DO UPDATE SET
  cliente       = EXCLUDED.cliente,
  empreendimento = EXCLUDED.empreendimento,
  status        = EXCLUDED.status,
  criado_por    = EXCLUDED.criado_por,
  created_at    = EXCLUDED.created_at,
  deletado_em   = NULL; -- Garante que o registro fica visível (não deletado)

-- ============================================================
-- BLOCO 3: Inserir versões das solicitações
-- ON CONFLICT garante que sobrepõe se a versão já existir
-- (requer constraint UNIQUE em solicitacao_id + numero_versao)
-- ============================================================

-- Limpar versões existentes dos IDs que vamos importar
DELETE FROM solicitacao_versoes WHERE solicitacao_id IN (3,5,6,7,8,9,10,11,12);

-- Versão da solicitação #3
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  3, 1, 'original', NULL,
  '{
    "id": 3,
    "solicitante": "Tiago Soares",
    "solicitadoPor": "Tiago Soares",
    "cliente": " #0006-6-2025",
    "nomeEstudo": "PRAD - Barreiro Tabatinga",
    "empreendimento": "",
    "localidade": "MARANGUAPE",
    "municipio": "",
    "tipoMapa": "FLORA",
    "nomeTipoMapa": "",
    "finalidade": "OUTROS",
    "observacoes": "Fazer croqui das áreas evidenciando os nucleos de prad, com área aproximada por núcleo e quantidade total de nucleos. Além disso, favor disponibilizar planilha com coordenada geografica central dos núcleos.",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-11",
    "dataEntrega": "2026-03-13",
    "dataConclusaoPrevista": "2026-03-13",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0006-6-2025/Shared%20Documents/BARREIRO%20TABATINGA%20AREA%202HA%20MARANGUAPE%20PRAD/02_GESTAO_TECNICA/03_PRAD/04_SOLIC_CARTOGRAFICA/KML",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0006-6-2025/Shared%20Documents/BARREIRO%20TABATINGA%20AREA%202HA%20MARANGUAPE%20PRAD/02_GESTAO_TECNICA/03_PRAD/04_SOLIC_CARTOGRAFICA/CARTOGRAFIA",
    "produtos": {"croqui": true, "kml": false, "mapa": false, "shapefile": false},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": true, "outrosTexto": "Croqui das áreas de PRAD com os núcleos (ilhas)."},
    "tecnicoResponsavel": "ISMAEL",
    "status": "concluido",
    "dataCriacao": "2026-03-11T18:38:20.988Z"
  }'
);

-- Versão da solicitação #5
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  5, 1, 'original', NULL,
  '{
    "id": 5,
    "solicitante": "Carina Rodrigues Silva",
    "solicitadoPor": "Carina Rodrigues Silva",
    "cliente": "AUREN | #0223-2-2025",
    "nomeEstudo": "Monitoramento de Ictiofauna",
    "empreendimento": "Usinas Hidrelétricas",
    "localidade": "São Paulo",
    "municipio": "Diversos municípios",
    "tipoMapa": "FAUNA",
    "nomeTipoMapa": "",
    "finalidade": "PRE_CAMPO",
    "observacoes": "Elaboração de um croqui com todos os pontos de ictiofauna. Os pontos estão na planilha dentro do diretório compartilhado.",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-12",
    "dataEntrega": "2026-03-17",
    "dataConclusaoPrevista": "2026-03-17",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/sites/0223-2-2025/Shared%20Documents/Forms/AllItems.aspx",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/sites/0223-2-2025/Shared%20Documents/Forms/AllItems.aspx",
    "produtos": {"croqui": true, "kml": true, "mapa": false, "shapefile": false},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "ISMAEL",
    "status": "em_andamento",
    "dataCriacao": "2026-03-12T21:16:41.057Z"
  }'
);

-- Versão da solicitação #6
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  6, 1, 'original', NULL,
  '{
    "id": 6,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Monitoramento de Processo Erosivo - Campanha C1/2026.",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": " Complexo Eólico Serra da Palmeira",
    "municipio": "MUNICÍPIOS DE NOVA PALMEIRA, PEDRA LAVRADA, PICUÍ, SÃO VICENTE DO SERIDÓ E BARAÚNA/PB",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "o mapa deverá ser elaborado após a conclusão do levantamento em campo por parte da equipe. A previsão de conclusão do campo está pra 23/03/2026.\n\nEspacialização dos processos erosivos acompanhados na campanha C1/2026.",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-03-23",
    "dataConclusaoPrevista": "2026-03-26",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_02_PROG_MONIT_PROC_EROSIVOS/03_CAMPANHAS/C1_2026/CAMPO/KMZ",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_02_PROG_MONIT_PROC_EROSIVOS/03_CAMPANHAS/C1_2026/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "LAIS",
    "status": "ajustes_pendentes",
    "dataCriacao": "2026-03-13T14:56:41.339Z"
  }'
);

-- Versão da solicitação #7
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  7, 1, 'original', NULL,
  '{
    "id": 7,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Monitoramento de Processo Erosivo - Campanha C1/2026.",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Linha de Transmissão 500 kV COMPLEXO EÓLICO SERRA DA PALMEIRA - SUBESTAÇÃO CAMPINA GRANDE III com extensão de 74,7 km",
    "municipio": "Paraíba",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "O mapa deverá ser elaborado após a conclusão do levantamento em campo por parte da equipe. A previsão de conclusão do campo está pra 23/03/2026. Espacialização dos processos erosivos acompanhados na campanha C1/2026.",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-03-25",
    "dataConclusaoPrevista": "2026-03-26",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_02_PROG_MONIT_PROC_EROSIVOS/LT/07_KMZ",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_02_PROG_MONIT_PROC_EROSIVOS/LT/03_CAMPANHAS/C1_2026/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "LAIS",
    "status": "ajustes_pendentes",
    "dataCriacao": "2026-03-13T15:19:48.875Z"
  }'
);

-- Versão da solicitação #8
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  8, 1, 'original', NULL,
  '{
    "id": 8,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Monitoramento de Recursos Hídricos - Campanha C1/2026",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Complexo Eólico Serra da Palmeira",
    "municipio": "MUNICÍPIOS DE NOVA PALMEIRA, PEDRA LAVRADA, PICUÍ, SÃO VICENTE DO SERIDÓ E BARAÚNA/PB",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "Espacialização dos pontos amostrais de análise dos recursos hídricos (Ponto dos locais amostrais de monitoramento dos recursos hídricos)",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-03-20",
    "dataConclusaoPrevista": "2026-03-20",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:u:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_03_PROG_MONIT_REC_HIDRICOS/CAMPANHAS/2026/C1_2026/KMZ/RH%20CE_Serra%20Palmeira.kmz",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_03_PROG_MONIT_REC_HIDRICOS/CAMPANHAS/2026/C1_2026/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "LAIS",
    "status": "em_andamento",
    "dataCriacao": "2026-03-13T15:25:14.445Z"
  }'
);

-- Versão da solicitação #9
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  9, 1, 'original', NULL,
  '{
    "id": 9,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de monitoramento de Residuos sólidos",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Complexo Eólico Serra da Palmeira",
    "municipio": "MUNICÍPIOS DE NOVA PALMEIRA, PEDRA LAVRADA, PICUÍ, SÃO VICENTE DO SERIDÓ E BARAÚNA/PB",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "Espacialização das estruturas da subestação relacionado ao programa. ",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-03-20",
    "dataConclusaoPrevista": "2026-04-03",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_04_PROG_MONIT_RESIDUOS_SOLIDOS/08_KMZ",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_04_PROG_MONIT_RESIDUOS_SOLIDOS/06_CAMPANHAS/2026/02_CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "PENDENTE",
    "status": "fila",
    "dataCriacao": "2026-03-13T15:37:16.162Z"
  }'
);

-- Versão da solicitação #10
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  10, 1, 'original', NULL,
  '{
    "id": 10,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Educação Ambiental",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Complexo Eólico Serra da Palmeira",
    "municipio": "MUNICÍPIOS DE NOVA PALMEIRA, PEDRA LAVRADA, PICUÍ, SÃO VICENTE DO SERIDÓ E BARAÚNA/PB",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "Espacialização das comunidades na área de influência do empreendimento\nPonto de localização das comunidades (casa do líder comunitário)\nLinha das vias de acesso local as comunidades\nPonto de localização dos locais de reunião",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-04-06",
    "dataConclusaoPrevista": "2026-04-03",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_08_PROG_EDUC_AMBIENTAL/03_CAMPANHAS/C1_2026/CARTOGRAFIA",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_08_PROG_EDUC_AMBIENTAL/03_CAMPANHAS/C1_2026/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "PENDENTE",
    "status": "fila",
    "dataCriacao": "2026-03-13T15:41:51.274Z"
  }'
);

-- Versão da solicitação #11
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  11, 1, 'original', NULL,
  '{
    "id": 11,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Comunicação Social",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Linha de Transmissão",
    "municipio": "Linha de Transmissão 500 kV COMPLEXO EÓLICO SERRA DA PALMEIRA - SUBESTAÇÃO CAMPINA GRANDE III com extensão de 74,7 km",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "Espacialização das comunidades na área de influência da Linha de Transmissão",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-04-06",
    "dataConclusaoPrevista": "2026-04-03",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_09_PROG_COMUN_SOCIAL/COMPLEXO_EOLICO_SERRA_PALMEIRA/03_CAMPANHAS/2026/CAMPANHA_C1_2026/CAMPO/KMZ",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_09_PROG_COMUN_SOCIAL/COMPLEXO_EOLICO_SERRA_PALMEIRA/03_CAMPANHAS/2026/CAMPANHA_C1_2026/CAMPO/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "PENDENTE",
    "status": "fila",
    "dataCriacao": "2026-03-13T15:48:22.953Z"
  }'
);

-- Versão da solicitação #12
INSERT INTO solicitacao_versoes (solicitacao_id, numero_versao, tipo, criado_por, dados)
VALUES (
  12, 1, 'original', NULL,
  '{
    "id": 12,
    "solicitante": "Juliana Vicente",
    "solicitadoPor": "Juliana Vicente",
    "cliente": "#0221-3-2025",
    "nomeEstudo": "Programa de Comunicação social",
    "empreendimento": "Complexo Eólico Serra da Palmeira",
    "localidade": "Complexo Eólico Serra da Palmeira",
    "municipio": "MUNICÍPIOS DE NOVA PALMEIRA, PEDRA LAVRADA, PICUÍ, SÃO VICENTE DO SERIDÓ E BARAÚNA/PB",
    "tipoMapa": "PLANTA_GEORREFERENCIADA",
    "nomeTipoMapa": "",
    "finalidade": "POS_CAMPO",
    "observacoes": "Espacialização das comunidades na área de influência do complexo Eólico",
    "artNecessaria": "nao",
    "artResponsavel": "",
    "dataSolicitacao": "2026-03-13",
    "dataEntrega": "2026-04-06",
    "dataConclusaoPrevista": "2026-04-03",
    "diretorioArquivos": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_09_PROG_COMUN_SOCIAL/COMPLEXO_EOLICO_SERRA_PALMEIRA/03_CAMPANHAS/2026/CAMPANHA_C1_2026/CAMPO/KMZ",
    "diretorioSalvamento": "https://setegadministrador.sharepoint.com/:f:/r/sites/0221-3-2025/Shared%20Documents/CTG%20PBA%20LO%20SERRA%20DA%20PALMEIRA/02_GESTAO_TECNICA/02_03_PROGRAMAS/03_09_PROG_COMUN_SOCIAL/COMPLEXO_EOLICO_SERRA_PALMEIRA/03_CAMPANHAS/2026/CAMPANHA_C1_2026/CAMPO/CARTOGRAFIA",
    "produtos": {"croqui": false, "kml": true, "mapa": true, "shapefile": true},
    "elementos": {"acessoLocal": false, "acessoRegional": false, "areaAmostral": false, "localizacao": false, "outros": false, "outrosTexto": ""},
    "tecnicoResponsavel": "PENDENTE",
    "status": "fila",
    "dataCriacao": "2026-03-13T15:51:44.793Z"
  }'
);

-- ============================================================
-- BLOCO 4: Ajustar a sequence para continuar do ID 13
-- (Evita conflito de IDs em novas inserções)
-- ============================================================
SELECT setval('solicitacoes_id_seq', 13);

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
-- Rode isso para confirmar que tudo foi inserido corretamente:
-- SELECT id, cliente, empreendimento, status, created_at FROM solicitacoes WHERE deletado_em IS NULL ORDER BY id;
-- SELECT solicitacao_id, numero_versao, tipo FROM solicitacao_versoes ORDER BY solicitacao_id;
