import { supabase } from "./supabaseClient.js";

export async function registrarLog(acao, entidade, entidadeId, dados = {}) {
  try {
    await supabase.from("system_logs").insert({
      acao: acao,
      entidade: entidade,
      entidade_id: entidadeId,
      dados: dados,
    });
  } catch (erro) {
    console.warn("Erro ao registrar log:", erro);
  }
}
