import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HERO_CAROUSEL_INTERVAL_MS } from '@estrelinha/core/home'
import { useHeroCarousel } from '../useHeroCarousel'

/**
 * `BNR-30`..`BNR-33` — o giro, a pausa e o movimento reduzido.
 *
 * O que este arquivo NÃO tenta provar: onde o trilho parou. `clientWidth` é 0 em jsdom, e por isso a
 * aritmética do índice mora em `@estrelinha/core/home` (`carousel.test.ts`), onde dá para prová-la de
 * verdade. Aqui se prova o que é observável sem medida: quantos temporizadores existem, quando eles
 * param, e o que o hook manda o trilho fazer.
 */

/** Um trilho de mentira: jsdom não implementa `Element.scrollTo`, e o hook conta com isso. */
const trilhoFalso = (largura: number) => {
  const scrollTo = vi.fn()
  return {
    scrollTo,
    elemento: {
      scrollTo,
      clientWidth: largura,
      scrollLeft: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDivElement,
  }
}

const comMovimentoReduzido = (reduzido: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: reduzido && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  comMovimentoReduzido(false)
})

afterEach(() => {
  vi.useRealTimers()
  comMovimentoReduzido(false)
})

describe('o giro automático (BNR-30, BNR-31)', () => {
  it('com dois ou mais slides, avança a cada 6 s', () => {
    const { result } = renderHook(() => useHeroCarousel(3))
    expect(result.current.index).toBe(0)

    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(1)

    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(2)
  })

  it('circula do último para o primeiro', () => {
    const { result } = renderHook(() => useHeroCarousel(2))

    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 2))
    expect(result.current.index).toBe(0)
  })

  it('NÃO gira antes dos 6 s', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS - 1))
    expect(result.current.index).toBe(0)
  })

  it('com UM slide, nenhum temporizador é criado (BNR-31)', () => {
    // Não basta o índice ficar em 0: um `setInterval` que troca 0 por 0 é trabalho invisível a cada
    // 6 s, para sempre, em toda visita à Home.
    const criar = vi.spyOn(globalThis, 'setInterval')
    renderHook(() => useHeroCarousel(1))

    expect(criar).not.toHaveBeenCalled()
    criar.mockRestore()
  })

  it('com nenhum slide, nenhum temporizador é criado', () => {
    const criar = vi.spyOn(globalThis, 'setInterval')
    renderHook(() => useHeroCarousel(0))

    expect(criar).not.toHaveBeenCalled()
    criar.mockRestore()
  })

  it('o temporizador é limpo ao desmontar', () => {
    const limpar = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useHeroCarousel(3))

    unmount()
    expect(limpar).toHaveBeenCalled()
    limpar.mockRestore()
  })
})

describe('a pausa (BNR-32)', () => {
  it('o ponteiro sobre o carrossel pausa, e sair retoma', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.pauseHandlers.onMouseEnter())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 3))
    expect(result.current.index).toBe(0)

    act(() => result.current.pauseHandlers.onMouseLeave())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(1)
  })

  it('o foco do teclado dentro do carrossel pausa, e sair retoma', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.pauseHandlers.onFocus())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 3))
    expect(result.current.index).toBe(0)

    act(() => result.current.pauseHandlers.onBlur())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(1)
  })

  it('o dedo encostado pausa, e soltar retoma', () => {
    // O caminho do celular, que é ~90% dos acessos: `mouseenter` nunca dispara ali.
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.pauseHandlers.onPointerDown())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 3))
    expect(result.current.index).toBe(0)

    act(() => result.current.pauseHandlers.onPointerUp())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(1)
  })

  it('o gesto cancelado também retoma', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.pauseHandlers.onPointerDown())
    act(() => result.current.pauseHandlers.onPointerCancel())
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS))
    expect(result.current.index).toBe(1)
  })

  it('soltar o dedo NÃO retoma enquanto o ponteiro continua sobre o carrossel', () => {
    // As duas pausas são independentes de propósito: com um booleano só, o `pointerup` apagaria a
    // pausa do hover e o banner trocaria debaixo de quem está lendo.
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.pauseHandlers.onMouseEnter())
    act(() => result.current.pauseHandlers.onPointerDown())
    act(() => result.current.pauseHandlers.onPointerUp())

    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 2))
    expect(result.current.index).toBe(0)
  })
})

