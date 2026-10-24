import {
  DEFAULT_ORDER_SLICE,
  ORDER_VIEWS,
  QUEUE_BLOCKS,
  queueBlock,
  type OrderSlice,
  type OrderViewId,
} from '@estrelinha/core/orders'

/**
 * Os endereços da aba Pedidos (feature `73`, `MAI-07`, `MAI-15`; feature `74`, `MAP-03`..`MAP-06`) —
 * UM dono, lido pela Início que os escreve e pela lista de pedidos que os obedece. Escrito à mão em
 * cada link, o "Ver pedidos" e o filtro da lista divergiriam sem nada quebrar: o link levaria a uma
 * lista que não filtra. `enderecoDePedidosComDonoUnico.test.ts` recusa os nomes dos parâmetros e o
 * `useSearchParams` em qualquer outro arquivo do app.
 *
 * Duas formas, nunca as duas juntas:
 * - `?visao=` — uma das seis visões de `ORDER_VIEWS` (`@estrelinha/core/orders`);
 * - `?bloco=` — um bloco de "Precisa de você", com o id de `QUEUE_BLOCKS`.
 *
 * Desde a `74` o vocabulário das DUAS formas vem de `core`: as visões subiram do painel para
 * `core/orders/views.ts`, e o `SPEC_DEVIATION` da `73` (as duas visões declaradas aqui) saiu.
 */

/** O recorte de um endereço — o mesmo tipo que `applyOrderSlice` traduz para filtro. */
export type DestinoDePedidos = OrderSlice

export const PEDIDOS_PATH = '/pedidos'
const PARAM_VISAO = 'visao'
const PARAM_BLOCO = 'bloco'

const VISOES: readonly OrderViewId[] = ORDER_VIEWS.map((v) => v.id)

/** O endereço de um destino. Lança para bloco ou visão fora do vocabulário. */
export const pedidosHref = (destino: DestinoDePedidos): string => {
  if ('bloco' in destino) {
    queueBlock(destino.bloco)
    return `${PEDIDOS_PATH}?${new URLSearchParams({ [PARAM_BLOCO]: destino.bloco })}`
  }
  if (!VISOES.includes(destino.visao)) throw new Error(`visão desconhecida: ${String(destino.visao)}`)
  return `${PEDIDOS_PATH}?${new URLSearchParams({ [PARAM_VISAO]: destino.visao })}`
}

/**
 * O destino de um `location.search`, ou `null`. Bloco vence visão (não deveriam vir juntos); valor
 * fora do vocabulário é `null`, nunca um destino qualquer.
 */
export const lerDestinoDePedidos = (search: string): DestinoDePedidos | null => {
  const p = new URLSearchParams(search)
  const bloco = p.get(PARAM_BLOCO)
  if (bloco !== null) {
    const achado = QUEUE_BLOCKS.find((b) => b.id === bloco)
    return achado ? { bloco: achado.id } : null
  }
  const visao = p.get(PARAM_VISAO)
  const achada = VISOES.find((v) => v === visao)
  return achada ? { visao: achada } : null
}

/**
 * O recorte que a lista mostra para um `location.search` (A5, `MAP-03`): o do endereço, ou "Precisa
 * de ação" quando o endereço não diz nada que a lista entenda. É a ÚNICA leitura que a página faz.
 */
export const recorteDoEndereco = (search: string): OrderSlice => lerDestinoDePedidos(search) ?? DEFAULT_ORDER_SLICE

/** O endereço do detalhe de um pedido (`MAP-20`, `MAP-52`). */
export const pedidoHref = (id: string): string => `${PEDIDOS_PATH}/${encodeURIComponent(id)}`
