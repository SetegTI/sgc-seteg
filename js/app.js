// =======================================================
//  SGC SETEG - Sistema de Gestào Cartográfica
//  app.js - Lógica principal da aplicaçào
// =======================================================

// Variáveis globais
let solicitacoes = [];
let acessoGestor = false;
let acessoTecnico = false;
let tecnicoLogado = null;
let currentTheme = 'dark';

// Restaurar login do localStorage
function restaurarLogin() {
  const loginSalvo = localStorage.getItem('sgc_login');
  if (loginSalvo) {
    try {
      const dados = JSON.parse(loginSalvo);
      if (dados.tipo === 'gestor') {
        acessoGestor = true;
        console.log("✅ Login de gestor restaurado");
      } else if (dados.tipo === 'tecnico' && dados.tecnico) {
        acessoTecnico = true;
        tecnicoLogado = dados.tecnico;
        console.log("✅ Login de técnico restaurado:", tecnicoLogado);
      }
      atualizarIndicadorLogin();
    } catch (e) {
      console.error("Erro ao restaurar login:", e);
    }
  }
}

// Salvar login no localStorage
function salvarLogin(tipo, tecnico = null) {
  const dados = { tipo };
  if (tecnico) dados.tecnico = tecnico;
  localStorage.setItem('sgc_login', JSON.stringify(dados));
}

// Limpar login do localStorage
function limparLogin() {
  localStorage.removeItem('sgc_login');
}

// Códigos de acesso
const CODIGO_GESTOR = "482913";
const CODIGOS_TECNICOS = {
  LAIS: "739156",
  LAIZE: "885412",
  VALESKA: "605284",
  LIZABETH: "918347",
  ISMAEL: "274690",
  FERNANDO: "563821",
};

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

// =======================================================
//  FUNÇÕES AUXILIARES
// =======================================================
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
    fila: "Na Fila",
    processando: "Processando",
    aguardando: "Aguardando Dados",
    finalizado: "Finalizado",
  };
  return map[status] || status;
}

function formatarTipoMapa(tipo, nomeOutro) {
  const map = {
    planta: "Planta de Situaçào",
    localizacao: "Mapa de Localizaçào",
    outros: nomeOutro || "Outros",
  };
  return map[tipo] || tipo;
}

function formatarNomeTecnico(codigo) {
  if (!codigo) return "Nào atribuído";
  const nomes = {
    LAIS: "Laís",
    LAIZE: "Laíze",
    VALESKA: "Valeska",
    LIZABETH: "Lizabeth",
    ISMAEL: "Ismael",
    FERNANDO: "Fernando",
  };
  return nomes[codigo] || codigo;
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
    info: '<i class="bi bi-info-circle-fill"></i>'
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
      .join(",")
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

function convertToCSV(data) {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);

  const rows = data.map((obj) =>
    headers
      .map((h) => {
        const v = obj[h] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      })
      .join(",")
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

// =======================================================
//  INICIALIZAÇÃO
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
  // Carregar tema salvo
  currentTheme = localStorage.getItem('theme') || 'dark';
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
  
  // Botão Nova Solicitaçào
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
  
  // Tabs de filtro
  tabBtns.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Filtros baseados no índice
      const filtros = [null, "fila", "processando", "aguardando", "finalizado"];
      atualizarTabela(filtros[index]);
    });
  });

  bindEnterNoModal(modalAcessoGestor, validarCodigoAcesso);
  bindEnterNoModal(modalAcessoTecnico, validarAcessoTecnico);
  
  // Fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Fechar modal de detalhes
      if (modalDetalhes?.classList.contains('active')) {
        fecharModal();
      }
      // Fechar modal de acesso gestor
      else if (modalAcessoGestor?.classList.contains('active')) {
        fecharModalAcessoGestor();
      }
      // Fechar modal de acesso técnico
      else if (modalAcessoTecnico?.classList.contains('active')) {
        fecharModalAcessoTecnico();
      }
      // Fechar modal de atribuição
      else if (modalAtribuicao?.classList.contains('active')) {
        fecharModalAtribuicao();
      }
      // Fechar modal de confirmação
      else if (modalConfirmacao?.classList.contains('active')) {
        fecharModalConfirmacao();
      }
      // Fechar modal de relatório
      else if (modalRelatorio?.classList.contains('active')) {
        fecharModalRelatorio();
      }
    }
  });

  // Aguardar Firebase estar pronto
  const aguardarFirebase = setInterval(() => {
    if (window.dbRef && window.firebaseFunctions) {
      clearInterval(aguardarFirebase);
      carregarSolicitacoesFirebase();
      console.log("✅ App inicializado com Firebase");
    }
  }, 100);

  // Timeout de segurança
  setTimeout(() => {
    clearInterval(aguardarFirebase);
    if (!window.dbRef) {
      console.error("❌ Firebase nào carregou!");
    }
  }, 5000);
});

// =======================================================
//  THEME TOGGLE (Dark/Light Mode)
// =======================================================
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  localStorage.setItem('theme', currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  const slider = document.querySelector('.theme-toggle-slider');
  if (slider) {
    if (theme === 'light') {
      slider.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
      slider.innerHTML = '<i class="bi bi-moon-fill"></i>';
    }
  }
}

