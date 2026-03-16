/**
 * Modal de Histórico de Versões - Supabase
 */

import {
  obterHistoricoSolicitacao,
  obterAjustesPendentes,
  formatarStatusVersao,
  obterClasseStatus,
} from "./ajustesService.js";

export async function abrirModalHistorico(idSolicitacao) {
  const modal = document.getElementById("modalHistorico");
  const conteudo = document.getElementById("conteudoHistorico");

  if (!modal || !conteudo) return;

  // Verificar se temos acesso gestor (variável global do app.js)
  const acessoGestor = window.acessoGestor || false;

  try {
    // Mostrar loading
    conteudo.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="bi bi-hourglass-split" style="font-size: 3rem; color: var(--primary);"></i>
        <p style="margin-top: 16px; color: var(--muted);">Carregando histórico...</p>
      </div>
    `;

    modal.classList.add("active");

    const historico = await obterHistoricoSolicitacao(idSolicitacao);
    const statusAtualSolicitacao = historico.statusAtual;

    // Buscar ajustes pendentes se for gestor
    let ajustesPendentes = [];
    if (acessoGestor) {
      ajustesPendentes = await obterAjustesPendentes(idSolicitacao);
    }

    let html = `
      <div class="historico-container">
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px;">
          <h4 style="margin-bottom: 8px; color: var(--primary);">
            <i class="bi bi-info-circle"></i> Informações Gerais
          </h4>
          <div class="versao-info">
            <div class="info-item">
              <span class="info-label">Solicitação</span>
              <span class="info-value">#${String(idSolicitacao).padStart(4, "0")}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Versão Atual</span>
              <span class="info-value">${historico.versaoAtual}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Criado por</span>
              <span class="info-value">${historico.criadoPor || "Sistema"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Criado em</span>
              <span class="info-value">${new Date(historico.criadoEm).toLocaleString("pt-BR")}</span>
            </div>
          </div>
        </div>

        <div class="versao-timeline">
    `;

    // Ordenar versões da mais recente para a mais antiga
    const versoesOrdenadas = [...historico.versoes].reverse();

    versoesOrdenadas.forEach((versao) => {
      const isAtual = versao.numero_versao === historico.versaoAtual;
      // Versão atual usa o status real da solicitação, versões antigas usam o status do JSON
      const statusParaExibir =
        isAtual && statusAtualSolicitacao
          ? statusAtualSolicitacao
          : versao.dados.status || "fila";
      const statusClass = obterClasseStatus(statusParaExibir);
      const statusFormatado = formatarStatusVersao(statusParaExibir);

      html += `
        <div class="versao-timeline-item ${isAtual ? "atual" : ""}">
          <div class="versao-card ${isAtual ? "atual" : ""}">
            <div class="versao-header">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="versao-numero">Versão ${versao.numero_versao}</span>
                ${isAtual ? '<span class="badge-versao-atual"><i class="bi bi-check-circle-fill"></i> Atual</span>' : ""}
              </div>
              <span class="status-badge ${statusClass}">${statusFormatado}</span>
            </div>

            <div class="versao-info">
              <div class="info-item">
                <span class="info-label">Solicitado por</span>
                <span class="info-value">${versao.dados.solicitadoPor || versao.dados.solicitante || "-"}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Data</span>
                <span class="info-value">${new Date(versao.dados.dataSolicitacao || versao.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Técnico</span>
                <span class="info-value">${versao.dados.tecnicoResponsavel || "-"}</span>
              </div>
            </div>

            ${
              versao.dados.observacoes
                ? `
            <div style="margin-top: 12px;">
              <span class="info-label">Observações</span>
              <p style="margin-top: 4px; color: var(--text); line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${versao.dados.observacoes}</p>
            </div>
            `
                : ""
            }

            ${
              versao.dados.diretorioArquivos
                ? `
            <div style="margin-top: 12px;">
              <span class="info-label">Diretório de Arquivos</span>
              <p style="margin-top: 4px; color: var(--text); font-family: monospace; font-size: 0.85rem; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${versao.dados.diretorioArquivos}</p>
            </div>
            `
                : ""
            }

            ${
              versao.dados.diretorioSalvamento
                ? `
            <div style="margin-top: 12px;">
              <span class="info-label">Diretório de Salvamento</span>
              <p style="margin-top: 4px; color: var(--text); font-family: monospace; font-size: 0.85rem; word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${versao.dados.diretorioSalvamento}</p>
            </div>
            `
                : ""
            }
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div class="btn-group justify-end" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
        <button class="btn btn-ghost" type="button" onclick="fecharModalHistorico()">
          <i class="bi bi-x-circle"></i> Fechar
        </button>
      </div>
    `;

    conteudo.innerHTML = html;
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    conteudo.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i>
        <p style="margin-top: 16px; color: var(--text);">Erro ao carregar histórico</p>
        <p style="margin-top: 8px; color: var(--muted); font-size: 0.9rem;">${error.message}</p>
        <button class="btn btn-ghost" type="button" onclick="fecharModalHistorico()" style="margin-top: 16px;">
          Fechar
        </button>
      </div>
    `;
  }
}

export function fecharModalHistorico() {
  const modal = document.getElementById("modalHistorico");
  if (modal) {
    modal.classList.remove("active");
  }
}
