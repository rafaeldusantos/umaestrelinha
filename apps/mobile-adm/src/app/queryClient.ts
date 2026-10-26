import { QueryClient } from '@tanstack/react-query'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'

/**
 * O cache do app do ateliê (feature `73`, design §6).
 *
 * **`42501` não repete** (`MAI-22`): é a RPC admin recusando por papel, e repetir só atrasa a ida à
 * recusa. Falha de rede repete UMA vez (`MAI-24`) — o mesmo `retry: 1` do Dashboard do painel.
 *
 * Isto é o PADRÃO. Opção de query vence a do `QueryClient`, então todo hook que declara o próprio
 * `retry` precisa recebê-lo de quem lê: é por isso que `useStoreMovement` ganhou o parâmetro e o app o
 * lê por `useMovimento` (`entities/stats`).
 *
 * Um cliente por montagem do `<App />` (e não um do módulo): o app real monta uma vez, e cada teste
 * que monta o app começa sem o cache do anterior.
 */
export const criarQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: retryUnlessDenied } } })
