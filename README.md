# SGC SETEG — Sistema de Gestão Cartográfica

Sistema interno da **SETEG — Soluções Geológicas e Ambientais** para gerenciamento de solicitações de mapas e produtos cartográficos.

## Sobre

O SGC centraliza o fluxo de solicitações cartográficas da empresa, desde a abertura até a entrega. Gestores acompanham todas as solicitações, atribuem técnicos e controlam o andamento. Técnicos visualizam e atualizam apenas as solicitações sob sua responsabilidade.

## Funcionalidades

- Abertura de solicitações com dados técnicos do mapa
- Atribuição de técnicos responsáveis
- Controle de status: Na Fila → Em Andamento → Ajustes Pendentes → Concluído
- Sistema de ajustes com versionamento de solicitações
- Histórico completo de versões por solicitação
- Exclusão lógica (soft delete) com preservação de dados
- Auditoria de ações registrada automaticamente
- Exportação de relatórios em CSV
- Painel do gestor e painel do técnico separados
- Suporte a tema claro e escuro

## Tecnologias

- **Frontend:** Vite + JavaScript (ES Modules)
- **Banco de dados:** Supabase (PostgreSQL)
- **Deploy:** Vercel

## Acesso

O sistema utiliza códigos de acesso para autenticação de gestores e técnicos, sem necessidade de cadastro externo.
