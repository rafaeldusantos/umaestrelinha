// A folha de separação em lote, pela lista de Pedidos: o teto e o recorte.
//
// Cada pedido do lote vira uma folha inteira (itens, fotos, endereço, observação) num documento só,
// e a impressão espera as fotos de todos. Acima de algumas folhas o documento fica lento de montar e
// de imprimir; o teto deixa o lote do tamanho de uma bancada. Acima dele, saem os primeiros e a tela
// diz quantos ficaram de fora — truncar em silêncio seria a mesma família de defeito da leitura
// cortada pelo PostgREST.

/** Quantos pedidos uma folha de separação em lote imprime de uma vez. */
export const PICK_SLIP_LIMIT = 10

export interface PickSlipBatch {
  /** Os ids que vão à folha, na ordem recebida. */
  ids: string[]
  /** Quantos ficaram de fora pelo teto. */
  deFora: number
}

/** Os primeiros `PICK_SLIP_LIMIT` pedidos, e quantos sobraram. */
export const pickSlipBatch = (rows: readonly { id: string }[]): PickSlipBatch => ({
  ids: rows.slice(0, PICK_SLIP_LIMIT).map(r => r.id),
  deFora: Math.max(0, rows.length - PICK_SLIP_LIMIT),
})

/** O aviso dos que ficaram de fora; `null` quando nenhum ficou. */
export const pickSlipLeftOutText = (deFora: number): string | null =>
  deFora <= 0
    ? null
    : `A folha saiu com os ${PICK_SLIP_LIMIT} primeiros pedidos. ${deFora} ${
        deFora === 1 ? 'ficou' : 'ficaram'
      } de fora — gere outra folha para ${deFora === 1 ? 'ele' : 'eles'}.`
