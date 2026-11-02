// Compre Junto — a marca "acompanha" no pedido.
//
// Folha: sem import nenhum, para a function `checkout` alcançá-la pelo Deno por caminho relativo. A
// loja chama `orderItemMarks` ao montar o payload e a function chama a MESMA função ao gravar: a linha
// do pedido vem do navegador, então a regra que vale é a do servidor, e escrevê-la duas vezes faria a
// loja mandar uma marca que o servidor recusa.
//
// A marca é INFORMATIVA: diz de qual principal e de qual lista a peça veio. Nunca decide preço nem
// desconto — o servidor recalcula o valor pelas colunas de preço de sempre.

/** Uma marca como o pedido a grava: o principal e a lista de origem (ou `null`). */
export interface OrderItemMark {
  mainProductId: string
  listId: string | null
}

/** A marca como chega — do carrinho, ou do corpo da requisição, onde qualquer coisa pode vir. */
export interface OrderItemMarkInput {
  mainProductId?: unknown
  listId?: unknown
}

/** O id da lista é `uuid` no banco; outro formato derrubaria o `insert` inteiro. */
const LIST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * As marcas que a linha leva ao pedido: **todas** as válidas, na ordem em que vieram — cujo
 * principal está nos itens do pedido, não é a própria linha e tem forma válida. Marca forjada
 * (principal que não é texto, lista que não é id) ou cujo principal não está no pedido é descartada;
 * a mesma marca (principal e lista) repetida entra uma vez.
 *
 * A mesma linha pode acompanhar mais de um principal ("Acompanha o X e o Y" na sacola), e o pedido
 * guarda todos: perder o segundo na gravação faria o pedido dizer menos que a sacola.
 */
export const orderItemMarks = (
  marks: readonly OrderItemMarkInput[] | null | undefined,
  orderProductIds: readonly string[],
  ownProductId: string,
): OrderItemMark[] => {
  const out: OrderItemMark[] = []
  for (const mark of marks ?? []) {
    const main = mark?.mainProductId
    if (typeof main !== 'string' || main === '' || main === ownProductId) continue
    if (!orderProductIds.includes(main)) continue
    const raw = mark.listId ?? null
    // `strictNullChecks` está desligado: `raw !== null` não estreita `unknown`, então o texto é
    // tirado por `typeof`, que estreita.
    const list = typeof raw === 'string' ? raw : null
    if (raw !== null && (list === null || !LIST_ID.test(list))) continue
    if (out.some((m) => m.mainProductId === main && m.listId === list)) continue
    out.push({ mainProductId: main, listId: list })
  }
  return out
}

/**
 * As duas colunas do pedido: `accompanies_product_ids` e `accompanies_list_ids`, alinhadas por
 * posição (a lista da posição `i` é a de origem do principal da posição `i`; `null` na peça
 * avulsa). Sem marca, as duas são `null` — a linha é peça comum.
 */
export const markColumns = (
  marks: readonly OrderItemMark[],
): { accompanies_product_ids: string[] | null; accompanies_list_ids: (string | null)[] | null } =>
  marks.length === 0
    ? { accompanies_product_ids: null, accompanies_list_ids: null }
    : {
        accompanies_product_ids: marks.map((m) => m.mainProductId),
        accompanies_list_ids: marks.map((m) => m.listId),
      }

/** O inverso de `markColumns`: as marcas que chegam nas duas colunas (do corpo ou do banco). */
export const marksFromColumns = (productIds: unknown, listIds: unknown): OrderItemMarkInput[] => {
  if (!Array.isArray(productIds)) return []
  const lists = Array.isArray(listIds) ? listIds : []
  return productIds.map((mainProductId, i) => ({ mainProductId, listId: lists[i] ?? null }))
}

/**
 * A frase da peça que acompanha: `Acompanha o A e o B`, ou `o A, o B e o C`. `null` sem principal.
 * Nomes inteiros, sem encurtar — o texto quebra de linha quando preciso. É a frase da sacola e a do
 * pedido (confirmação e painel): uma escrita só.
 */
export const companionPhrase = (names: readonly string[]): string | null => {
  if (names.length === 0) return null
  const itens = names.map((n) => `o ${n}`)
  const lista =
    itens.length === 1 ? itens[0] : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
  return `Acompanha ${lista}`
}

/** A linha do pedido como esta regra a lê — o snapshot de `order_items`. */
export interface OrderItemForPhrase {
  product_id?: string | null
  product_name: string
  accompanies_product_ids?: readonly string[] | null
}

/**
 * Os nomes dos principais que a linha acompanha, cada um tirado de OUTRA linha do mesmo pedido por
 * `product_id` (a primeira, se o principal veio em mais de uma variação), na ordem das marcas e sem
 * repetir. O snapshot do nome é o do pedido, não o do catálogo de hoje. Principal fora do pedido não
 * é nomeado.
 */
export const orderItemCompanionNames = <T extends OrderItemForPhrase>(
  item: T,
  items: readonly T[],
): string[] => {
  const names: string[] = []
  const vistos: string[] = []
  for (const main of item.accompanies_product_ids ?? []) {
    if (!main || vistos.includes(main)) continue
    vistos.push(main)
    const linha = items.find((i) => i !== item && i.product_id === main)
    if (linha) names.push(linha.product_name)
  }
  return names
}
