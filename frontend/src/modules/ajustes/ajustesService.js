/**
 * SGC SETEG - Serviço de Ajustes (Supabase)
 * Gerencia ajustes e versionamento de solicitações
 */

import { supabase } from "../../services/supabaseClient.js";
import { registrarLog } from "../../services/logService.js";

// ============================================
// SOLICITAR AJUSTE
// ============================================
// SOLICITAR AJUSTE
// ============================================
export async function solicitarAjuste(idSolicitacao, dadosAjuste, usuarioId) {
  try {
    // Buscar versão atual da solicitação
    const { data: versoes, error: erroVersoes } = await supabase
      .from("solicitacao_versoes")
      .select("*")
      .eq("solicitacao_id", idSolicitacao)
      .order("numero_versao", { ascending: false })
      .limit(1);

    if (erroVersoes || !versoes || versoes.length === 0) {
      throw new Error("Versão atual não encontrada");
    }

    const versaoAtual = versoes[0];

    // Criar ajuste pendente com dados completos
    const { data: ajuste, error: erroAjuste } = await supabase
      .from("ajustes")
      .insert([
        {
          solicitacao_id: idSolicitacao,
          versao_origem: versaoAtual.numero_versao,
          descricao: dadosAjuste.observacoes || "",
          status: "aguardando_aprovacao",
          tecnico_responsavel: null,
          prazo_final: dadosAjuste.prazoFinal || null,
          dados: {
            tipoAjuste: dadosAjuste.tipoAjuste || "",
            observacoes: dadosAjuste.observacoes || "",
            diretorioReferencia: dadosAjuste.diretorioReferencia || "",
            diretorioSalvamento: dadosAjuste.diretorioSalvamento || "",
            prazoFinal: dadosAjuste.prazoFinal || null,
            solicitadoPor: dadosAjuste.solicitadoPor || "Sistema",
            dataSolicitacao: new Date().toISOString(),
          },
        },
      ])
      .select()
      .single();

    if (erroAjuste) {
      console.error("Erro detalhado do Supabase:", erroAjuste);
      throw new Error(erroAjuste.message || "Erro ao criar ajuste");
    }

    return ajuste.id;
  } catch (erro) {
    console.error("Erro ao solicitar ajuste:", erro);
    throw erro;
  }
}

// ============================================
// APROVAR AJUSTE E CRIAR NOVA VERSÃO
// ============================================
export async function aprovarAjustePendente(
  idSolicitacao,
  idAjuste,
  gestorId,
  tecnicoId,
) {
  try {
    // 6️⃣ VALIDAÇÃO: Verificar se solicitação existe e não está deletada
    const { data: solicitacaoExiste, error: erroVerificacao } = await supabase
      .from("solicitacoes")
      .select("id")
      .eq("id", idSolicitacao)
      .is("deletado_em", null)
      .single();

    if (erroVerificacao || !solicitacaoExiste) {
      throw new Error("Solicitação não encontrada");
    }

    // Buscar ajuste
    const { data: ajuste, error: erroAjuste } = await supabase
      .from("ajustes")
      .select("*")
      .eq("id", idAjuste)
      .single();

    if (erroAjuste || !ajuste) {
      throw new Error("Ajuste não encontrado");
    }

    // Buscar versão base
    const { data: versaoBase, error: erroVersaoBase } = await supabase
      .from("solicitacao_versoes")
      .select("*")
      .eq("solicitacao_id", idSolicitacao)
      .eq("numero_versao", ajuste.versao_origem)
      .single();

    if (erroVersaoBase || !versaoBase) {
      throw new Error("Versão base não encontrada");
    }

    // 5️⃣ BUSCAR MAIOR VERSÃO EXISTENTE
    const { data: versoes, error: erroVersoes } = await supabase
      .from("solicitacao_versoes")
      .select("numero_versao")
      .eq("solicitacao_id", idSolicitacao)
      .order("numero_versao", { ascending: false })
      .limit(1);

    if (erroVersoes) {
      throw new Error("Erro ao buscar versões");
    }

    // Calcular próximo número de versão
    const maiorVersao =
      versoes && versoes.length > 0 ? versoes[0].numero_versao : 0;
    const novaVersao = maiorVersao + 1;

    // 4️⃣ VALIDAÇÃO: Número de versão deve ser > 0
    if (novaVersao <= 0) {
      throw new Error("Número de versão inválido");
    }

    // Criar nova versão
    const dadosNovaVersao = {
      ...versaoBase.dados,
      status: "em_andamento", // Status válido
      dataAjuste: new Date().toISOString(),
      aprovadoPor: gestorId,
      dataAprovacao: new Date().toISOString(),
      tecnicoResponsavel: tecnicoId,
    };

    const { data: novaVersaoCriada, error: erroNovaVersao } = await supabase
      .from("solicitacao_versoes")
      .insert([
        {
          solicitacao_id: idSolicitacao,
          numero_versao: novaVersao,
          dados: dadosNovaVersao,
          tipo: "ajuste",
          criado_por: null, // NULL permitido - gestor aprovou
        },
      ])
      .select()
      .single();

    if (erroNovaVersao) {
      console.error("Erro detalhado ao criar versão:", erroNovaVersao);
      console.error("Dados enviados:", {
        solicitacao_id: idSolicitacao,
        numero_versao: novaVersao,
        dados: dadosNovaVersao,
        tipo: "ajuste",
        criado_por: gestorId,
      });
      throw new Error(erroNovaVersao.message || "Erro ao criar nova versão");
    }

    // Atualizar ajuste para aprovado
    const { error: erroUpdateAjuste } = await supabase
      .from("ajustes")
      .update({
        status: "aprovado",
        tecnico_responsavel: tecnicoId,
      })
      .eq("id", idAjuste);

    if (erroUpdateAjuste) {
      console.error("Erro detalhado ao atualizar ajuste:", erroUpdateAjuste);
      console.error("ID do ajuste:", idAjuste);
      console.error("Técnico:", tecnicoId);
      throw new Error(erroUpdateAjuste.message || "Erro ao atualizar ajuste");
    }

    // Atualizar status da solicitação
    await supabase
      .from("solicitacoes")
      .update({ status: "em_andamento" }) // Status válido
      .eq("id", idSolicitacao);

    // 6️⃣ LOG: Registrar aprovação de ajuste
    await registrarLog("aprovar_ajuste", "ajustes", idAjuste, {
      solicitacao_id: idSolicitacao,
      tecnico_responsavel: tecnicoId,
      nova_versao: novaVersao,
    });

    return novaVersao;
  } catch (erro) {
    console.error("Erro ao aprovar ajuste:", erro);
    throw erro;
  }
}

