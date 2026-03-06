/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ano: 2026
 * Empresa: SETEG
 */

// Integração do Versionamento

// Abre modal para solicitar ajuste
window.abrirModalAjuste = function(idSolicitacao) {
  const modal = document.getElementById("modalAjuste");
  const idInput = document.getElementById("ajusteIdSolicitacao");
  
  if (modal && idInput) {
    idInput.value = idSolicitacao;
    modal.classList.add("active");
    
    // Aplicar máscara de data
    setTimeout(() => {
      const prazoInput = document.getElementById("ajustePrazoFinal");
      if (prazoInput && window.aplicarMascaraData) {
        window.aplicarMascaraData(prazoInput);
      }
    }, 100);
  }
};

/**
 * Fecha modal de ajuste
 */
window.fecharModalAjuste = function() {
  const modal = document.getElementById("modalAjuste");
  if (modal) {
    modal.classList.remove("active");
    
    // Limpar campos
    document.getElementById("ajusteNomeSolicitante").value = "";
    document.getElementById("ajusteDiretorioReferencia").value = "";
    document.getElementById("ajusteDiretorioSalvamento").value = "";
    document.getElementById("ajusteTipoAjuste").value = "";
    document.getElementById("ajusteObservacoes").value = "";
    document.getElementById("ajustePrazoFinal").value = "";
  }
};

/**
 * Confirma e envia solicitação de ajuste
 */
