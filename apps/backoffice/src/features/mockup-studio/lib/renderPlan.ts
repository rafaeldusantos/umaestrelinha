// Helpers puros do estúdio de mockup. Isolados da UI para teste unitário direto (APP-04/APP-05).

/**
 * Anexa novas URLs de render às imagens existentes do produto.
 * Preserva as imagens existentes e sua ordem — a principal (índice 0) não muda — e adiciona
 * os novos ao final. Se não havia imagens, o primeiro render vira a principal. APP-04.
 */
export function appendImages(existing: string[], added: string[]): string[] {
  return [...existing, ...added]
}

/**
 * Resume o resultado dos uploads de render: coleta as URLs bem-sucedidas (não-nulas),
 * na ordem, e conta as falhas (nulls) para reportar sucesso parcial sem travar a UI. APP-05.
 */
export function summarizeUploads(results: (string | null)[]): { urls: string[]; failed: number } {
  const urls = results.filter((u): u is string => u !== null)
  return { urls, failed: results.length - urls.length }
}