// =======================================================
//  FIREBASE - CRUD
// =======================================================
function carregarSolicitacoesFirebase() {
  const { onValue } = window.firebaseFunctions;
  const dbRef = window.dbRef;

  if (!dbRef || !onValue) {
    console.error("Firebase Nào inicializado!");
    return;
  }

  onValue(dbRef, (snapshot) => {
    solicitacoes = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        solicitacoes.push({ id: child.key, ...child.val() });
      });
    }
    atualizarTabela();
    atualizarEstatisticas();
    atualizarListaTecnicos();
    atualizarEstatisticasTecnico();
  });
}

function salvarSolicitacaoFirebase(dados) {
  const { ref, runTransaction } = window.firebaseFunctions;
  const db = window.db;

  const contadorRef = ref(db, "contador");

  runTransaction(contadorRef, (atual) => {
    return (atual || 0) + 1;
  }).then((result) => {
    const novoId = result.snapshot.val();
    const { set } = window.firebaseFunctions;
    const solRef = ref(db, `solicitacoes/${novoId}`);

    set(solRef, {
      ...dados,
      id: novoId,
      dataCriacao: new Date().toISOString(),
    })
      .then(() => {
        mostrarNotificacao("Solicitaçào criada com sucesso!", "success");
        limparForm();
        toggleForm();
      })
      .catch((err) => {
        console.error("Erro ao salvar:", err);
        mostrarNotificacao("Erro ao salvar Solicitaçào!", "error");
      });
  });
}

function atualizarSolicitacaoFirebase(id, dados) {
  const { ref, update } = window.firebaseFunctions;
  const db = window.db;

  const solRef = ref(db, `solicitacoes/${id}`);

  update(solRef, dados)
    .then(() => {
      console.log(`Solicitaçào #${id} atualizada`);
    })
    .catch((err) => {
      console.error("Erro ao atualizar:", err);
      mostrarNotificacao("Erro ao atualizar!", "error");
    });
}

function excluirSolicitacao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const { ref, remove } = window.firebaseFunctions;
  const db = window.db;

  const solRef = ref(db, `solicitacoes/${id}`);

  remove(solRef)
    .then(() => {
      fecharModalConfirmacao();
      fecharModal();
      mostrarNotificacao(`Solicitaçào #${id} excluída!`, "success");
    })
    .catch((err) => {
      console.error("Erro ao excluir:", err);
      mostrarNotificacao("Erro ao excluir!", "error");
    });
}

// =======================================================
//  FORMULÁRIO
// =======================================================
function toggleForm() {
  const formSection = document.querySelector(".form-section");
  const btnToggle = document.getElementById("btnToggleForm");
  const isActive = formSection?.classList.toggle("active");
  
  if (btnToggle) {
    if (isActive) {
      btnToggle.innerHTML = '<i class="bi bi-chevron-up"></i> Recolher Formulário';
    } else {
      btnToggle.innerHTML = '<i class="bi bi-file-earmark-plus"></i> Nova Solicitação';
    }
  }
}

function limparForm() {
  formSolicitacao?.reset();
  safeSetDisplay("campoTipoMapaOutros", "none");
  safeSetDisplay("campoARTResponsavel", "none");
  safeSetDisplay("campoElementosOutros", "none");
  mostrarNotificacao("Campos do formulário foram limpos!", "info");
}

function toggleTipoMapaOutros() {
  const select = document.getElementById("tipoMapa");
  const campo = document.getElementById("campoTipoMapaOutros");
  if (campo) {
    campo.style.display = select?.value === "OUTROS" ? "block" : "none";
  }
}

function toggleARTResponsavel() {
  const select = document.getElementById("artNecessaria");
  const campo = document.getElementById("campoARTResponsavel");
  if (campo) {
    campo.style.display = select?.value === "sim" ? "block" : "none";
  }
}

function toggleElementosOutros() {
  const checkbox = document.getElementById("elementosOutros");
  const campo = document.getElementById("campoElementosOutros");
  if (campo) {
    campo.style.display = checkbox?.checked ? "block" : "none";
  }
}

function salvarSolicitacao(e) {
  e.preventDefault();
  
  // Verificar se o formulário é válido
  const form = e.target;
  if (!form.checkValidity()) {
    // Mostrar notificação
    mostrarNotificacao("Preencha todos os campos obrigatórios (*)", "warning");
    
    // Encontrar o primeiro campo inválido e focar nele
    const campoInvalido = form.querySelector(':invalid');
    if (campoInvalido) {
      campoInvalido.focus();
      // Forçar a exibição da mensagem de validação nativa
      campoInvalido.reportValidity();
    }
    return;
  }

  const formData = new FormData(formSolicitacao);
  const dados = {
    solicitante: formData.get("solicitante"),
    cliente: formData.get("cliente"),
    nomeEstudo: formData.get("nomeEstudo"),
    empreendimento: formData.get("empreendimento"),
    localidade: formData.get("localidade"),
    municipio: formData.get("municipio"),
    tipoMapa: formData.get("tipoMapa"),
    nomeTipoMapa: formData.get("nomeTipoMapa") || "",
    finalidade: formData.get("finalidade"),
    artNecessaria: formData.get("artNecessaria"),
    artResponsavel: formData.get("artResponsavel") || "",
    diretorioArquivos: formData.get("diretorioArquivos"),
    diretorioSalvamento: formData.get("diretorioSalvamento"),
    observacoes: formData.get("observacoes") || "",
    dataSolicitacao: formData.get("dataSolicitacao"),
    dataEntrega: formData.get("dataEntrega") || "",
    prazoDias: Number(formData.get("prazoDias")) || 0,
    status: "fila",
    tecnicoResponsavel: "PENDENTE",
    produtos: {
      mapa: formData.get("produtoMapa") === "on",
      croqui: formData.get("produtoCroqui") === "on",
      shapefile: formData.get("produtoShapefile") === "on",
      kml: formData.get("produtoKML") === "on",
    },
    elementos: {
      localizacao: formData.get("elementosLocalizacao") === "on",
      acessoLocal: formData.get("elementosAcessoLocal") === "on",
      acessoRegional: formData.get("elementosAcessoRegional") === "on",
      areaAmostral: formData.get("elementosAreaAmostral") === "on",
      outros: formData.get("elementosOutros") === "on",
      outrosTexto: formData.get("elementosOutrosTexto") || "",
    },
  };

  const dataSol = dados.dataSolicitacao;
  const prazo = dados.prazoDias;
  if (dataSol && prazo > 0) {
    dados.dataConclusaoPrevista = calcularDataConclusao(dataSol, prazo);
  }

  salvarSolicitacaoFirebase(dados);
}

