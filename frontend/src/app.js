/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ano: 2026
 * Empresa: SETEG
 */

import { supabase } from "./services/supabaseClient.js";
import { autenticarUsuario } from "./modules/usuarios/usuariosService.js";
import { registrarLog } from "./services/logService.js";
import {
  criarSolicitacao,
  listarSolicitacoes,
} from "./modules/solicitacoes/solicitacoesService.js";
import {
  solicitarAjuste,
  aprovarAjustePendente,
  reprovarAjustePendente,
  obterAjustesPendentes,
  obterHistoricoSolicitacao,
  formatarStatusVersao,
  obterClasseStatus,
} from "./modules/ajustes/ajustesService.js";
import {
  abrirModalHistorico,
  fecharModalHistorico,
} from "./modules/ajustes/historicoModal.js";
import { getStatusClass } from "./constants/status.js";

// Variáveis globais
let solicitacoes = [];
let acessoGestor = false;
let acessoTecnico = false;
let tecnicoLogado = null;
let currentTheme = "dark";
let filtroAtual = null; // Armazena o filtro atual selecionado

// Paginação
let paginaAtual = 1;
let itensPorPagina = 10;

// Restaurar login do localStorage
function restaurarLogin() {
  const loginSalvo = localStorage.getItem("sgc_login");
  if (loginSalvo) {
    try {
      const dados = JSON.parse(loginSalvo);
      if (dados.tipo === "gestor") {
        acessoGestor = true;
      } else if (dados.tipo === "tecnico" && dados.tecnico) {
        acessoTecnico = true;
        tecnicoLogado = dados.tecnico;
      }
    } catch (e) {
      console.error("Erro ao restaurar sessão:", e);
    }
  }
}

// Mostrar painéis após restaurar login
function mostrarPaineisLogin() {
  if (acessoGestor) {
    const painelGestor = document.getElementById("painelGestor");
    if (painelGestor) painelGestor.style.display = "block";

    const painelTecnico = document.getElementById("painelTecnico");
    if (painelTecnico) painelTecnico.style.display = "none";
  } else if (acessoTecnico && tecnicoLogado) {
    const painelTecnico = document.getElementById("painelTecnico");
    if (painelTecnico) painelTecnico.style.display = "block";

    const painelGestor = document.getElementById("painelGestor");
    if (painelGestor) painelGestor.style.display = "none";
  }
}

// Salvar login no localStorage
function salvarLogin(tipo, tecnico = null) {
  const dados = { tipo };
  if (tecnico) dados.tecnico = tecnico;
  localStorage.setItem("sgc_login", JSON.stringify(dados));
}

// Limpar login do localStorage
function limparLogin() {
  localStorage.removeItem("sgc_login");
}

// Referências DOM
let formSolicitacao,
  tabelaSolicitacoes,
  emptyState,
  modalDetalhes,
  conteudoDetalhes,
  modalAcessoGestor,
  modalAcessoTecnico,
  modalAtribuicao,
  conteudoAtribuicao,
  modalConfirmacao,
  conteudoConfirmacao,
  modalRelatorio,
  listaTecnicos,
  estatisticasTecnico,
  tabBtns;

// Funções Auxiliares
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}

