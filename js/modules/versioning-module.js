/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ano: 2026
 * Empresa: SETEG
 */

// Versionamento de Ajustes
// Gerencia versões e ajustes das solicitações

// Criar solicitação inicial
export async function criarSolicitacaoInicial(dados) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, runTransaction, set } = window.firebaseFunctions;
  const db = window.db;

  try {
    // Pega próximo ID
    const contadorRef = ref(db, "contador");
    const result = await runTransaction(contadorRef, (atual) => {
      return (atual || 0) + 1;
    });

    const novoId = result.snapshot.val();
    const solRef = ref(db, `solicitacoes/${novoId}`);

    // Estrutura da solicitação com versionamento
    const solicitacao = {
      versaoAtual: 1,
      criadoPor: dados.criadoPor || "Sistema",
      criadoEm: new Date().toISOString(),
      versoes: {
        1: {
          // Dados da versão inicial
          ...dados,
          status: "criado",
          dataSolicitacao: new Date().toISOString(),
          solicitadoPor: dados.criadoPor || "Sistema",
          tecnicoResponsavel: dados.tecnicoResponsavel || "PENDENTE",
          aprovadoPor: null,
        },
      },
    };

    await set(solRef, solicitacao);
    return novoId;
  } catch (error) {
    console.error("Erro ao criar solicitação inicial:", error);
    throw error;
  }
}

// =======================================================
//  2. SOLICITAR AJUSTE (CRIAR NOVA VERSÃO)
// =======================================================

/**
 * Solicita um ajuste (não cria versão ainda, apenas registra a solicitação)
 * @param {number} idSolicitacao - ID da solicitação
 * @param {Object} dadosAjuste - Dados do ajuste a ser aplicado
 * @param {string} usuario - Usuário que está solicitando o ajuste
 * @returns {Promise<string>} ID da solicitação de ajuste criada
 */
export async function solicitarAjuste(idSolicitacao, dadosAjuste, usuario) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get, update, push } = window.firebaseFunctions;
  const db = window.db;

  try {
    const solRef = ref(db, `solicitacoes/${idSolicitacao}`);
    const snapshot = await get(solRef);

    if (!snapshot.exists()) {
      throw new Error(`Solicitação ${idSolicitacao} não encontrada`);
    }

    const solicitacao = snapshot.val();
    
    // Verificar se a solicitação tem estrutura de versionamento
    if (!solicitacao.versoes) {
      // Solicitação antiga sem versionamento - converter para formato novo
      const versao1 = {
        ...solicitacao,
        status: solicitacao.status || "criado",
        dataSolicitacao: solicitacao.dataSolicitacao || new Date().toISOString(),
        solicitadoPor: solicitacao.solicitante || "Sistema",
        tecnicoResponsavel: solicitacao.tecnicoResponsavel || "PENDENTE",
      };
      
      // Criar estrutura de versionamento
      const updates = {};
      updates['versaoAtual'] = 1;
      updates['criadoPor'] = solicitacao.solicitante || "Sistema";
      updates['criadoEm'] = solicitacao.dataCriacao || new Date().toISOString();
      updates['versoes/1'] = versao1;
      
      await update(solRef, updates);
      
      // Recarregar solicitação atualizada
      const snapshotAtualizado = await get(solRef);
      solicitacao.versoes = snapshotAtualizado.val().versoes;
      solicitacao.versaoAtual = 1;
    }
    
    const versaoAtual = solicitacao.versaoAtual || 1;
    const dadosVersaoAtual = solicitacao.versoes[versaoAtual];
    
    if (!dadosVersaoAtual) {
      throw new Error(`Versão ${versaoAtual} não encontrada`);
    }

    // Criar solicitação de ajuste pendente (não cria versão ainda)
    const ajustesPendentesRef = ref(db, `solicitacoes/${idSolicitacao}/ajustesPendentes`);
    const novoAjusteRef = push(ajustesPendentesRef);
    
    const ajustePendente = {
      ...dadosAjuste,
      solicitadoPor: usuario,
      dataSolicitacao: new Date().toISOString(),
      status: "aguardando_aprovacao",
      versaoBase: versaoAtual,
    };

    await update(novoAjusteRef, ajustePendente);
    
    return novoAjusteRef.key;
  } catch (error) {
    console.error("Erro ao solicitar ajuste:", error);
    throw error;
  }
}

