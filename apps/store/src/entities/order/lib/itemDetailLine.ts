// A linha de detalhe de uma peça do pedido (feature 59, `DET-10`, `ACB-01`). Mora fora do
// componente para o arquivo de UI exportar só componente (Fast Refresh) — a regra é pura.

export interface OrderSummaryItem {
  id: string
  product_name: string
  product_image: string | null
  size?: string | null
  finish?: string | null
  /** Snapshot legível das opções (`4,5 cm · Fosco`), quando o pedido nasceu com variação. */
  variant_label?: string | null
  quantity: number
  /** O preço COBRADO da unidade (nos pedidos de antes, o que o checkout gravava). */
  unit_price: number
  /** O preço cheio da unidade. Nulo nos pedidos de antes: o resumo fica no formato de sempre. */
  full_unit_price?: number | null
  variant_id?: string | null
  engraving_text?: string | null
  /** O produto da linha — é por ele que a peça que acompanha acha o nome do principal. */
  product_id?: string | null
  /** Compre Junto: os principais que esta peça acompanhava na compra (snapshot). */
  accompanies_product_ids?: string[] | null
}

/**
 * A linha de detalhe da peça: as opções que existirem e a quantidade, unidas por " · ".
 *
 * `detailed` é o `orderSummary(...).detailed` do pedido.
 *
 * `ACB-01`: sem opção, sobra só a quantidade — a conta antiga escrevia `" · Qtd: 1"`, com o ponto
 * solto, porque colava o separador à mão depois de uma lista que podia vir vazia.
 */
export const itemDetailLine = (item: OrderSummaryItem, detailed = false): string => {
  const rotulo = item.variant_label?.trim()
  const opcoes = rotulo ? [rotulo] : [item.size, item.finish].map((v) => v?.trim()).filter(Boolean)
  // No pedido com o preço cheio das linhas (o resumo detalhado), a quantidade é "N unidade(s)" —
  // cada parte da linha mista diz quantas unidades leva. O pedido de antes fica com "Qtd: N".
  const quantidade = detailed
    ? `${item.quantity} ${item.quantity === 1 ? 'unidade' : 'unidades'}`
    : `Qtd: ${item.quantity}`
  return [...opcoes, quantidade].join(' · ')
}
