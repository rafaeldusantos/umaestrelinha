import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { useStoreMovement } from '@estrelinha/core/hooks/useStoreMovement'

export { STORE_MOVEMENT_KEY } from '@estrelinha/core/hooks/useStoreMovement'
export { STORE_OVERVIEW_KEY, useStoreOverview as useResumo } from '@estrelinha/core/hooks/useStoreOverview'

/**
 * O movimento da loja (feature `73`, `MAI-01`), com a regra de repetição do app.
 *
 * `useStoreMovement` declara `retry: 1` no próprio hook (a `71` prende isso para o painel), e opção
 * de query vence a do `QueryClient`: sem passar `retryUnlessDenied` aqui, um `42501` seria repetido
 * uma vez antes de o app ir à recusa (`MAI-22`). A Início lê o movimento SÓ por aqui.
 *
 * Feature `83`: `refetchInterval` opcional — a Início relê a cada 30 s, a Loja ao vivo a 15 s, só com
 * a aba visível e nunca depois de uma recusa (a regra mora no hook de `core`).
 */
export const useMovimento = ({ refetchInterval }: { refetchInterval?: number } = {}) =>
  useStoreMovement({ retry: retryUnlessDenied, refetchInterval })
