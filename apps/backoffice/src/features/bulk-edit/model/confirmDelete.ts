// RFN-02 (A27) — as regras da confirmação de exclusão, fora do componente.
//
// Separadas porque exportar constante + componente do mesmo arquivo quebra o fast refresh — e
// porque a regra de aceitação da palavra é comportamento, não apresentação.

/** Listar 160 nomes numa modal não é conhecimento prévio, é ruído. */
export const PREVIEW_LIMIT = 10

export const CONFIRM_WORD = 'EXCLUIR'

/** Aceita minúsculas e espaço nas pontas: exigir caixa exata é hostilidade, não segurança. */
export const matchesConfirmWord = (typed: string): boolean =>
  typed.trim().toLocaleUpperCase('pt-BR') === CONFIRM_WORD
