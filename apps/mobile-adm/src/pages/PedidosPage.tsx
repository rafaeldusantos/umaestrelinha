import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useOrdersRealtime } from '@estrelinha/core/hooks/useOrdersRealtime'
import { isBlockSlice, type OrderSlice } from '@estrelinha/core/orders'
import { LISTA_DE_PEDIDOS_KEY, pedidosHref, recorteDoEndereco, useListaDePedidos, type LinhaDaLista } from '@/entities/order'
import { STORE_OVERVIEW_KEY } from '@/entities/stats'
import { useRecusaDePapel } from '@/features/access-check'
import { BotaoDaAcao, useRecusaDaAcao } from '@/features/order-actions'
import { ChipsDeRecorte, FaixaDoBloco } from '@/features/order-slice'
import { BuscaDePedidos } from '@/features/order-search'
import { ListaDePedidos } from '@/widgets/order-list'
import { tabFor } from '@/widgets/tab-bar'
import { useRolagemRestaurada } from '@/shared/lib/useRolagemRestaurada'
import { useTermoDaEntrada } from '@/shared/lib/useTermoDaEntrada'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { LinhaDeFrescor } from '@/shared/ui/leitura'

/**
 * O canal de pedidos da lista. Outro nome que o da Início (`atelie-orders-realtime`): as duas páginas
 * nunca estão montadas juntas, mas o nome distinto deixa o canal identificável no inspetor.
 */
export const CANAL_DA_LISTA = 'atelie-pedidos-realtime'

/** O canal da lista, montado só depois da primeira leitura CONFIRMADA (ver `PedidosPage`). */
const AvisoDePedidos = ({ aoMudar }: { aoMudar: () => void }) => {
  useOrdersRealtime(CANAL_DA_LISTA, aoMudar)
  return null
}

/**
 * A aba Pedidos (feature `74`, `MAP-01`..`MAP-15`, `MAP-34`..`MAP-40`, `MAP-46`). Compõe a busca, o
 * recorte e a lista; nenhuma regra de recorte, frase ou número mora aqui.
 *
 * - **O endereço é lido SÓ por `recorteDoEndereco`** (`MAP-03`, `MAP-04`): o mesmo dono que monta os
 *   endereços da Início. Chip e "Limpar filtro" trocam o endereço por SUBSTITUIÇÃO (`MAP-05`,
 *   `MAP-06`): o voltar do Android sai da aba, não percorre os recortes.
 * - **O termo da busca é estado da página** (A13), já com o atraso de `core`; fora do endereço. A
 *   memória por entrada do histórico (`useTermoDaEntrada`, B02) o devolve ao voltar do detalhe.
 * - **Toda leitura passa pela confirmação de papel** (`useListaDePedidos` → `lerComPapel`). Com
 *   `42501`, a vigia reconfere o papel uma vez por episódio e a recusa da `72` assume; enquanto isso,
 *   **nenhuma linha** — nem a do cache (`MAP-36`). Rede nunca é recusa (`MAP-38`).
 * - **Releem**: o aviso do Realtime (UM canal por montagem, fechado ao sair), que relê a lista e o
 *   resumo da Início/selo (`STORE_OVERVIEW_KEY`, A25); o puxar no topo; a volta ao primeiro plano.
 *   **O canal abre depois da primeira leitura com o papel CONFIRMADO, e fecha na recusa**: a RLS de
 *   `orders` entregaria a uma conta sem papel os avisos dos pedidos DELA, e antes da confirmação não há
 *   lista para reler — a falha da primeira leitura tem o "Tentar de novo", o foco e o puxar. Trocar de
 *   recorte não fecha o canal (a confirmação vale para a montagem).
 * - **O `h1` existe em todo estado** (E5): o foco do `MobileLayout` vai a ele ao trocar de aba, mesmo
 *   com a leitura pendente.
  * - O voltar restaura a rolagem da entrada (G-A28) só quando a lista volta do cache; sem cache, abre no topo.
 * - **A ação no cartão** (feature `75`, `MAA-36`): `BotaoDaAcao` ao lado de cada linha, composto aqui.
 *   A recusa que a porta lança (R11) volta por `aoRecusa` e entra na MESMA vigia da leitura.
 */
const PedidosPage = () => {
  const { search } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recorte = recorteDoEndereco(search)
  const [termo, setTermo] = useTermoDaEntrada()

  const lista = useListaDePedidos(recorte, termo)
  const [recusaBruta, setRecusaBruta] = useState<unknown>(null)
  const recusaDaAcao = useRecusaDaAcao(recusaBruta, lista.dataUpdatedAt)
  const recusada = useRecusaDePapel([lista.error, lista.erroDaProxima, recusaDaAcao], !!lista.data && !lista.isError)
  const acaoDaLinha = useCallback((l: LinhaDaLista) => <BotaoDaAcao linha={l} aoRecusa={setRecusaBruta} />, [])

  const trocarRecorte = useCallback(
    (slice: OrderSlice) => navigate(pedidosHref(slice), { replace: true }),
    [navigate],
  )

  const reler = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [LISTA_DE_PEDIDOS_KEY] })
    void queryClient.invalidateQueries({ queryKey: STORE_OVERVIEW_KEY })
  }, [queryClient])

  const janela = recusada ? undefined : lista.data
  const [confirmada, setConfirmada] = useState(false)
  useEffect(() => {
    if (recusada) setConfirmada(false)
    else if (janela) setConfirmada(true)
  }, [recusada, janela])
  useRolagemRestaurada(!!janela)
  const naoAtualizou = !recusada && lista.isError && !!lista.data

  return (
    <PullToRefresh onRefresh={() => lista.refetch()}>
      <div className="space-y-4">
        {confirmada && <AvisoDePedidos aoMudar={reler} />}
        <h1 className="text-2xl">{tabFor('/pedidos').label}</h1>
        <BuscaDePedidos inicial={termo} aoBuscar={setTermo} />
        <ChipsDeRecorte recorte={recorte} aoTrocar={trocarRecorte} />
        {isBlockSlice(recorte) && <FaixaDoBloco bloco={recorte.bloco} aoTrocar={trocarRecorte} />}
        {janela && <LinhaDeFrescor lidoEm={janela.lido_em} naoAtualizou={naoAtualizou} />}
        <ListaDePedidos
          recorte={recorte}
          termo={termo}
          janela={janela}
          falhou={recusada || (lista.isError && !lista.data)}
          tentarDeNovo={() => {
            void lista.refetch()
          }}
          carregarMais={() => {
            void lista.carregarMais()
          }}
          carregandoMais={lista.carregandoMais}
          proximaFalhou={lista.proximaFalhou}
          acaoDaLinha={acaoDaLinha}
        />
      </div>
    </PullToRefresh>
  )
}

export default PedidosPage