function formatDateBR(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatarStatus(status) {
  const map = {
    // Status válidos do sistema
    fila: "Na Fila",
    em_andamento: "Em Andamento",
    ajustes_pendentes: "Ajustes Pendentes",
    concluido: "Concluído",
    // Status de versionamento (legado - manter para compatibilidade)
    criado: "Criado",
    solicitado: "Aguardando Gestor",
    atribuido: "Atribuído",
    reprovado: "Reprovado",
    aguardando_aprovacao: "Aguardando Aprovação",
  };
  return map[status] || status;
}

function formatarTipoMapa(tipo, nomeOutro) {
  const map = {
    planta: "Planta de Situação",
    localizacao: "Mapa de Localização",
    outros: nomeOutro || "Outros",
  };
  return map[tipo] || tipo;
}

// Cache de técnicos carregada do banco
let cacheTecnicos = {}; // { "ISMAEL": "Ismael Alves", ... }

async function carregarCacheTecnicos() {
  try {
    const { data, error } = await supabase
      .from("usuarios")
      .select("nome, codigo_acesso")
      .eq("role", "tecnico");
    if (error || !data) return;
    // Montar mapa: PRIMEIRANOME -> nome completo
    cacheTecnicos = {};
    data.forEach((u) => {
      const chave = u.nome
        .split(" ")[0]
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // remove acentos
      cacheTecnicos[chave] = u.nome;
    });
  } catch (e) {
    console.warn("Erro ao carregar técnicos:", e);
  }
}

function formatarNomeTecnico(codigo) {
  if (!codigo || codigo === "PENDENTE") return "Não atribuído";
  return cacheTecnicos[codigo] || codigo;
}

function formatarFinalidade(finalidade) {
  const map = {
    LICENCIAMENTO: "Licenciamento Ambiental",
    ESTUDO_IMPACTO: "Estudo de Impacto Ambiental",
    PRE_CAMPO: "Pré-Campo",
    POS_CAMPO: "Pós-Campo",
    PLANEJAMENTO: "Planejamento Territorial",
    OUTROS: "Outros",
  };
  return map[finalidade] || finalidade;
}

function mostrarNotificacao(mensagem, tipo = "info") {
  const notif = document.createElement("div");
  notif.className = `notification ${tipo}`;

  // Ícone baseado no tipo
  const icones = {
    success: '<i class="bi bi-check-circle-fill"></i>',
    error: '<i class="bi bi-x-circle-fill"></i>',
    warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
    info: '<i class="bi bi-info-circle-fill"></i>',
  };

  notif.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${icones[tipo] || icones.info}</span>
      <span class="notification-message">${mensagem}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="bi bi-x"></i>
      </button>
    </div>
  `;

  document.body.appendChild(notif);

  setTimeout(() => notif.classList.add("show"), 10);
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 300);
  }, 5000); // 5 segundos
}

// Funções do Loader Global
function mostrarLoader(texto = "Carregando...") {
  const loader = document.getElementById("globalLoader");
  const loaderText = loader?.querySelector(".loader-text");
  if (loader) {
    if (loaderText) loaderText.textContent = texto;
    loader.style.display = "flex";
  }
}

function esconderLoader() {
  const loader = document.getElementById("globalLoader");
  if (loader) {
    loader.style.display = "none";
  }
}

function bindEnterNoModal(modal, callback) {
  if (!modal) return;
  const input = modal.querySelector('input[type="password"]');
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        callback();
      }
    });
  }
}

function convertToCSV(data) {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);

  const rows = data.map((obj) =>
    headers
      .map((h) => {
        const v = obj[h] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(dataArray, filename) {
  const csv = convertToCSV(dataArray);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function safeSetDisplay(id, val) {
  const el = document.getElementById(id);
  if (el) el.style.display = val;
}

function setInputDate(id, date) {
  const el = document.getElementById(id);
  if (el && date instanceof Date && !isNaN(date))
    el.value = date.toISOString().split("T")[0];
}

function calcularDataConclusao(dataInicio, prazoDias) {
  const data = parseDateOnly(dataInicio);
  if (!data) return null;

  let dias = 0;
  while (dias < prazoDias) {
    data.setDate(data.getDate() + 1);
    if (data.getDay() !== 0 && data.getDay() !== 6) dias++;
  }
  return data.toISOString().split("T")[0];
}

// Fecha o modal visível no momento (usado pelo ESC e clique fora)
function fecharModalVisivel() {
  const modalHistorico = document.getElementById("modalHistorico");
  const modalAjuste = document.getElementById("modalAjuste");
  const modalAjustesPendentes = document.getElementById(
    "modalAjustesPendentes",
  );
  const modalReprovacao = document.getElementById("modalConfirmarReprovacao");

  if (modalHistorico?.classList.contains("active")) {
    window.fecharModalHistorico();
  } else if (modalAjuste?.classList.contains("active")) {
    fecharModalAjuste();
  } else if (modalAjustesPendentes?.style.display === "flex") {
    fecharModalAjustesPendentes();
  } else if (modalDetalhes?.classList.contains("active")) {
    fecharModal();
  } else if (modalAcessoGestor?.classList.contains("active")) {
    fecharModalAcessoGestor();
  } else if (modalAcessoTecnico?.classList.contains("active")) {
    fecharModalAcessoTecnico();
  } else if (modalAtribuicao?.classList.contains("active")) {
    fecharModalAtribuicao();
  } else if (modalConfirmacao?.classList.contains("active")) {
    fecharModalConfirmacao();
  } else if (modalReprovacao?.style.display === "flex") {
    fecharModalConfirmarReprovacao();
  } else if (modalRelatorio?.classList.contains("active")) {
    fecharModalRelatorio();
  }
}

// Confirma a ação do modal visível ao pressionar ENTER
function confirmarModalVisivel(e) {
  // Não disparar se o foco estiver em textarea ou select
  if (["TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

  const modalAcessoGestorEl = document.getElementById("modalAcessoGestor");
  const modalAcessoTecnicoEl = document.getElementById("modalAcessoTecnico");
  const modalConfirmacaoEl = document.getElementById("modalConfirmacao");
  const modalAtribuicaoEl = document.getElementById("modalAtribuicao");
  const modalAjusteEl = document.getElementById("modalAjuste");
  const modalReprovacao = document.getElementById("modalConfirmarReprovacao");

  if (modalAcessoGestorEl?.classList.contains("active")) {
    e.preventDefault();
    validarCodigoAcesso();
  } else if (modalAcessoTecnicoEl?.classList.contains("active")) {
    e.preventDefault();
    validarAcessoTecnico();
  } else if (modalConfirmacaoEl?.classList.contains("active")) {
    e.preventDefault();
    modalConfirmacaoEl.querySelector(".btn-danger")?.click();
  } else if (modalAtribuicaoEl?.classList.contains("active")) {
    e.preventDefault();
    const id = modalAtribuicaoEl.dataset.solicitacaoId;
    if (id) atribuirTecnico(Number(id));
  } else if (modalAjusteEl?.classList.contains("active")) {
    e.preventDefault();
    confirmarSolicitarAjuste();
  } else if (modalReprovacao?.style.display === "flex") {
    e.preventDefault();
    confirmarReprovacaoAjuste();
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Carregar tema salvo
  currentTheme = localStorage.getItem("theme") || "dark";
  applyTheme(currentTheme);

  // Restaurar login salvo
  restaurarLogin();

  // Inicializar referências DOM
  formSolicitacao = document.getElementById("solicitacaoForm");
  tabelaSolicitacoes = document.querySelector("#tabelaSolicitacoes tbody");
  emptyState = document.getElementById("emptyState");

  modalDetalhes = document.getElementById("modalDetalhes");
  conteudoDetalhes = document.getElementById("conteudoDetalhes");

  modalAcessoGestor = document.getElementById("modalAcessoGestor");
  modalAcessoTecnico = document.getElementById("modalAcessoTecnico");

  modalAtribuicao = document.getElementById("modalAtribuicao");
  conteudoAtribuicao = document.getElementById("conteudoAtribuicao");

  modalConfirmacao = document.getElementById("modalConfirmacao");
  conteudoConfirmacao = document.getElementById("conteudoConfirmacao");

  modalRelatorio = document.getElementById("modalRelatorio");

  listaTecnicos = document.getElementById("listaTecnicos");
  estatisticasTecnico = document.getElementById("estatisticasTecnico");

  tabBtns = document.querySelectorAll(".tab-btn");

  // Bind eventos
  formSolicitacao?.addEventListener("submit", salvarSolicitacao);

  // Botão Nova Solicitação
  const btnToggleForm = document.getElementById("btnToggleForm");
  btnToggleForm?.addEventListener("click", toggleForm);

  // Botão toggle theme
  const btnToggleTheme = document.querySelector(".theme-toggle");
  btnToggleTheme?.addEventListener("click", toggleTheme);

  // Botões de acesso
  const btnAcessoGestor = document.getElementById("btnAcessoGestor");
  btnAcessoGestor?.addEventListener("click", abrirModalAcessoGestor);

  const btnAcessoTecnico = document.getElementById("btnAcessoTecnico");
  btnAcessoTecnico?.addEventListener("click", abrirModalAcessoTecnico);

  // Botão Limpar Formulário
  const btnLimparForm = document.getElementById("btnLimparForm");
  btnLimparForm?.addEventListener("click", limparForm);

  // Event listeners para campos condicionais
  const tipoMapaSelect = document.getElementById("tipoMapa");
  tipoMapaSelect?.addEventListener("change", toggleTipoMapaOutros);

  const artNecessariaRadios = document.querySelectorAll(
    'input[name="artNecessaria"]',
  );
  artNecessariaRadios.forEach((radio) => {
    radio.addEventListener("change", toggleARTResponsavel);
  });

  // Tabs de filtro
  tabBtns.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // Filtros baseados no índice
      const filtros = [
        "todas",
        "fila",
        "em_andamento",
        "ajustes_pendentes",
        "concluido",
      ];
      atualizarTabela(filtros[index]);
    });
  });

  bindEnterNoModal(modalAcessoGestor, validarCodigoAcesso);
  bindEnterNoModal(modalAcessoTecnico, validarAcessoTecnico);

  // Aplicar máscaras de data
  aplicarMascaraData(document.getElementById("dataSolicitacao"));
  aplicarMascaraData(document.getElementById("dataEntrega"));
  aplicarMascaraData(document.getElementById("relatorioPeriodoInicio"));
  aplicarMascaraData(document.getElementById("relatorioPeriodoFim"));

  // Inicializar seletores de data nativos
  inicializarSeletoresData();

  // Validação de limite de caracteres em textareas
  validarLimiteTextareas();

  // Fechar modais com ESC e clique fora
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharModalVisivel();
    }
    if (e.key === "Enter") {
      confirmarModalVisivel(e);
    }
  });

  // Fechar modal ao clicar no backdrop (fora do conteúdo)
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      fecharModalVisivel();
    }
  });

  // CARREGAR SOLICITAÇÕES DO SUPABASE
  carregarCacheTecnicos().then(() => carregarSolicitacoes());

  // Mostrar painéis após DOM estar pronto
  mostrarPaineisLogin();
  atualizarIndicadorLogin();
});

// Theme Toggle
function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
  localStorage.setItem("theme", currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  const slider = document.querySelector(".theme-toggle-slider");
  if (slider) {
    if (theme === "light") {
      slider.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
      slider.innerHTML = '<i class="bi bi-moon-fill"></i>';
    }
  }
}

// ============================================
// CARREGAR SOLICITAÇÕES DO SUPABASE
// ============================================
async function carregarSolicitacoes() {
  try {
    // Buscar solicitações com apenas a versão mais recente (não todas as versões)
    const { data: listaSolicitacoes, error: erroSolicitacoes } = await supabase
      .from("solicitacoes")
      .select(
        "id,cliente,empreendimento,status,tecnico_responsavel,data_conclusao_prevista,data_conclusao_real,criado_por,created_at",
      )
      .is("deletado_em", null)
      .order("created_at", { ascending: false });

    if (erroSolicitacoes) {
      console.error("Erro ao carregar solicitações:", erroSolicitacoes);
      mostrarNotificacao("Erro ao carregar solicitações", "error");
      return;
    }

    if (!listaSolicitacoes || listaSolicitacoes.length === 0) {
      solicitacoes = [];
      atualizarTabela("todas");
      atualizarEstatisticas();
      atualizarListaTecnicos();
      atualizarEstatisticasTecnico();
      return;
    }

    // Buscar apenas a versão mais recente de cada solicitação em uma única query
    const ids = listaSolicitacoes.map((s) => s.id);
    const { data: versoes, error: erroVersoes } = await supabase
      .from("solicitacao_versoes")
      .select("solicitacao_id,numero_versao,dados")
      .in("solicitacao_id", ids)
      .order("numero_versao", { ascending: false });

    if (erroVersoes) {
      console.error("Erro ao carregar versões:", erroVersoes);
    }

    // Montar mapa: solicitacao_id -> versão mais recente (já vem ordenado desc)
    const versaoMaisRecente = {};
    if (versoes) {
      for (const v of versoes) {
        if (!versaoMaisRecente[v.solicitacao_id]) {
          versaoMaisRecente[v.solicitacao_id] = v;
        }
      }
    }

    // Montar array final
    solicitacoes = listaSolicitacoes.map((sol) => {
      const versao = versaoMaisRecente[sol.id];

      if (versao) {
        return {
          id: sol.id,
          ...versao.dados,
          status: sol.status,
          tecnicoResponsavel:
            sol.tecnico_responsavel ||
            versao.dados.tecnicoResponsavel ||
            "PENDENTE",
          dataConclusaoPrevista:
            sol.data_conclusao_prevista ||
            versao.dados.dataConclusaoPrevista ||
            null,
          dataConclusaoReal:
            sol.data_conclusao_real || versao.dados.dataConclusaoReal || null,
          versaoAtual: versao.numero_versao,
          criadoPor: versao.dados.solicitadoPor || "Sistema",
          criadoEm: sol.created_at,
        };
      }

      return {
        id: sol.id,
        cliente: sol.cliente,
        empreendimento: sol.empreendimento,
        status: sol.status,
        tecnicoResponsavel: sol.tecnico_responsavel || "PENDENTE",
        dataConclusaoPrevista: sol.data_conclusao_prevista || null,
        dataConclusaoReal: sol.data_conclusao_real || null,
        criadoEm: sol.created_at,
        solicitante: "Sistema",
        nomeEstudo: "Não informado",
      };
    });

    atualizarTabela("todas");
    atualizarEstatisticas();
    atualizarListaTecnicos();
    atualizarEstatisticasTecnico();

    // Remover loader inicial após carregar solicitações
    setTimeout(() => {
      const loader = document.getElementById("initial-loader");
      if (loader && !loader.classList.contains("hidden")) {
        document.body.classList.add("loaded");
        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 300);
      }
    }, 200);
  } catch (erro) {
    console.error("Erro ao carregar solicitações:", erro);
    mostrarNotificacao("Erro ao carregar solicitações", "error");
  }
}

// ============================================
// SALVAR NOVA SOLICITAÇÃO NO SUPABASE
// ============================================
async function salvarNovaSolicitacao(dados) {
  try {
    // Validação: Status inicial deve ser "fila"
    const statusInicial = "fila";

    // Inserir solicitação principal
    // IMPORTANTE: criado_por = NULL - qualquer pessoa da empresa pode criar
    const { data: solicitacao, error: erroSolicitacao } = await supabase
      .from("solicitacoes")
      .insert({
        cliente: dados.cliente,
        empreendimento: dados.empreendimento,
        status: statusInicial, // Sempre "fila" para novas solicitações
        tecnico_responsavel: "PENDENTE",
        criado_por: null,
      })
      .select()
      .single();

    if (erroSolicitacao) {
      console.error("Supabase error:", erroSolicitacao);
      console.error(
        "Detalhes do erro:",
        JSON.stringify(erroSolicitacao, null, 2),
      );
      mostrarNotificacao("Erro ao salvar solicitação!", "error");
      return false;
    }

    // 3️⃣ VALIDAÇÃO: Verificar se solicitação foi criada
    if (!solicitacao || !solicitacao.id) {
      console.error("Solicitação não foi criada corretamente");
      mostrarNotificacao("Erro ao criar solicitação!", "error");
      return false;
    }

    // 4️⃣ VALIDAÇÃO: Número de versão inicial
    const numeroVersaoInicial = 1;

    if (numeroVersaoInicial <= 0) {
      throw new Error("Número de versão inválido");
    }

    // Inserir versão inicial com todos os dados
    const dadosVersao = {
      ...dados,
      id: solicitacao.id,
      status: statusInicial,
      dataCriacao: new Date().toISOString(),
      solicitadoPor: dados.solicitante,
      tecnicoResponsavel: "PENDENTE",
    };

    const { error: erroVersao } = await supabase
      .from("solicitacao_versoes")
      .insert({
        solicitacao_id: solicitacao.id, // 6️⃣ ID validado acima
        numero_versao: numeroVersaoInicial, // Sempre 1 para primeira versão
        dados: dadosVersao,
        tipo: "original",
        criado_por: null,
      });

    if (erroVersao) {
      console.error("Erro ao criar versão:", erroVersao);
      mostrarNotificacao("Erro ao salvar solicitação!", "error");
      return false;
    }

    // 2️⃣ LOG: Registrar criação de solicitação
    await registrarLog("criar_solicitacao", "solicitacoes", solicitacao.id, {
      cliente: solicitacao.cliente,
      empreendimento: solicitacao.empreendimento,
      status: solicitacao.status,
    });

    mostrarNotificacao("Solicitação criada com sucesso!", "success");
    limparForm(false); // false = não mostrar notificação de formulário limpo
    toggleForm();

    await carregarSolicitacoes();

    return true;
  } catch (erro) {
    console.error("Erro ao salvar solicitação:", erro);
    mostrarNotificacao("Erro ao salvar solicitação!", "error");
    return false;
  }
}

// ============================================
// ATUALIZAR SOLICITAÇÃO NO SUPABASE
// ============================================
async function atualizarSolicitacao(id, dados) {
  try {
    // Montar objeto de atualização para a tabela principal (colunas reais)
    const updatePrincipal = {};
    if (dados.status !== undefined) updatePrincipal.status = dados.status;
    if (dados.tecnicoResponsavel !== undefined)
      updatePrincipal.tecnico_responsavel = dados.tecnicoResponsavel;
    if (dados.dataConclusaoPrevista !== undefined)
      updatePrincipal.data_conclusao_prevista =
        dados.dataConclusaoPrevista || null;
    if (dados.dataConclusaoReal !== undefined)
      updatePrincipal.data_conclusao_real = dados.dataConclusaoReal || null;

    // Salvar na tabela principal se houver campos para atualizar
    if (Object.keys(updatePrincipal).length > 0) {
      console.log(
        "[SGC] Tentando atualizar solicitacoes id:",
        id,
        "dados:",
        updatePrincipal,
      );
      const { data: dadosSalvos, error: erroStatus } = await supabase
        .from("solicitacoes")
        .update(updatePrincipal)
        .eq("id", id)
        .select();

      if (erroStatus) {
        console.error(
          "[SGC] ERRO ao atualizar solicitação principal:",
          erroStatus,
        );
        mostrarNotificacao(
          "Erro ao salvar no banco: " + erroStatus.message,
          "error",
        );
        return false;
      }

      console.log(
        "[SGC] Resultado do update na tabela solicitacoes:",
        dadosSalvos,
      );

      if (!dadosSalvos || dadosSalvos.length === 0) {
        console.error(
          "[SGC] UPDATE não afetou nenhuma linha! Verifique RLS no Supabase.",
        );
        mostrarNotificacao(
          "Erro: dado não foi salvo (RLS pode estar bloqueando). Verifique o console.",
          "error",
        );
        return false;
      }
    }

    // Buscar a versão atual para atualizar o JSON também (mantém consistência)
    const { data: versoes, error: erroVersoes } = await supabase
      .from("solicitacao_versoes")
      .select("*")
      .eq("solicitacao_id", id)
      .order("numero_versao", { ascending: false })
      .limit(1);

    if (erroVersoes || !versoes || versoes.length === 0) {
      console.error("Erro ao buscar versão:", erroVersoes);
      return false;
    }

    const versaoAtual = versoes[0];

    // Mesclar dados antigos com novos no JSON
    const dadosAtualizados = {
      ...versaoAtual.dados,
      ...dados,
    };

    // Atualizar o JSON da versão
    const { error: erroUpdate } = await supabase
      .from("solicitacao_versoes")
      .update({ dados: dadosAtualizados })
      .eq("id", versaoAtual.id);

    if (erroUpdate) {
      console.error("Erro ao atualizar versão:", erroUpdate);
      return false;
    }

    return true;
  } catch (erro) {
    console.error("Erro ao atualizar solicitação:", erro);
    return false;
  }
}

async function excluirSolicitacao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  try {
    mostrarLoader("Excluindo solicitação...");

    // 5️⃣ PROTEÇÃO: Verificar se existe e não está deletada
    const solicitacao = solicitacoes.find((s) => s.id === id);
    if (!solicitacao) {
      esconderLoader();
      mostrarNotificacao("Solicitação não encontrada!", "error");
      return;
    }

    if (solicitacao.deletado_em) {
      esconderLoader();
      mostrarNotificacao("Solicitação já foi excluída!", "warning");
      return;
    }

    // 1️⃣ SOFT DELETE: Marcar como deletado ao invés de excluir
    const { error } = await supabase
      .from("solicitacoes")
      .update({ deletado_em: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir:", error);
      esconderLoader();
      mostrarNotificacao("Erro ao excluir!", "error");
      return;
    }

    // Remover da lista local imediatamente
    const index = solicitacoes.findIndex((s) => s.id === id);
    if (index !== -1) {
      solicitacoes.splice(index, 1);
    }

    // 5️⃣ LOG: Registrar exclusão (soft delete)
    await registrarLog("excluir_solicitacao", "solicitacoes", id);

    // Fechar modais e esconder loader ANTES de atualizar
    fecharModalConfirmacao();
    fecharModal();
    esconderLoader();

    mostrarNotificacao(`Solicitação #${id} excluída!`, "success");

    // Atualizar tabela e estatísticas de forma assíncrona (não bloqueia UI)
    setTimeout(() => {
      atualizarTabela(filtroAtual || "todas");
      atualizarEstatisticas();
    }, 0);
  } catch (erro) {
    console.error("Erro ao excluir solicitação:", erro);
    esconderLoader();
    mostrarNotificacao("Erro ao excluir!", "error");
  }
}

// Formulário
function toggleForm() {
  const formSection = document.querySelector(".form-section");
  const btnToggle = document.getElementById("btnToggleForm");
  const isActive = formSection?.classList.toggle("active");

  if (btnToggle) {
    if (isActive) {
      btnToggle.innerHTML =
        '<i class="bi bi-chevron-up"></i> Recolher Formulário';
      formSection?.setAttribute("aria-hidden", "false");
    } else {
      btnToggle.innerHTML =
        '<i class="bi bi-file-earmark-plus"></i> Nova Solicitação';
      formSection?.setAttribute("aria-hidden", "true");
    }
  }
}

