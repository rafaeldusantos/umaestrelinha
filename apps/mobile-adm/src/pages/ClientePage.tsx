import { useCallback, useEffect } from 'react'
import { useNavigationType, useParams } from 'react-router-dom'
import { NAO_ENCONTREI_CLIENTE, useCliente, usePedidosDoCliente } from '@/entities/customer'
import { useRecusaDePapel } from '@/features/access-check'
import {
  CabecalhoDaCliente,
  ContatoDaCliente,
  NumerosDaCliente,
  PedidosDaCliente,
  TopoDaFicha,
} from '@/widgets/customer-detail'
import { useRolagemRestaurada } from '@/shared/lib/useRolagemRestaurada'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { FalhaDoBloco, LinhaDeFrescor, Traco } from '@/shared/ui/leitura'

/** Os esqueletos da primeira leitura: nenhum texto que afirme conteúdo. */
const Esqueletos = () => (
  <div data-testid="ficha-carregando" aria-busy="true" className="space-y-4">
    <Traco className="h-14 w-full" />
    <Traco className="h-20 w-full" />
    <Traco className="h-24 w-full" />
  </div>
)

/**
 * A ficha de uma cliente (feature `76`, `MAC-14`..`MAC-22`, `MAC-28`, `MAC-36`, `MAC-37`). Compõe os
 * blocos de `widgets/customer-detail`; nenhuma regra mora aqui.
 *
 * - **Uma leitura de cabeçalho, uma de pedidos** — as duas por `lerComPapel`. `42501` em qualquer uma ⇒
 *   a vigia reconfere o papel uma vez por episódio e **nenhum bloco é desenhado, nem o do cache**
 *   (`MAC-37`). Rede nunca é recusa.
 * - **O `h1` "Cliente" existe em todo estado** (lendo, falha, "não encontrei", dado), e o título do
 *   documento é a constante `Cliente · Ateliê`, sem o nome.
 * - `:id` que não é uuid, ou uuid sem linha ⇒ "Não encontrei esta cliente." — o primeiro sem ir à rede.
 * - **A falha dos pedidos é do bloco**: o cabeçalho, os números e o contato já estão na tela e ficam.
 *   A falha do CABEÇALHO derruba a ficha, com "Tentar de novo".
 * - Abre no topo (`scrollTo(0, 0)`) numa entrada nova; no voltar, restaura a posição. Releem: o puxar, a volta ao primeiro plano e a volta da
 *   rede; sem Realtime.
 */
const ClientePage = () => {
  const { id = '' } = useParams()
  const ficha = useCliente(id)
  const email = ficha.data?.cliente?.email ?? null
  const pedidos = usePedidosDoCliente(id, email)
  const recusada = useRecusaDePapel(
    [ficha.error, pedidos.error, pedidos.erroDaProxima],
    !!ficha.data && !ficha.isError && !pedidos.isError,
  )

  // Abre no topo quando a entrada é NOVA (a linha da lista, "Ver cliente"): quem vem do meio de uma lista
  // não cai no meio da ficha. Quando é o VOLTAR (`POP`) — de um pedido da ficha —, a posição é a de
  // antes (`MAC-20`), restaurada pelo hook abaixo.
  const tipoDeNavegacao = useNavigationType()
  useEffect(() => {
    if (tipoDeNavegacao !== 'POP') window.scrollTo(0, 0)
  }, [id, tipoDeNavegacao])

  // O título do documento é um LITERAL, em todo estado. O nome da pessoa **não** vai ao título
  // (`MAC-28`): ele aparece no histórico do navegador, no seletor de apps e na leitura de tela da troca
  // de página, e nome de cliente não é para ficar em nenhum deles (`semDadoDeClienteNoAparelho`).
  useEffect(() => {
    document.title = 'Cliente · Ateliê'
  }, [])

  const dado = recusada ? undefined : ficha.data
  const falhou = recusada || (ficha.isError && !ficha.data)
  const naoAtualizou = !recusada && ficha.isError && !!ficha.data
  const janela = recusada ? undefined : pedidos.data
  useRolagemRestaurada(!!dado)
  const tentarDeNovo = useCallback(() => {
    void ficha.refetch()
  }, [ficha])
  const reler = useCallback(async () => {
    await ficha.refetch()
    if (email) await pedidos.refetch()
  }, [ficha, pedidos, email])

  return (
    <PullToRefresh onRefresh={reler}>
      <div className="space-y-4">
        <TopoDaFicha />
        {falhou ? (
          <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
        ) : !dado ? (
          <Esqueletos />
        ) : !dado.cliente ? (
          <p role="status" className="text-sm text-estrelinha-ink">
            {NAO_ENCONTREI_CLIENTE}
          </p>
        ) : (
          <>
            {dado.lido_em && <LinhaDeFrescor naoAtualizou={naoAtualizou} />}
            <CabecalhoDaCliente cliente={dado.cliente} cidade={dado.cidade} />
            <NumerosDaCliente cliente={dado.cliente} />
            <ContatoDaCliente cliente={dado.cliente} />
            <PedidosDaCliente
              total={dado.cliente.orders_total}
              janela={janela}
              falhou={pedidos.isError && !pedidos.data}
              tentarDeNovo={() => {
                void pedidos.refetch()
              }}
              carregarMais={() => {
                void pedidos.carregarMais()
              }}
              carregandoMais={pedidos.carregandoMais}
              proximaFalhou={pedidos.proximaFalhou}
            />
          </>
        )}
      </div>
    </PullToRefresh>
  )
}

export default ClientePage
