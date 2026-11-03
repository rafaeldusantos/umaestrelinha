// As linhas de `order_items` juntadas de volta nas linhas da sacola.
//
// A loja grava a linha mista (unidades com e sem o desconto casado) como DUAS linhas do pedido. Antes
// de recalcular, o servidor junta as linhas da mesma peça — mesmo produto, variação, tamanho,
// acabamento e gravação, a identidade da linha da sacola (`itemKey`) — para a faixa contar as
// unidades juntas e o order bump (que só vale para a linha de 1 unidade) não valer duas vezes.
//
// Folha sem import: a function `mercado-pago` a alcança pelo Deno por caminho relativo, e o teste de
// exibido = cobrado (`displayedEqualsCharged.test.ts`) a chama do mesmo jeito.

/** O que a junção lê de uma linha do pedido. Estrutural: a linha de `order_items` satisfaz. */
export interface OrderRowLike {
  product_id: string
  variant_id?: string | null
  size?: string | null
  finish?: string | null
  engraving_text?: string | null
  quantity: number
  /** A marca "acompanha" já validada na gravação (`orderItemMarks`). */
  accompanies_product_ids?: readonly string[] | null
}

/** Uma linha da sacola reconstituída: as linhas do pedido que a formam, na ordem em que vieram. */
export interface JoinedOrderLine {
  /** As posições, em `rows`, das linhas do pedido desta peça. */
  rows: number[]
  quantity: number
  /** Os principais que a peça acompanha, sem repetir, na ordem das linhas. */
  marks: string[]
}

const part = (value: string | null | undefined): string => (value ? value : '')

const keyOf = (row: OrderRowLike): string =>
  JSON.stringify([
    row.product_id,
    part(row.variant_id),
    part(row.size),
    part(row.finish),
    part(row.engraving_text),
  ])

/** Junta as linhas da mesma peça, na ordem da primeira aparição de cada uma. */
export function joinOrderRows(rows: readonly OrderRowLike[]): JoinedOrderLine[] {
  const byKey = new Map<string, JoinedOrderLine>()
  const out: JoinedOrderLine[] = []
  rows.forEach((row, index) => {
    const key = keyOf(row)
    let line = byKey.get(key)
    if (!line) {
      line = { rows: [], quantity: 0, marks: [] }
      byKey.set(key, line)
      out.push(line)
    }
    line.rows.push(index)
    line.quantity += Number(row.quantity) || 0
    for (const mark of row.accompanies_product_ids ?? []) {
      if (typeof mark === 'string' && mark && !line.marks.includes(mark)) line.marks.push(mark)
    }
  })
  return out
}
