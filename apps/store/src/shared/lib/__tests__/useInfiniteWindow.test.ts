import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PRODUCTS_PER_PAGE, useInfiniteWindow } from '../useInfiniteWindow'

/**
 * A janela da rolagem infinita da `CategoryPage`.
 *
 * O que se mede aqui é a **aritmética** — quantos itens estão abertos, quando ainda há mais, e
 * quando a contagem volta ao começo. O disparo por `IntersectionObserver` não é mensurável em jsdom
 * (o dublê de `test/setup.ts` é inerte, e mesmo o de verdade dependeria de layout, que jsdom mede
 * como 0). É por isso que o caminho manual — `loadMore`, o botão "Carregar mais joias" — não é
 * enfeite de acessibilidade: é a única superfície que este teste consegue exercitar, e a mesma que o
 * teclado usa.
 */
describe('useInfiniteWindow — a primeira leva', () => {
  it('abre uma página, não a lista inteira', () => {
    const { result } = renderHook(() => useInfiniteWindow(500, 'lista'))

    expect(result.current.visibleCount).toBe(PRODUCTS_PER_PAGE)
    expect(result.current.hasMore).toBe(true)
  })

  it('lista menor que a página abre inteira e não pede mais', () => {
    const { result } = renderHook(() => useInfiniteWindow(7, 'lista'))

    expect(result.current.visibleCount).toBe(7)
    expect(result.current.hasMore).toBe(false)
  })

  it('lista exatamente do tamanho da página não pede mais', () => {
    const { result } = renderHook(() => useInfiniteWindow(PRODUCTS_PER_PAGE, 'lista'))

    expect(result.current.visibleCount).toBe(PRODUCTS_PER_PAGE)
    expect(result.current.hasMore).toBe(false)
  })

  it('lista vazia não pede mais — senão a sentinela ficaria pendurada sob a tela de vazio', () => {
    const { result } = renderHook(() => useInfiniteWindow(0, 'lista'))

    expect(result.current.visibleCount).toBe(0)
    expect(result.current.hasMore).toBe(false)
  })
})

describe('useInfiniteWindow — avanço', () => {
  it('`loadMore` abre mais uma página', () => {
    const { result } = renderHook(() => useInfiniteWindow(500, 'lista', 10))

    act(() => result.current.loadMore())

    expect(result.current.visibleCount).toBe(20)
    expect(result.current.hasMore).toBe(true)
  })

  it('a contagem PARA no total — nunca renderiza vaga que não existe', () => {
    const { result } = renderHook(() => useInfiniteWindow(25, 'lista', 10))

    act(() => result.current.loadMore())
    act(() => result.current.loadMore())
    act(() => result.current.loadMore())

    expect(result.current.visibleCount).toBe(25)
    expect(result.current.hasMore).toBe(false)
  })
})

describe('useInfiniteWindow — reancoragem pela chave da lista', () => {
  it('lista NOVA volta a janela ao começo', () => {
    const { result, rerender } = renderHook(
      ({ total, key }: { total: number; key: string }) => useInfiniteWindow(total, key, 10),
      { initialProps: { total: 100, key: 'coleção A' } },
    )

    act(() => result.current.loadMore())
    act(() => result.current.loadMore())
    expect(result.current.visibleCount).toBe(30)

    rerender({ total: 100, key: 'coleção B' })

    expect(result.current.visibleCount).toBe(10)
  })

  it('MESMA lista preserva a janela — rerender não pode desfazer a rolagem da cliente', () => {
    const { result, rerender } = renderHook(
      ({ total, key }: { total: number; key: string }) => useInfiniteWindow(total, key, 10),
      { initialProps: { total: 100, key: 'coleção A' } },
    )

    act(() => result.current.loadMore())
    rerender({ total: 100, key: 'coleção A' })

    expect(result.current.visibleCount).toBe(20)
  })

  /**
   * **Sensor da cicatriz da assinatura.**
   *
   * A primeira versão do hook recebia o array de produtos e comparava por identidade. Um consumidor
   * que devolvesse um array novo a cada render — `useProducts: () => ({ data: [] })`, que é o dublê
   * de `routing.test.tsx` — fazia a reancoragem disparar em todo render e a página morria em "Too
   * many re-renders", derrubando a rota inteira.
   *
   * Com chave de valor, re-renderizar com uma string **igual porém recém-construída** não reancora.
   * Se alguém trocar a comparação de volta para identidade, este teste reprova.
   */
  it('chave IGUAL porém recém-construída não reancora — identidade não pode ser a régua', () => {
    const chave = () => ['joias-afetivas', 'relevancia', '{}'].join('|')
    const { result, rerender } = renderHook(
      ({ total, key }: { total: number; key: string }) => useInfiniteWindow(total, key, 10),
      { initialProps: { total: 100, key: chave() } },
    )

    act(() => result.current.loadMore())
    rerender({ total: 100, key: chave() })
    rerender({ total: 100, key: chave() })

    expect(result.current.visibleCount).toBe(20)
  })

  /**
   * O caso que a reancoragem existe para cobrir: filtrar 100 → 5 com a janela em 30. Sem o clamp de
   * `visibleCount` a página pediria `slice(0, 30)` de uma lista de 5 e `hasMore` mentiria.
   */
  it('lista nova MENOR que a janela anterior não deixa contagem pendurada', () => {
    const { result, rerender } = renderHook(
      ({ total, key }: { total: number; key: string }) => useInfiniteWindow(total, key, 10),
      { initialProps: { total: 100, key: 'sem filtro' } },
    )

    act(() => result.current.loadMore())
    act(() => result.current.loadMore())

    rerender({ total: 5, key: 'filtrada' })

    expect(result.current.visibleCount).toBe(5)
    expect(result.current.hasMore).toBe(false)
  })
})
