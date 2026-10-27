import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { STORE_MOVEMENT_KEY, periodoDaEntrada, useMovimento } from '@/entities/stats'
import { useRecusaDePapel } from '@/features/access-check'
import { CabecalhoAoVivo, SecaoAcessos, TITULO_AO_VIVO } from '@/widgets/store-access'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { leituraDe } from '@/shared/ui/leituraDe'

/** A Loja ao vivo relê a cada 15 s com a aba visível (`LAV-08`). */
export const CICLO_AO_VIVO_MS = 15_000

/**
 * A Loja ao vivo (feature `83`, Fase 1: a seção Acessos). Compõe; nenhuma regra de número mora aqui.
 *
 * - **A MESMA leitura da faixa do Início** (`useMovimento`, chave `['store-movement']`): Visitas e
 *   Vendas iguais às da faixa por construção. Relê a cada 15 s só com a aba visível, no puxar, na
 *   volta ao primeiro plano e na virada do dia (o hook); nunca depois de uma recusa (`LAV-08`).
 * - **Sem `lerComPapel`** (`LAV-60`, `SPEC_DEVIATION` do texto do PRD, design §4.1): a RPC
 *   `store_movement` recusa a conta sem papel com `42501` no próprio corpo — a mesma resposta que
 *   confirma o papel traz o dado. `42501` ⇒ a vigia (`useRecusaDePapel`) e a recusa da `72`; enquanto
 *   isso, nenhum número, nem o do cache.
 * - O período inicial vem do `history.state` da entrada (`periodoDaEntrada`), nunca da URL.
 */
const AoVivoPage = () => {
  const { state } = useLocation()
  const [periodoInicial] = useState(() => periodoDaEntrada(state))
  const movimento = useMovimento({ refetchInterval: CICLO_AO_VIVO_MS })
  const queryClient = useQueryClient()
  const recusada = useRecusaDePapel([movimento.error], !!movimento.data && !movimento.isError)

  useEffect(() => {
    document.title = `${TITULO_AO_VIVO} · Ateliê`
  }, [])

  const reler = useCallback(() => queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY }), [queryClient])
  const leitura = leituraDe(movimento, recusada)
  const naoAtualizou = !recusada && movimento.isError && !!movimento.data

  return (
    <PullToRefresh onRefresh={reler}>
      <div className="space-y-4">
        <CabecalhoAoVivo atualizadoEm={leitura.dado ? movimento.dataUpdatedAt : null} naoAtualizou={naoAtualizou} />
        <SecaoAcessos leitura={leitura} periodoInicial={periodoInicial} />
      </div>
    </PullToRefresh>
  )
}

export default AoVivoPage
