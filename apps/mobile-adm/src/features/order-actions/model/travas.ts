import { useSyncExternalStore } from 'react'

/**
 * A trava por pedido (feature `75`, `MAA-20`, `MAA-36`, A20; design §1.2, abordagem A).
 *
 * Um `Set` de ids em MÓDULO, fora do React — molde de `access-check/model/tentativa.ts`. Por quê:
 * `travar(id)` é SÍNCRONO, então o segundo toque no MESMO tique (sem `await` entre os dois) já vê a
 * trava e não sai; e o cartão da lista e o rodapé do detalhe leem a mesma trava sem prop. Um `useRef`
 * morreria com o cartão que sai do recorte ou com o detalhe que desmonta na recusa.
 *
 * `soltar` mora no `finally` de quem travou (`useAcaoDoPedido`), inclusive quando a porta LANÇA.
 */
const travados = new Set<string>()
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

/** Trava o pedido. `true` ⇒ quem chamou agora é o dono da trava; `false` ⇒ já estava travado. */
export const travar = (id: string): boolean => {
  if (travados.has(id)) return false
  travados.add(id)
  avisar()
  return true
}

/** Solta a trava do pedido (sem efeito se não estava travado). */
export const soltar = (id: string): void => {
  if (travados.delete(id)) avisar()
}

/** O pedido está travado? Reativo, para o rodapé e o cartão desenharem "Salvando…". */
export const useTravado = (id: string): boolean => useSyncExternalStore(assinar, () => travados.has(id))

/** Solta todas as travas (troca de conta, testes). */
export const esquecerTravas = (): void => {
  if (travados.size === 0) return
  travados.clear()
  avisar()
}
