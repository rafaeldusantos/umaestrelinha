// Os números que a página do produto anuncia — economia e saldo.
//
// Boards "Desktop Product Detail - v3" e "Mobile Product Detail - v3": a linha "Economize R$ 1,60"
// e o "Em estoque — apenas 8 restantes". Os bullets de tamanho e peso do acordeão saíram em
// 2026-10-10 (decisão do usuário): a seção "Detalhes do Produto" traz só a descrição.
//
// Função pura, e não JSX: o que precisa de prova aqui é a **conta**, não o DOM. E as duas respostas
// aparecem em duas superfícies cada uma (coluna de informação e barra fixa do mobile) — duas cópias
// seriam dois lugares para a regra divergir.

import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { hasSellableGrid } from './variantSelection'

/**
 * Quanto a cliente deixa de pagar em relação ao preço de comparação.
 *
 * `compare_price` só vale como desconto quando é **maior** que o preço cobrado: um cadastro com
 * `compare_price` menor (ou igual) é dado torto, e anunciar "Economize R$ -2,00" é pior que não
 * anunciar nada. O preço cobrado é o da linha escolhida, não o `base_price` da vitrine — por isso
 * entra por parâmetro.
 */
export const savingsOf = (
  product: Pick<Product, 'compare_price'>,
  price: number,
): { compareAt: number; saved: number; percent: number } | null => {
  const compareAt = product.compare_price
  if (typeof compareAt !== 'number' || !(compareAt > price)) return null
  return {
    compareAt,
    saved: Math.round((compareAt - price) * 100) / 100,
    percent: Math.round((1 - price / compareAt) * 100),
  }
}

export type StockTone = 'in' | 'low' | 'out'

export interface StockLine {
  tone: StockTone
  label: string
  /** O "— apenas 8 restantes" do board. `null` quando o saldo não é para ser anunciado. */
  note: string | null
}

/**
 * A linha de estoque, com o saldo que de fato vale.
 *
 * PST-08 / AC 6-7: com `stock_policy` diferente de `track` a loja **nunca** esgota nem conta —
 * anunciar "3 restantes" sob `backorder` seria inventar escassez. Com grade vendável o saldo é o da
 * linha escolhida; sem grade, o `stock_total` do produto.
 *
 * O aviso de escassez respeita `low_stock_threshold`, o mesmo limiar do selo "Últimas" do card —
 * senão a vitrine e a página discordariam sobre o que é pouco.
 */
export const stockLineOf = (product: Product, variant: ProductVariant | null): StockLine => {
  if (product.stock_policy !== 'track') {
    return { tone: 'in', label: 'Em estoque', note: null }
  }

  const remaining = hasSellableGrid(product)
    ? variant
      ? variant.stock
      : 0
    : product.stock_total

  if (remaining <= 0) return { tone: 'out', label: 'Esgotado', note: null }

  const low = remaining <= product.low_stock_threshold
  return {
    tone: low ? 'low' : 'in',
    label: low ? 'Últimas unidades' : 'Em estoque',
    note: low ? `— apenas ${remaining} ${remaining === 1 ? 'restante' : 'restantes'}` : null,
  }
}
