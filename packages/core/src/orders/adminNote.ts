// A observação do pedido — o texto que só quem administra lê e escreve.
//
// Não é o Recado da cliente (`orders.notes`) nem a Nota interna (`order_notes`, histórico só de
// acréscimo): é UM texto por pedido, editável, guardado em `order_admin_notes`. O teto é o mesmo
// número do `check` da migration — `char_length(btrim(note)) between 1 and 1000` — e se conta do
// MESMO jeito: texto aparado, em pontos de código. Contar em unidades de UTF-16 (`.length`) recusaria
// na tela um texto com caractere fora do plano básico que o banco aceita.
//
// Folha sem import nenhum: o painel, o app do ateliê e o dono da escrita (`core/order-actions`) a
// leem, e o grafo é o mesmo que uma edge function poderá alcançar por caminho relativo.

/** O teto da observação, em caracteres do texto aparado. */
export const ORDER_ADMIN_NOTE_MAX = 1000

/** O texto como ele é gravado: aparado nas pontas. Ausente vira vazio. */
export function normalizeAdminNote(texto: string | null | undefined): string {
  return typeof texto === 'string' ? texto.trim() : ''
}

/** Quantos caracteres a observação tem para o teto: o texto aparado, por ponto de código. */
export function adminNoteLength(texto: string | null | undefined): number {
  return [...normalizeAdminNote(texto)].length
}

/**
 * A observação é gravável? `null` = sim. O vazio é aceito: gravar vazio APAGA a observação do
 * pedido (não existe observação vazia no banco).
 */
export function adminNoteRefusal(texto: string | null | undefined): string | null {
  if (adminNoteLength(texto) > ORDER_ADMIN_NOTE_MAX) {
    return `A observação vai até ${ORDER_ADMIN_NOTE_MAX} caracteres.`
  }
  return null
}
