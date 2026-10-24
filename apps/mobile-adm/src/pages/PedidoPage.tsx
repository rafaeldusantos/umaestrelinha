import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrdersRealtime } from '@estrelinha/core/hooks/useOrdersRealtime'
import { PEDIDOS_PATH, chaveDoPedido, usePedido } from '@/entities/order'
import { STORE_OVERVIEW_KEY } from '@/entities/stats'
import { useRecusaDePapel } from '@/features/access-check'
import {
  BlocoCliente,
  BlocoEntrega,
  BlocoItens,
  BlocoMaterial,
  BlocoValores,
  CabecalhoDoPedido,
  EsqueletoDoBloco,
  Historico,
  ProximoPasso,
  tituloDoPedido,
} from '@/widgets/order-detail'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { FalhaDoBloco, LinhaDeFrescor } from '@/shared/ui/leitura'

/** O canal do detalhe: outro nome que o da lista e o da Início, identificável no inspetor. */
export const CANAL_DO_DETALHE = 'atelie-pedido-realtime'
export const NAO_ENCONTREI = 'Não encontrei este pedido.'
export const VOLTAR_AOS_PEDIDOS = 'Voltar aos pedidos'

/** O canal do detalhe, montado só depois da primeira leitura com o papel CONFIRMADO (molde da lista). */
const AvisoDoPedido = ({ aoMudar }: { aoMudar: () => void }) => {
  useOrdersRealtime(CANAL_DO_DETALHE, aoMudar)
  return null
}

/** Os esqueletos por bloco da primeira leitura (`MAP-44`): nenhum texto que afirme conteúdo. */
const Esqueletos = () => (
  <div data-testid="detalhe-carregando" className="space-y-4">
    <EsqueletoDoBloco linhas={1} />
    <EsqueletoDoBloco linhas={3} />
    <EsqueletoDoBloco linhas={2} />
    <EsqueletoDoBloco linhas={4} />
  </div>
)

/**
 * O detalhe de um pedido (feature `74`, `MAP-20`..`MAP-30`, `MAP-34`..`MAP-40`, `MAP-44`, `MAP-46`).
 * Compõe os blocos de `widgets/order-detail`; nenhuma regra mora aqui.
 *
 * - **Uma leitura, uma confirmação de papel** (`usePedido` → `lerComPapel`). `42501` ⇒ a vigia
 *   reconfere o papel uma vez por episódio e nenhum bloco é desenhado, nem o do cache (`MAP-36`).
 * - **O `h1` existe em todo estado** (E5): "Pedido" enquanto lê, na falha e no "não encontrei";
 *   "Pedido #0244" com o dado. O título do documento acompanha (`MAP-46`, Q9) — o layout não o
 *   sobrescreve, porque `/pedidos/:id` não é aba (M6).
 * - Pedido inexistente ou endereço que não é id ⇒ "Não encontrei este pedido." (`MAP-29`).
 * - Um bloco em falha não derruba os outros (`MAP-30`), e o "Tentar de novo" dele relê o detalhe
 *   inteiro sem trocar os blocos bons por esqueleto (TE4): é releitura com dado.
 * - **Releem**: o aviso do Realtime (um canal, aberto após a confirmação e fechado ao sair), que relê
 *   este pedido e o resumo da Início/selo (`STORE_OVERVIEW_KEY`, A25); o puxar; o primeiro plano.
 * - Abre no topo (`scrollTo(0, 0)` ao montar): quem vem do meio da lista não cai no meio do detalhe.
 */
const PedidoPage = () => {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const pedido = usePedido(id)
  const recusada = useRecusaDePapel([pedido.error])
  const detalhe = recusada ? undefined : pedido.data
  const naoAtualizou = !recusada && pedido.isError && !!pedido.data
  const tentarDeNovo = useCallback(() => {
    void pedido.refetch()
  }, [pedido])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const titulo = tituloDoPedido(detalhe?.pedido)
  useEffect(() => {
    document.title = `${titulo} · Ateliê`
  }, [titulo])

  const [confirmada, setConfirmada] = useState(false)
  useEffect(() => {
    if (recusada) setConfirmada(false)
    else if (detalhe?.lido_em) setConfirmada(true)
  }, [recusada, detalhe])

  const reler = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chaveDoPedido(id) })
    void queryClient.invalidateQueries({ queryKey: STORE_OVERVIEW_KEY })
  }, [queryClient, id])

  const falhou = recusada || (pedido.isError && !pedido.data)
  const p = detalhe?.pedido
  const lidoEm = detalhe?.lido_em

  return (
    <PullToRefresh onRefresh={() => pedido.refetch()}>
      <div className="space-y-4">
        {confirmada && <AvisoDoPedido aoMudar={reler} />}
        <CabecalhoDoPedido pedido={p} lidoEm={lidoEm} />
        {falhou ? (
          <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
        ) : !detalhe ? (
          <Esqueletos />
        ) : !p ? (
          <div className="space-y-3">
            <p className="text-sm text-estrelinha-ink">{NAO_ENCONTREI}</p>
            <Link
              to={PEDIDOS_PATH}
              replace
              className="inline-flex min-h-11 items-center font-medium text-estrelinha-primary underline underline-offset-4"
            >
              {VOLTAR_AOS_PEDIDOS}
            </Link>
          </div>
        ) : (
          <>
            <LinhaDeFrescor lidoEm={lidoEm} naoAtualizou={naoAtualizou} />
            <ProximoPasso pedido={p} />
            <BlocoCliente pedido={p} />
            <BlocoMaterial pedido={p} lidoEm={lidoEm} />
            <BlocoItens itens={detalhe.itens} tentarDeNovo={tentarDeNovo} />
            <BlocoValores pedido={p} />
            <BlocoEntrega pedido={p} />
            <Historico historico={detalhe.historico} lidoEm={lidoEm} tentarDeNovo={tentarDeNovo} />
          </>
        )}
      </div>
    </PullToRefresh>
  )
}

export default PedidoPage
