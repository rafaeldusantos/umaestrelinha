import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAccessDenied, retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { lerComPapel } from './lerComPapel'

/**
 * A janela paginada por cursor do app do ateliê — o dono único da máquina que a feature `74` levou
 * quatro rodadas de verificação para acertar (lista de pedidos) e que a `76` reusa (lista de clientes
 * e pedidos de uma cliente). Extraída de `useListaDePedidos` SEM mudar uma linha de comportamento
 * (abordagem A do Design da `76`, §1.1): duas cópias herdariam os defeitos já consertados e os ainda
 * não achados.
 *
 * **Toda leitura passa por `lerComPapel`** (`MAP-36`, `MAP-37`, `MAC-11`): a conta sem papel admin vê a
 * recusa, nunca as linhas dela como cliente. A consulta é INJETADA e roda sempre DENTRO de
 * `lerComPapel`.
 *
 * A `queryFn` (a primeira leitura e toda releitura — Realtime, foco, puxar, voltar) relê a JANELA
 * inteira do topo, numa ida (G-A11): tantas linhas quantas já estavam carregadas, arredondadas para
 * cima em páginas cheias, com a contagem `exact`. `carregarMais` lê a página seguinte por CHAVE (o
 * cursor que `cursorDe` tira da última linha, as strings do servidor — R1), sem contagem (G-A9a), e só
 * a anexa se nenhuma releitura começou desde que ela saiu (E3: a GERAÇÃO da chave).
 *
 * `desduplicar` (só a lista de clientes): ao anexar, o `id` que já está na janela é descartado — a
 * cliente que mudou de posição entre duas leituras (`MAC-05`). Em pedidos é `false`, e inerte.
 */

export interface PaginaLida<L> {
  linhas: L[]
  count: number | null
}

export interface JanelaPaginada<L> {
  linhas: L[]
  total: number
  lido_em: string
  fim: boolean
}

export interface PedidoDeLeitura<C> {
  limite: number
  cursor?: C
  contar: boolean
}

export interface OpcoesDaJanela<L extends { id: string }, C> {
  /** Ex.: `['atelie-pedidos', slice, termo]` — o prefixo separa as listas no cache e nas gerações. */
  chave: readonly unknown[]
  tamanhoDaPagina: number
  consultar: (p: PedidoDeLeitura<C>) => Promise<PaginaLida<L>>
  cursorDe: (ultima: L) => C
  desduplicar?: boolean
  /** Só liga a leitura com `true` (a ficha espera o cabeçalho). Padrão: ligada. */
  habilitada?: boolean
}

/** O tamanho da janela relida: o que já estava carregado, em páginas cheias (nunca menos que uma). */
export const tamanhoDaJanelaDe = (carregadas: number, tamanhoDaPagina: number): number =>
  Math.max(tamanhoDaPagina, Math.ceil(carregadas / tamanhoDaPagina) * tamanhoDaPagina)

/**
 * Quantas leituras da janela já COMEÇARAM para cada chave (E3). Incrementado no início da `queryFn`;
 * `carregarMais` guarda o valor ao sair e só anexa se ele não mudou — cobre a releitura em voo E a
 * terminada (`dataUpdatedAt` só muda quando ela termina). Em módulo, fora do React, no molde da
 * `geracao` do `AuthProvider`.
 */
const geracoes = new Map<string, number>()
const idDaChave = (chave: readonly unknown[]) => JSON.stringify(chave)
const geracaoDe = (chave: readonly unknown[]) => geracoes.get(idDaChave(chave)) ?? 0

/**
 * A recusa (`42501`) da PÁGINA SEGUINTE, por chave, presa à JANELA do cache sobre a qual ela aconteceu
 * (D2 da rodada 4 da verificação da `74`, `MAP-36`). Em módulo, e não no estado do componente, pelo
 * mesmo motivo de `reconferidoPara` na vigia: a recusa faz a vigia reconferir o papel, o `RequireAdmin`
 * troca a página pela splash e ela DESMONTA. Num `useState`, a recusa morria com ela, e a remontagem
 * desenhava a janela do cache — que é de uma leitura BEM-SUCEDIDA — enquanto a confirmação da releitura
 * estava no ar ("nem o de antes"), e a resposta dela abria um segundo episódio na vigia.
 *
 * Vale enquanto o cache guarda AQUELA leitura da janela (o `dataUpdatedAt` dela, e não a identidade do
 * objeto: o compartilhamento estrutural do React Query devolve o MESMO objeto a uma releitura com os
 * mesmos dados). Uma releitura que confirma o papel muda o `dataUpdatedAt` e a recusa deixa de valer; a
 * releitura recusada põe o próprio `42501` no erro da query. Pedir a página seguinte de novo não é
 * alcançável com ela valendo: com a recusa, a lista mostra a falha e não oferece a próxima.
 */