function limparForm(mostrarNotif = true) {
  formSolicitacao?.reset();
  safeSetDisplay("tipoMapaOutros", "none");
  safeSetDisplay("artResponsavelContainer", "none");
  safeSetDisplay("campoElementosOutros", "none");

  // Resetar contadores e feedback visual dos textareas
  const textareas = formSolicitacao?.querySelectorAll("textarea[maxlength]");
  textareas?.forEach((textarea) => {
    // Remover classes de limite atingido
    textarea.classList.remove("limite-atingido");

    // Resetar contador
    const helpText =
      textarea.nextElementSibling ||
      textarea.parentElement.querySelector(".help");
    if (helpText) {
      helpText.classList.remove("limite-atingido");
      const charCounter = helpText.querySelector(".char-count");
      if (charCounter) {
        charCounter.textContent = "0";
      }
    }
  });

  // Mostrar notificação apenas se solicitado (quando usuário clica em limpar)
  if (mostrarNotif) {
    mostrarNotificacao("Formulário limpo com sucesso!", "success");
  }
}

function toggleTipoMapaOutros() {
  const select = document.getElementById("tipoMapa");
  const campo = document.getElementById("campoTipoMapaOutros");
  if (campo) {
    campo.style.display = select?.value === "OUTROS" ? "block" : "none";
  }
}

function toggleARTResponsavel() {
  const radioSim = document.querySelector(
    'input[name="artNecessaria"][value="sim"]',
  );
  const campo = document.getElementById("artResponsavelContainer");
  if (campo && radioSim) {
    campo.style.display = radioSim.checked ? "block" : "none";
  }
}

function toggleElementosOutros() {
  const checkbox = document.getElementById("elementoOutros");
  const campo = document.getElementById("campoElementosOutros");
  if (campo) {
    campo.style.display = checkbox?.checked ? "block" : "none";
  }
}

async function salvarSolicitacao(e) {
  e.preventDefault();

  // Proteção contra duplo clique
  if (salvarSolicitacao.processando) {
    mostrarNotificacao("Aguarde, salvando solicitação...", "info");
    return;
  }

  // Verificar se o formulário é válido
  const form = e.target;
  if (!form.checkValidity()) {
    // Mostrar notificação
    mostrarNotificacao("Preencha todos os campos obrigatórios (*)", "warning");

    // Encontrar o primeiro campo inválido e focar nele
    const campoInvalido = form.querySelector(":invalid");
    if (campoInvalido) {
      campoInvalido.focus();
      // Forçar a exibição da mensagem de validação nativa
      campoInvalido.reportValidity();
    }
    return;
  }

  const formData = new FormData(formSolicitacao);

  // Validação customizada: se "Outros" em Elementos do Croqui estiver marcado, o campo texto é obrigatório
  const elementoOutros = formData.get("elementoOutros") === "on";
  const elementoOutrosTexto = formData.get("elementoOutrosTexto")?.trim();

  if (elementoOutros && !elementoOutrosTexto) {
    mostrarNotificacao(
      "Por favor, especifique os outros elementos do croqui!",
      "warning",
    );
    const campoOutrosTexto = document.getElementById("elementoOutrosTexto");
    if (campoOutrosTexto) {
      campoOutrosTexto.focus();
    }
    return;
  }

  // Validação: Data de Entrega deve ser maior ou igual à Data de Solicitação
  const dataSolicitacaoBR = formData.get("dataSolicitacao");
  const dataEntregaBR = formData.get("dataEntrega");

  if (dataSolicitacaoBR && dataEntregaBR) {
    const dataSolicitacaoISO = converterDataParaISO(dataSolicitacaoBR);
    const dataEntregaISO = converterDataParaISO(dataEntregaBR);

    if (dataEntregaISO < dataSolicitacaoISO) {
      mostrarNotificacao(
        "A Data de Entrega não pode ser anterior à Data de Solicitação!",
        "warning",
      );
      const campoDataEntrega = document.getElementById("dataEntrega");
      if (campoDataEntrega) {
        campoDataEntrega.focus();
      }
      return;
    }
  }

  // Marcar como processando
  salvarSolicitacao.processando = true;
  mostrarLoader("Salvando solicitação...");

  const dados = {
    solicitante: formData.get("solicitante"),
    cliente: formData.get("cliente"),
    nomeEstudo: formData.get("nomeEstudo"),
    empreendimento: formData.get("empreendimento"),
    localidade: formData.get("localidade"),
    municipio: formData.get("municipio"),
    tipoMapa: formData.get("tipoMapa"),
    nomeTipoMapa: formData.get("tipoMapaOutrosTexto") || "",
    finalidade: formData.get("finalidade"),
    artNecessaria: formData.get("artNecessaria"),
    artResponsavel: formData.get("artResponsavel") || "",
    diretorioArquivos: formData.get("diretorioArquivos"),
    diretorioSalvamento: formData.get("diretorioSalvamento"),
    observacoes: formData.get("observacoes") || "",
    dataSolicitacao: converterDataParaISO(formData.get("dataSolicitacao")),
    dataEntrega: converterDataParaISO(formData.get("dataEntrega")) || "",
    status: "fila",
    tecnicoResponsavel: "PENDENTE",
    produtos: {
      mapa: formData.get("produtoMapa") === "on",
      croqui: formData.get("produtoCroqui") === "on",
      shapefile: formData.get("produtoShapefile") === "on",
      kml: formData.get("produtoKML") === "on",
    },
    elementos: {
      localizacao: formData.get("elementoLocalizacao") === "on",
      acessoLocal: formData.get("elementoAcessoLocal") === "on",
      acessoRegional: formData.get("elementoAcessoRegional") === "on",
      areaAmostral: formData.get("elementoAreaAmostral") === "on",
      outros: elementoOutros,
      outrosTexto: elementoOutrosTexto || "",
    },
  };

  const sucesso = await salvarNovaSolicitacao(dados);

  // Liberar flag de processamento
  salvarSolicitacao.processando = false;
  esconderLoader();
}

// Acesso Gestor / Técnico
function atualizarIndicadorLogin() {
  const indicator = document.getElementById("loginIndicator");
  const loginText = document.getElementById("loginText");
  const btnGestor = document.getElementById("btnAcessoGestor");
  const btnTecnico = document.getElementById("btnAcessoTecnico");
  const cardNovaSolicitacao = document.getElementById("cardNovaSolicitacao");
  const notificacoesAjustes = document.getElementById("notificacoesAjustes");
  const tituloSolicitacoes = document.getElementById("tituloSolicitacoes");

  if (acessoGestor) {
    indicator.style.display = "flex";
    loginText.innerHTML =
      '<i class="bi bi-shield-lock"></i> Logado como <strong>Gestor</strong>';
    btnGestor.style.display = "none";
    btnTecnico.style.display = "none";
    if (cardNovaSolicitacao) cardNovaSolicitacao.style.display = "none";
    if (notificacoesAjustes) notificacoesAjustes.style.display = "block";
    if (tituloSolicitacoes)
      tituloSolicitacoes.textContent = "Todas as Solicitações";

    // Atualizar contador de ajustes pendentes
    setTimeout(() => atualizarContadorAjustesPendentes(), 500);
  } else if (acessoTecnico && tecnicoLogado) {
    indicator.style.display = "flex";
    loginText.innerHTML = `<i class="bi bi-person-circle"></i> Logado como <strong>${formatarNomeTecnico(tecnicoLogado)}</strong>`;
    btnGestor.style.display = "none";
    btnTecnico.style.display = "none";
    if (cardNovaSolicitacao) cardNovaSolicitacao.style.display = "none";
    if (notificacoesAjustes) notificacoesAjustes.style.display = "none";
    if (tituloSolicitacoes)
      tituloSolicitacoes.textContent = "Minhas Solicitações";
  } else {
    indicator.style.display = "none";
    btnGestor.style.display = "inline-flex";
    btnTecnico.style.display = "inline-flex";
    if (cardNovaSolicitacao) cardNovaSolicitacao.style.display = "block";
    if (notificacoesAjustes) notificacoesAjustes.style.display = "none";
    if (tituloSolicitacoes)
      tituloSolicitacoes.textContent = "Todas as Solicitações";
  }
}

function abrirModalAcessoGestor() {
  // Bloquear se já estiver logado como técnico
  if (acessoTecnico) {
    mostrarNotificacao(
      "Você já está logado como Técnico. Faça logout primeiro.",
      "warning",
    );
    return;
  }
  modalAcessoGestor?.classList.add("active");
  setTimeout(() => document.getElementById("codigoAcesso")?.focus(), 100);
}

function fecharModalAcessoGestor() {
  modalAcessoGestor?.classList.remove("active");
  const input = document.getElementById("codigoAcesso");
  if (input) input.value = "";
}

// Autenticação com Supabase
async function verificarCodigoSupabase(codigoDigitado) {
  if (!codigoDigitado) {
    mostrarNotificacao("Digite um código!", "warning");
    return null;
  }

  try {
    const resultado = await autenticarUsuario(codigoDigitado);

    if (!resultado.sucesso || !resultado.usuario) {
      mostrarNotificacao("Código inválido!", "error");
      return null;
    }

    return resultado.usuario;
  } catch (error) {
    console.error("Erro ao verificar acesso:", error);
    mostrarNotificacao("Erro ao verificar acesso. Tente novamente.", "error");
    return null;
  }
}

async function validarCodigoAcesso() {
  const codigo = document.getElementById("codigoAcesso")?.value.trim();
  const usuario = await verificarCodigoSupabase(codigo);

  if (!usuario) {
    return;
  }

  if (usuario.role !== "gestor") {
    mostrarNotificacao("Este código não é de gestor!", "error");
    return;
  }

  // Login como gestor
  acessoGestor = true;
  salvarLogin("gestor");
  mostrarNotificacao("Acesso de gestor concedido!", "success");
  fecharModalAcessoGestor();
  atualizarIndicadorLogin();
  atualizarListaTecnicos();

  // Mostrar painel do gestor
  const painelGestor = document.getElementById("painelGestor");
  if (painelGestor) painelGestor.style.display = "block";

  // Esconder painel do técnico
  const painelTecnico = document.getElementById("painelTecnico");
  if (painelTecnico) painelTecnico.style.display = "none";
}

async function validarAcessoTecnico() {
  const codigo = document.getElementById("codigoAcessoTecnico")?.value.trim();

  if (!codigo) {
    mostrarNotificacao("Digite seu código de acesso!", "warning");
    return;
  }

  const usuario = await verificarCodigoSupabase(codigo);
  if (!usuario) return;

  if (usuario.role !== "tecnico") {
    mostrarNotificacao("Este código não é de técnico!", "error");
    return;
  }

  // Derivar código interno do primeiro nome sem acento
  const codigoTecnico = usuario.nome
    .split(" ")[0]
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Atualizar cache com esse técnico
  cacheTecnicos[codigoTecnico] = usuario.nome;

  acessoTecnico = true;
  tecnicoLogado = codigoTecnico;
  salvarLogin("tecnico", tecnicoLogado);
  mostrarNotificacao(`Bem-vindo(a), ${usuario.nome}!`, "success");
  fecharModalAcessoTecnico();
  atualizarIndicadorLogin();
  atualizarTabela();
  atualizarEstatisticas();
  atualizarEstatisticasTecnico();

  const painelTecnico = document.getElementById("painelTecnico");
  if (painelTecnico) painelTecnico.style.display = "block";

  const painelGestor = document.getElementById("painelGestor");
  if (painelGestor) painelGestor.style.display = "none";
}

function abrirModalAcessoTecnico() {
  // Bloquear se já estiver logado como gestor
  if (acessoGestor) {
    mostrarNotificacao(
      "Você já está logado como Gestor. Faça logout primeiro.",
      "warning",
    );
    return;
  }
  modalAcessoTecnico?.classList.add("active");
  setTimeout(
    () => document.getElementById("codigoAcessoTecnico")?.focus(),
    100,
  );
}

function fecharModalAcessoTecnico() {
  modalAcessoTecnico?.classList.remove("active");
  const input = document.getElementById("codigoAcessoTecnico");
  if (input) input.value = "";
}

function fazerLogout() {
  acessoGestor = false;
  acessoTecnico = false;
  tecnicoLogado = null;
  limparLogin();
  mostrarNotificacao("Logout realizado!", "info");

  // Esconder painéis
  const painelGestor = document.getElementById("painelGestor");
  if (painelGestor) painelGestor.style.display = "none";

  const painelTecnico = document.getElementById("painelTecnico");
  if (painelTecnico) painelTecnico.style.display = "none";

  atualizarTabela();
  atualizarEstatisticas();
  atualizarListaTecnicos();
  atualizarEstatisticasTecnico();
  atualizarIndicadorLogin();
}