// =======================================================
//  ACESSO GESTOR / TÉCNICO
// =======================================================
function atualizarIndicadorLogin() {
  const indicator = document.getElementById("loginIndicator");
  const loginText = document.getElementById("loginText");
  const btnGestor = document.getElementById("btnAcessoGestor");
  const btnTecnico = document.getElementById("btnAcessoTecnico");
  
  if (acessoGestor) {
    indicator.style.display = "flex";
    loginText.innerHTML = '<i class="bi bi-shield-lock"></i> Logado como <strong>Gestor</strong>';
    btnGestor.style.display = "none";
    btnTecnico.style.display = "none";
  } else if (acessoTecnico && tecnicoLogado) {
    indicator.style.display = "flex";
    loginText.innerHTML = `<i class="bi bi-person-circle"></i> Logado como <strong>${formatarNomeTecnico(tecnicoLogado)}</strong>`;
    btnGestor.style.display = "none";
    btnTecnico.style.display = "none";
  } else {
    indicator.style.display = "none";
    btnGestor.style.display = "inline-flex";
    btnTecnico.style.display = "inline-flex";
  }
}

function abrirModalAcessoGestor() {
  // Bloquear se já estiver logado como técnico
  if (acessoTecnico) {
    mostrarNotificacao("Você já está logado como Técnico. Faça logout primeiro.", "warning");
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

function validarCodigoAcesso() {
  const codigo = document.getElementById("codigoAcesso")?.value.trim();
  if (codigo === CODIGO_GESTOR) {
    acessoGestor = true;
    fecharModalAcessoGestor();
    salvarLogin('gestor');
    mostrarNotificacao("Acesso de gestor concedido!", "success");
    atualizarListaTecnicos();
    atualizarIndicadorLogin();
  } else {
    mostrarNotificacao("Código incorreto!", "error");
  }
}


function abrirModalAcessoTecnico() {
  // Bloquear se já estiver logado como gestor
  if (acessoGestor) {
    mostrarNotificacao("Você já está logado como Gestor. Faça logout primeiro.", "warning");
    return;
  }
  modalAcessoTecnico?.classList.add("active");
  setTimeout(() => document.getElementById("codigoAcessoTecnico")?.focus(), 100);
}

function fecharModalAcessoTecnico() {
  modalAcessoTecnico?.classList.remove("active");
  const input = document.getElementById("codigoAcessoTecnico");
  if (input) input.value = "";
}

function validarAcessoTecnico() {
  const codigo = document.getElementById("codigoAcessoTecnico")?.value.trim();
  
  const tecnico = Object.keys(CODIGOS_TECNICOS).find(
    (t) => CODIGOS_TECNICOS[t] === codigo
  );

  if (tecnico) {
    acessoTecnico = true;
    tecnicoLogado = tecnico;
    fecharModalAcessoTecnico();
    salvarLogin('tecnico', tecnico);
    mostrarNotificacao(
      `Bem-vindo(a), ${formatarNomeTecnico(tecnico)}!`,
      "success"
    );
    atualizarTabela();
    atualizarEstatisticas();
    atualizarEstatisticasTecnico();
    atualizarIndicadorLogin();
  } else {
    mostrarNotificacao("Código incorreto!", "error");
  }
}


function fazerLogout() {
  acessoGestor = false;
  acessoTecnico = false;
  tecnicoLogado = null;
  limparLogin();
  mostrarNotificacao("Logout realizado!", "info");
  atualizarTabela();
  atualizarEstatisticas();
  atualizarListaTecnicos();
  atualizarEstatisticasTecnico();
  atualizarIndicadorLogin();
}

// =======================================================
//  TABELA
// =======================================================
function atualizarTabela(filtroStatus = null) {
  if (!tabelaSolicitacoes) return;

  let base = solicitacoes;

  if (acessoTecnico && tecnicoLogado && !acessoGestor) {
    base = base.filter((s) => s.tecnicoResponsavel === tecnicoLogado);
  }

  if (filtroStatus) {
    base = base.filter((s) => s.status === filtroStatus);
  }

  if (base.length === 0) {
    tabelaSolicitacoes.innerHTML = "";
    emptyState?.classList.add("active");
    return;
  }

  emptyState?.classList.remove("active");

  const html = base
    .sort((a, b) => b.id - a.id)
    .map((s) => {
      const statusClass = `status-${s.status}`;
      return `
        <tr>
          <td>#${String(s.id).padStart(4, "0")}</td>
          <td>${escapeHtml(s.solicitante || "")}</td>
          <td>${escapeHtml(s.nomeEstudo || "Nào informado")}</td>
          <td>${escapeHtml(s.cliente || "")}</td>
          <td>${escapeHtml(formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa))}</td>
          <td>${escapeHtml(s.municipio || "")}</td>
          <td>${escapeHtml(formatarNomeTecnico(s.tecnicoResponsavel))}</td>
          <td><span class="status-badge ${statusClass}">${escapeHtml(
        formatarStatus(s.status)
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
}

// =======================================================
//  DETALHES DA SOLICITAÇÃO
// =======================================================
function verDetalhes(id) {
  console.log("🔍 Abrindo detalhes - ID:", id);
  console.log("🔍 acessoGestor:", acessoGestor);
  console.log("🔍 acessoTecnico:", acessoTecnico);
  console.log("🔍 tecnicoLogado:", tecnicoLogado);
  
  const solicitacao = solicitacoes.find((s) => s.id == id);
  
  console.log("📦 Dados completos da solicitação:", solicitacao);
  
  if (!solicitacao) {
    console.error("❌ Solicitação não encontrada!");
    mostrarNotificacao("Solicitação não encontrada!", "error");
    return;
  }
  
  if (!conteudoDetalhes) {
    console.error("❌ conteudoDetalhes não encontrado!");
    return;
  }

  const dataSolicitacao = formatDateBR(solicitacao.dataSolicitacao);
  const dataCriacao = solicitacao.dataCriacao
    ? new Date(solicitacao.dataCriacao).toLocaleString("pt-BR")
    : "â€”";
  const dataConclusaoPrevista = formatDateBR(solicitacao.dataConclusaoPrevista);
  const dataConclusaoReal = solicitacao.dataConclusaoReal
    ? formatDateBR(solicitacao.dataConclusaoReal)
    : "Nào concluída";
  const dataEntrega = solicitacao.dataEntrega
    ? formatDateBR(solicitacao.dataEntrega)
    : "Nào informado";

  let statusPrazo = "";
  if (solicitacao.status === "finalizado" && solicitacao.dataConclusaoReal) {
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
  if (elementos.localizacao) elementosHtml += "✓ Localizaçào ";
  if (elementos.acessoLocal) elementosHtml += "✓ Via de Acesso Local ";
  if (elementos.acessoRegional)
    elementosHtml += "✓ Via de Acesso Regional ";
  if (elementos.areaAmostral) elementosHtml += "✓ àrea Amostral ";
  if (elementos.outros && elementos.outrosTexto) {
    elementosHtml += `✓ Outros: ${escapeHtml(elementos.outrosTexto)} `;
  }

  conteudoDetalhes.innerHTML = `
    <div class="modal-body">
      
      <!-- Seçào: Situaçào da Solicitaçào -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-info-circle"></i> Situaçào da Solicitaçào</h4>
        <div class="detalhe-grid" style="grid-template-columns: repeat(4, 1fr);">
          <div class="detalhe-item">
            <div class="detalhe-label">ID</div>
            <div class="detalhe-value">#${String(solicitacao.id).padStart(4, "0")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Status</div>
            <div class="detalhe-value">
              <span class="status-badge status-${solicitacao.status}">${escapeHtml(formatarStatus(solicitacao.status))}</span>
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
      </div>

      ${(() => {
        console.log("🔍 Verificando acessoGestor no template:", acessoGestor);
        if (acessoGestor) {
          console.log("✅ Renderizando seção Ações do Gestor");
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
                <option value="" disabled ${!solicitacao.status ? 'selected' : ''}>Selecione um estágio...</option>
                <option value="fila" ${solicitacao.status === 'fila' ? 'selected' : ''}>Na Fila</option>
                <option value="processando" ${solicitacao.status === 'processando' ? 'selected' : ''}>Processando</option>
                <option value="aguardando" ${solicitacao.status === 'aguardando' ? 'selected' : ''}>Aguardando Dados</option>
                <option value="finalizado" ${solicitacao.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
              </select>
              <i class="bi bi-chevron-down" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(59, 130, 246, 0.8); font-size: 1.2rem;"></i>
            </div>
            <button class="btn btn-success" type="button" onclick="salvarNovoStatus(${solicitacao.id})" style="margin-top: 12px; width: 100%;">
              <i class="bi bi-check-circle"></i> Salvar Alterações
            </button>
          </div>
        </div>
        <div class="btn-group" style="margin-top: 12px; gap: 8px;">
          <button class="btn btn-info" type="button" onclick="abrirModalAtribuicao(${Number(solicitacao.id)})">
            <i class="bi bi-person-plus"></i> Atribuir Técnico
          </button>
          <button class="btn btn-danger" type="button" onclick="confirmarExclusao(${Number(solicitacao.id)})">
            <i class="bi bi-trash"></i> Excluir Solicitação
          </button>
        </div>
      </div>
          `;
        } else if (acessoTecnico && solicitacao.tecnicoResponsavel === tecnicoLogado) {
          console.log("✅ Renderizando seção Ações do Técnico");
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
                <option value="" disabled ${!solicitacao.status ? 'selected' : ''}>Selecione um estágio...</option>
                <option value="processando" ${solicitacao.status === 'processando' ? 'selected' : ''}>Processando</option>
                <option value="aguardando" ${solicitacao.status === 'aguardando' ? 'selected' : ''}>Aguardando Dados</option>
                <option value="finalizado" ${solicitacao.status === 'finalizado' ? 'selected' : ''}>Finalizado</option>
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
          console.log("❌ Nenhuma seção de ações renderizada");
          return '';
        }
      })()}

      <!-- Seçào: Dados Gerais -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-file-text"></i> Dados Gerais</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Solicitante</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.solicitante || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Cliente / Requerente</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.cliente || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Nome do Estudo</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.nomeEstudo || "Nào informado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Data da Solicitaçào</div>
            <div class="detalhe-value">${dataSolicitacao}</div>
          </div>
        </div>
      </div>

      <!-- Seçào: Localizaçào e Empreendimento -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-geo-alt"></i> Localizaçào e Empreendimento</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Empreendimento</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.empreendimento || "Nào informado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Localidade</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.localidade || "")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Município / Estado</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.municipio || "Nào informado")}</div>
          </div>
        </div>
      </div>

      <!-- Seçào: Prazos -->
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
            <div class="detalhe-label">Conclusào Prevista</div>
            <div class="detalhe-value">${dataConclusaoPrevista}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Conclusào Real</div>
            <div class="detalhe-value">${dataConclusaoReal}</div>
          </div>
          ${statusPrazo ? `
          <div class="detalhe-item">
            <div class="detalhe-label">Situaçào do Prazo</div>
            <div class="detalhe-value">${statusPrazo}</div>
          </div>
          ` : ""}
        </div>
      </div>

      <!-- Seçào: Informações Técnicas -->
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
            <div class="detalhe-value">${solicitacao.artNecessaria === "sim" ? "✓ Sim" : "✓ Nào"}</div>
          </div>
          ${solicitacao.artNecessaria === "sim" && solicitacao.artResponsavel ? `
          <div class="detalhe-item">
            <div class="detalhe-label">Responsável Técnico</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.artResponsavel)}</div>
          </div>
          ` : ""}
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

      <!-- Seçào: Arquivos e Diretórios -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-folder"></i> Arquivos e Diretórios</h4>
        <div class="detalhe-grid">
          <div class="detalhe-item">
            <div class="detalhe-label">Diretório dos Arquivos</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.diretorioArquivos || "Nào especificado")}</div>
          </div>
          <div class="detalhe-item">
            <div class="detalhe-label">Diretório de Salvamento</div>
            <div class="detalhe-value">${escapeHtml(solicitacao.diretorioSalvamento || "Nào especificado")}</div>
          </div>
        </div>
      </div>

      ${solicitacao.observacoes ? `
      <!-- Seçào: Observações -->
      <div class="detalhe-section">
        <h4 class="detalhe-section-title"><i class="bi bi-chat-left-text"></i> Observações</h4>
        <div class="detalhe-observacoes">
          ${escapeHtml(solicitacao.observacoes)}
        </div>
      </div>
      ` : ""}

    </div>
  `;

  modalDetalhes?.classList.add("active");
}

function fecharModal() {
  modalDetalhes?.classList.remove("active");
}

function mudarStatus(id, novoStatus) {
  console.log("🔄 mudarStatus chamado - ID:", id, "Novo Status:", novoStatus);
  console.log("📋 Array solicitacoes:", solicitacoes.map(s => ({ id: s.id, tipo: typeof s.id })));
  
  if (!novoStatus) {
    console.log("❌ Nenhum status selecionado");
    mostrarNotificacao("Selecione um estágio!", "warning");
    return;
  }
  
  if (!acessoGestor && !acessoTecnico) {
    console.log("❌ Sem permissão - acessoGestor:", acessoGestor, "acessoTecnico:", acessoTecnico);
    mostrarNotificacao("Faça login para alterar status!", "warning");
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  console.log("📦 Solicitação encontrada:", solicitacao);
  
  if (!solicitacao) {
    console.log("❌ Solicitação não encontrada");
    return;
  }

  if (acessoTecnico && solicitacao.tecnicoResponsavel !== tecnicoLogado) {
    console.log("❌ Técnico não autorizado");
    mostrarNotificacao(
      "Você só pode alterar solicitações atribuídas a você!",
      "warning"
    );
    return;
  }

  console.log("✅ Atualizando status no Firebase...");
  atualizarSolicitacaoFirebase(id, { status: novoStatus });

  const mensagem = {
    fila: "movida para a fila",
    processando: "iniciou o processamento",
    aguardando: "está aguardando dados",
    finalizado: "foi finalizada",
  };

  mostrarNotificacao(
    `Solicitação #${id} ${mensagem[novoStatus] || "atualizada"}!`,
    "success"
  );
  
  // Atualizar o status localmente e reabrir os detalhes
  solicitacao.status = novoStatus;
  setTimeout(() => verDetalhes(id), 300);
}

function salvarNovoStatus(id) {
  console.log("🔧 salvarNovoStatus chamado - ID:", id, "Tipo:", typeof id);
  const select = document.getElementById(`selectEstagio${id}`);
  console.log("🔧 Select encontrado:", select);
  if (!select) {
    console.error("❌ Select não encontrado para ID:", id);
    return;
  }
  
  const novoStatus = select.value;
  console.log("🔧 Novo status selecionado:", novoStatus);
  mudarStatus(id, novoStatus);
}
function finalizarSolicitacao(id) {
  if (!acessoGestor && !acessoTecnico) {
    mostrarNotificacao("Faça login para finalizar!", "warning");
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao) return;

  if (acessoTecnico && solicitacao.tecnicoResponsavel !== tecnicoLogado) {
    mostrarNotificacao(
      "Você só pode finalizar solicitações atribuídas a você!",
      "warning"
    );
    return;
  }

  if (solicitacao.status === "finalizado") {
    mostrarNotificacao("Esta Solicitaçào já foi finalizada.", "info");
    return;
  }

  atualizarSolicitacaoFirebase(id, {
    status: "finalizado",
    dataConclusaoReal: new Date().toISOString().split("T")[0],
  });

  fecharModal();
  mostrarNotificacao(`Solicitaçào #${id} finalizada!`, "success");
}

function abrirModalAtribuicao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao || !conteudoAtribuicao) return;

  conteudoAtribuicao.innerHTML = `
    <div class="form-group">
      <p><strong>Solicitaçào #${id}</strong></p>
      <p>Estudo: ${escapeHtml(
        solicitacao.nomeEstudo || "Nào informado"
      )}</p>
      <p>Cliente: ${escapeHtml(solicitacao.cliente || "")}</p>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="selectTecnico">Selecione o Técnico *</label>
      <select id="selectTecnico" required>
        <option value="PENDENTE" disabled selected>Selecione um técnico...</option>
        <option value="LAIS">Laís Mendes</option>
        <option value="LAIZE">Laize Rodrigues</option>
        <option value="VALESKA">Valeska Soares</option>
        <option value="LIZABETH">Lizabeth Silva</option>
        <option value="ISMAEL">Ismael Alves</option>
        <option value="FERNANDO">Fernando Sousa</option>
      </select>
    </div>

    <div class="form-group" style="margin-top: 12px;">
      <label for="inputDataConclusao">Data de Conclusào (Prazo)</label>
      <input type="date" id="inputDataConclusao" />
    </div>

    <div class="btn-group" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalAtribuicao()">Cancelar</button>
      <button class="btn btn-primary" type="button" onclick="atribuirTecnico(${Number(
        id
      )})">Atribuir</button>
    </div>
  `;

  const sel = document.getElementById("selectTecnico");
  if (sel && solicitacao.tecnicoResponsavel)
    sel.value = solicitacao.tecnicoResponsavel;

  modalAtribuicao?.classList.add("active");
}

function fecharModalAtribuicao() {
  modalAtribuicao?.classList.remove("active");
}

function atribuirTecnico(id) {
  const tecnico = document.getElementById("selectTecnico")?.value;
  const dataConclusao =
    document.getElementById("inputDataConclusao")?.value;

  if (!tecnico || tecnico === "PENDENTE") {
    mostrarNotificacao("Selecione um Técnico!", "warning");
    return;
  }

  atualizarSolicitacaoFirebase(id, {
    tecnicoResponsavel: tecnico,
    dataConclusaoPrevista: dataConclusao || null,
    status: "processando",
  });

  fecharModalAtribuicao();
  mostrarNotificacao(
    `Solicitaçào #${id} atribuída para ${formatarNomeTecnico(tecnico)}!`,
    "success"
  );
}

function confirmarExclusao(id) {
  if (!acessoGestor) {
    abrirModalAcessoGestor();
    return;
  }

  const solicitacao = solicitacoes.find((s) => s.id == id);
  if (!solicitacao || !conteudoConfirmacao) return;

  conteudoConfirmacao.innerHTML = `
    <p><strong>Confirmar Exclusào</strong></p>
    <p style="margin-top: 8px;">
      Tem certeza que deseja excluir a Solicitaçào #${id} de ${escapeHtml(
        solicitacao.cliente || ""
      )}?
    </p>
    <p style="margin-top: 8px; color: var(--warning);">
      Esta açào Nào pode ser desfeita!
    </p>
    <div class="btn-group" style="margin-top: 16px;">
      <button class="btn btn-ghost" type="button" onclick="fecharModalConfirmacao()">Cancelar</button>
      <button class="btn btn-danger" type="button" onclick="excluirSolicitacao(${Number(
        id
      )})">Excluir</button>
    </div>
  `;

  modalConfirmacao?.classList.add("active");
}

function fecharModalConfirmacao() {
  modalConfirmacao?.classList.remove("active");
}

// =======================================================
//  RELATÓRIOS / FILTROS
// =======================================================
function filtrarSolicitacoes(tipo) {
  let statusFiltro = null;
  switch (tipo) {
    case "em_andamento":
      statusFiltro = null;
      break;
    case "na_fila":
      statusFiltro = "fila";
      break;
    case "aguardando_dados":
      statusFiltro = "aguardando";
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
    case "processando":
      statusFiltro = "processando";
      break;
    case "aguardando":
      statusFiltro = "aguardando";
      break;
    case "finalizadas":
    case "finalizado":
      statusFiltro = "finalizado";
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

  const dataInicio = document.getElementById(
    "relatorioPeriodoInicio"
  )?.value;
  const dataFim = document.getElementById("relatorioPeriodoFim")?.value;

  if (!dataInicio || !dataFim) {
    mostrarNotificacao("Selecione o período!", "warning");
    return;
  }
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
    (s) => s.status === "finalizado"
  ).length;

  const dentroPrazo = solicitacoesPeriodo.filter((s) => {
    const real = s.dataConclusaoReal
      ? parseDateOnly(s.dataConclusaoReal)
      : null;
    const prevista = s.dataConclusaoPrevista
      ? parseDateOnly(s.dataConclusaoPrevista)
      : null;
    return (
      s.status === "finalizado" &&
      real &&
      prevista &&
      real <= prevista
    );
  }).length;

  const foraPrazo = finalizadas - dentroPrazo;

  const tecnicos = Object.keys(CODIGOS_TECNICOS);
  const estatisticasTecnicos = {};

  tecnicos.forEach((tecnico) => {
    const solTec = solicitacoesPeriodo.filter(
      (s) => s.tecnicoResponsavel === tecnico
    );
    estatisticasTecnicos[tecnico] = {
      total: solTec.length,
      finalizadas: solTec.filter((s) => s.status === "finalizado").length,
      dentroPrazo: solTec.filter((s) => {
        const real = s.dataConclusaoReal
          ? parseDateOnly(s.dataConclusaoReal)
          : null;
        const prevista = s.dataConclusaoPrevista
          ? parseDateOnly(s.dataConclusaoPrevista)
          : null;
        return (
          s.status === "finalizado" &&
          real &&
          prevista &&
          real <= prevista
        );
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
      <h4 class="panel-card-title">ðŸ‘¨â€ðŸ’¼ Por Técnico</h4>
  `;

  tecnicos.forEach((tecnico) => {
    const stats = estatisticasTecnicos[tecnico];
    if (stats.total > 0) {
      const taxaConclusao = (
        (stats.finalizadas / stats.total) *
        100
      ).toFixed(1);
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
              <div class="relatorio-metric-label">Conclusào</div>
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
        dataInicio
      )}', '${escapeAttr(dataFim)}')">ðŸ“¥ Exportar CSV</button>
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
      s.status === "finalizado" &&
      s.dataConclusaoReal &&
      s.dataConclusaoPrevista &&
      parseDateOnly(s.dataConclusaoReal) <=
        parseDateOnly(s.dataConclusaoPrevista);

    return {
      ID: s.id,
      Solicitante: s.solicitante,
      Cliente: s.cliente,
      Estudo: s.nomeEstudo || "Nào informado",
      "Tipo Mapa": formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa),
      Município: s.municipio,
      Técnico: formatarNomeTecnico(s.tecnicoResponsavel),
      Status: formatarStatus(s.status),
      "Prazo (dias úteis)": s.prazoDias,
      "Diretório Arquivos": s.diretorioArquivos || "Nào especificado",
      "Diretório Salvamento":
        s.diretorioSalvamento || "Nào especificado",
      "Data Solicitaçào": formatDateBR(s.dataSolicitacao),
      "Conclusào Prevista": formatDateBR(s.dataConclusaoPrevista),
      "Conclusào Real": s.dataConclusaoReal
        ? formatDateBR(s.dataConclusaoReal)
        : "",
      "Dentro do Prazo":
        s.status === "finalizado"
          ? dentroPrazo
            ? "SIM"
            : "NàO"
          : "EM ANDAMENTO",
    };
  });

  downloadCSV(
    dadosExport,
    `relatorio_solicitacoes_${dataInicio}_a_${dataFim}.csv`
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
      s.status === "finalizado" &&
      s.dataConclusaoReal &&
      s.dataConclusaoPrevista &&
      parseDateOnly(s.dataConclusaoReal) <=
        parseDateOnly(s.dataConclusaoPrevista);

    return {
      ID: s.id,
      Solicitante: s.solicitante,
      Cliente: s.cliente,
      Estudo: s.nomeEstudo || "Nào informado",
      "Tipo Mapa": formatarTipoMapa(s.tipoMapa, s.nomeTipoMapa),
      Município: s.municipio,
      Técnico: formatarNomeTecnico(s.tecnicoResponsavel),
      Status: formatarStatus(s.status),
      "Prazo (dias úteis)": s.prazoDias,
      "Diretório Arquivos": s.diretorioArquivos || "Nào especificado",
      "Diretório Salvamento":
        s.diretorioSalvamento || "Nào especificado",
      "Data Solicitaçào": formatDateBR(s.dataSolicitacao),
      "Conclusào Prevista": formatDateBR(s.dataConclusaoPrevista),
      "Conclusào Real": s.dataConclusaoReal
        ? formatDateBR(s.dataConclusaoReal)
        : "",
      "Dentro do Prazo":
        s.status === "finalizado"
          ? dentroPrazo
            ? "SIM"
            : "NàO"
          : "EM ANDAMENTO",
    };
  });

  downloadCSV(
    dadosExport,
    `todos_dados_solicitacoes_${
      new Date().toISOString().split("T")[0]
    }.csv`
  );
  mostrarNotificacao("Todos os dados exportados!", "success");
}

// =======================================================
//  ESTATÍSTICAS
// =======================================================
function atualizarEstatisticas() {
  const base =
    acessoTecnico && tecnicoLogado
      ? solicitacoes.filter((s) => s.tecnicoResponsavel === tecnicoLogado)
      : solicitacoes;

  setText("totalSolicitacoes", base.length);
  setText(
    "totalFila",
    base.filter((s) => s.status === "fila").length
  );
  setText(
    "totalProcessando",
    base.filter((s) => s.status === "processando").length
  );
  setText(
    "totalFinalizadas",
    base.filter((s) => s.status === "finalizado").length
  );
}

function atualizarListaTecnicos() {
  if (!listaTecnicos) return;

  if (!acessoGestor) {
    listaTecnicos.innerHTML =
      '<p class="muted">Faça login como gestor para ver os Técnicos</p>';
    return;
  }

  const tecnicos = Object.keys(CODIGOS_TECNICOS);
  let html = "";

  tecnicos.forEach((tecnico) => {
    const solTec = solicitacoes.filter(
      (s) => s.tecnicoResponsavel === tecnico && s.status !== "finalizado"
    );
    if (solTec.length > 0) {
      html += `
        <div class="tecnico-item">
          <strong>${formatarNomeTecnico(tecnico)}</strong>
          <span class="muted-strong">${solTec.length} projeto(s) em andamento</span>
          <div class="panel-card-list" style="margin-top: 6px;">
            ${solTec
              .slice(0, 3)
              .map(
                (s) =>
                  `<div class="muted">${escapeHtml(
                    s.nomeEstudo || "Sem nome"
                  )} - ${escapeHtml(formatarStatus(s.status))}</div>`
              )
              .join("")}
            ${
              solTec.length > 3
                ? `<div class="muted">+ ${
                    solTec.length - 3
                  } outro(s)</div>`
                : ""
            }
          </div>
        </div>
      `;
    }
  });

  if (!html) {
    html =
      '<p class="muted">Nenhum Técnico com projetos em andamento</p>';
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
    (s) => s.tecnicoResponsavel === tecnicoLogado
  );
  const emAndamento = solTec.filter(
    (s) => s.status !== "finalizado"
  ).length;
  const finalizadas = solTec.filter(
    (s) => s.status === "finalizado"
  ).length;

  const dentroPrazo = solTec.filter((s) => {
    const real = s.dataConclusaoReal
      ? parseDateOnly(s.dataConclusaoReal)
      : null;
    const prevista = s.dataConclusaoPrevista
      ? parseDateOnly(s.dataConclusaoPrevista)
      : null;
    return (
      s.status === "finalizado" &&
      real &&
      prevista &&
      real <= prevista
    );
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

// =======================================================
//  HELPERS / UTILITÁRIOS
// =======================================================
function bindEnterNoModal(modalEl, callback) {
  if (!modalEl) return;
  modalEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    callback();
  });
}

function parseDateOnly(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return null;
  const d = new Date(`${yyyy_mm_dd}T00:00:00`);
  return isNaN(d) ? null : d;
}

function formatDateBR(dateOrStr) {
  const d =
    typeof dateOrStr === "string" ? parseDateOnly(dateOrStr) : dateOrStr;
  return d instanceof Date && !isNaN(d)
    ? d.toLocaleDateString("pt-BR")
    : "â€”";
}


// =======================================================
//  EXPORTS GLOBAIS (para handlers inline no HTML)
//  IMPORTANTE: Devem estar NO FINAL, após todas as funções
// =======================================================
window.toggleForm = toggleForm;
window.limparForm = limparForm;
window.toggleTipoMapaOutros = toggleTipoMapaOutros;
window.toggleARTResponsavel = toggleARTResponsavel;
window.toggleElementosOutros = toggleElementosOutros;

window.abrirModalAcessoGestor = abrirModalAcessoGestor;
window.fecharModalAcessoGestor = fecharModalAcessoGestor;
window.validarCodigoAcesso = validarCodigoAcesso;

window.abrirModalAcessoTecnico = abrirModalAcessoTecnico;
window.fecharModalAcessoTecnico = fecharModalAcessoTecnico;
window.validarAcessoTecnico = validarAcessoTecnico;

window.fazerLogout = fazerLogout;

window.atualizarTabela = atualizarTabela;
window.verDetalhes = verDetalhes;
window.fecharModal = fecharModal;

window.abrirModalAtribuicao = abrirModalAtribuicao;
window.fecharModalAtribuicao = fecharModalAtribuicao;
window.atribuirTecnico = atribuirTecnico;

window.mudarStatus = mudarStatus;
window.salvarNovoStatus = salvarNovoStatus;
window.finalizarSolicitacao = finalizarSolicitacao;

window.confirmarExclusao = confirmarExclusao;
window.fecharModalConfirmacao = fecharModalConfirmacao;
window.excluirSolicitacao = excluirSolicitacao;

window.abrirModalRelatorio = abrirModalRelatorio;
window.fecharModalRelatorio = fecharModalRelatorio;
window.gerarRelatorio = gerarRelatorio;
window.exportarRelatorioCompleto = exportarRelatorioCompleto;
window.exportarTodosDados = exportarTodosDados;

window.filtrarSolicitacoes = filtrarSolicitacoes;
window.filtrarMinhasSolicitacoes = filtrarMinhasSolicitacoes;

window.toggleTheme = toggleTheme;



