/**
 * STATUS VÁLIDOS DO SISTEMA
 * Estes são os únicos status permitidos no banco de dados
 */
export const STATUS = {
  FILA: "fila",
  EM_ANDAMENTO: "em_andamento",
  AJUSTES_PENDENTES: "ajustes_pendentes",
  CONCLUIDO: "concluido",
};

/**
 * Mapeamento de status para exibição
 */
export const STATUS_LABELS = {
  [STATUS.FILA]: "Na Fila",
  [STATUS.EM_ANDAMENTO]: "Em Andamento",
  [STATUS.AJUSTES_PENDENTES]: "Ajustes Pendentes",
  [STATUS.CONCLUIDO]: "Concluído",
};

/**
 * Mapeamento de status para classes CSS
 */
export const STATUS_CLASSES = {
  [STATUS.FILA]: "status-fila",
  [STATUS.EM_ANDAMENTO]: "status-processando",
  [STATUS.AJUSTES_PENDENTES]: "status-aguardando",
  [STATUS.CONCLUIDO]: "status-finalizado",
};

/**
 * Validar se um status é válido
 */
export function isStatusValido(status) {
  return Object.values(STATUS).includes(status);
}

/**
 * Obter label de um status
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

/**
 * Obter classe CSS de um status
 */
export function getStatusClass(status) {
  return STATUS_CLASSES[status] || "status-fila";
}