// Tabela
function atualizarTabela(filtroStatus = undefined) {
  if (!tabelaSolicitacoes) return;

  // Só atualiza filtroAtual se um filtro foi explicitamente passado
  if (filtroStatus !== undefined) {
    filtroAtual = filtroStatus;
    paginaAtual = 1; // Resetar para página 1 ao mudar filtro
  }

  let base = solicitacoes;

  if (acessoTecnico && tecnicoLogado && !acessoGestor) {
    base = base.filter((s) => s.tecnicoResponsavel === tecnicoLogado);
  }

  // Filtrar por status apenas se não for 'todas' ou null
  if (filtroAtual && filtroAtual !== "todas") {
    base = base.filter((s) => s.status === filtroAtual);
  }

  if (base.length === 0) {
    tabelaSolicitacoes.innerHTML = "";
    emptyState?.classList.add("active");
    renderizarPaginacao(0);
    return;
  }

  emptyState?.classList.remove("active");

  const ordenado = base.sort((a, b) => b.id - a.id);
  const totalItens = ordenado.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  // Garantir que paginaAtual não ultrapasse o total
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const paginados = ordenado.slice(inicio, fim);

  const html = paginados
    .map((s) => {
      const statusClass = getStatusClass(s.status);
      return `
        <tr>
          <td>#${String(s.id).padStart(4, "0")}</td>
          <td title="${escapeAttr(s.solicitante || "")}">${escapeHtml(s.solicitante || "")}</td>
          <td title="${escapeAttr(s.nomeEstudo || "Não informado")}">${escapeHtml(s.nomeEstudo || "Não informado")}</td>
          <td title="${escapeAttr(s.cliente || "")}">${escapeHtml(s.cliente || "")}</td>
          <td title="${escapeAttr(formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa))}">${escapeHtml(formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa))}</td>
          <td title="${escapeAttr(s.municipio || "")}">${escapeHtml(s.municipio || "")}</td>
          <td>${escapeHtml(formatarNomeTecnico(s.tecnicoResponsavel))}</td>
          <td><span class="status-badge ${statusClass}">${escapeHtml(
            formatarStatus(s.status),
          )}</span></td>
          <td>${formatDateBR(s.dataSolicitacao)}</td>
          <td>
            <button class="btn action-btn btn-info" type="button" onclick="verDetalhes(${s.id})">
              <i class="bi bi-eye"></i> Ver
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tabelaSolicitacoes.innerHTML = html;
  renderizarPaginacao(totalItens);
}

function renderizarPaginacao(totalItens) {
  const container = document.getElementById("paginacaoContainer");
  if (!container) return;

  const totalPaginas = Math.ceil(totalItens / itensPorPagina);

  // Botões de página
  let btnsPaginas = "";
  if (totalPaginas > 1) {
    // Anterior
    btnsPaginas += `<button class="btn btn-ghost pag-btn" type="button" onclick="irParaPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? "disabled" : ""}>
      <i class="bi bi-chevron-left"></i>
    </button>`;

    for (let i = 1; i <= totalPaginas; i++) {
      btnsPaginas += `<button class="btn pag-btn ${i === paginaAtual ? "btn-primary" : "btn-ghost"}" type="button" onclick="irParaPagina(${i})">${i}</button>`;
    }

    // Próximo
    btnsPaginas += `<button class="btn btn-ghost pag-btn" type="button" onclick="irParaPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? "disabled" : ""}>
      <i class="bi bi-chevron-right"></i>
    </button>`;
  }

  const inicio = totalItens === 0 ? 0 : (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens);

  container.innerHTML = `
    <span class="pag-info">${totalItens === 0 ? "0 registros" : `${inicio}–${fim} de ${totalItens}`}</span>
    <div class="pag-btns">${btnsPaginas}</div>
    <div class="pag-seletor">
      <label for="itensPorPaginaSelect">Por página:</label>
      <select id="itensPorPaginaSelect" onchange="alterarItensPorPagina(this.value)">
        <option value="10" ${itensPorPagina === 10 ? "selected" : ""}>10</option>
        <option value="20" ${itensPorPagina === 20 ? "selected" : ""}>20</option>
        <option value="30" ${itensPorPagina === 30 ? "selected" : ""}>30</option>
      </select>
    </div>
  `;
}

function irParaPagina(pagina) {
  const totalPaginas = Math.ceil(
    solicitacoes
      .filter((s) => {
        if (acessoTecnico && tecnicoLogado && !acessoGestor)
          return s.tecnicoResponsavel === tecnicoLogado;
        return true;
      })
      .filter(
        (s) =>
          !filtroAtual || filtroAtual === "todas" || s.status === filtroAtual,
      ).length / itensPorPagina,
  );
  if (pagina < 1 || pagina > totalPaginas) return;
  paginaAtual = pagina;
  atualizarTabela();
}

function alterarItensPorPagina(valor) {
  itensPorPagina = Number(valor);
  paginaAtual = 1;
  atualizarTabela();
}

// Detalhes da Solicitação
function verDetalhes(id) {
  const solicitacao = solicitacoes.find((s) => s.id == id);

  if (!solicitacao) {
    mostrarNotificacao("Solicitação não encontrada!", "error");
    return;
  }

  if (!conteudoDetalhes) {
    return;
  }

  const dataSolicitacao = solicitacao.dataSolicitacao
    ? formatDateBR(solicitacao.dataSolicitacao)
    : "—";
  const dataCriacao = solicitacao.dataCriacao
    ? new Date(solicitacao.dataCriacao).toLocaleString("pt-BR")
    : "—";
  const dataConclusaoReal = solicitacao.dataConclusaoReal
    ? formatDateBR(solicitacao.dataConclusaoReal)
    : "Não concluída";
  const dataEntrega = solicitacao.dataEntrega
    ? formatDateBR(solicitacao.dataEntrega)
    : "Não informado";
  const dataConclusaoPrevista = solicitacao.dataConclusaoPrevista
    ? formatDateBR(solicitacao.dataConclusaoPrevista)
    : "—";

  let statusPrazo = "";
  if (solicitacao.status === "concluido" && solicitacao.dataConclusaoReal) {
    const prevista = parseDateOnly(solicitacao.dataConclusaoPrevista);
    const real = parseDateOnly(solicitacao.dataConclusaoReal);
    if (prevista && real) {
      statusPrazo =
        real <= prevista ? ` ✓ Dentro do prazo ` : ` ✓ Fora do prazo `;
    }
  }

  const produtos = solicitacao.produtos || {};
  let produtosHtml = "";
  if (produtos.mapa) produtosHtml += "✓ Mapa / Planta  ";
  if (produtos.croqui) produtosHtml += "✓ Croqui  ";
  if (produtos.shapefile) produtosHtml += "✓ Shapefile (SHP)  ";
  if (produtos.kml) produtosHtml += "✓ KMZ/KML  ";

  const elementos = solicitacao.elementos || {};
  let elementosHtml = "";
  if (elementos.localizacao) elementosHtml += "✓ Localização ";
  if (elementos.acessoLocal) elementosHtml += "✓ Via de Acesso Local ";
  if (elementos.acessoRegional) elementosHtml += "✓ Via de Acesso Regional ";
  if (elementos.areaAmostral) elementosHtml += "✓ ãrea Amostral ";
  if (elementos.outros && elementos.outrosTexto) {
    elementosHtml += `✓ Outros: ${escapeHtml(elementos.outrosTexto)} `;
  }

  conteudoDetalhes.innerHTML = `
    <div class="modal-body">
      
      <!-- Seção: Situação da Solicitação -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-info-circle"></i> Situação da Solicitação</h4>
        <div class="detalhe-grid" style="grid-template-columns: repeat(4, 1fr);">
          <div class="detalhe-item">
            <div class="detalhe-label">ID</div>
            <div class="detalhe-value">#${String(solicitacao.id).padStart(4, "0")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Status</div>
            <div class="detalhe-value">
              <span class="status-badge ${getStatusClass(solicitacao.status)}">${escapeHtml(formatarStatus(solicitacao.status))}</span>
            </div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Técnico Responsável</div>
            <div class="detalhe-value">${escapeHtml(formatarNomeTecnico(solicitacao.tecnicoResponsavel))}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Criado em</div>
            <div class="detalhe-value">${escapeHtml(dataCriacao)}</div>
          </div>
        </div>
        
        <!-- Botão Solicitar Ajuste - Visível para todos -->
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
          <button class="btn btn-primary" type="button" onclick="abrirModalAjuste(${solicitacao.id})" style="width: 100%;">
            <i class="bi bi-pencil-square"></i> Solicitar Ajuste
          </button>
        </div>
      </div>

      ${(() => {
        if (acessoGestor) {
          return `
      <!-- Seção: Ações do Gestor -->
      <div class="detalhe-section" style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2);">
        <h4 class="detalhe-section-title"><i class="bi bi-gear-fill"></i> Ações do Gestor</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item-full">
            <label for="selectEstagio${solicitacao.id}" style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
              <i class="bi bi-arrow-repeat"></i> Atualizar Estágio da Solicitação
            </label>
            <div style="position: relative;">
              <select id="selectEstagio${solicitacao.id}" style="width: 100%; padding: 12px 40px 12px 12px; border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.5); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.95rem; font-weight: 500; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none;">
                <option value="" disabled ${!solicitacao.status ? "selected" : ""}>Selecione um estágio...</option>
                <option value="fila" ${solicitacao.status === "fila" ? "selected" : ""}>Na Fila</option>
                <option value="em_andamento" ${solicitacao.status === "em_andamento" ? "selected" : ""}>Em Andamento</option>
                <option value="ajustes_pendentes" ${solicitacao.status === "ajustes_pendentes" ? "selected" : ""}>Ajustes Pendentes</option>
                <option value="concluido" ${solicitacao.status === "concluido" ? "selected" : ""}>Concluído</option>
              </select>
              <i class="bi bi-chevron-down" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(59, 130, 246, 0.8); font-size: 1.2rem;"></i>
            </div>
          </div>
        </div>
        <div class="btn-group justify-end" style="margin-top: 12px; gap: 8px;">
          <button class="btn btn-danger" type="button" onclick="confirmarExclusao(${Number(solicitacao.id)})">
            <i class="bi bi-trash"></i> Excluir Solicitação
          </button>
          <button class="btn btn-info" type="button" onclick="abrirModalAtribuicao(${Number(solicitacao.id)})">
            <i class="bi bi-person-plus"></i> Atribuir Técnico
          </button>
          <button class="btn btn-success" type="button" onclick="salvarNovoStatus(${solicitacao.id})">
            <i class="bi bi-check-circle"></i> Salvar Alterações
          </button>
        </div>
          </button>
        </div>
      </div>
          `;
        } else if (
          acessoTecnico &&
          solicitacao.tecnicoResponsavel === tecnicoLogado
        ) {
          return `
      <!-- Seção: Ações do Técnico -->
      <div class="detalhe-section" style="background: rgba(234, 179, 8, 0.05); border: 1px solid rgba(234, 179, 8, 0.2);">
        <h4 class="detalhe-section-title"><i class="bi bi-tools"></i> Ações do Técnico</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item-full">
            <label for="selectEstagio${solicitacao.id}" style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-primary);">
              <i class="bi bi-arrow-repeat"></i> Atualizar Estágio da Solicitação
            </label>
            <div style="position: relative;">
              <select id="selectEstagio${solicitacao.id}" style="width: 100%; padding: 12px 40px 12px 12px; border-radius: 8px; border: 2px solid rgba(234, 179, 8, 0.5); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.95rem; font-weight: 500; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none;">
                <option value="" disabled ${!solicitacao.status ? "selected" : ""}>Selecione um estágio...</option>
                <option value="em_andamento" ${solicitacao.status === "em_andamento" ? "selected" : ""}>Em Andamento</option>
                <option value="ajustes_pendentes" ${solicitacao.status === "ajustes_pendentes" ? "selected" : ""}>Ajustes Pendentes</option>
                <option value="concluido" ${solicitacao.status === "concluido" ? "selected" : ""}>Concluído</option>
              </select>
              <i class="bi bi-chevron-down" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(234, 179, 8, 0.8); font-size: 1.2rem;"></i>
            </div>
            <button class="btn btn-success" type="button" onclick="salvarNovoStatus(${solicitacao.id})" style="margin-top: 12px; width: 100%;">
              <i class="bi bi-check-circle"></i> Salvar Alterações
            </button>
          </div>
        </div>
      </div>
          `;
        } else {
          return "";
        }
      })()}

      ${
        acessoGestor || acessoTecnico
          ? `
      <!-- Seção: Histórico de Versões -->
      <div class="detalhe-section detalhe-historico">
        <h4 class="detalhe-historico-title">
          <i class="bi bi-clock-history"></i> Histórico de Versões
        </h4>
        <p style="color: var(--muted); margin-bottom: 16px;">
          Visualize todas as versões e ajustes desta solicitação
        </p>
        <button class="btn btn-historico" type="button" onclick="abrirModalHistorico(${solicitacao.id})" style="width: 100%;">
          <i class="bi bi-clock-history"></i> Ver Histórico Completo
        </button>
      </div>
      `
          : ""
      }
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-file-text"></i> Dados Gerais</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Solicitante</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.solicitante || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Cliente - Código</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.cliente || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Nome do Estudo</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.nomeEstudo || "Não informado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Data da Solicitação</div>
            <div class="detalhe-value">${dataSolicitacao}</div>
          </div>
        </div>
      </div>

      <!-- Seção: Localização e Empreendimento -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-geo-alt"></i> Localização e Empreendimento</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Empreendimento</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.empreendimento || "Não informado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Localidade</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.localidade || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Município / Estado</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.municipio || "Não informado")}</div>
          </div>
        </div>
      </div>

      <!-- Seção: Prazos -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-calendar-check"></i> Prazos</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Data de Entrega</div>
            <div class="detalhe-value">${dataEntrega}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Prazo Solicitado</div>
            <div class="detalhe-value">${Number(solicitacao.prazoDias || 0)} dias úteis</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Conclusão Prevista</div>
            <div class="detalhe-value">${dataConclusaoPrevista}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Conclusão Real</div>
            <div class="detalhe-value">${dataConclusaoReal}</div>
          </div>
          ${
            statusPrazo
              ? `
          <div class="detalhe-item">
            <div class="detalhe-label">Situação do Prazo</div>
            <div class="detalhe-value">${statusPrazo}</div>
          </div>
          `
              : ""
          }
        </div>
      </div>

      <!-- Seção: Informações Técnicas -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-tools"></i> Informações Técnicas</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Tipo de Mapa</div>
            <div class="detalhe-value">${escapeHtml(formatarTipoMapa(solicitacao.tipoMapa, solicitacao.nomeTipoMapa))}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Finalidade</div>
            <div class="detalhe-value">${escapeHtml(formatarFinalidade(solicitacao.finalidade))}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">ART Necessária</div>
            <div class="detalhe-value">${solicitacao.artNecessaria === "sim" ? "✓ Sim" : "✓ Não"}</div>
          </div>
          ${
            solicitacao.artNecessaria === "sim" && solicitacao.artResponsavel
              ? `
          <div class="detalhe-item">
            <div class="detalhe-label">Responsável Técnico</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.artResponsavel)}</div>
          </div>
          `
              : ""
          }
          <div class="detalhe-item detalhe-item-full">
            <div class="detalhe-label"><i class="bi bi-box-seam"></i> Produtos Solicitados</div>
            <div class="detalhe-value">${produtosHtml || "Nenhum produto selecionado"}</div>
          </div>
          <div class="detalhe-item detalhe-item-full">
            <div class="detalhe-label"><i class="bi bi-pencil-square"></i> Elementos do Croqui</div>
            <div class="detalhe-value">${elementosHtml || "Nenhum elemento selecionado"}</div>
          </div>
        </div>
      </div>

      <!-- Seção: Arquivos e Diretórios -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-folder"></i> Arquivos e Diretórios</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Diretório dos Arquivos</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.diretorioArquivos || "Não especificado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Diretório de Salvamento</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.diretorioSalvamento || "Não especificado")}</div>
          </div>
        </div>
      </div>

      ${
        solicitacao.observacoes
          ? `
      <!-- Seção: Observações -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-chat-left-text"></i> Observações</h4>
        <div class="detalhe-observacoes">
          ${escapeHtml(solicitacao.observacoes)}
        </div>
      </div>
      `
          : ""
      }

    </div>
  `;

  modalDetalhes?.classList.add("active");
}

function fecharModal() {
  modalDetalhes?.classList.remove("active");
}

async function mudarStatus(id, novoStatus) {
  if (!novoStatus) {
    mostrarNotificacao("Selecione um estágio!", "warning");
    return;
  }

  if (!acessoGestor && !acessoTecnico) {
    mostrarNotificacao("Faça login para alterar status!", "warning");
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);

  if (!solicitacao) {
    return;
  }

  if (acessoTecnico && solicitacao.tecnicoResponsavel !== tecnicoLogado) {
    mostrarNotificacao(
      "Você só pode alterar solicitações atribuídas a você!",
      "warning",
    );
    return;
  }

  const sucesso = await atualizarSolicitacao(id, { status: novoStatus });

  // 3️⃣ LOG: Registrar alteração de status
  registrarLog("alterar_status", "solicitacoes", id, {
    status_anterior: solicitacao.status,
    novo_status: novoStatus,
  });

  const mensagem = {
    fila: "movida para a fila",
    em_andamento: "iniciou o processamento",
    ajustes_pendentes: "está aguardando ajustes",
    concluido: "foi concluída",
  };

  if (sucesso) {
    mostrarNotificacao(
      `Solicitação #${id} ${mensagem[novoStatus] || "atualizada"}!`,
      "success",
    );
  } else {
    mostrarNotificacao("Erro ao atualizar status!", "error");
    return;
  }

  // Atualizar o status localmente
  solicitacao.status = novoStatus;

  // Atualizar a tabela imediatamente
  atualizarTabela(filtroAtual || "todas");

  // Atualizar estatísticas
  atualizarEstatisticas();

  // Reabrir os detalhes
  setTimeout(() => verDetalhes(id), 300);
}

