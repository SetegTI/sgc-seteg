import { supabase } from "../../services/supabaseClient.js";

// Status válidos do sistema
const STATUS_VALIDOS = {
  FILA: "fila",
  EM_ANDAMENTO: "em_andamento",
  AJUSTES_PENDENTES: "ajustes_pendentes",
  CONCLUIDO: "concluido",
};

export async function criarSolicitacao(cliente, empreendimento, usuarioId) {
  const { data, error } = await supabase
    .from("solicitacoes")
    .insert([
      {
        cliente: cliente,
        empreendimento: empreendimento,
        status: STATUS_VALIDOS.FILA, // Status inicial sempre "fila"
        criado_por: usuarioId,
      },
    ])
    .select();

  if (error) {
    console.error("Erro ao criar solicitação:", error);
    return null;
  }

  return data[0];
}

export async function listarSolicitacoes() {
  // 2️⃣ FILTRAR: Não mostrar registros deletados
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*")
    .is("deletado_em", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar solicitações:", error);
    return [];
  }

  return data;
}

export { STATUS_VALIDOS };