// =======================================================
//  3. APROVAR AJUSTE (CRIA NOVA VERSÃO)
// =======================================================

/**
 * Aprova um ajuste pendente e cria nova versão
 * @param {number} idSolicitacao - ID da solicitação
 * @param {string} idAjuste - ID do ajuste pendente
 * @param {string} gestor - Nome do gestor que está aprovando
 * @param {string} tecnico - Código do técnico responsável
 * @returns {Promise<number>} Número da nova versão criada
 */
export async function aprovarAjustePendente(idSolicitacao, idAjuste, gestor, tecnico) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get, update, remove } = window.firebaseFunctions;
  const db = window.db;

  try {
    // Buscar ajuste pendente
    const ajusteRef = ref(db, `solicitacoes/${idSolicitacao}/ajustesPendentes/${idAjuste}`);
    const ajusteSnapshot = await get(ajusteRef);
    
    if (!ajusteSnapshot.exists()) {
      throw new Error("Ajuste pendente não encontrado");
    }
    
    const ajustePendente = ajusteSnapshot.val();
    
    // Buscar solicitação
    const solRef = ref(db, `solicitacoes/${idSolicitacao}`);
    const solSnapshot = await get(solRef);
    const solicitacao = solSnapshot.val();
    
    const versaoAtual = solicitacao.versaoAtual || 1;
    const novaVersao = versaoAtual + 1;
    const dadosVersaoAtual = solicitacao.versoes[versaoAtual];
    
    // Criar nova versão com os dados do ajuste
    const dadosNovaVersao = {
      ...dadosVersaoAtual,
      diretorioReferencia: ajustePendente.diretorioReferencia || dadosVersaoAtual.diretorioReferencia,
      diretorioSalvamento: ajustePendente.diretorioSalvamento || dadosVersaoAtual.diretorioSalvamento,
      tipoAjuste: ajustePendente.tipoAjuste || dadosVersaoAtual.tipoAjuste,
      observacoes: ajustePendente.observacoes || dadosVersaoAtual.observacoes,
      prazoFinal: ajustePendente.prazoFinal || dadosVersaoAtual.prazoFinal,
      status: "atribuido",
      dataAjuste: new Date().toISOString(),
      solicitadoPor: ajustePendente.solicitadoPor,
      aprovadoPor: gestor,
      dataAprovacao: new Date().toISOString(),
      tecnicoResponsavel: tecnico,
    };

    // Atualizar Firebase
    const updates = {};
    updates[`versaoAtual`] = novaVersao;
    updates[`versoes/${novaVersao}`] = dadosNovaVersao;

    await update(solRef, updates);
    
    // Remover ajuste pendente
    await remove(ajusteRef);
    
    return novaVersao;
  } catch (error) {
    console.error("Erro ao aprovar ajuste:", error);
    throw error;
  }
}

// =======================================================
//  4. REPROVAR AJUSTE
// =======================================================

/**
 * Reprova um ajuste pendente
 * @param {number} idSolicitacao - ID da solicitação
 * @param {string} idAjuste - ID do ajuste pendente
 * @param {string} gestor - Nome do gestor que está reprovando
 * @param {string} motivo - Motivo da reprovação
 * @returns {Promise<void>}
 */
export async function reprovarAjustePendente(idSolicitacao, idAjuste, gestor, motivo) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, update } = window.firebaseFunctions;
  const db = window.db;

  try {
    const ajusteRef = ref(db, `solicitacoes/${idSolicitacao}/ajustesPendentes/${idAjuste}`);

    const updates = {
      status: "reprovado",
      reprovadoPor: gestor,
      motivoReprovacao: motivo,
      dataReprovacao: new Date().toISOString(),
    };

    await update(ajusteRef, updates);
  } catch (error) {
    console.error("Erro ao reprovar ajuste:", error);
    throw error;
  }
}

// =======================================================
//  5. OBTER AJUSTES PENDENTES
// =======================================================