function salvarNovoStatus(id) {
  const select = document.getElementById(`selectEstagio${id}`);

  if (!select) {
    return;
  }

  const novoStatus = select.value;
  mudarStatus(id, novoStatus);
}
async function finalizarSolicitacao(id) {
  if (!acessoGestor && !acessoTecnico) {
    mostrarNotificacao("Faça login para finalizar!", "warning");
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao) return;

  if (acessoTecnico && solicitacao.tecnicoResponsavel !== tecnicoLogado) {
    mostrarNotificacao(
      "Você só pode finalizar solicitações atribuídas a você!",
      "warning",
    );
    return;
  }

  if (solicitacao.status === "concluido") {
    mostrarNotificacao("Esta Solicitação já foi concluída.", "info");
    return;
  }

  const sucesso = await atualizarSolicitacao(id, {
    status: "concluido",
    dataConclusaoReal: new Date().toISOString().split("T")[0],
  });

  // 4️⃣ LOG: Registrar finalização de solicitação
  registrarLog("finalizar_solicitacao", "solicitacoes", id);

  if (!sucesso) {
    mostrarNotificacao("Erro ao finalizar solicitação!", "error");
    return;
  }

  mostrarNotificacao(`Solicitação #${id} finalizada!`, "success");

  // Atualizar o status localmente
  solicitacao.status = "concluido";
  solicitacao.dataConclusaoReal = new Date().toISOString().split("T")[0];

  // Atualizar a tabela imediatamente
  atualizarTabela(filtroAtual || "todas");

  // Atualizar estatísticas
  atualizarEstatisticas();

  // Fechar modal
  fecharModal();
}

function abrirModalAtribuicao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao || !conteudoAtribuicao) return;

  // Gerar options do select a partir do cache de técnicos
  const optionsTecnicos = Object.entries(cacheTecnicos)
    .map(
      ([codigo, nome]) =>
        `<option value="${codigo}" ${solicitacao.tecnicoResponsavel === codigo ? "selected" : ""}>${escapeHtml(nome)}</option>`,
    )
    .join("");

  conteudoAtribuicao.innerHTML = `
    <div class="form-group">
      <p><strong>Solicitação #${id}</strong></p>
      <p>Estudo: ${escapeHtml(solicitacao.nomeEstudo || "Não informado")}</p>
      <p>Cliente: ${escapeHtml(solicitacao.cliente || "")}</p>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="selectTecnico">Selecione o Técnico *</label>
      <select id="selectTecnico" required>
        <option value="PENDENTE" disabled ${!solicitacao.tecnicoResponsavel || solicitacao.tecnicoResponsavel === "PENDENTE" ? "selected" : ""}>Selecione um técnico...</option>
        ${optionsTecnicos}
      </select>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="inputDataConclusao">Data de Conclusão (Prazo)</label>
      <input type="text" id="inputDataConclusao" placeholder="DD/MM/AAAA" maxlength="10" />
    </div>

    <div class="btn-group justify-end" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalAtribuicao()">Cancelar</button>
      <button class="btn btn-primary" type="button" onclick="atribuirTecnico(${Number(id)})">Atribuir</button>
    </div>
  `;

  modalAtribuicao?.classList.add("active");
  modalAtribuicao.dataset.solicitacaoId = id;
  setTimeout(() => {
    aplicarMascaraData(document.getElementById("inputDataConclusao"));

    // Adicionar evento Enter para atribuir
    const modal = document.getElementById("modalAtribuicao");
    if (modal) {
      const handleEnter = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          atribuirTecnico(id);
        }
      };

      // Remover listener anterior se existir
      modal.removeEventListener("keypress", handleEnter);
      modal.addEventListener("keypress", handleEnter);
    }
  }, 100);
}

function fecharModalAtribuicao() {
  modalAtribuicao?.classList.remove("active");
}

async function atribuirTecnico(id) {
  const tecnico = document.getElementById("selectTecnico")?.value;
  const dataConclusaoBR = document.getElementById("inputDataConclusao")?.value;

  if (!tecnico || tecnico === "PENDENTE") {
    mostrarNotificacao("Selecione um Técnico!", "warning");
    return;
  }

  // Validar data se fornecida
  if (dataConclusaoBR && dataConclusaoBR.length > 0) {
    if (dataConclusaoBR.length !== 10) {
      mostrarNotificacao("Data inválida! Use o formato DD/MM/AAAA", "warning");
      return;
    }

    const partes = dataConclusaoBR.split("/");
    if (partes.length !== 3) {
      mostrarNotificacao("Data inválida! Use o formato DD/MM/AAAA", "warning");
      return;
    }

    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]);
    const ano = parseInt(partes[2]);

    // Validação básica de ranges
    if (
      dia < 1 ||
      dia > 31 ||
      mes < 1 ||
      mes > 12 ||
      ano < 1900 ||
      ano > 2100
    ) {
      mostrarNotificacao("Data inválida! Use o formato DD/MM/AAAA", "warning");
      return;
    }

    // Validação se a data realmente existe (ex: 31/02 não existe)
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    const dataObj = new Date(dataISO + "T00:00:00");

    // Verificar se a data é válida comparando os valores
    if (
      dataObj.getDate() !== dia ||
      dataObj.getMonth() + 1 !== mes ||
      dataObj.getFullYear() !== ano
    ) {
      mostrarNotificacao(
        "Data inválida! Esta data não existe no calendário.",
        "warning",
      );
      return;
    }
  }

  // Converter data BR para ISO se fornecida
  const dataConclusao = dataConclusaoBR
    ? converterDataParaISO(dataConclusaoBR)
    : null;

  const sucesso = await atualizarSolicitacao(id, {
    tecnicoResponsavel: tecnico,
    dataConclusaoPrevista: dataConclusao || null,
    status: "em_andamento",
  });

  // Atualizar localmente
  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (solicitacao) {
    solicitacao.tecnicoResponsavel = tecnico;
    solicitacao.dataConclusaoPrevista = dataConclusao;
    solicitacao.status = "em_andamento";
  }

  fecharModalAtribuicao();

  if (sucesso) {
    mostrarNotificacao(
      `Solicitação #${id} atribuída para ${formatarNomeTecnico(tecnico)}!`,
      "success",
    );
  } else {
    mostrarNotificacao("Erro ao atribuir técnico!", "error");
  }

  // Atualizar tabela e estatísticas
  atualizarTabela(filtroAtual || "todas");
  atualizarEstatisticas();
  atualizarListaTecnicos();
}

function confirmarExclusao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao || !conteudoConfirmacao) return;

  conteudoConfirmacao.innerHTML = `
    <p><strong>Confirmar Exclusão</strong></p>
    <p style="margin-top: 8px;">
      Tem certeza que deseja excluir a Solicitação #${id} de ${escapeHtml(
        solicitacao.cliente || "",
      )}?
    </p>
    <p style="margin-top: 8px; color: var(--warning);">
      Esta ação NÃO pode ser desfeita!
    </p>
    <div class="btn-group justify-end" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalConfirmacao()">Cancelar</button>
      <button class="btn btn-danger" type="button" onclick="excluirSolicitacao(${Number(
        id,
      )})">Excluir</button>
    </div>
  `;

  modalConfirmacao?.classList.add("active");
}

function fecharModalConfirmacao() {
  modalConfirmacao?.classList.remove("active");
}

// Relatórios e Filtros
function filtrarSolicitacoes(tipo) {
  let statusFiltro = null;
  switch (tipo) {
    case "em_andamento":
      statusFiltro = "em_andamento";
      break;
    case "na_fila":
      statusFiltro = "fila";
      break;
    case "ajustes_pendentes":
      statusFiltro = "ajustes_pendentes";
      break;
    default:
      statusFiltro = null;
  }

  tabBtns?.forEach((b) => b.classList.remove("active"));
  atualizarTabela(statusFiltro);
}

function filtrarMinhasSolicitacoes(tipo) {
  let statusFiltro = null;
  switch (tipo) {
    case "em_andamento":
      statusFiltro = "em_andamento";
      break;
    case "ajustes_pendentes":
      statusFiltro = "ajustes_pendentes";
      break;
    case "finalizadas":
    case "concluido":
      statusFiltro = "concluido";
      break;
    default:
      statusFiltro = null;
  }

  tabBtns?.forEach((b) => b.classList.remove("active"));
  atualizarTabela(statusFiltro);
}

function abrirModalRelatorio() {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }
  modalRelatorio?.classList.add("active");
}

function fecharModalRelatorio() {
  modalRelatorio?.classList.remove("active");
  const resultado = document.getElementById("resultadoRelatorio");
  if (resultado) {
    resultado.style.display = "none";
    resultado.innerHTML = "";
  }
}

