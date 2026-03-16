/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ano: 2026
 * Empresa: SETEG
 *
 * Serviço de usuários — autenticação por código de acesso
 */

import { supabase } from "../../services/supabaseClient.js";

export async function buscarUsuarioPorCodigo(codigo) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("codigo_acesso", codigo)
    .single();

  if (error) {
    console.error("Erro ao buscar usuário:", error);
    return null;
  }

  return data;
}

export async function autenticarUsuario(codigoDigitado) {
  const usuario = await buscarUsuarioPorCodigo(codigoDigitado);

  if (!usuario) {
    return {
      sucesso: false,
      mensagem: "Código de acesso inválido",
    };
  }

  return {
    sucesso: true,
    usuario: usuario,
  };
}