const recusasDaProxima = new Map<string, { lidaEm: number; erro: unknown }>()

export const useJanelaPaginada = <L extends { id: string }, C>({
  chave,
  tamanhoDaPagina,
  consultar,
  cursorDe,
  desduplicar = false,
  habilitada = true,
}: OpcoesDaJanela<L, C>) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: chave,
    enabled: habilitada,
    queryFn: async (): Promise<JanelaPaginada<L>> => {
      geracoes.set(idDaChave(chave), geracaoDe(chave) + 1)
      const carregadas = queryClient.getQueryData<JanelaPaginada<L>>(chave)?.linhas.length ?? 0
      const limite = tamanhoDaJanelaDe(carregadas, tamanhoDaPagina)
      const { resultado, lido_em } = await lerComPapel(() => consultar({ limite, contar: true }))
      return {
        linhas: resultado.linhas,
        total: resultado.count ?? resultado.linhas.length,
        lido_em,
        fim: resultado.linhas.length < limite,
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })

  const [carregandoMais, setCarregandoMais] = useState(false)
  /** O erro da página seguinte, preso à CHAVE em que aconteceu: trocar de recorte não herda a falha. */
  const [falhaDaProxima, setFalhaDaProxima] = useState<{ chave: string; erro: unknown } | null>(null)
  const emVoo = useRef(false)
  const { data, isFetching, dataUpdatedAt } = query
  // Os valores do render corrente, lidos pelo `carregarMais` sem recriá-lo a cada render.
  const atual = useRef({ chave, consultar, cursorDe })
  atual.current = { chave, consultar, cursorDe }

  const carregarMais = useCallback(async () => {
    if (!data || data.fim || emVoo.current || isFetching) return
    const ultima = data.linhas[data.linhas.length - 1]
    if (!ultima) return
    const { chave: daVez, consultar: consultaDaVez, cursorDe: cursor } = atual.current
    const geracao = geracaoDe(daVez)
    emVoo.current = true
    setCarregandoMais(true)
    setFalhaDaProxima(null)
    try {
      const { resultado } = await lerComPapel(() =>
        consultaDaVez({ limite: tamanhoDaPagina, cursor: cursor(ultima), contar: false }),
      )
      // E3: uma releitura começou (ou terminou) desde que esta página saiu ⇒ ela é velha. Descartada
      // em silêncio — a janela relida já é a verdade, e a sentinela se rearma (E4).
      if (geracaoDe(daVez) !== geracao) return
      queryClient.setQueryData<JanelaPaginada<L>>(daVez, (janela) => {
        if (!janela) return janela
        const jaTem = desduplicar ? new Set(janela.linhas.map((l) => l.id)) : null
        const novas = jaTem ? resultado.linhas.filter((l) => !jaTem.has(l.id)) : resultado.linhas
        return { ...janela, linhas: [...janela.linhas, ...novas], fim: resultado.linhas.length < tamanhoDaPagina }
      })
    } catch (erro) {
      if (geracaoDe(daVez) === geracao) {
        const lidaEm = queryClient.getQueryState(daVez)?.dataUpdatedAt ?? 0
        if (lidaEm > 0 && isAccessDenied(erro)) recusasDaProxima.set(idDaChave(daVez), { lidaEm, erro })
        setFalhaDaProxima({ chave: idDaChave(daVez), erro })
      }
    } finally {
      emVoo.current = false
      setCarregandoMais(false)
    }
  }, [data, isFetching, queryClient, tamanhoDaPagina, desduplicar])

  const recusaGuardada = recusasDaProxima.get(idDaChave(chave))
  const erroDaProxima =
    falhaDaProxima && falhaDaProxima.chave === idDaChave(chave)
      ? falhaDaProxima.erro
      : recusaGuardada && data !== undefined && recusaGuardada.lidaEm === dataUpdatedAt
        ? recusaGuardada.erro
        : null

  return {
    ...query,
    carregarMais,
    carregandoMais,
    /** A página seguinte falhou: as linhas ficam, e o fim oferece "Tentar de novo" (`MAP-35`). */
    proximaFalhou: erroDaProxima !== null,
    /** O erro dela — a página o passa à vigia da recusa junto com o da janela (`MAP-36`). */
    erroDaProxima,
  }
}