function gerarRelatorio() {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const dataInicioBR = document.getElementById("relatorioPeriodoInicio")?.value;
  const dataFimBR = document.getElementById("relatorioPeriodoFim")?.value;

  if (!dataInicioBR || !dataFimBR) {
    mostrarNotificacao("Selecione o período!", "warning");
    return;
  }

  // Converter datas BR para ISO
  const dataInicio = converterDataParaISO(dataInicioBR);
  const dataFim = converterDataParaISO(dataFimBR);

  if (parseDateOnly(dataInicio) > parseDateOnly(dataFim)) {
    mostrarNotificacao("Data inicial maior que final!", "error");
    return;
  }

  const solicitacoesPeriodo = solicitacoes.filter((s) => {
    const d = parseDateOnly(s.dataSolicitacao);
    return d && d >= parseDateOnly(dataInicio) && d <= parseDateOnly(dataFim);
  });

  const total = solicitacoesPeriodo.length;
  const finalizadas = solicitacoesPeriodo.filter(
    (s) => s.status === "concluido",
  ).length;

  const dentroPrazo = solicitacoesPeriodo.filter((s) => {
    const real = s.dataConclusaoReal
      ? parseDateOnly(s.dataConclusaoReal)
      : null;
    const prevista = s.dataConclusaoPrevista
      ? parseDateOnly(s.dataConclusaoPrevista)
      : null;
    return s.status === "concluido" && real && prevista && real <= prevista;
  }).length;

  const foraPrazo = finalizadas - dentroPrazo;

  // Usar técnicos do cache (carregado do banco)
  const tecnicos = Object.keys(cacheTecnicos);
  const estatisticasTecnicos = {};

  tecnicos.forEach((tecnico) => {
    const solTec = solicitacoesPeriodo.filter(
      (s) => s.tecnicoResponsavel === tecnico,
    );
    estatisticasTecnicos[tecnico] = {
      total: solTec.length,
      finalizadas: solTec.filter((s) => s.status === "concluido").length,
      dentroPrazo: solTec.filter((s) => {
        const real = s.dataConclusaoReal
          ? parseDateOnly(s.dataConclusaoReal)
          : null;
        const prevista = s.dataConclusaoPrevista
          ? parseDateOnly(s.dataConclusaoPrevista)
          : null;
        return s.status === "concluido" && real && prevista && real <= prevista;
      }).length,
    };
  });

  let htmlRelatorio = `
    <div class="relatorio-item">
      <div class="relatorio-grid">
        <div class="relatorio-metric">
          <div class="relatorio-metric-value">${total}</div>
          <div class="relatorio-metric-label">Total</div>
        </div>
        <div class="relatorio-metric">
          <div class="relatorio-metric-value">${finalizadas}</div>
          <div class="relatorio-metric-label">Finalizadas</div>
        </div>
        <div class="relatorio-metric">
          <div class="relatorio-metric-value">${dentroPrazo}</div>
          <div class="relatorio-metric-label">Dentro do Prazo</div>
        </div>
        <div class="relatorio-metric">
          <div class="relatorio-metric-value">${foraPrazo}</div>
          <div class="relatorio-metric-label">Fora do Prazo</div>
        </div>
      </div>
    </div>

    <div class="relatorio-item">
      <h4 class="panel-card-title"> Por Técnico</h4>
  `;

  tecnicos.forEach((tecnico) => {
    const stats = estatisticasTecnicos[tecnico];
    if (stats.total > 0) {
      const taxaConclusao = ((stats.finalizadas / stats.total) * 100).toFixed(
        1,
      );
      const taxaPrazo =
        stats.finalizadas > 0
          ? ((stats.dentroPrazo / stats.finalizadas) * 100).toFixed(1)
          : "0.0";

      htmlRelatorio += `
        <div class="tecnico-relatorio">
          <strong>${formatarNomeTecnico(tecnico)}</strong>
          <div class="relatorio-grid" style="margin-top: 8px;">
            <div class="relatorio-metric">
              <div class="relatorio-metric-value">${stats.total}</div>
              <div class="relatorio-metric-label">Atribuídas</div>
            </div>
            <div class="relatorio-metric">
              <div class="relatorio-metric-value">${stats.finalizadas}</div>
              <div class="relatorio-metric-label">Finalizadas</div>
            </div>
            <div class="relatorio-metric">
              <div class="relatorio-metric-value">${taxaConclusao}%</div>
              <div class="relatorio-metric-label">Conclusão</div>
            </div>
            <div class="relatorio-metric">
              <div class="relatorio-metric-value">${taxaPrazo}%</div>
              <div class="relatorio-metric-label">No Prazo</div>
            </div>
          </div>
        </div>
      `;
    }
  });

  htmlRelatorio += `
    </div>
    <div class="btn-group" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalRelatorio()">Fechar</button>
      <button class="btn btn-info" type="button" onclick="exportarRelatorioCompleto('${escapeAttr(
        dataInicio,
      )}', '${escapeAttr(dataFim)}')"> Exportar CSV</button>
    </div>
  `;

  const resultado = document.getElementById("resultadoRelatorio");
  if (resultado) {
    resultado.style.display = "block";
    resultado.innerHTML = htmlRelatorio;
  }
}

function exportarRelatorioCompleto(dataInicio, dataFim) {
  if (!acessoGestor) return;

  const inicio = parseDateOnly(dataInicio);
  const fim = parseDateOnly(dataFim);

  const solicitacoesPeriodo = solicitacoes.filter((s) => {
    const d = parseDateOnly(s.dataSolicitacao);
    return d && inicio && fim && d >= inicio && d <= fim;
  });

  const dadosExport = solicitacoesPeriodo.map((s) => {
    const dentroPrazo =
      s.status === "concluido" &&
      s.dataConclusaoReal &&
      s.dataConclusaoPrevista &&
      parseDateOnly(s.dataConclusaoReal) <=
        parseDateOnly(s.dataConclusaoPrevista);

    return {
      ID: s.id,
      Solicitante: s.solicitante,
      Cliente: s.cliente,
      Estudo: s.nomeEstudo || "Não informado",
      "Tipo Mapa": formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa),
      Município: s.municipio,
      Técnico: formatarNomeTecnico(s.tecnicoResponsavel),
      Status: formatarStatus(s.status),
      "Prazo (dias úteis)": s.prazoDias,
      "Diretório Arquivos": s.diretorioArquivos || "Não especificado",
      "Diretório Salvamento": s.diretorioSalvamento || "Não especificado",
      "Data Solicitação": formatDateBR(s.dataSolicitacao),
      "Conclusão Prevista": formatDateBR(s.dataConclusaoPrevista),
      "Conclusão Real": s.dataConclusaoReal
        ? formatDateBR(s.dataConclusaoReal)
        : "",
      "Dentro do Prazo":
        s.status === "concluido"
          ? dentroPrazo
            ? "SIM"
            : "NÃO"
          : "EM ANDAMENTO",
    };
  });

  downloadCSV(
    dadosExport,
    `relatorio_solicitacoes_${dataInicio}_a_${dataFim}.csv`,
  );
  mostrarNotificacao("Relatório exportado!", "success");
}

function exportarTodosDados() {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const dadosExport = solicitacoes.map((s) => {
    const dentroPrazo =
      s.status === "concluido" &&
      s.dataConclusaoReal &&
      s.dataConclusaoPrevista &&
      parseDateOnly(s.dataConclusaoReal) <=
        parseDateOnly(s.dataConclusaoPrevista);

    return {
      ID: s.id,
      Solicitante: s.solicitante,
      Cliente: s.cliente,
      Estudo: s.nomeEstudo || "Não informado",
      "Tipo Mapa": formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa),
      Município: s.municipio,
      Técnico: formatarNomeTecnico(s.tecnicoResponsavel),
      Status: formatarStatus(s.status),
      "Prazo (dias úteis)": s.prazoDias,
      "Diretório Arquivos": s.diretorioArquivos || "Não especificado",
      "Diretório Salvamento": s.diretorioSalvamento || "Não especificado",
      "Data Solicitação": formatDateBR(s.dataSolicitacao),
      "Conclusão Prevista": formatDateBR(s.dataConclusaoPrevista),
      "Conclusão Real": s.dataConclusaoReal
        ? formatDateBR(s.dataConclusaoReal)
        : "",
      "Dentro do Prazo":
        s.status === "concluido"
          ? dentroPrazo
            ? "SIM"
            : "NÃO"
          : "EM ANDAMENTO",
    };
  });

  downloadCSV(
    dadosExport,
    `todos_dados_solicitacoes_${new Date().toISOString().split("T")[0]}.csv`,
  );
  mostrarNotificacao("Todos os dados exportados!", "success");
}

// Estatísticas
function atualizarEstatisticas() {
  const base =
    acessoTecnico && tecnicoLogado
      ? solicitacoes.filter((s) => s.tecnicoResponsavel === tecnicoLogado)
      : solicitacoes;

  setText("totalSolicitacoes", base.length);
  setText("totalFila", base.filter((s) => s.status === "fila").length);
  setText(
    "totalProcessando",
    base.filter((s) => s.status === "em_andamento").length,
  );
  setText(
    "totalFinalizadas",
    base.filter((s) => s.status === "concluido").length,
  );
}

function atualizarListaTecnicos() {
  if (!listaTecnicos) return;

  if (!acessoGestor) {
    listaTecnicos.innerHTML =
      '<p class="muted">Faça login como gestor para ver os Técnicos</p>';
    return;
  }

  const tecnicos = Object.keys(cacheTecnicos);
  let html = "";

  tecnicos.forEach((codigo) => {
    const solTec = solicitacoes.filter(
      (s) => s.tecnicoResponsavel === codigo && s.status !== "concluido",
    );
    if (solTec.length > 0) {
      html += `
        <div class="tecnico-item">
          <strong>${formatarNomeTecnico(codigo)}</strong>
          <span class="muted-strong">${solTec.length} projeto(s) em andamento</span>
          <div class="panel-card-list" style="margin-top: 6px;">
            ${solTec
              .slice(0, 3)
              .map(
                (s) =>
                  `<div class="muted">${escapeHtml(s.nomeEstudo || "Sem nome")} - ${escapeHtml(formatarStatus(s.status))}</div>`,
              )
              .join("")}
            ${solTec.length > 3 ? `<div class="muted">+ ${solTec.length - 3} outro(s)</div>` : ""}
          </div>
        </div>
      `;
    }
  });

  if (!html) {
    html = '<p class="muted">Nenhum Técnico com projetos em andamento</p>';
  }

  listaTecnicos.innerHTML = html;
}

function atualizarEstatisticasTecnico() {
  if (!estatisticasTecnico) return;

  if (!acessoTecnico || !tecnicoLogado) {
    estatisticasTecnico.innerHTML =
      '<p class="muted">Faça login como Técnico para ver suas estatísticas</p>';
    return;
  }

  const solTec = solicitacoes.filter(
    (s) => s.tecnicoResponsavel === tecnicoLogado,
  );
  const emAndamento = solTec.filter((s) => s.status !== "concluido").length;
  const finalizadas = solTec.filter((s) => s.status === "concluido").length;

  const dentroPrazo = solTec.filter((s) => {
    const real = s.dataConclusaoReal
      ? parseDateOnly(s.dataConclusaoReal)
      : null;
    const prevista = s.dataConclusaoPrevista
      ? parseDateOnly(s.dataConclusaoPrevista)
      : null;
    return s.status === "concluido" && real && prevista && real <= prevista;
  }).length;

  estatisticasTecnico.innerHTML = `
    <div class="relatorio-grid">
      <div class="relatorio-metric">
        <div class="relatorio-metric-value">${solTec.length}</div>
        <div class="relatorio-metric-label">Total</div>
      </div>
      <div class="relatorio-metric">
        <div class="relatorio-metric-value">${emAndamento}</div>
        <div class="relatorio-metric-label">Em Andamento</div>
      </div>
      <div class="relatorio-metric">
        <div class="relatorio-metric-value">${finalizadas}</div>
        <div class="relatorio-metric-label">Finalizadas</div>
      </div>
      <div class="relatorio-metric">
        <div class="relatorio-metric-value">${dentroPrazo}</div>
        <div class="relatorio-metric-label">Dentro do Prazo</div>
      </div>
    </div>
  `;
}

// Helpers
function parseDateOnly(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const d = new Date(`${yyyy_mm_dd}T00:00:00`);
  return isNaN(d) ? null : d;
}

// Exports globais (handlers inline do HTML)
window.toggleForm = toggleForm;
window.limparForm = limparForm;
window.toggleTipoMapaOutros = toggleTipoMapaOutros;
window.toggleARTResponsavel = toggleARTResponsavel;
window.toggleElementosOutros = toggleElementosOutros;

window.resetarTextareaContador = resetarTextareaContador;
window.abrirSeletorData = abrirSeletorData;
window.inicializarSeletoresData = inicializarSeletoresData;
window.aplicarMascaraData = aplicarMascaraData;
window.converterDataParaISO = converterDataParaISO;
window.converterDataParaBR = converterDataParaBR;

window.abrirModalAcessoGestor = abrirModalAcessoGestor;
window.fecharModalAcessoGestor = fecharModalAcessoGestor;
window.validarCodigoAcesso = validarCodigoAcesso;

