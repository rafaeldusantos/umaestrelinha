import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { STORE_LIVE_KEY, STORE_MOVEMENT_KEY, periodoDaEntrada, useMovimento, usePresenca } from '@/entities/stats'
import { useRecusaDePapel } from '@/features/access-check'
import { CabecalhoAoVivo, SecaoAcessos, TITULO_AO_VIVO } from '@/widgets/store-access'
import { BlocosDaPresenca } from '@/widgets/store-live'
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
 * - **A presença** (Fase 2, `usePresenca`, `store_live`, chave própria): os blocos A–E acima de
 *   Acessos. Também relê a cada 15 s só visível, e o `42501` dela cai na MESMA vigia. Cada leitura
 *   tem a sua chave: a falha de uma não apaga os blocos da outra. O puxar relê as duas, e o frescor
 *   é o da leitura MAIS ANTIGA das duas (a duração desde a chegada de cada uma), e só com as duas
 *   na tela.
 */
const AoVivoPage = () => {
  const { state } = useLocation()
  const [periodoInicial] = useState(() => periodoDaEntrada(state))
  const movimento = useMovimento({ refetchInterval: CICLO_AO_VIVO_MS })
  const presenca = usePresenca({ refetchInterval: CICLO_AO_VIVO_MS })
  const queryClient = useQueryClient()
  const recusada = useRecusaDePapel(
    [movimento.error, presenca.error],
    (!!movimento.data && !movimento.isError) || (!!presenca.data && !presenca.isError),
  )

  useEffect(() => {
    document.title = `${TITULO_AO_VIVO} · Ateliê`
  }, [])

  const reler = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY }),
        queryClient.invalidateQueries({ queryKey: STORE_LIVE_KEY }),
      ]),
    [queryClient],
  )
  const leitura = leituraDe(movimento, recusada)
  const daPresenca = leituraDe(presenca, recusada)
  // A chegada mais ANTIGA das DUAS leituras (instantes LOCAIS do React Query). Com uma delas sem
  // dado — carregando ou em falha —, não há frescor a afirmar: a linha some, como "nada enquanto não
  // há dado" da `83`. Contar só pela que chegou diria "Atualizado agora" acima de blocos em falha.
  const atualizadoEm =
    leitura.dado && daPresenca.dado ? Math.min(movimento.dataUpdatedAt, presenca.dataUpdatedAt) : null
  const naoAtualizou = !recusada && ((movimento.isError && !!movimento.data) || (presenca.isError && !!presenca.data))

  return (
    <PullToRefresh onRefresh={reler}>
      <div className="space-y-3">
        <CabecalhoAoVivo atualizadoEm={atualizadoEm} naoAtualizou={naoAtualizou} />
        <BlocosDaPresenca leitura={daPresenca} />
        <div className="pt-3">
          <SecaoAcessos leitura={leitura} periodoInicial={periodoInicial} />
        </div>
      </div>
    </PullToRefresh>
  )
}

export default AoVivoPage
