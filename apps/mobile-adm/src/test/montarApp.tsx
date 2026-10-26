import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import App from '@/app/App'

/**
 * Monta o app INTEIRO (o mesmo `<App />` do `main.tsx`) num caminho, e passa o piso da splash.
 * Requer `vi.useFakeTimers({ shouldAdvanceTime: true })` no teste.
 *
 * `estado` é o `location.state` da entrada (o que o React Router guarda em `history.state.usr`):
 * é como se monta um passo da recuperação "reaberto" com o que a entrada carregava. Ele vai no MESMO
 * `pushState` que cria a entrada — gravá-lo antes com `replaceState` não serve, porque o `pushState`
 * daqui cria uma entrada nova, sem ele.
 */
export const montarApp = async (
  caminho: string,
  { passarPiso = true, estado }: { passarPiso?: boolean; estado?: Record<string, unknown> } = {},
) => {
  window.history.pushState(estado ? { usr: estado, key: 'montado', idx: 0 } : {}, '', caminho)
  const r = render(<App />)
  if (passarPiso) await act(() => vi.advanceTimersByTimeAsync(600))
  return r
}
