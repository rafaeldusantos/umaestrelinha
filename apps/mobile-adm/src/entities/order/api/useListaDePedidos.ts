import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAccessDenied, retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import {
  ORDER_PAGE_SIZE,
  applyOrderSlice,
  buildOrderSearchCondition,
  cursorFilter,
  sliceOrder,
  type OrderCursor,
  type OrderSlice,
} from '@estrelinha/core/orders'
import { supabase } from '@estrelinha/supabase/client'

import { COLUNAS_DA_LISTA, type JanelaDaLista, type LinhaDaLista } from '../model/linha'
import { lerComPapel } from './lerComPapel'

/**
 * A lista de pedidos do ateliê (feature `74`, abordagem B do Design — "a janela").
 *
 * **O recorte é só a regra de `core`** (`MAP-01`, `MAP-02`, `L-060`): a cadeia é exatamente
 * `select → applyOrderSlice → or(busca)? → or(cursor)? → order(created_at) → order(id) → limit`, e o
 * teste a compara por IGUALDADE com a que `core` produz. Nenhum filtro escrito aqui.
 *
 * **Toda leitura passa por `lerComPapel`** (`MAP-36`, `MAP-37`): a conta sem papel admin vê a recusa,
 * nunca os pedidos dela como cliente.
 *
 * A `queryFn` (a primeira leitura e toda releitura — Realtime, foco, puxar, voltar) relê a JANELA
 * inteira do topo, numa ida (G-A11): tantas linhas quantas já estavam carregadas, arredondadas para
 * cima em páginas de 25, com a contagem `exact`. `carregarMais` lê a página seguinte por CHAVE
 * (`created_at`, `id` da última linha, as strings do servidor — R1), sem contagem (G-A9a), e só a
 * anexa se nenhuma releitura começou desde que ela saiu (E3: a GERAÇÃO da chave).
 */

export const LISTA_DE_PEDIDOS_KEY = 'atelie-pedidos'

export const chaveDaLista = (slice: OrderSlice, termo: string) => [LISTA_DE_PEDIDOS_KEY, slice, termo.trim()] as const

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
 * (D2 da rodada 4 da verificação, `MAP-36`). Em módulo, e não no estado do componente, pelo mesmo
 * motivo de `reconferidoPara` na vigia: a recusa faz a vigia reconferir o papel, o `RequireAdmin` troca
 * a página pela splash e ela DESMONTA. Num `useState`, a recusa morria com ela, e a remontagem
 * desenhava a janela do cache — que é de uma leitura BEM-SUCEDIDA — enquanto a confirmação da releitura
 * estava no ar ("nem o de antes"), e a resposta dela abria um segundo episódio na vigia.
 *
 * Vale enquanto o cache guarda AQUELA leitura da janela (o `dataUpdatedAt` dela, e não a identidade do
 * objeto: o compartilhamento estrutural do React Query devolve o MESMO objeto a uma releitura com os
 * mesmos dados). Uma releitura que confirma o papel muda o `dataUpdatedAt` e a recusa deixa de valer; a releitura recusada põe o próprio `42501` no erro
 * da query. Pedir a página seguinte de novo não é alcançável com ela valendo: com a recusa, a lista
 * mostra a falha e não oferece a próxima.
 */
const recusasDaProxima = new Map<string, { lidaEm: number; erro: unknown }>()

interface Leitura {
  limite: number
  cursor?: OrderCursor
  contar: boolean
}

/** A consulta — a única cadeia de leitura da lista. Lança o erro do supabase-js (ele não rejeita). */
const consultaDaLista = async (slice: OrderSlice, termo: string, { limite, cursor, contar }: Leitura) => {
  let q = contar
    ? supabase.from('order_list').select(COLUNAS_DA_LISTA, { count: 'exact' })
    : supabase.from('order_list').select(COLUNAS_DA_LISTA)
  q = applyOrderSlice(q, slice)
  const busca = buildOrderSearchCondition(termo)
  if (busca) q = q.or(busca)
  const dir = sliceOrder(slice)
  if (cursor) q = q.or(cursorFilter(cursor, dir))
  const { data, error, count } = await q
    .order('created_at', { ascending: dir === 'asc' })
    .order('id', { ascending: dir === 'asc' })
    .limit(limite)
  if (error) throw error
  return { linhas: (data ?? []) as unknown as LinhaDaLista[], count: count ?? null }
}

/** O tamanho da janela relida: o que já estava carregado, em páginas cheias de 25 (nunca menos que uma). */
export const tamanhoDaJanela = (carregadas: number): number =>
  Math.max(ORDER_PAGE_SIZE, Math.ceil(carregadas / ORDER_PAGE_SIZE) * ORDER_PAGE_SIZE)

export const useListaDePedidos = (slice: OrderSlice, termo: string) => {
  const queryClient = useQueryClient()
  const chave = chaveDaLista(slice, termo)
  const termoLimpo = chave[2]

  const query = useQuery({
    queryKey: chave,
    queryFn: async (): Promise<JanelaDaLista> => {
      geracoes.set(idDaChave(chave), geracaoDe(chave) + 1)
      const carregadas = queryClient.getQueryData<JanelaDaLista>(chave)?.linhas.length ?? 0
      const limite = tamanhoDaJanela(carregadas)
      const { resultado, lido_em } = await lerComPapel(() => consultaDaLista(slice, termoLimpo, { limite, contar: true }))
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
  const atual = useRef({ chave, slice, termoLimpo })
  atual.current = { chave, slice, termoLimpo }

  const carregarMais = useCallback(async () => {
    if (!data || data.fim || emVoo.current || isFetching) return
    const ultima = data.linhas[data.linhas.length - 1]
    if (!ultima) return
    const { chave: daVez, slice: recorte, termoLimpo: t } = atual.current
    const geracao = geracaoDe(daVez)
    emVoo.current = true
    setCarregandoMais(true)
    setFalhaDaProxima(null)
    try {
      const { resultado } = await lerComPapel(() =>
        consultaDaLista(recorte, t, {
          limite: ORDER_PAGE_SIZE,
          cursor: { created_at: ultima.created_at, id: ultima.id },
          contar: false,
        }),
      )
      // E3: uma releitura começou (ou terminou) desde que esta página saiu ⇒ ela é velha. Descartada
      // em silêncio — a janela relida já é a verdade, e a sentinela se rearma (E4).
      if (geracaoDe(daVez) !== geracao) return
      queryClient.setQueryData<JanelaDaLista>(daVez, (janela) =>
        janela
          ? { ...janela, linhas: [...janela.linhas, ...resultado.linhas], fim: resultado.linhas.length < ORDER_PAGE_SIZE }
          : janela,
      )
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
  }, [data, isFetching, queryClient])

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
