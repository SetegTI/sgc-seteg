// Pequenos utilitários de DOM podem ser extraídos para cá futuramente.
// Mantido apenas como ponto de extensão da arquitetura.

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