describe('movimento reduzido (BNR-33)', () => {
  it('não gira sozinho', () => {
    comMovimentoReduzido(true)
    const { result } = renderHook(() => useHeroCarousel(3))

    expect(result.current.reduced).toBe(true)
    act(() => void vi.advanceTimersByTime(HERO_CAROUSEL_INTERVAL_MS * 4))
    expect(result.current.index).toBe(0)
  })

  it('os controles continuam funcionando', () => {
    // A AC pede as duas metades: parar de girar **e** manter o controle. Só a primeira deixaria a
    // cliente presa no primeiro banner.
    comMovimentoReduzido(true)
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.next())
    expect(result.current.index).toBe(1)

    act(() => result.current.prev())
    expect(result.current.index).toBe(0)
  })

  it('a troca é imediata, sem deslize', () => {
    comMovimentoReduzido(true)
    const { scrollTo, elemento } = trilhoFalso(390)
    const { result } = renderHook(() => useHeroCarousel(3))
    act(() => {
      result.current.trackRef.current = elemento
    })

    act(() => result.current.goTo(2))
    expect(scrollTo).toHaveBeenCalledWith({ left: 780, behavior: 'auto' })
  })

  it('sem movimento reduzido, a troca DESLIZA', () => {
    const { scrollTo, elemento } = trilhoFalso(390)
    const { result } = renderHook(() => useHeroCarousel(3))
    act(() => {
      result.current.trackRef.current = elemento
    })

    act(() => result.current.goTo(1))
    expect(scrollTo).toHaveBeenCalledWith({ left: 390, behavior: 'smooth' })
  })
})

describe('os controles', () => {
  it('`goTo` leva ao slide pedido', () => {
    const { result } = renderHook(() => useHeroCarousel(4))

    act(() => result.current.goTo(2))
    expect(result.current.index).toBe(2)
  })

  it('`goTo` fora da lista satura em vez de sair dela', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.goTo(99))
    expect(result.current.index).toBe(2)

    act(() => result.current.goTo(-5))
    expect(result.current.index).toBe(0)
  })

  it('`prev` circula do primeiro para o último', () => {
    const { result } = renderHook(() => useHeroCarousel(3))

    act(() => result.current.prev())
    expect(result.current.index).toBe(2)
  })

  it('trilho sem `scrollTo` não derruba nada', () => {
    // É literalmente o caso de jsdom, e seria o caso de qualquer navegador antigo.
    const { result } = renderHook(() => useHeroCarousel(3))
    act(() => {
      result.current.trackRef.current = { clientWidth: 390 } as unknown as HTMLDivElement
    })

    expect(() => act(() => result.current.goTo(1))).not.toThrow()
    expect(result.current.index).toBe(1)
  })

  it('largura zero não vira `scrollTo` com destino inventado', () => {
    const { scrollTo, elemento } = trilhoFalso(0)
    const { result } = renderHook(() => useHeroCarousel(3))
    act(() => {
      result.current.trackRef.current = elemento
    })

    act(() => result.current.goTo(2))
    expect(scrollTo).not.toHaveBeenCalled()
    expect(result.current.index).toBe(2)
  })
})

describe('a lista muda de tamanho', () => {
  it('o índice não fica apontando para fora quando a lista encolhe', () => {
    // Alcançável de verdade: um slide cujo destino saiu do ar some da lista entre dois renders.
    const { result, rerender } = renderHook(({ total }) => useHeroCarousel(total), {
      initialProps: { total: 4 },
    })

    act(() => result.current.goTo(3))
    expect(result.current.index).toBe(3)

    rerender({ total: 2 })
    expect(result.current.index).toBe(1)
  })
})
