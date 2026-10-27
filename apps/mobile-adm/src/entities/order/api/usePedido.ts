import { useQuery } from '@tanstack/react-query'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { primaryImage } from '@estrelinha/core/media'
import {
  buildHistory,
  catalogProductIds,
  isOrderId,
  itemPhoto,
  shippedNoticeSent,
  type HistoryNoteRow,
  type HistoryNotificationRow,
  type HistoryStatusRow,
} from '@estrelinha/core/orders'
import { supabase } from '@estrelinha/supabase/client'

import {
  COLUNAS_DAS_NOTAS,
  COLUNAS_DAS_NOTIFICACOES,
  COLUNAS_DO_DETALHE,
  COLUNAS_DO_STATUS,
  COLUNAS_DOS_ITENS,
  type Bloco,
  type DetalheDoPedido,
  type ItemComFoto,
  type ItemDoPedido,
  type PedidoDoDetalhe,
} from '../model/linha'
import { lerComPapel } from '@/shared/api/lerComPapel'
import { ler } from '@/shared/api/lerSemLancar'

/**
 * O detalhe de um pedido (feature `74`, Design §3.4, emenda E2; `MAP-29`, `MAP-30`, `MAP-36`,
 * `MAP-37`, `MAP-39`).
 *
 * UMA `queryFn`, cinco leituras e UMA confirmação de papel para todas (`lerComPapel`): o pedido vem da
 * view `order_list` (endereço, descontos e `purchase_ordinal` numa ida), e as quatro relações por
 * `order_id`. As colunas são as de `model/linha.ts`, conferidas pelo probe `02-lista` (`AD-012`).
 *
 * - erro na leitura do PEDIDO ⇒ a query falha (a tela inteira em falha, `MAP-34`);
 * - pedido `null` ⇒ `pedido: null` ("Não encontrei este pedido.", `MAP-29`);
 * - um id que não é uuid ⇒ `pedido: null` SEM rede e sem RPC (Q7): o PostgREST devolveria `22P02`,
 *   e a tela diria "não consegui carregar" de um endereço que simplesmente não existe;
 * - erro em itens ⇒ só `itens` em falha; erro em QUALQUER das três fontes do histórico ⇒ o
 *   histórico inteiro em falha (Q6: fundir um fio faltando contaria uma história errada);
 * - a recusa da RPC vence tudo: nenhum bloco sai.
 *
 * "Tentar de novo" de um bloco é o `refetch` desta query inteira (TE4): uma ida, e a confirmação junto.
 */

export const PEDIDO_KEY = 'atelie-pedido'
export const chaveDoPedido = (id: string) => [PEDIDO_KEY, id] as const

/**
 * A capa de hoje do catálogo, para os itens SEM snapshot (os vindos da Nuvemshop). Leitura de
 * conveniência, no molde de `useAdminOrder` do painel: o erro vira mapa vazio — sem a foto o item
 * continua com nome, variação e preço, e uma faixa de erro por causa de uma miniatura assustaria.
 * Só os `product_id` procuráveis vão ao `in(id)` (um `nuvemshop:…` derrubaria a consulta com `22P02`).
 */
const lerCapas = async (itens: readonly ItemDoPedido[]): Promise<Record<string, string | null>> => {
  const ids = catalogProductIds(itens.filter((i) => !i.product_image?.trim()))
  if (ids.length === 0) return {}
  const lida = await ler<{ id: string; images: unknown }[]>(supabase.from('products').select('id, images').in('id', ids))
  if (lida.error || !lida.data) return {}
  return Object.fromEntries(lida.data.map((p) => [p.id, primaryImage(p.images)?.url ?? null]))
}

const comFoto = (itens: readonly ItemDoPedido[], capas: Record<string, string | null>): ItemComFoto[] =>
  itens.map((i) => ({ ...i, foto: itemPhoto(i.product_image, capas[i.product_id]) }))

const lerDetalhe = async (id: string): Promise<DetalheDoPedido> => {
  if (!isOrderId(id)) {
    return { pedido: null, itens: { estado: 'falhou' }, historico: { estado: 'falhou' }, avisoDePostagemSaiu: false, lido_em: null }
  }

  const { resultado, lido_em } = await lerComPapel(async () => {
    const [pedido, itens, status, notas, notificacoes] = await Promise.all([
      ler<PedidoDoDetalhe>(supabase.from('order_list').select(COLUNAS_DO_DETALHE).eq('id', id).maybeSingle()),
      ler<ItemDoPedido[]>(supabase.from('order_items').select(COLUNAS_DOS_ITENS).eq('order_id', id)),
      ler<HistoryStatusRow[]>(supabase.from('order_status_history').select(COLUNAS_DO_STATUS).eq('order_id', id)),
      ler<HistoryNoteRow[]>(supabase.from('order_notes').select(COLUNAS_DAS_NOTAS).eq('order_id', id)),
      ler<HistoryNotificationRow[]>(supabase.from('order_notifications').select(COLUNAS_DAS_NOTIFICACOES).eq('order_id', id)),
    ])
    if (pedido.error) throw pedido.error
    const historico: Bloco<ReturnType<typeof buildHistory>> =
      status.error || notas.error || notificacoes.error
        ? { estado: 'falhou' }
        : // Feature `82` (`ENV-21`): o pedido é o 4º argumento — a última autoria do código do envelope.
          { estado: 'ok', dado: buildHistory(status.data ?? [], notificacoes.data ?? [], notas.data ?? [], pedido.data) }
    const avisoDePostagemSaiu = !notificacoes.error && shippedNoticeSent(notificacoes.data ?? [])
    const capas = itens.error ? {} : await lerCapas(itens.data ?? [])
    const blocoDosItens: Bloco<ItemComFoto[]> = itens.error ? { estado: 'falhou' } : { estado: 'ok', dado: comFoto(itens.data ?? [], capas) }
    return { pedido: pedido.data, itens: blocoDosItens, historico, avisoDePostagemSaiu }
  })

  return { ...resultado, lido_em }
}

export const usePedido = (id: string) =>
  useQuery({
    queryKey: chaveDoPedido(id),
    queryFn: () => lerDetalhe(id),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })
