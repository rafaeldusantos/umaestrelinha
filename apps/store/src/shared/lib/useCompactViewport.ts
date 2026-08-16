import { useCallback, useSyncExternalStore } from 'react'

/**
 * `true` abaixo de `md` (768px) — a viewport onde o desenho da loja é o do artboard de 390.
 *
 * **`useSyncExternalStore`, e não `useState` + `useEffect`.** O par tradicional (o `useIsMobile` de
 * `@estrelinha/ui`) começa em `false`, descobre a verdade no efeito e re-renderiza: no celular, a
 * primeira pintura é a de desktop. Em quase toda tela isso é invisível; num acordeão, não — as sete
 * fichas do guia nascem abertas e **colapsam na frente da cliente**, com a página encolhendo alguns
 * milhares de pixels. `useSyncExternalStore` responde certo já na primeira renderização.
 *
 * O terceiro argumento é o valor de servidor. A loja é SPA sem SSR, mas o vitest roda em jsdom, onde
 * `matchMedia` é dublê: `false` ali significa "trate como desktop", que é o que faz o teste de
 * componente ver o conteúdo aberto em vez de precisar clicar em cada acordeão.
 */
const CONSULTA = '(max-width: 767px)'

export const useCompactViewport = (): boolean => {
  const subscribe = useCallback((notificar: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}
    const mql = window.matchMedia(CONSULTA)
    mql.addEventListener('change', notificar)
    return () => mql.removeEventListener('change', notificar)
  }, [])

  const snapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(CONSULTA).matches
  }, [])

  return useSyncExternalStore(subscribe, snapshot, () => false)
}

export default useCompactViewport
