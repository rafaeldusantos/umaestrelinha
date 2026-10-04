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
  unit_price: number
  engraving_text?: string | null
}

/**
 * A linha de detalhe da peça: as opções que existirem e a quantidade, unidas por " · ".
 *
 * `ACB-01`: sem opção, sobra só a quantidade — a conta antiga escrevia `" · Qtd: 1"`, com o ponto
 * solto, porque colava o separador à mão depois de uma lista que podia vir vazia.
 */
export const itemDetailLine = (item: OrderSummaryItem): string => {
  const rotulo = item.variant_label?.trim()
  const opcoes = rotulo ? [rotulo] : [item.size, item.finish].map((v) => v?.trim()).filter(Boolean)
  return [...opcoes, `Qtd: ${item.quantity}`].join(' · ')
}
