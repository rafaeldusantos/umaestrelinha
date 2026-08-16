/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * O que o `Select` do shadcn (Radix + floating-ui) precisa para abrir no jsdom.
 *
 * São **quatro** coisas, e a última é a que engana: sem `PointerEvent`, o gatilho recebe um `Event`
 * genérico sem `pointerType`, a condição `pointerType === 'mouse'` do Radix não passa, e o menu
 * simplesmente **não abre** — o teste então mede a ausência de uma opção que existe, e falha por um
 * motivo que não tem nada a ver com o componente sob teste.
 *
 * Vive aqui porque três arquivos de teste já precisavam disso, e dois deles carregam a própria cópia
 * (`CheckoutSettingsCard.test.tsx` e `AdminProductsPage.test.tsx`, ambos anteriores a este módulo).
 * Quem escrever o quarto usa esta função.
 *
 * Chame de dentro de um `beforeAll`.
 */
export const enableRadixSelectInJsdom = (): void => {
  Element.prototype.hasPointerCapture = (() => false) as any
  Element.prototype.setPointerCapture = (() => {}) as any
  Element.prototype.releasePointerCapture = (() => {}) as any
  Element.prototype.scrollIntoView = (() => {}) as any

  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any

  class JsdomPointerEvent extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: any = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
  ;(globalThis as any).PointerEvent ??= JsdomPointerEvent
  ;(window as any).PointerEvent ??= JsdomPointerEvent
}

/** O `pointerdown` que o Radix aceita como abertura de um `SelectTrigger`. */
export const RADIX_POINTER_DOWN = {
  button: 0,
  ctrlKey: false,
  pointerId: 1,
  pointerType: 'mouse',
} as const