// ============================================
// REPROVAR AJUSTE
// ============================================
export async function reprovarAjustePendente(
  idSolicitacao,
  idAjuste,
  gestorId,
  motivo,
) {
  try {
    const { error } = await supabase
      .from("ajustes")
      .update({
        status: "reprovado",
        descricao: motivo,
      })
      .eq("id", idAjuste);

    if (error) {
      throw new Error("Erro ao reprovar ajuste");
    }
  } catch (erro) {
    console.error("Erro ao reprovar ajuste:", erro);
    throw erro;
  }
}

// ============================================
// OBTER AJUSTES PENDENTES
// ============================================
export async function obterAjustesPendentes(idSolicitacao) {
  try {
    const { data, error } = await supabase
      .from("ajustes")
      .select("*")
      .eq("solicitacao_id", idSolicitacao)
      .eq("status", "aguardando_aprovacao")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Erro ao buscar ajustes pendentes");
    }

    return data || [];
  } catch (erro) {
    console.error("Erro ao obter ajustes pendentes:", erro);
    return [];
  }
}

// ============================================
// OBTER HISTÓRICO COMPLETO
// ============================================
export async function obterHistoricoSolicitacao(idSolicitacao) {
  try {
    // Buscar solicitação (não deletada)
    const { data: solicitacao, error: erroSol } = await supabase
      .from("solicitacoes")
      .select("*")
      .eq("id", idSolicitacao)
      .is("deletado_em", null)
      .single();

    if (erroSol || !solicitacao) {
      throw new Error("Solicitação não encontrada");
    }

    // Buscar todas as versões
    const { data: versoes, error: erroVersoes } = await supabase
      .from("solicitacao_versoes")
      .select("*")
      .eq("solicitacao_id", idSolicitacao)
      .order("numero_versao", { ascending: true });

    if (erroVersoes) {
      throw new Error("Erro ao buscar versões");
    }

    // Buscar ajustes
    const { data: ajustes, error: erroAjustes } = await supabase
      .from("ajustes")
      .select("*")
      .eq("solicitacao_id", idSolicitacao)
      .order("created_at", { ascending: true });

    const versaoAtual =
      versoes && versoes.length > 0
        ? Math.max(...versoes.map((v) => v.numero_versao))
        : 1;

    return {
      id: idSolicitacao,
      versaoAtual,
      statusAtual: solicitacao.status,
      criadoPor: solicitacao.criado_por,
      criadoEm: solicitacao.created_at,
      versoes: versoes || [],
      ajustes: ajustes || [],
    };
  } catch (erro) {
    console.error("Erro ao obter histórico:", erro);
    throw erro;
  }
}

// ============================================
// HELPERS
// ============================================
export function formatarStatusVersao(status) {
  const statusMap = {
    criado: "Criado",
    fila: "Na Fila",
    solicitado: "Aguardando Gestor",
    atribuido: "Atribuído",
    reprovado: "Reprovado",
    em_andamento: "Em Andamento",
    ajustes_pendentes: "Ajustes Pendentes",
    aguardando_aprovacao: "Aguardando Aprovação",
    concluido: "Concluído",
  };
  return statusMap[status] || status;
}

export function obterClasseStatus(status) {
  const classMap = {
    criado: "status-fila",
    fila: "status-fila",
    solicitado: "status-aguardando",
    atribuido: "status-processando",
    reprovado: "status-reprovado",
    em_andamento: "status-processando",
    ajustes_pendentes: "status-aguardando",
    aguardando_aprovacao: "status-aguardando",
    concluido: "status-finalizado",
  };
  return classMap[status] || "status-fila";
}
