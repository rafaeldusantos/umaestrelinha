// Compre Junto — as regras puras das listas e dos adicionais.
//
// Mora em `core` porque tem vários leitores: a tela de listas e a do produto no painel (recusam
// antes de gravar), a loja (que pula o que saiu do ar) e a function `checkout` (que recusa o que a
// tela deixaria passar). Cada recusa devolve `string | null` — `strictNullChecks` está desligado, e a
// união discriminada por booleano não estreita.

/** Quantos adicionais uma joia leva. É o `check` da posição (0..2) na migration. */
export const BUY_TOGETHER_ADDONS_MAX = 3

/** Quantas peças cabem numa lista. É o `check` da posição (0..11) na migration. */
export const BUY_TOGETHER_LIST_ITEMS_MAX = 12

/** O teto do nome da lista, igual ao `check` do nome na migration. */
export const BUY_TOGETHER_LIST_NAME_MAX = 40

/** Quantos nomes a recusa de apagar cita antes de dizer "e outras". */
const NAMES_SHOWN = 3

export const addonCountRefusal = (count: number): string | null =>
  count > BUY_TOGETHER_ADDONS_MAX
    ? `Cada joia leva até ${BUY_TOGETHER_ADDONS_MAX} adicionais. Tire um para acrescentar outro.`
    : null

export const listItemCountRefusal = (count: number): string | null =>
  count > BUY_TOGETHER_LIST_ITEMS_MAX
    ? `Uma lista leva até ${BUY_TOGETHER_LIST_ITEMS_MAX} peças. Tire uma para acrescentar outra, ou crie uma segunda lista.`
    : null

/** O nome conta depois de aparar, como o `check` do banco (`btrim`). */
export const listNameRefusal = (name: string | null | undefined): string | null => {
  const nome = (name ?? '').trim()
  if (nome === '') return 'Dê um nome à lista para salvar.'
  if (nome.length > BUY_TOGETHER_LIST_NAME_MAX) {
    return `O nome da lista tem no máximo ${BUY_TOGETHER_LIST_NAME_MAX} caracteres.`
  }
  return null
}

/** Uma lista sem peças pode ser salva, mas não pode ser escolhida por um adicional. */
export const listUsableRefusal = (itemCount: number): string | null =>
  itemCount <= 0 ? 'Esta lista ainda não tem peças. Acrescente ao menos uma antes de usá-la.' : null

/** Apagar lista em uso é recusado nomeando as joias; o banco recusa também (`restrict`). */
export const listDeleteRefusal = (productNames: readonly string[]): string | null => {
  const n = productNames.length
  if (n === 0) return null
  const nomes = productNames.slice(0, NAMES_SHOWN).join(', ')
  const lista = n > NAMES_SHOWN ? `${nomes} e outras` : nomes
  return n === 1
    ? `Esta lista está em uso em 1 joia (${lista}). Tire-a dela antes de excluir.`
    : `Esta lista está em uso em ${n} joias (${lista}). Tire-a delas antes de excluir.`
}

export const addonIsMainRefusal = (mainProductId: string, targetProductId: string): string | null =>
  mainProductId === targetProductId ? 'Uma joia não pode ser adicional dela mesma.' : null

export const addonRepeatedRefusal = (
  targetProductId: string,
  otherTargetProductIds: readonly string[],
): string | null =>
  otherTargetProductIds.includes(targetProductId) ? 'Esta peça já é outro adicional desta joia.' : null
