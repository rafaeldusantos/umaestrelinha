/**
 * Feature `74` (R7 do Design) — o dublê de `IntersectionObserver`, que o jsdom não tem.
 *
 * Instalado por `setup.ts` em todo teste. Ele NÃO dispara sozinho: quem decide quando a sentinela
 * "aparece" é o teste, por `dispararInterseccao(alvo, visivel)` — a rolagem real (margem, momento
 * exato) é da prova em navegador. Registra cada observador criado, o `rootMargin` pedido e os alvos
 * observados, e esquece o observador desligado (`disconnect`), para que "a sentinela se rearma"
 * (E4) seja medível: o observador velho não recebe mais nada.
 */

type Entrada = Pick<IntersectionObserverEntry, 'isIntersecting' | 'target' | 'intersectionRatio'>

export class ObservadorFalso {
  static todos: ObservadorFalso[] = []
  readonly alvos = new Set<Element>()
  desligado = false
  constructor(
    readonly callback: (entradas: Entrada[], observador: ObservadorFalso) => void,
    readonly opcoes: IntersectionObserverInit = {},
  ) {
    ObservadorFalso.todos.push(this)
  }
  get rootMargin() {
    return this.opcoes.rootMargin ?? '0px'
  }
  observe(alvo: Element) {
    this.alvos.add(alvo)
  }
  unobserve(alvo: Element) {
    this.alvos.delete(alvo)
  }
  disconnect() {
    this.alvos.clear()
    this.desligado = true
  }
  takeRecords() {
    return []
  }
}

/** Os observadores ligados que observam este alvo. */
export const observadoresDe = (alvo: Element) =>
  ObservadorFalso.todos.filter((o) => !o.desligado && o.alvos.has(alvo))

/** O alvo entra (ou sai) da área visível: todo observador ligado que o observa é avisado. Devolve quantos. */
export const dispararInterseccao = (alvo: Element, visivel = true): number => {
  const observadores = observadoresDe(alvo)
  for (const o of observadores) o.callback([{ isIntersecting: visivel, target: alvo, intersectionRatio: visivel ? 1 : 0 }], o)
  return observadores.length
}

export const instalarIntersectionObserver = () => {
  ObservadorFalso.todos = []
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, configurable: true, value: ObservadorFalso })
  globalThis.IntersectionObserver = ObservadorFalso as unknown as typeof IntersectionObserver
}
