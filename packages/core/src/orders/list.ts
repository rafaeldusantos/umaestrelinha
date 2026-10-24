// Feature `74` (`MAP-08`, `MAP-09`, `MAP-13`, `MAP-14`, `MAP-29`, `AD-058`) — a lista de pedidos do
// app do ateliê: a ordem de cada recorte, a página seguinte por CHAVE e as frases da lista.
//
// Nasce aqui (e não no app) porque as frases dependem do id da visão, e `MAP-49` proíbe esse mapa em
// `apps/mobile-adm`; e porque o tamanho da página é o MESMO do painel (`defaultOrderQuery` passou a
// ler `ORDER_PAGE_SIZE` daqui).
//
// **Sem `ATELIE_CLOCK_RPC`** (emenda E1 do Design): o nome da RPC é literal no único chamador, porque
// `marcacaoSoPorAcao.test.ts` exige `rpc('<literal>')`.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { isBlockSlice, type OrderSlice } from './views.ts'

/** 25 por página — o mesmo número da listagem do painel (A9). */
export const ORDER_PAGE_SIZE = 25

/**
 * A8 / G-A8: a fila é para resolver — "Precisa de ação" e qualquer bloco vêm do mais antigo para o
 * mais novo; as outras visões, do mais novo para o mais antigo.
 */
export const sliceOrder = (slice: OrderSlice): 'asc' | 'desc' =>
  isBlockSlice(slice) || slice.visao === 'precisa-acao' ? 'asc' : 'desc'

/**
 * O último pedido carregado. **As strings como o PostgREST as devolveu**: `created_at` com
 * microssegundos (`2026-10-05T23:34:12.017605+00:00`).
 */
export interface OrderCursor {
  created_at: string
  id: string
}

/**
 * O `or=` da página seguinte (A9, `MAP-14`): depois do último (`created_at`, `id`) carregado, nunca
 * por `offset` — um pedido novo entrando entre duas páginas não repete nem pula linha.
 *
 * O instante vai **entre aspas duplas** e **cru**, como veio do servidor. Passar por `Date` truncaria
 * para milissegundos, e o `eq` do desempate deixaria de casar dois pedidos do mesmo instante (R1,
 * medido no gate do Design, M2).
 */
export const cursorFilter = (cursor: OrderCursor, dir: 'asc' | 'desc'): string => {
  const op = dir === 'asc' ? 'gt' : 'lt'
  const c = `"${cursor.created_at}"`
  return `created_at.${op}.${c},and(created_at.eq.${c},id.${op}.${cursor.id})`
}

/** O título da lista vazia (`MAP-09`). */
export const EMPTY_TITLE = 'Nada por aqui.'

const ehPrecisaDeAcao = (slice: OrderSlice): boolean => !isBlockSlice(slice) && slice.visao === 'precisa-acao'

/**
 * A linha de contagem (`MAP-08`), ou `null` com a lista vazia (`MAP-09`: ela não aparece).
 *
 * Em "Precisa de ação" sem busca a frase diz a ordem — é a única visão cuja ordem difere do painel.
 */
export const listCountLine = (total: number, slice: OrderSlice, comBusca: boolean): string | null => {
  if (!total || total < 1) return null
  if (ehPrecisaDeAcao(slice) && !comBusca) {
    return total === 1
      ? '1 pedido precisa de você, do mais antigo para o mais novo.'
      : `${total} pedidos precisam de você, do mais antigo para o mais novo.`
  }
  return total === 1 ? '1 pedido' : `${total} pedidos`
}

/** A frase sob "Nada por aqui." (`MAP-09`). */
export const emptyHint = (slice: OrderSlice, termo: string): string => {
  const t = (termo ?? '').trim()
  if (t !== '') return `Nenhum pedido com “${t}”.`
  if (ehPrecisaDeAcao(slice)) return 'Nenhum pedido esperando você agora.'
  return 'Nenhum pedido nesta visão.'
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `MAP-29` / Q7: um id que não pode existir não vai à rede — é "Não encontrei este pedido." */
export const isOrderId = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