window.abrirModalAcessoTecnico = abrirModalAcessoTecnico;
window.fecharModalAcessoTecnico = fecharModalAcessoTecnico;
window.validarAcessoTecnico = validarAcessoTecnico;

window.fazerLogout = fazerLogout;
window.togglePasswordVisibility = togglePasswordVisibility;

window.atualizarTabela = atualizarTabela;
window.verDetalhes = verDetalhes;
window.fecharModal = fecharModal;

window.mostrarLoader = mostrarLoader;
window.esconderLoader = esconderLoader;

window.abrirModalAtribuicao = abrirModalAtribuicao;
window.fecharModalAtribuicao = fecharModalAtribuicao;
window.atribuirTecnico = atribuirTecnico;

window.mudarStatus = mudarStatus;
window.salvarNovoStatus = salvarNovoStatus;
window.finalizarSolicitacao = finalizarSolicitacao;

window.confirmarExclusao = confirmarExclusao;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.excluirSolicitacao = excluirSolicitacao;

window.fecharModalConfirmarReprovacao = fecharModalConfirmarReprovacao;
window.confirmarReprovacaoAjuste = confirmarReprovacaoAjuste;

window.atualizarContadorAjustesPendentes = atualizarContadorAjustesPendentes;
window.abrirModalAjustesPendentes = abrirModalAjustesPendentes;
window.fecharModalAjustesPendentes = fecharModalAjustesPendentes;
window.aprovarAjusteModal = aprovarAjusteModal;
window.reprovarAjusteModal = reprovarAjusteModal;
window.verDetalhesSolicitacao = verDetalhesSolicitacao;
window.abrirModalAtribuicaoAjuste = abrirModalAtribuicaoAjuste;
window.confirmarAprovarAjuste = confirmarAprovarAjuste;

// Funções de ajuste e histórico
window.abrirModalAjuste = abrirModalAjuste;
window.fecharModalAjuste = fecharModalAjuste;
window.confirmarSolicitarAjuste = confirmarSolicitarAjuste;
window.abrirModalHistorico = abrirModalHistorico;
window.fecharModalHistorico = fecharModalHistorico;

window.abrirModalRelatorio = abrirModalRelatorio;
window.fecharModalRelatorio = fecharModalRelatorio;
window.gerarRelatorio = gerarRelatorio;
window.exportarRelatorioCompleto = exportarRelatorioCompleto;
window.exportarTodosDados = exportarTodosDados;

window.filtrarSolicitacoes = filtrarSolicitacoes;
window.filtrarMinhasSolicitacoes = filtrarMinhasSolicitacoes;

window.toggleTheme = toggleTheme;

window.irParaPagina = irParaPagina;
window.alterarItensPorPagina = alterarItensPorPagina;

// Toggle de visibilidade de senha
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (!input || !icon) return;

  if (input.type === "password") {
    input.type = "text";
    icon.className = "bi bi-eye-slash";
  } else {
    input.type = "password";
    icon.className = "bi bi-eye";
  }
}

// Máscara para campos de data DD/MM/AAAA
function aplicarMascaraData(input) {
  if (!input) return;

  input.addEventListener("input", function (e) {
    let valor = e.target.value.replace(/\D/g, ""); // Remove tudo que não é número

    // Limita a 8 dígitos (DDMMAAAA)
    if (valor.length > 8) {
      valor = valor.substring(0, 8);
    }

    // Aplica a máscara DD/MM/AAAA
    if (valor.length >= 5) {
      valor =
        valor.substring(0, 2) +
        "/" +
        valor.substring(2, 4) +
        "/" +
        valor.substring(4, 8);
    } else if (valor.length >= 3) {
      valor = valor.substring(0, 2) + "/" + valor.substring(2, 4);
    }

    e.target.value = valor;
  });

  // Validação ao sair do campo
  input.addEventListener("blur", function (e) {
    const valor = e.target.value;
    if (valor && valor.length === 10) {
      const partes = valor.split("/");
      if (partes.length === 3) {
        const dia = parseInt(partes[0]);
        const mes = parseInt(partes[1]);
        const ano = parseInt(partes[2]);

        // Validação básica de ranges
        if (
          dia < 1 ||
          dia > 31 ||
          mes < 1 ||
          mes > 12 ||
          ano < 1900 ||
          ano > 2100
        ) {
          mostrarNotificacao(
            "Data inválida! Use o formato DD/MM/AAAA",
            "warning",
          );
          e.target.value = "";
          return;
        }

        // Validação se a data realmente existe (ex: 31/02 não existe)
        const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const dataObj = new Date(dataISO + "T00:00:00");

        // Verificar se a data é válida comparando os valores
        if (
          dataObj.getDate() !== dia ||
          dataObj.getMonth() + 1 !== mes ||
          dataObj.getFullYear() !== ano
        ) {
          mostrarNotificacao(
            "Data inválida! Esta data não existe no calendário.",
            "warning",
          );
          e.target.value = "";
        }
      }
    }
  });
}

