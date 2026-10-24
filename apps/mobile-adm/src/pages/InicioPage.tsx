import { useCallback } from 'react'
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { useOrdersRealtime } from '@estrelinha/core/hooks/useOrdersRealtime'
import { STORE_MOVEMENT_KEY, STORE_OVERVIEW_KEY, useMovimento, useResumo } from '@/entities/stats'
import { useRecusaDePapel } from '@/features/access-check'
import { MovementHero } from '@/widgets/movement-hero'
import { QueueTiles } from '@/widgets/queue-tiles'
import { WeekChart } from '@/widgets/week-chart'
import { MonthCards } from '@/widgets/month-cards'
import { TopJewels } from '@/widgets/top-jewels'
import { RecentOrders } from '@/widgets/recent-orders'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { LinhaDeFrescor, type Leitura } from '@/shared/ui/leitura'

/**
 * O canal de pedidos da Início. Outro nome que o do Dashboard do painel (`admin-orders-realtime`): os
 * dois apps têm clients diferentes, e o nome distinto deixa o canal identificável no inspetor.
 */
export const CANAL_DA_INICIO = 'atelie-orders-realtime'

// A frase subiu para `shared/ui/leitura.tsx` na `74` (a lista de pedidos diz a mesma); reexportada
// aqui para o teste da `73` não mudar.
export { NAO_ATUALIZOU } from '@/shared/ui/leitura'

/**
 * O que um bloco sabe de uma query. Com recusa por papel (`42501`), nenhum número — nem o dado de
 * antes: o bloco diz que não carregou enquanto o papel é reconferido (`MAI-22`).
 */
const leituraDe = <T, E>(q: UseQueryResult<T, E>, recusada: boolean): Leitura<T> => ({
  dado: recusada ? undefined : (q.data ?? undefined),
  falhou: recusada || (q.isError && !q.data),
  tentarDeNovo: () => {
    void q.refetch()
  },
})

/** O instante mais ANTIGO entre os dados na tela: é a hora do número mais velho que a Adri lê. */
const maisAntigo = (instantes: (string | undefined)[]): string | null => {
  const validos = instantes.filter((i): i is string => !!i).sort((a, b) => Date.parse(a) - Date.parse(b))
  return validos[0] ?? null
}

/**
 * A Início (feature `73`). Compõe os blocos; nenhuma regra de número mora aqui.
 *
 * - **Duas leituras, só RPC admin** (`MAI-01`, `MAI-09`, `MAI-23`): o movimento por `useMovimento` e
 *   o resumo por `useResumo`. Cada uma tem a sua chave, então a falha de uma não apaga os blocos da
 *   outra (`MAI-17`), e a releitura que falha mantém o dado anterior (`MAI-18`).
 * - **"Atualizado às"** é a hora de Brasília do `lido_em` que o SERVIDOR devolveu (`formatStoreHour`,
 *   o dono da hora escrita), nunca o relógio do aparelho. Com duas leituras, vale a mais antiga.
 * - **Releem**: o aviso do Realtime (um canal por montagem, `MAI-20`), o puxar (`MAI-19`), a volta ao
 *   primeiro plano (`refetchOnWindowFocus` dos hooks) e a virada do dia (o timer por duração dos
 *   hooks, `MAI-21`).
 * - **`42501`** chama a vigia (`useRecusaDePapel`), que reconfere o papel e leva à recusa da `72`.
 */
const InicioPage = () => {
  const movimento = useMovimento()
  const resumo = useResumo()
  const queryClient = useQueryClient()
  const recusada = useRecusaDePapel([movimento.error, resumo.error])

  const reler = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY }),
        queryClient.invalidateQueries({ queryKey: STORE_OVERVIEW_KEY }),
      ]),
    [queryClient],
  )

  useOrdersRealtime(CANAL_DA_INICIO, () => {
    void reler()
  })

  const doMovimento = leituraDe(movimento, recusada)
  const doResumo = leituraDe(resumo, recusada)
  const lidoEm = recusada ? null : maisAntigo([doMovimento.dado?.lido_em, doResumo.dado?.lido_em])
  const naoAtualizou = !recusada && ((movimento.isError && !!movimento.data) || (resumo.isError && !!resumo.data))

  return (
    <PullToRefresh onRefresh={reler}>
      <div className="space-y-6">
        <MovementHero leitura={doMovimento} />
        {lidoEm && <LinhaDeFrescor lidoEm={lidoEm} naoAtualizou={naoAtualizou} />}
        <QueueTiles leitura={doResumo} />
        <section aria-labelledby="o-mes-e-a-semana" className="space-y-3">
          <h2 id="o-mes-e-a-semana" className="sr-only">
            A semana e o mês
          </h2>
          <WeekChart leitura={doResumo} />
          <MonthCards leitura={doResumo} />
          <TopJewels leitura={doResumo} />
        </section>
        <RecentOrders leitura={doResumo} />
      </div>
    </PullToRefresh>
  )
}

export default InicioPage