/**
 * Retorna todos os ajustes pendentes de uma solicitação
 * @param {number} idSolicitacao - ID da solicitação
 * @returns {Promise<Array>} Array de ajustes pendentes
 */
export async function obterAjustesPendentes(idSolicitacao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get } = window.firebaseFunctions;
  const db = window.db;

  try {
    const ajustesRef = ref(db, `solicitacoes/${idSolicitacao}/ajustesPendentes`);
    const snapshot = await get(ajustesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const ajustes = [];
    snapshot.forEach((child) => {
      ajustes.push({
        id: child.key,
        ...child.val(),
      });
    });

    return ajustes;
  } catch (error) {
    console.error("Erro ao obter ajustes pendentes:", error);
    throw error;
  }
}

// =======================================================
//  6. INICIAR AJUSTE
// =======================================================

/**
 * Marca o ajuste como em andamento
 * @param {number} idSolicitacao - ID da solicitação
 * @param {number} versao - Número da versão
 * @returns {Promise<void>}
 */
export async function iniciarAjuste(idSolicitacao, versao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, update } = window.firebaseFunctions;
  const db = window.db;

  try {
    const versaoRef = ref(db, `solicitacoes/${idSolicitacao}/versoes/${versao}`);

    const updates = {
      status: "em_andamento",
      dataInicio: new Date().toISOString(),
    };

    await update(versaoRef, updates);
  } catch (error) {
    console.error("Erro ao iniciar ajuste:", error);
    throw error;
  }
}

// =======================================================
//  6. FINALIZAR AJUSTE
// =======================================================

/**
 * Marca o ajuste como finalizado
 * @param {number} idSolicitacao - ID da solicitação
 * @param {number} versao - Número da versão
 * @returns {Promise<void>}
 */
export async function finalizarAjuste(idSolicitacao, versao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, update } = window.firebaseFunctions;
  const db = window.db;

  try {
    const versaoRef = ref(db, `solicitacoes/${idSolicitacao}/versoes/${versao}`);

    const updates = {
      status: "finalizado",
      dataConclusao: new Date().toISOString(),
    };

    await update(versaoRef, updates);
  } catch (error) {
    console.error("Erro ao finalizar ajuste:", error);
    throw error;
  }
}

// =======================================================
//  7. OBTER HISTÓRICO DA SOLICITAÇÃO
// =======================================================

/**
 * Retorna o histórico completo de uma solicitação
 * @param {number} idSolicitacao - ID da solicitação
 * @returns {Promise<Object>} Objeto com versaoAtual e array de versoes ordenadas
 */
export async function obterHistoricoSolicitacao(idSolicitacao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get } = window.firebaseFunctions;
  const db = window.db;

  try {
    const solRef = ref(db, `solicitacoes/${idSolicitacao}`);
    const snapshot = await get(solRef);

    if (!snapshot.exists()) {
      throw new Error(`Solicitação ${idSolicitacao} não encontrada`);
    }

    const solicitacao = snapshot.val();
    const versaoAtual = solicitacao.versaoAtual || 1;
    const versoes = solicitacao.versoes || {};

    // Converter objeto de versões em array ordenado
    const versoesArray = Object.keys(versoes)
      .map((key) => ({
        numero: parseInt(key),
        ...versoes[key],
      }))
      .sort((a, b) => a.numero - b.numero);

    return {
      id: idSolicitacao,
      versaoAtual,
      criadoPor: solicitacao.criadoPor,
      criadoEm: solicitacao.criadoEm,
      versoes: versoesArray,
    };
  } catch (error) {
    console.error("Erro ao obter histórico:", error);
    throw error;
  }
}

// =======================================================
//  8. OBTER VERSÃO ESPECÍFICA
// =======================================================

/**
 * Retorna os dados de uma versão específica
 * @param {number} idSolicitacao - ID da solicitação
 * @param {number} versao - Número da versão
 * @returns {Promise<Object>} Dados da versão
 */
export async function obterVersao(idSolicitacao, versao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get } = window.firebaseFunctions;
  const db = window.db;

  try {
    const versaoRef = ref(db, `solicitacoes/${idSolicitacao}/versoes/${versao}`);
    const snapshot = await get(versaoRef);

    if (!snapshot.exists()) {
      throw new Error(`Versão ${versao} da solicitação ${idSolicitacao} não encontrada`);
    }

    return {
      numero: versao,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error("Erro ao obter versão:", error);
    throw error;
  }
}

