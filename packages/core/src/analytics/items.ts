// Feature 61 · EVT-13, EVT-14 — o item de todo evento de comércio do GA4.
//
// Um dono só, porque três consumidores montam itens: a loja (os eventos do navegador), a edge
// function `mercado-pago` (o `purchase` pelo servidor) e o teste que prova que nenhum dado pessoal
// sai. Escrito duas vezes, o `item_id` do navegador e o do servidor divergiriam — e o GA4 deixaria
// de ligar a compra à vitrine que a originou.
//
// **`item_id` é o identificador público do PRODUTO** (`publicProductId`), o mesmo
// `item_group_id` do feed do Google Shopping. A variação vai em `item_variant`. Usar o id da
// variação obrigaria o card e a sacola a carregar o `nuvemshop_id` de cada variação só para isto.
//
// ⚠️ O único import deste arquivo é por caminho relativo com extensão explícita: a edge function
// alcança este módulo por caminho, e o Deno resolve o grafo de tipos junto.

import { publicProductId } from '../shopping/identity.ts'

/** A marca de todo item. Escrita UMA vez. */
export const ANALYTICS_ITEM_BRAND = 'Uma Estrelinha'

/**
 * O que entra num item — e **só** isto.
 *
 * O tipo não tem campo de gravação, de nome de cliente nem de endereço, e isso é a primeira metade
 * de `EVT-14`. A segunda metade é a função: ela copia campo a campo para um objeto novo, nunca
 * espalha a entrada — então um objeto de domínio passado inteiro (com `engraving_text` dentro) não
 * vaza nada.
 */
export interface AnalyticsItemInput {
  /** UUID do produto — o recuo quando não há `nuvemshop_id`. */
  id: string
  nuvemshop_id?: number | null
  name: string
  /** O SLUG da categoria de exibição (`displayCategorySlug`, `core/product`) — o mesmo nos dois lados. */
  category?: string | null
  /** Rótulo da variação escolhida (`Aço Inoxidável / 45cm`). */
  variant?: string | null
  /** Preço UNITÁRIO efetivo — o da variação, nunca o base do produto. */
  price: number
  /** Padrão 1. */
  quantity?: number
  /** Posição na listagem (`view_item_list`, `select_item`). */
  index?: number
}

/** O item como o GA4 o recebe. As chaves opcionais só aparecem quando há valor. */
export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_brand: string
  item_category?: string
  item_variant?: string
  price: number
  quantity: number
  index?: number
}

/**
 * As chaves que um item PODE ter. Um item com chave fora desta lista é vazamento — é o que o teste
 * de `EVT-14` compara por **igualdade**, nunca por "contém".
 */
export const ANALYTICS_ITEM_KEYS = [
  'item_id',
  'item_name',
  'item_brand',
  'item_category',
  'item_variant',
  'price',
  'quantity',
  'index',
] as const

/** Dinheiro com duas casas, sem o ruído de ponto flutuante (`0.1 + 0.2`). */
export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100
}

const texto = (v: string | null | undefined): string =>
  typeof v === 'string' ? v.trim() : ''

export function toAnalyticsItem(input: AnalyticsItemInput): AnalyticsItem {
  const quantidade =
    typeof input.quantity === 'number' && Number.isFinite(input.quantity) && input.quantity > 0
      ? Math.trunc(input.quantity)
      : 1

  const item: AnalyticsItem = {
    item_id: publicProductId({ id: input.id, nuvemshop_id: input.nuvemshop_id }),
    item_name: texto(input.name),
    item_brand: ANALYTICS_ITEM_BRAND,
    price: round2(input.price),
    quantity: quantidade,
  }
  const categoria = texto(input.category)
  if (categoria !== '') item.item_category = categoria
  const variacao = texto(input.variant)
  if (variacao !== '') item.item_variant = variacao
  if (typeof input.index === 'number' && Number.isFinite(input.index) && input.index >= 0) {
    item.index = Math.trunc(input.index)
  }
  return item
}

/** `value` de um evento: a soma de preço × quantidade dos itens, em duas casas. */
export function itemsValue(items: readonly AnalyticsItem[]): number {
  return round2(items.reduce((soma, i) => soma + i.price * i.quantity, 0))
}
