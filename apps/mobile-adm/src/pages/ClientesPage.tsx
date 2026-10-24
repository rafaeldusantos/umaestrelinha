import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CustomerSliceId } from '@estrelinha/core/customers'
import { clientesHref, recorteDeClientesDoEndereco, useListaDeClientes } from '@/entities/customer'
import { useRecusaDePapel } from '@/features/access-check'
import { ChipsDeClientes } from '@/features/customer-slice'
import { BuscaDeClientes } from '@/features/customer-search'
import { ListaDeClientes } from '@/widgets/customer-list'
import { tabFor } from '@/widgets/tab-bar'
import { useBuscaEmFoco } from '@/shared/lib/useBuscaEmFoco'
import { useRolagemRestaurada } from '@/shared/lib/useRolagemRestaurada'
import { useTecladoVirtual } from '@/shared/lib/useTecladoVirtual'
import { useTermoDaEntrada } from '@/shared/lib/useTermoDaEntrada'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { LinhaDeFrescor } from '@/shared/ui/leitura'

/**
 * A aba Clientes (feature `76`, `MAC-01`..`MAC-13`, `MAC-34`). Compõe a busca, os recortes e a lista;
 * nenhuma regra de recorte, busca, frase ou número mora aqui (molde de `PedidosPage`).
 *
 * - **O endereço é lido SÓ por `recorteDeClientesDoEndereco`** (`MAC-07`): o mesmo dono que monta os
 *   endereços. O chip troca o endereço por SUBSTITUIÇÃO: o voltar do Android sai da aba, não percorre
 *   os recortes.
 * - **O termo da busca é estado da página**, já com o atraso de `core`; **fora do endereço** (`MAC-28`:
 *   nome e telefone de uma pessoa não vão para o histórico). A memória por entrada do histórico
 *   (`useTermoDaEntrada`) o devolve ao voltar da ficha, junto com a rolagem.
 * - **Toda leitura passa pela confirmação de papel** (`useListaDeClientes` → `lerComPapel`). Com
 *   `42501`, a vigia reconfere o papel uma vez por episódio e a recusa da `72` assume; enquanto isso,
 *   **nenhuma linha** — nem a do cache (`MAC-11`). Rede nunca é recusa.
 * - **Releem**: o puxar no topo, a volta ao primeiro plano e a volta da rede. **Sem Realtime**: cliente
 *   nova entrando com a tela aberta não é urgência.
 * - **O `h1` existe em todo estado**: o foco do `MobileLayout` vai a ele ao trocar de aba.
 * - **O teclado virtual** não cobre o fim dos resultados: a seção ganha a folga que ele ocupa.
 */
const ClientesPage = () => {
  const { search } = useLocation()
  const navigate = useNavigate()
  const recorte = recorteDeClientesDoEndereco(search)
  const [termo, setTermo] = useTermoDaEntrada()
  // O campo guarda o próprio texto: para "Limpar" esvaziá-lo, ele é remontado (a chave muda).
  const [geracaoDoCampo, setGeracaoDoCampo] = useState(0)

  const lista = useListaDeClientes(recorte, termo)
  const recusada = useRecusaDePapel([lista.error, lista.erroDaProxima], !!lista.data && !lista.isError)
  const folgaDoTeclado = useTecladoVirtual()
  // Com o teclado aberto sobra pouca tela: o título e a hora da leitura saem da frente (o título segue na
  // árvore, para o leitor de tela e para o foco do layout).
  const buscando = useBuscaEmFoco()

  const trocarRecorte = useCallback(
    (id: CustomerSliceId) => navigate(clientesHref(id), { replace: true }),
    [navigate],
  )
  const limpar = useCallback(() => {
    setTermo('')
    setGeracaoDoCampo((g) => g + 1)
    navigate(clientesHref('todas'), { replace: true })
  }, [navigate, setTermo])

  // "Limpar" remonta o campo, e o botão que tinha o foco sai do DOM: o foco vai ao campo novo.
  useEffect(() => {
    if (geracaoDoCampo > 0) document.getElementById('busca-de-clientes')?.focus()
  }, [geracaoDoCampo])

  const janela = recusada ? undefined : lista.data
  useRolagemRestaurada(!!janela)
  const naoAtualizou = !recusada && lista.isError && !!lista.data

  return (
    <PullToRefresh onRefresh={() => lista.refetch()}>
      <div className="space-y-4">
        <h1 className={buscando ? 'sr-only' : 'text-2xl'}>{tabFor('/clientes').label}</h1>
        <BuscaDeClientes key={geracaoDoCampo} inicial={termo} aoBuscar={setTermo} />
        <ChipsDeClientes recorte={recorte} aoTrocar={trocarRecorte} />
        {janela && !(buscando && !naoAtualizou) && <LinhaDeFrescor lidoEm={janela.lido_em} naoAtualizou={naoAtualizou} />}
        <ListaDeClientes
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
          limpar={limpar}
          folgaDoTeclado={folgaDoTeclado}
        />
      </div>
    </PullToRefresh>
  )
}

export default ClientesPage
