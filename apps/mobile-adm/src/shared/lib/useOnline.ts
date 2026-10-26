import { useSyncExternalStore } from 'react'

/**
 * `navigator.onLine` como estado do React (feature 72, `MAF-19`/`MAF-21`).
 *
 * `useSyncExternalStore` lê o valor NA MONTAGEM, sem um primeiro quadro com o estado errado: o app
 * aberto offline nasce na tela "Sem conexão", nunca no Login seguido de troca. Os eventos `online` e
 * `offline` fazem o resto — a volta da rede tira o app da tela sozinha.
 */
const assinar = (avisar: () => void) => {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

const ler = () => navigator.onLine

export const useOnline = (): boolean => useSyncExternalStore(assinar, ler, () => true)