// Converter data DD/MM/AAAA para AAAA-MM-DD (formato ISO)
function converterDataParaISO(dataBR) {
  if (!dataBR || dataBR.length !== 10) return "";
  const partes = dataBR.split("/");
  if (partes.length !== 3) return "";
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// Converter data AAAA-MM-DD para DD/MM/AAAA
function converterDataParaBR(dataISO) {
  if (!dataISO) return "";
  const partes = dataISO.split("-");
  if (partes.length !== 3) return "";
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Abrir seletor de data nativo do navegador
function abrirSeletorData(inputTextoId, inputNativoId) {
  const inputNativo = document.getElementById(inputNativoId);
  const inputTexto = document.getElementById(inputTextoId);

  if (!inputNativo || !inputTexto) {
    return;
  }

  // Converter data atual do campo texto para ISO (se houver)
  if (inputTexto.value && inputTexto.value.length === 10) {
    const dataISO = converterDataParaISO(inputTexto.value);
    if (dataISO) {
      inputNativo.value = dataISO;
    }
  }

  // Tentar usar showPicker se disponível
  try {
    if (typeof inputNativo.showPicker === "function") {
      inputNativo.showPicker();
    } else {
      // Fallback: focar no input
      inputNativo.focus();
      inputNativo.click();
    }
  } catch (e) {
    // Fallback: focar no input
    inputNativo.focus();
    inputNativo.click();
  }
}

// Inicializar seletores de data em todos os campos
function inicializarSeletoresData() {
  const campos = [
    { texto: "dataSolicitacao", nativo: "dataSolicitacaoNativo" },
    { texto: "dataEntrega", nativo: "dataEntregaNativo" },
    { texto: "relatorioPeriodoInicio", nativo: "relatorioPeriodoInicioNativo" },
    { texto: "relatorioPeriodoFim", nativo: "relatorioPeriodoFimNativo" },
    { texto: "ajustePrazoFinal", nativo: "ajustePrazoFinalNativo" },
  ];

  campos.forEach((campo) => {
    const inputTexto = document.getElementById(campo.texto);
    if (!inputTexto) return;

    const wrapper = inputTexto.parentElement;
    if (!wrapper || !wrapper.classList.contains("date-input-wrapper")) return;

    // Verificar se já existe o input nativo
    let inputNativo = document.getElementById(campo.nativo);

    if (!inputNativo) {
      // Criar input nativo oculto
      inputNativo = document.createElement("input");
      inputNativo.type = "date";
      inputNativo.id = campo.nativo;
      inputNativo.setAttribute("tabindex", "-1");
      inputNativo.setAttribute("aria-hidden", "true");

      wrapper.appendChild(inputNativo);

      // Quando selecionar uma data no input nativo
      inputNativo.addEventListener("change", function () {
        if (inputNativo.value) {
          inputTexto.value = converterDataParaBR(inputNativo.value);
          inputTexto.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    }

    // Tornar o ícone clicável
    const icone = wrapper.querySelector(".calendar-icon");
    if (icone) {
      // Remover listeners antigos clonando o elemento
      const novoIcone = icone.cloneNode(true);
      icone.parentNode.replaceChild(novoIcone, icone);

      // Adicionar novo listener
      novoIcone.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirSeletorData(campo.texto, campo.nativo);
      });
    }
  });
}

// Resetar contador e feedback visual de um textarea
function resetarTextareaContador(textareaId, helpTextId = null) {
  const textarea = document.getElementById(textareaId);
  if (textarea) {
    textarea.value = "";
    textarea.classList.remove("limite-atingido");

    // Tentar encontrar o help text
    let helpText = helpTextId ? document.getElementById(helpTextId) : null;
    if (!helpText) {
      helpText = textarea.nextElementSibling;
      if (helpText && !helpText.classList.contains("help")) {
        helpText = textarea.parentElement.querySelector(".help");
      }
    }

    if (helpText) {
      helpText.classList.remove("limite-atingido");
      const charCounter = helpText.querySelector(".char-count");
      if (charCounter) {
        charCounter.textContent = "0";
      }
    }
  }
}

// Validar limite de caracteres em textareas
function validarLimiteTextareas() {
  const textareas = document.querySelectorAll("textarea[maxlength]");

  textareas.forEach((textarea) => {
    const maxLength = parseInt(textarea.getAttribute("maxlength"));

    // Encontrar o elemento de ajuda (help text) associado
    let helpText = textarea.nextElementSibling;
    if (helpText && !helpText.classList.contains("help")) {
      helpText = textarea.parentElement.querySelector(".help");
    }

    // Encontrar o contador de caracteres
    const charCounter = helpText?.querySelector(".char-count");

    // Função para verificar e aplicar feedback visual
    const verificarLimite = () => {
      const currentLength = textarea.value.length;
      const atingiuLimite = currentLength >= maxLength;

      // Atualizar contador
      if (charCounter) {
        charCounter.textContent = currentLength;
      }

      // Aplicar feedback visual
      if (atingiuLimite) {
        textarea.classList.add("limite-atingido");
        if (helpText) {
          helpText.classList.add("limite-atingido");
        }
      } else {
        textarea.classList.remove("limite-atingido");
        if (helpText) {
          helpText.classList.remove("limite-atingido");
        }
      }
    };

    // Validar ao colar
    textarea.addEventListener("paste", function (e) {
      setTimeout(() => {
        if (this.value.length > maxLength) {
          this.value = this.value.substring(0, maxLength);
          mostrarNotificacao(
            "TEXTO MUITO GRANDE, LIMITE DE 1000 CARACTERES",
            "warning",
          );
        }
        verificarLimite();
      }, 10);
    });

    // Validar ao digitar
    textarea.addEventListener("input", function () {
      if (this.value.length > maxLength) {
        this.value = this.value.substring(0, maxLength);
        mostrarNotificacao(
          "TEXTO MUITO GRANDE, LIMITE DE 1000 CARACTERES",
          "warning",
        );
      }
      verificarLimite();
    });

    // Remover feedback visual ao começar a apagar
    textarea.addEventListener("keydown", function (e) {
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        this.value.length >= maxLength
      ) {
        setTimeout(() => verificarLimite(), 10);
      }
    });

    // Verificar limite inicial (caso já tenha conteúdo)
    verificarLimite();
  });
}

// Sistema de Notificações de Ajustes
async function atualizarContadorAjustesPendentes() {
  if (!acessoGestor) {
    const notifDiv = document.getElementById("notificacoesAjustes");
    if (notifDiv) notifDiv.style.display = "none";
    return;
  }

  try {
    // 1 única query para contar todos os ajustes pendentes
    const { count, error } = await supabase
      .from("ajustes")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_aprovacao");

    if (error) return;

    const notifDiv = document.getElementById("notificacoesAjustes");
    const badge = document.getElementById("badgeAjustesPendentes");

    if (notifDiv) notifDiv.style.display = "block";

    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  } catch (error) {
    // Silencioso
  }
}

// ============================================
// MODAL DE SOLICITAR AJUSTE
// ============================================
let solicitacaoAjusteAtual = null;

function abrirModalAjuste(idSolicitacao) {
  solicitacaoAjusteAtual = idSolicitacao;
  const modal = document.getElementById("modalAjuste");
  if (modal) {
    // Limpar formulário
    document.getElementById("ajusteTipoAjuste").value = "";
    document.getElementById("ajusteObservacoes").value = "";
    document.getElementById("ajusteDiretorioReferencia").value = "";
    document.getElementById("ajusteDiretorioSalvamento").value = "";
    document.getElementById("ajustePrazoFinal").value = "";

    modal.classList.add("active");
  }
}

function fecharModalAjuste() {
  const modal = document.getElementById("modalAjuste");
  if (modal) {
    modal.classList.remove("active");
  }
  solicitacaoAjusteAtual = null;
}

async function confirmarSolicitarAjuste() {
  if (!solicitacaoAjusteAtual) {
    mostrarNotificacao("Erro: Solicitação não identificada", "error");
    return;
  }

  const solicitadoPor = document
    .getElementById("ajusteNomeSolicitante")
    .value.trim();
  const tipoAjuste = document.getElementById("ajusteTipoAjuste").value.trim();
  const observacoes = document.getElementById("ajusteObservacoes").value.trim();
  const diretorioReferencia = document
    .getElementById("ajusteDiretorioReferencia")
    .value.trim();
  const diretorioSalvamento = document
    .getElementById("ajusteDiretorioSalvamento")
    .value.trim();
  const prazoFinal = document.getElementById("ajustePrazoFinal").value.trim();

  if (!solicitadoPor) {
    mostrarNotificacao("Por favor, informe seu nome", "warning");
    document.getElementById("ajusteNomeSolicitante").focus();
    return;
  }

  if (!observacoes) {
    mostrarNotificacao("Por favor, descreva o ajuste necessário", "warning");
    return;
  }

  try {
    mostrarLoader("Solicitando ajuste...");

    const dadosAjuste = {
      solicitadoPor,
      tipoAjuste,
      observacoes,
      diretorioReferencia,
      diretorioSalvamento,
      prazoFinal: prazoFinal ? converterDataParaISO(prazoFinal) : null,
    };

    await solicitarAjuste(solicitacaoAjusteAtual, dadosAjuste, null);

    mostrarNotificacao("Ajuste solicitado com sucesso!", "success");
    fecharModalAjuste();
    esconderLoader();

    // Atualizar contador de ajustes pendentes imediatamente
    await atualizarContadorAjustesPendentes();
  } catch (erro) {
    console.error("Erro ao solicitar ajuste:", erro);
    mostrarNotificacao("Erro ao solicitar ajuste: " + erro.message, "error");
    esconderLoader();
  }
}

// Abre modal com ajustes pendentes
async function abrirModalAjustesPendentes() {
  if (!acessoGestor) {
    mostrarNotificacao(
      "Apenas gestores podem ver ajustes pendentes!",
      "warning",
    );
    return;
  }

  const modal = document.getElementById("modalAjustesPendentes");
  const conteudo = document.getElementById("conteudoAjustesPendentes");

  if (!modal || !conteudo) return;

  try {
    // Mostrar loading
    conteudo.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="bi bi-hourglass-split" style="font-size: 3rem; color: var(--primary);"></i>
        <p style="margin-top: 16px; color: var(--muted);">Carregando ajustes pendentes...</p>
      </div>
    `;

    modal.classList.add("active");

    // 1 única query para buscar todos os ajustes pendentes com join
    const { data: ajustesPendentes, error } = await supabase
      .from("ajustes")
      .select("*")
      .eq("status", "aguardando_aprovacao")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Agrupar por solicitacao_id
    const ajustesPorSolicitacao = [];
    const idsUnicos = [
      ...new Set(ajustesPendentes.map((a) => a.solicitacao_id)),
    ];

    for (const solId of idsUnicos) {
      const solicitacao = solicitacoes.find((s) => s.id === solId);
      const ajustes = ajustesPendentes.filter(
        (a) => a.solicitacao_id === solId,
      );
      if (ajustes.length > 0) {
        ajustesPorSolicitacao.push({
          solicitacao: solicitacao || { id: solId },
          ajustes,
        });
      }
    }

    if (ajustesPorSolicitacao.length === 0) {
      conteudo.innerHTML = `
        <div class="ajustes-empty-state">
          <i class="bi bi-check-circle ajustes-empty-icon"></i>
          <p class="ajustes-empty-text">Nenhum ajuste pendente</p>
          <p class="ajustes-empty-subtext">Todos os ajustes foram processados</p>
        </div>
        <div class="btn-group justify-end" style="margin-top: 24px;">
          <button class="btn btn-ghost" type="button" onclick="fecharModalAjustesPendentes()">
            <i class="bi bi-x-circle"></i> Fechar
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div style="margin-bottom: 24px;">
        <p style="color: var(--muted); font-size: 0.95rem;">
          <i class="bi bi-info-circle"></i> 
          ${ajustesPorSolicitacao.length} solicitação(ões) com ajustes pendentes de aprovação
        </p>
      </div>
    `;

    ajustesPorSolicitacao.forEach(({ solicitacao, ajustes }) => {
      ajustes.forEach((ajuste) => {
        html += `
          <div class="ajuste-pendente-card">
            <div class="ajuste-pendente-header">
              <div class="ajuste-pendente-info">
                <div class="ajuste-pendente-solicitacao">
                  Solicitação #${String(solicitacao.id).padStart(4, "0")}
                </div>
                <div style="color: var(--text); font-size: 0.9rem; margin-top: 4px;">
                  ${escapeHtml(solicitacao.nomeEstudo || solicitacao.cliente || "Sem informações")}
                </div>
                <div class="ajuste-pendente-meta">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <i class="bi bi-calendar"></i>
                    ${new Date(ajuste.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              <span class="status-badge status-aguardando" style="display: flex; align-items: center; gap: 6px;">
                <i class="bi bi-clock"></i> Aguardando
              </span>
            </div>

            <div class="ajuste-pendente-content">
              ${
                ajuste.dados?.tipoAjuste
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Tipo de Ajuste</div>
                <div class="ajuste-pendente-field-value">${escapeHtml(ajuste.dados.tipoAjuste)}</div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.dados?.observacoes
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Observações</div>
                <div class="ajuste-pendente-field-value">${escapeHtml(ajuste.dados.observacoes)}</div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.dados?.diretorioReferencia
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Diretório de Referência</div>
                <div class="ajuste-pendente-field-value">${escapeHtml(ajuste.dados.diretorioReferencia)}</div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.dados?.diretorioSalvamento
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Diretório de Salvamento</div>
                <div class="ajuste-pendente-field-value">${escapeHtml(ajuste.dados.diretorioSalvamento)}</div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.prazo_final
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Novo Prazo Final</div>
                <div class="ajuste-pendente-field-value">
                  ${formatDateBR(ajuste.prazo_final)}
                </div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.dados?.solicitadoPor
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Solicitado por</div>
                <div class="ajuste-pendente-field-value">${escapeHtml(ajuste.dados.solicitadoPor)}</div>
              </div>
              `
                  : ""
              }

              ${
                ajuste.dados?.dataSolicitacao
                  ? `
              <div class="ajuste-pendente-field">
                <div class="ajuste-pendente-field-label">Data da Solicitação</div>
                <div class="ajuste-pendente-field-value">
                  ${new Date(ajuste.dados.dataSolicitacao).toLocaleString("pt-BR")}
                </div>
              </div>
              `
                  : ""
              }
            </div>

            <div class="ajuste-pendente-actions">
              <button class="btn btn-success" type="button" onclick="aprovarAjusteModal(${solicitacao.id}, ${ajuste.id})">
                <i class="bi bi-check-circle"></i> Aprovar
              </button>
              <button class="btn btn-danger" type="button" onclick="reprovarAjusteModal(${solicitacao.id}, ${ajuste.id})">
                <i class="bi bi-x-circle"></i> Reprovar
              </button>
              <button class="btn btn-info" type="button" onclick="verDetalhesSolicitacao(${solicitacao.id})">
                <i class="bi bi-eye"></i> Ver Solicitação
              </button>
            </div>
          </div>
        `;
      });
    });

    html += `
      <div class="btn-group justify-end" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
        <button class="btn btn-ghost" type="button" onclick="fecharModalAjustesPendentes()">
          <i class="bi bi-x-circle"></i> Fechar
        </button>
      </div>
    `;

    conteudo.innerHTML = html;
  } catch (error) {
    conteudo.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--danger);"></i>
        <p style="margin-top: 16px; color: var(--text);">Erro ao carregar ajustes pendentes</p>
        <p style="margin-top: 8px; color: var(--muted); font-size: 0.9rem;">${error.message}</p>
        <button class="btn btn-ghost" type="button" onclick="fecharModalAjustesPendentes()" style="margin-top: 16px;">
          Fechar
        </button>
      </div>
    `;
  }
}

// Fechar modal de ajustes pendentes
function fecharModalAjustesPendentes() {
  const modal = document.getElementById("modalAjustesPendentes");
  if (modal) {
    modal.classList.remove("active");
  }
}

// Ver detalhes da solicitação
function verDetalhesSolicitacao(idSolicitacao) {
  fecharModalAjustesPendentes();
  setTimeout(() => verDetalhes(idSolicitacao), 300);
}

// Abrir modal de atribuição para ajuste
function abrirModalAtribuicaoAjuste(idSolicitacao, idAjuste) {
  if (!acessoGestor) {
    mostrarNotificacao("Apenas gestores podem aprovar ajustes!", "warning");
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == idSolicitacao);
  if (!solicitacao || !conteudoAtribuicao) return;

  conteudoAtribuicao.innerHTML = `
    <div class="form-group">
      <p><strong>Aprovar Ajuste - Solicitação #${idSolicitacao}</strong></p>
      <p>Estudo: ${escapeHtml(solicitacao.nomeEstudo || "Não informado")}</p>
      <p>Cliente: ${escapeHtml(solicitacao.cliente || "")}</p>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="selectTecnicoAjuste">Atribuir ao Técnico *</label>
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

    <div class="btn-group justify-end" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalAtribuicao()">Cancelar</button>
      <button class="btn btn-success" type="button" onclick="confirmarAprovarAjuste(${idSolicitacao}, ${idAjuste})">
        <i class="bi bi-check-circle"></i> Aprovar e Atribuir
      </button>
    </div>
  `;

  modalAtribuicao?.classList.add("active");
  modalAtribuicao.dataset.solicitacaoId = idSolicitacao;

  // Focar no select após abrir
  setTimeout(() => {
    document.getElementById("selectTecnicoAjuste")?.focus();
  }, 100);
}

// Confirmar aprovação do ajuste
async function confirmarAprovarAjuste(idSolicitacao, idAjuste) {
  const tecnico = document.getElementById("selectTecnicoAjuste")?.value;

  if (!tecnico) {
    mostrarNotificacao("Selecione um técnico!", "warning");
    return;
  }

  try {
    mostrarLoader("Aprovando ajuste...");

    // Converter IDs para número
    const solicitacaoId = Number(idSolicitacao);
    const ajusteId = Number(idAjuste);

    await aprovarAjustePendente(solicitacaoId, ajusteId, "Gestor", tecnico);

    mostrarNotificacao("Ajuste aprovado com sucesso!", "success");
    fecharModalAtribuicao();
    esconderLoader();

    // Atualizar contador
    await atualizarContadorAjustesPendentes();

    // Recarregar solicitações
    await carregarSolicitacoes();

    // Reabrir modal de ajustes pendentes após 500ms
    setTimeout(() => abrirModalAjustesPendentes(), 500);
  } catch (error) {
    console.error("Erro ao aprovar ajuste:", error);
    mostrarNotificacao("Erro ao aprovar ajuste: " + error.message, "error");
    esconderLoader();
  }
}

// Aprovar ajuste do modal de notificações
async function aprovarAjusteModal(idSolicitacao, idAjuste) {
  if (!acessoGestor) {
    mostrarNotificacao("Apenas gestores podem aprovar ajustes!", "warning");
    return;
  }

  // Fechar modal de ajustes pendentes
  fecharModalAjustesPendentes();

  // Abrir modal de atribuição
  setTimeout(() => {
    window.abrirModalAtribuicaoAjuste(idSolicitacao, idAjuste);
  }, 300);
}

// Reprovar ajuste do modal de notificações
let ajusteParaReprovar = null;

async function reprovarAjusteModal(idSolicitacao, idAjuste) {
  if (!acessoGestor) {
    mostrarNotificacao("Apenas gestores podem reprovar ajustes!", "warning");
    return;
  }

  // Guardar IDs para usar na confirmação
  ajusteParaReprovar = { idSolicitacao, idAjuste };

  // Limpar campo de motivo
  const motivoInput = document.getElementById("motivoReprovacao");
  if (motivoInput) motivoInput.value = "";

  // Abrir modal de confirmação
  const modal = document.getElementById("modalConfirmarReprovacao");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => motivoInput?.focus(), 100);
  }
}

function fecharModalConfirmarReprovacao() {
  const modal = document.getElementById("modalConfirmarReprovacao");
  if (modal) modal.style.display = "none";
  ajusteParaReprovar = null;

  // Resetar textarea de motivo
  resetarTextareaContador("motivoReprovacao", "helpMotivoReprovacao");
}

async function confirmarReprovacaoAjuste() {
  if (!ajusteParaReprovar) return;

  const motivoInput = document.getElementById("motivoReprovacao");
  const motivo = motivoInput?.value?.trim();

  if (!motivo) {
    mostrarNotificacao("O motivo da reprovação é obrigatório!", "warning");
    motivoInput?.focus();
    return;
  }

  try {
    // Converter IDs para número
    const solicitacaoId = Number(ajusteParaReprovar.idSolicitacao);
    const ajusteId = Number(ajusteParaReprovar.idAjuste);

    await reprovarAjustePendente(solicitacaoId, ajusteId, "Gestor", motivo);

    mostrarNotificacao("Ajuste reprovado com sucesso!", "warning");

    // Fechar modal
    fecharModalConfirmarReprovacao();

    // Atualizar contador
    await atualizarContadorAjustesPendentes();

    // Reabrir modal de ajustes pendentes
    setTimeout(() => abrirModalAjustesPendentes(), 500);
  } catch (error) {
    console.error("Erro ao reprovar ajuste:", error);
    mostrarNotificacao("Erro ao reprovar ajuste: " + error.message, "error");
  }
}