window.confirmarSolicitarAjuste = async function() {
  // Proteção contra cliques duplos
  if (window.confirmarSolicitarAjuste.processando) {
    return;
  }
  window.confirmarSolicitarAjuste.processando = true;

  const idSolicitacao = parseInt(document.getElementById("ajusteIdSolicitacao").value);
  const nomeSolicitante = document.getElementById("ajusteNomeSolicitante").value.trim();
  const diretorioReferencia = document.getElementById("ajusteDiretorioReferencia").value.trim();
  const diretorioSalvamento = document.getElementById("ajusteDiretorioSalvamento").value.trim();
  const tipoAjuste = document.getElementById("ajusteTipoAjuste").value;
  const observacoes = document.getElementById("ajusteObservacoes").value.trim();
  const prazoFinalBR = document.getElementById("ajustePrazoFinal").value.trim();
  
  // Validações
  if (!nomeSolicitante) {
    mostrarNotificacao("Digite seu nome!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }
  
  if (!diretorioReferencia) {
    mostrarNotificacao("Digite o diretório de referência!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }
  
  if (!diretorioSalvamento) {
    mostrarNotificacao("Digite o diretório de salvamento!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }
  
  if (!tipoAjuste) {
    mostrarNotificacao("Selecione o tipo de ajuste!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }
  
  if (!observacoes) {
    mostrarNotificacao("Digite as observações do ajuste!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }
  
  if (!prazoFinalBR) {
    mostrarNotificacao("Digite o prazo final!", "warning");
    window.confirmarSolicitarAjuste.processando = false;
    return;
  }

  const ajustes = {
    nomeSolicitante: nomeSolicitante,
    diretorioReferencia: diretorioReferencia,
    diretorioSalvamento: diretorioSalvamento,
    tipoAjuste: tipoAjuste,
    observacoes: observacoes,
  };

  // Converter data
  if (prazoFinalBR && window.converterDataParaISO) {
    ajustes.prazoFinal = window.converterDataParaISO(prazoFinalBR);
  }

  try {
    const idAjuste = await window.versioningModule.solicitarAjuste(
      idSolicitacao,
      ajustes,
      nomeSolicitante
    );

    mostrarNotificacao(
      `Ajuste solicitado com sucesso! Aguardando aprovação do gestor.`,
      "success"
    );
    
    fecharModalAjuste();
    
    // Recarregar detalhes se estiver aberto
    if (window.verDetalhes) {
      setTimeout(() => window.verDetalhes(idSolicitacao), 300);
    }
  } catch (error) {
    console.error("Erro ao solicitar ajuste:", error);
    mostrarNotificacao("Erro ao solicitar ajuste: " + error.message, "error");
  } finally {
    window.confirmarSolicitarAjuste.processando = false;
  }
};

/**
 * Abre modal com histórico de versões
 */
window.abrirModalHistorico = async function(idSolicitacao) {
  const modal = document.getElementById("modalHistorico");
  const conteudo = document.getElementById("conteudoHistorico");
  
  if (!modal || !conteudo) return;

  try {
    // Mostrar loading
    conteudo.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="bi bi-hourglass-split" style="font-size: 3rem; color: var(--primary);"></i>
        <p style="margin-top: 16px; color: var(--muted);">Carregando histórico...</p>
      </div>
    `;
    
    modal.classList.add("active");

    const historico = await window.versioningModule.obterHistoricoSolicitacao(idSolicitacao);
    
    // Buscar ajustes pendentes se for gestor
    let ajustesPendentes = [];
    if (window.acessoGestor) {
      ajustesPendentes = await window.versioningModule.obterAjustesPendentes(idSolicitacao);
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
              <span class="info-value">${historico.criadoPor}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Criado em</span>
              <span class="info-value">${new Date(historico.criadoEm).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        ${ajustesPendentes.length > 0 ? `
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px;">
          <h4 style="margin-bottom: 12px; color: #f59e0b;">
            <i class="bi bi-exclamation-triangle"></i> Ajustes Pendentes de Aprovação (${ajustesPendentes.length})
          </h4>
          ${ajustesPendentes.filter(a => a.status === 'aguardando_aprovacao').map(ajuste => `
            <div style="background: var(--bg-elevated); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                  <strong style="color: var(--text);">Solicitado por: ${ajuste.solicitadoPor}</strong>
                  <p style="color: var(--muted); font-size: 0.85rem; margin-top: 4px;">
                    ${new Date(ajuste.dataSolicitacao).toLocaleString('pt-BR')}
                  </p>
                </div>
                <span class="status-badge status-aguardando">Aguardando</span>
              </div>
              
              ${ajuste.observacoes ? `
              <div style="margin-bottom: 12px;">
                <span class="info-label">Observações:</span>
                <p style="margin-top: 4px; color: var(--text); line-height: 1.6;">${ajuste.observacoes}</p>
              </div>
              ` : ''}
              
              <div class="versao-actions">
                <button class="btn btn-success" type="button" onclick="aprovarAjustePendenteModal(${idSolicitacao}, '${ajuste.id}')">
                  <i class="bi bi-check-circle"></i> Aprovar
                </button>
                <button class="btn btn-danger" type="button" onclick="reprovarAjustePendenteModal(${idSolicitacao}, '${ajuste.id}')">
                  <i class="bi bi-x-circle"></i> Reprovar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <h4 style="margin-bottom: 16px; color: var(--text); font-size: 1.1rem;">
          <i class="bi bi-clock-history"></i> Histórico de Versões (${historico.versoes.length})
        </h4>
        
        <div class="versao-timeline">
    `;

    // Ordenar versões da mais recente para a mais antiga
    const versoesOrdenadas = [...historico.versoes].reverse();

    versoesOrdenadas.forEach(versao => {
      const isAtual = versao.numero === historico.versaoAtual;
      const statusClass = window.versioningModule.obterClasseStatus(versao.status);
      const statusFormatado = window.versioningModule.formatarStatusVersao(versao.status);

      html += `
        <div class="versao-timeline-item ${isAtual ? 'atual' : ''}">
          <div class="versao-card ${isAtual ? 'atual' : ''}">
            <div class="versao-header">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span class="versao-numero">Versão ${versao.numero}</span>
                ${isAtual ? '<span class="badge-versao-atual"><i class="bi bi-check-circle-fill"></i> Atual</span>' : ''}
              </div>
              <span class="status-badge ${statusClass}">${statusFormatado}</span>
            </div>
            
            <div class="versao-info">
              <div class="info-item">
                <span class="info-label">Solicitado por</span>
                <span class="info-value">${versao.solicitadoPor || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Data</span>
                <span class="info-value">${new Date(versao.dataSolicitacao).toLocaleString('pt-BR')}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Técnico</span>
                <span class="info-value">${versao.tecnicoResponsavel ? window.formatarNomeTecnico(versao.tecnicoResponsavel) : '-'}</span>
              </div>
              ${versao.prazoFinal ? `
              <div class="info-item">
                <span class="info-label">Prazo Final</span>
                <span class="info-value">${window.formatDateBR ? window.formatDateBR(versao.prazoFinal) : versao.prazoFinal}</span>
              </div>
              ` : ''}
            </div>

            ${versao.tipoAjuste ? `
            <div style="margin-top: 12px;">
              <span class="info-label">Tipo de Ajuste</span>
              <p style="margin-top: 4px; color: var(--text);">${versao.tipoAjuste}</p>
            </div>
            ` : ''}

            ${versao.observacoes ? `
            <div style="margin-top: 12px;">
              <span class="info-label">Observações</span>
              <p style="margin-top: 4px; color: var(--text); line-height: 1.6;">${versao.observacoes}</p>
            </div>
            ` : ''}

            ${versao.aprovadoPor ? `
            <div style="margin-top: 12px; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
              <span class="info-label">Aprovado por</span>
              <p style="margin-top: 4px; color: var(--success); font-weight: 600;">${versao.aprovadoPor}</p>
              ${versao.dataAprovacao ? `<small style="color: var(--muted);">${new Date(versao.dataAprovacao).toLocaleString('pt-BR')}</small>` : ''}
            </div>
            ` : ''}

            ${versao.reprovadoPor ? `
            <div style="margin-top: 12px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
              <span class="info-label">Reprovado por</span>
              <p style="margin-top: 4px; color: var(--danger); font-weight: 600;">${versao.reprovadoPor}</p>
              ${versao.observacaoGestor ? `<p style="margin-top: 8px; color: var(--text);">${versao.observacaoGestor}</p>` : ''}
            </div>
            ` : ''}

            ${versao.diretorioReferencia || versao.diretorioSalvamento ? `
            <div style="margin-top: 12px; display: grid; gap: 8px;">
              ${versao.diretorioReferencia ? `
              <div>
                <span class="info-label">Diretório de Referência</span>
                <p style="margin-top: 4px; color: var(--text); font-family: monospace; font-size: 0.85rem;">${versao.diretorioReferencia}</p>
              </div>
              ` : ''}
              ${versao.diretorioSalvamento ? `
              <div>
                <span class="info-label">Diretório de Salvamento</span>
                <p style="margin-top: 4px; color: var(--text); font-family: monospace; font-size: 0.85rem;">${versao.diretorioSalvamento}</p>
              </div>
              ` : ''}
            </div>
            ` : ''}

            ${gerarBotoesAcoesVersao(idSolicitacao, versao)}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
      
      <div class="btn-group" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
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
};

/**
 * Gera botões de ações para uma versão
 */
function gerarBotoesAcoesVersao(idSolicitacao, versao) {
  if (!window.acessoGestor && !window.acessoTecnico) {
    return '';
  }

  let html = '<div class="versao-actions">';

  // Gestor pode aprovar/reprovar versões solicitadas
  if (window.acessoGestor && versao.status === 'solicitado') {
    html += `
      <button class="btn btn-success" type="button" onclick="aprovarVersaoModal(${idSolicitacao}, ${versao.numero})">
        <i class="bi bi-check-circle"></i> Aprovar
      </button>
      <button class="btn btn-danger" type="button" onclick="reprovarVersaoModal(${idSolicitacao}, ${versao.numero})">
        <i class="bi bi-x-circle"></i> Reprovar
      </button>
    `;
  }

  // Técnico pode iniciar versões atribuídas
  if (window.acessoTecnico && versao.status === 'atribuido' && versao.tecnicoResponsavel === window.tecnicoLogado) {
    html += `
      <button class="btn btn-info" type="button" onclick="iniciarVersaoModal(${idSolicitacao}, ${versao.numero})">
        <i class="bi bi-play-circle"></i> Iniciar
      </button>
    `;
  }

  // Técnico pode finalizar versões em andamento
  if (window.acessoTecnico && versao.status === 'em_andamento' && versao.tecnicoResponsavel === window.tecnicoLogado) {
    html += `
      <button class="btn btn-success" type="button" onclick="finalizarVersaoModal(${idSolicitacao}, ${versao.numero})">
        <i class="bi bi-check-circle-fill"></i> Finalizar
      </button>
    `;
  }

  html += '</div>';
  return html;
}

/**
 * Fecha modal de histórico
 */
window.fecharModalHistorico = function() {
  const modal = document.getElementById("modalHistorico");
  if (modal) {
    modal.classList.remove("active");
  }
};

/**
 * Aprova um ajuste pendente (chamado do modal de histórico)
 */
window.aprovarAjustePendenteModal = async function(idSolicitacao, idAjuste) {
  if (!window.acessoGestor) {
    mostrarNotificacao("Apenas gestores podem aprovar ajustes!", "warning");
    return;
  }

  // Abrir modal de atribuição
  window.abrirModalAtribuicaoAjuste(idSolicitacao, idAjuste);
};

/**
 * Abre modal para atribuir técnico ao aprovar ajuste
 */
window.abrirModalAtribuicaoAjuste = function(idSolicitacao, idAjuste) {
  const modal = document.getElementById("modalAtribuicao");
  const conteudo = document.getElementById("conteudoAtribuicao");
  
  if (!modal || !conteudo) return;

  conteudo.innerHTML = `
    <div class="form-group">
      <p><strong>Aprovar Ajuste da Solicitação #${idSolicitacao}</strong></p>
      <p style="margin-top: 8px; color: var(--muted);">Ao aprovar, uma nova versão será criada.</p>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="selectTecnicoAjuste">Selecione o Técnico *</label>
      <select id="selectTecnicoAjuste" required>
        <option value="" disabled selected>Selecione um técnico...</option>
        <option value="LAIS">Laís Mendes</option>
        <option value="LAIZE">Laize Rodrigues</option>
        <option value="VALESKA">Valeska Soares</option>
        <option value="LIZABETH">Lizabeth Silva</option>
        <option value="ISMAEL">Ismael Alves</option>
        <option value="FERNANDO">Fernando Sousa</option>
      </select>
    </div>

    <div class="btn-group" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalAtribuicao()">Cancelar</button>
      <button class="btn btn-success" type="button" onclick="confirmarAprovarAjuste(${idSolicitacao}, '${idAjuste}')">
        <i class="bi bi-check-circle"></i> Aprovar e Atribuir
      </button>
    </div>
  `;

  modal.classList.add("active");
};

/**
 * Confirma aprovação do ajuste pendente
 */
window.confirmarAprovarAjuste = async function(idSolicitacao, idAjuste) {
  const tecnico = document.getElementById("selectTecnicoAjuste")?.value;

  if (!tecnico) {
    mostrarNotificacao("Selecione um técnico!", "warning");
    return;
  }

  try {
    const novaVersao = await window.versioningModule.aprovarAjustePendente(
      idSolicitacao,
      idAjuste,
      "Gestor",
      tecnico
    );

    mostrarNotificacao(
      `Ajuste aprovado! Versão ${novaVersao} criada e atribuída para ${window.formatarNomeTecnico(tecnico)}!`,
      "success"
    );

    window.fecharModalAtribuicao();
    
    // Atualizar contador de ajustes pendentes
    if (window.atualizarContadorAjustesPendentes) {
      await window.atualizarContadorAjustesPendentes();
    }
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao aprovar ajuste:", error);
    mostrarNotificacao("Erro ao aprovar ajuste: " + error.message, "error");
  }
};

/**
 * Reprova um ajuste pendente
 */
window.reprovarAjustePendenteModal = async function(idSolicitacao, idAjuste) {
  if (!window.acessoGestor) {
    mostrarNotificacao("Apenas gestores podem reprovar ajustes!", "warning");
    return;
  }

  const motivo = prompt("Digite o motivo da reprovação:");
  
  if (!motivo || !motivo.trim()) {
    mostrarNotificacao("Reprovação cancelada", "info");
    return;
  }

  try {
    await window.versioningModule.reprovarAjustePendente(
      idSolicitacao,
      idAjuste,
      "Gestor",
      motivo.trim()
    );

    mostrarNotificacao(`Ajuste reprovado!`, "warning");
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao reprovar ajuste:", error);
    mostrarNotificacao("Erro ao reprovar ajuste: " + error.message, "error");
  }
};

/**
 * Aprova uma versão (chamado do modal de histórico)
 */
window.aprovarVersaoModal = async function(idSolicitacao, versao) {
  if (!window.acessoGestor) {
    mostrarNotificacao("Apenas gestores podem aprovar ajustes!", "warning");
    return;
  }

  // Abrir modal de atribuição
  window.abrirModalAtribuicaoVersao(idSolicitacao, versao);
};

/**
 * Abre modal para atribuir técnico ao aprovar versão
 */
window.abrirModalAtribuicaoVersao = function(idSolicitacao, versao) {
  const modal = document.getElementById("modalAtribuicao");
  const conteudo = document.getElementById("conteudoAtribuicao");
  
  if (!modal || !conteudo) return;

  conteudo.innerHTML = `
    <div class="form-group">
      <p><strong>Aprovar Versão ${versao} da Solicitação #${idSolicitacao}</strong></p>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="selectTecnicoVersao">Selecione o Técnico *</label>
      <select id="selectTecnicoVersao" required>
        <option value="" disabled selected>Selecione um técnico...</option>
        <option value="LAIS">Laís Mendes</option>
        <option value="LAIZE">Laize Rodrigues</option>
        <option value="VALESKA">Valeska Soares</option>
        <option value="LIZABETH">Lizabeth Silva</option>
        <option value="ISMAEL">Ismael Alves</option>
        <option value="FERNANDO">Fernando Sousa</option>
      </select>
    </div>

    <div class="btn-group" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalAtribuicao()">Cancelar</button>
      <button class="btn btn-success" type="button" onclick="confirmarAprovarVersao(${idSolicitacao}, ${versao})">
        <i class="bi bi-check-circle"></i> Aprovar e Atribuir
      </button>
    </div>
  `;

  modal.classList.add("active");
};

/**
 * Confirma aprovação da versão
 */
window.confirmarAprovarVersao = async function(idSolicitacao, versao) {
  const tecnico = document.getElementById("selectTecnicoVersao")?.value;

  if (!tecnico) {
    mostrarNotificacao("Selecione um técnico!", "warning");
    return;
  }

  try {
    await window.versioningModule.aprovarAjuste(
      idSolicitacao,
      versao,
      "Gestor",
      tecnico
    );

    mostrarNotificacao(
      `Versão ${versao} aprovada e atribuída para ${window.formatarNomeTecnico(tecnico)}!`,
      "success"
    );

    window.fecharModalAtribuicao();
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao aprovar versão:", error);
    mostrarNotificacao("Erro ao aprovar versão: " + error.message, "error");
  }
};

/**
 * Reprova uma versão
 */
window.reprovarVersaoModal = async function(idSolicitacao, versao) {
  if (!window.acessoGestor) {
    mostrarNotificacao("Apenas gestores podem reprovar ajustes!", "warning");
    return;
  }

  const motivo = prompt("Digite o motivo da reprovação:");
  
  if (!motivo || !motivo.trim()) {
    mostrarNotificacao("Reprovação cancelada", "info");
    return;
  }

  try {
    await window.versioningModule.reprovarAjuste(
      idSolicitacao,
      versao,
      "Gestor",
      motivo.trim()
    );

    mostrarNotificacao(`Versão ${versao} reprovada!`, "warning");
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao reprovar versão:", error);
    mostrarNotificacao("Erro ao reprovar versão: " + error.message, "error");
  }
};

/**
 * Inicia uma versão
 */
window.iniciarVersaoModal = async function(idSolicitacao, versao) {
  try {
    await window.versioningModule.iniciarAjuste(idSolicitacao, versao);
    
    mostrarNotificacao(`Versão ${versao} iniciada!`, "success");
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao iniciar versão:", error);
    mostrarNotificacao("Erro ao iniciar versão: " + error.message, "error");
  }
};

/**
 * Finaliza uma versão
 */
window.finalizarVersaoModal = async function(idSolicitacao, versao) {
  if (!confirm(`Confirma a finalização da versão ${versao}?`)) {
    return;
  }

  try {
    await window.versioningModule.finalizarAjuste(idSolicitacao, versao);
    
    mostrarNotificacao(`Versão ${versao} finalizada!`, "success");
    
    // Recarregar histórico
    setTimeout(() => window.abrirModalHistorico(idSolicitacao), 300);
  } catch (error) {
    console.error("Erro ao finalizar versão:", error);
    mostrarNotificacao("Erro ao finalizar versão: " + error.message, "error");
  }
};

// Aguardar o DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  // Módulo carregado
});
