/**
 * SGC SETEG - Sistema de Gestão Cartográfica
 * Ponto de entrada principal da aplicação
 * Ano: 2026
 * Empresa: SETEG
 */

// Importar CSS principal
import "./styles/style.css";

// Importar app.js (lógica principal da aplicação)
import "./app.js";

// Função para remover o loader inicial
function removerLoaderInicial() {
  const loader = document.getElementById("initial-loader");
  if (loader && !loader.classList.contains("hidden")) {
    document.body.classList.add("loaded");
    loader.classList.add("hidden");
    setTimeout(() => {
      loader.remove();
    }, 300);
  }
}

// Remover loader quando o DOM estiver pronto E após um pequeno delay
// para garantir que as solicitações foram carregadas
window.addEventListener("DOMContentLoaded", () => {
  // Aguardar um pouco para as solicitações carregarem
  setTimeout(() => {
    removerLoaderInicial();
  }, 800);
});

// Fallback: remover após 3 segundos no máximo
setTimeout(() => {
  removerLoaderInicial();
}, 3000);