// =======================================================
//  9. OBTER VERSÃO ATUAL
// =======================================================

/**
 * Retorna os dados da versão atual (ativa)
 * @param {number} idSolicitacao - ID da solicitação
 * @returns {Promise<Object>} Dados da versão atual
 */
export async function obterVersaoAtual(idSolicitacao) {
  if (!window.db || !window.firebaseFunctions) {
    throw new Error("Firebase não inicializado");
  }

  const { ref, get } = window.firebaseFunctions;
  const db = window.db;

  try {
    const solRef = ref(db, `solicitacoes/${idSolicitacao}`);
    const snapshot = await get(solRef);

    if (!snapshot.exists()) {
      throw new Error(`Solicitação ${idSolicitacao} não encontrada`);
    }

    const solicitacao = snapshot.val();
    const versaoAtual = solicitacao.versaoAtual || 1;

    return obterVersao(idSolicitacao, versaoAtual);
  } catch (error) {
    console.error("Erro ao obter versão atual:", error);
    throw error;
  }
}

// =======================================================
//  10. HELPERS / UTILITÁRIOS
// =======================================================

/**
 * Formata o status da versão para exibição
 * @param {string} status - Status da versão
 * @returns {string} Status formatado
 */
export function formatarStatusVersao(status) {
  const statusMap = {
    criado: "Criado",
    fila: "Na Fila",
    solicitado: "Aguardando Gestor",
    atribuido: "Atribuído",
    reprovado: "Reprovado",
    em_andamento: "Em Andamento",
    processando: "Processando",
    aguardando: "Aguardando Dados",
    aguardando_aprovacao: "Aguardando Aprovação",
    finalizado: "Finalizado",
  };
  return statusMap[status] || status;
}

/**
 * Retorna a classe CSS para o status
 * @param {string} status - Status da versão
 * @returns {string} Classe CSS
 */
export function obterClasseStatus(status) {
  const classMap = {
    criado: "status-fila",
    fila: "status-fila",
    solicitado: "status-aguardando",
    atribuido: "status-processando",
    reprovado: "status-reprovado",
    em_andamento: "status-processando",
    processando: "status-processando",
    aguardando: "status-aguardando",
    aguardando_aprovacao: "status-aguardando",
    finalizado: "status-finalizado",
  };
  return classMap[status] || "status-fila";
}

/**
 * Verifica se uma versão pode ser editada
 * @param {Object} versao - Dados da versão
 * @returns {boolean} True se pode ser editada
 */
export function podeEditarVersao(versao) {
  const statusEditaveis = ["criado", "solicitado", "reprovado"];
  return statusEditaveis.includes(versao.status);
}

/**
 * Verifica se uma versão pode ser aprovada
 * @param {Object} versao - Dados da versão
 * @returns {boolean} True se pode ser aprovada
 */
export function podeAprovarVersao(versao) {
  return versao.status === "solicitado";
}

/**
 * Verifica se uma versão pode ser iniciada
 * @param {Object} versao - Dados da versão
 * @returns {boolean} True se pode ser iniciada
 */
export function podeIniciarVersao(versao) {
  return versao.status === "atribuido";
}

/**
 * Verifica se uma versão pode ser finalizada
 * @param {Object} versao - Dados da versão
 * @returns {boolean} True se pode ser finalizada
 */
export function podeFinalizarVersao(versao) {
  return versao.status === "em_andamento";
}

// Exportar todas as funções para uso global
if (typeof window !== "undefined") {
  window.versioningModule = {
    criarSolicitacaoInicial,
    solicitarAjuste,
    aprovarAjustePendente,
    reprovarAjustePendente,
    obterAjustesPendentes,
    iniciarAjuste,
    finalizarAjuste,
    obterHistoricoSolicitacao,
    obterVersao,
    obterVersaoAtual,
    formatarStatusVersao,
    obterClasseStatus,
    podeEditarVersao,
    podeAprovarVersao,
    podeIniciarVersao,
    podeFinalizarVersao,
  };
}
