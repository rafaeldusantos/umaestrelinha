import { QUEUE_BLOCKS, queueBlock, type QueueBlockId } from '@estrelinha/core/orders'

/**
 * Os endereços da aba Pedidos (feature `73`, `MAI-07`, `MAI-15`) — UM dono, lido pela Início que os
 * escreve e pela lista de pedidos (`74`) que os obedece. Escrito à mão em cada link, o "Ver pedidos"
 * e o filtro da `74` divergiriam sem nada quebrar: o link levaria a uma lista que não filtra.
 *
 * Duas formas, nunca as duas juntas:
 * - `?visao=` — uma visão da lista ("Precisa de ação", "Tudo");
 * - `?bloco=` — um bloco de "Precisa de você", com o id de `QUEUE_BLOCKS` (`@estrelinha/core/orders`).
 *
 * SPEC_DEVIATION (design §4, "o vocabulário vem de core"): os ids de BLOCO vêm de `core`, mas os de
 * VISÃO ainda moram no painel (`OrderViewId`, `apps/backoffice/src/entities/order/api/orderQuery.ts`).
 * Movê-los mexeria no painel, fora do escopo da `73`; a Início só precisa de duas visões, declaradas
 * aqui com os MESMOS ids do painel. A `74`, que lê a visão, é quem a leva a `core`.
 */
export type VisaoDaInicio = 'precisa-acao' | 'tudo'

export type DestinoDePedidos = { visao: VisaoDaInicio } | { bloco: QueueBlockId }

export const PEDIDOS_PATH = '/pedidos'
export const PARAM_VISAO = 'visao'
export const PARAM_BLOCO = 'bloco'

const VISOES: readonly VisaoDaInicio[] = ['precisa-acao', 'tudo']

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
 * O destino de um `location.search`, ou `null` — a leitura que a `74` fará. Bloco vence visão
 * (não deveriam vir juntos); valor fora do vocabulário é `null`, nunca um destino qualquer.
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
