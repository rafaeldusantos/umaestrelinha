// A foto de um item de pedido (e de uma joia da Início) — dois apps a desenham: o painel (a tela do
// pedido) e o app do ateliê (o detalhe do pedido e "Joias mais pedidas no mês"). Escrita em cada um,
// a precedência divergiria sem nada quebrar, e a bancada veria fotos diferentes da mesma peça.
//
// Este arquivo não importa nada: a capa do catálogo chega JÁ escolhida (`primaryImage(images)?.url`,
// de `core/media`) — escolher aqui arrastaria o barril de `media`, que importa
// `@estrelinha/supabase/types`, para o grafo de `orders`, que o Deno resolve.

/**
 * `order_items.product_id` é `text`, e **nem sempre é um uuid**: o import da Nuvemshop grava
 * `nuvemshop:<nome>` no item que não casou com o catálogo. Mandar esse valor num `in('id', ...)`
 * contra uma coluna `uuid` derruba a consulta inteira com `22P02` — e levaria junto a foto dos itens
 * que CASARAM. Por isso o recorte é por forma, antes da rede.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Os `product_id` que **podem** ser procurados em `products`, sem repetição. */
export const catalogProductIds = (itens: readonly { product_id: string }[]): string[] =>
  [...new Set(itens.map(i => i.product_id).filter(id => UUID.test(id ?? '')))]

/**
 * A foto a desenhar: o snapshot do pedido (`order_items.product_image`) VENCE sempre — é a foto do
 * momento da compra, e trocar a imagem no cadastro não pode mudar o que a bancada vai separar. A capa
 * de hoje do catálogo só entra onde o snapshot está ausente (os itens vindos da Nuvemshop, cujo CSV
 * não traz imagem). Espaço em branco não é foto. `null` quando não há nenhuma.
 */
export const itemPhoto = (snapshot: string | null | undefined, catalogUrl: string | null | undefined): string | null => {
  const doPedido = snapshot?.trim()
  if (doPedido) return doPedido
  const doCatalogo = catalogUrl?.trim()
  return doCatalogo || null
}
