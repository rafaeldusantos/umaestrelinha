// Feature 47 — a preferência do trilho. Revista em 2026-10-28: o botão existe em toda tela.
//
// O que este arquivo trava é o que a ausência da chave significa (o padrão da rota) e que a escolha
// feita em qualquer tela é lembrada nos dois sentidos. Ler a chave do `navCollapse` faria um botão
// apagar o que o outro guarda.

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, isRailCollapsed, readChoice, useNavRail } from './navRail'
import { STORAGE_KEY as CHAVE_DOS_GRUPOS } from './navCollapse'

/** Um `Storage` de mentira, para não depender do `localStorage` do jsdom entre arquivos. */
const fakeStorage = (inicial: Record<string, string> = {}): Storage => {
  const dados = new Map(Object.entries(inicial))
  return {
    get length() {
      return dados.size
    },
    clear: () => dados.clear(),
    getItem: (key: string) => (dados.has(key) ? dados.get(key)! : null),
    key: (index: number) => [...dados.keys()][index] ?? null,
    removeItem: (key: string) => void dados.delete(key),
    setItem: (key: string, value: string) => void dados.set(key, value),
  }
}

/** Um `Storage` que lança em tudo — aba anônima com política de site, ou cota estourada. */
const storageQueLanca = (): Storage =>
  ({
    get length(): number {
      throw new Error('storage bloqueado')
    },
    clear: () => {
      throw new Error('storage bloqueado')
    },
    getItem: () => {
      throw new Error('storage bloqueado')
    },
    key: () => {
      throw new Error('storage bloqueado')
    },
    removeItem: () => {
      throw new Error('storage bloqueado')
    },
    setItem: () => {
      throw new Error('storage bloqueado')
    },
  }) as Storage

describe('readChoice — só os dois valores exatos contam', () => {
  it('chave ausente lê como `null` — siga o padrão da rota', () => {
    expect(readChoice(fakeStorage())).toBeNull()
  })

  it('os dois valores gravados são lidos', () => {
    expect(readChoice(fakeStorage({ [STORAGE_KEY]: 'expandido' }))).toBe('expandido')
    expect(readChoice(fakeStorage({ [STORAGE_KEY]: 'recolhido' }))).toBe('recolhido')
  })

  it('valor de lixo lê como ausente, em vez de virar um terceiro estado', () => {
    expect(readChoice(fakeStorage({ [STORAGE_KEY]: 'true' }))).toBeNull()
    expect(readChoice(fakeStorage({ [STORAGE_KEY]: 'Expandido' }))).toBeNull()
  })

  it('storage que LANÇA ao ler devolve `null`, sem subir exceção', () => {
    expect(readChoice(storageQueLanca())).toBeNull()
  })
})

describe('isRailCollapsed — a escolha vence o padrão da rota', () => {
  it('sem escolha: rota de foco recolhe, as demais não', () => {
    expect(isRailCollapsed(null, true)).toBe(true)
    expect(isRailCollapsed(null, false)).toBe(false)
  })

  it('com escolha, a rota não importa', () => {
    expect(isRailCollapsed('recolhido', false)).toBe(true)
    expect(isRailCollapsed('expandido', true)).toBe(false)
  })
})

describe('useNavRail — o botão em toda tela, e a escolha lembrada', () => {
  it('em rota de foco, sem chave, nasce RECOLHIDO', () => {
    const { result } = renderHook(() => useNavRail(true, fakeStorage()))
    expect(result.current.recolhido).toBe(true)
  })

  it('fora de rota de foco, sem chave, nasce EXPANDIDO', () => {
    const { result } = renderHook(() => useNavRail(false, fakeStorage()))
    expect(result.current.recolhido).toBe(false)
  })

  it('recolher fora de rota de foco GRAVA `recolhido` — apagar a chave devolveria a sidebar aberta', () => {
    const storage = fakeStorage()
    const { result } = renderHook(() => useNavRail(false, storage))

    act(() => result.current.alternar())

    expect(result.current.recolhido).toBe(true)
    expect(storage.getItem(STORAGE_KEY)).toBe('recolhido')
  })

  it('expandir numa rota de foco GRAVA `expandido`', () => {
    const storage = fakeStorage()
    const { result } = renderHook(() => useNavRail(true, storage))

    act(() => result.current.alternar())

    expect(result.current.recolhido).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBe('expandido')
  })

  it('alternar duas vezes volta ao estado de partida, e a chave guarda a última escolha', () => {
    const storage = fakeStorage()
    const { result } = renderHook(() => useNavRail(false, storage))

    act(() => result.current.alternar())
    act(() => result.current.alternar())

    expect(result.current.recolhido).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBe('expandido')
  })

  it('a escolha atravessa as rotas: recolhida em Produtos, continua recolhida em outra tela', () => {
    const storage = fakeStorage()
    const primeira = renderHook(() => useNavRail(false, storage))
    act(() => primeira.result.current.alternar())
    primeira.unmount()

    expect(renderHook(() => useNavRail(false, storage)).result.current.recolhido).toBe(true)
    expect(renderHook(() => useNavRail(true, storage)).result.current.recolhido).toBe(true)
  })

  it('a rota muda sem remontar: sem escolha, o estado acompanha o padrão da rota nova', () => {
    const storage = fakeStorage()
    const { result, rerender } = renderHook(({ foco }) => useNavRail(foco, storage), {
      initialProps: { foco: false },
    })
    expect(result.current.recolhido).toBe(false)
    rerender({ foco: true })
    expect(result.current.recolhido).toBe(true)
  })

  it('storage que LANÇA ao gravar não impede o estado em memória de alternar', () => {
    const { result } = renderHook(() => useNavRail(true, storageQueLanca()))

    expect(result.current.recolhido).toBe(true)
    expect(() => act(() => result.current.alternar())).not.toThrow()
    expect(result.current.recolhido).toBe(false)
  })
})

describe('FOCO-11 — duas preferências, dois donos', () => {
  it('as chaves são literais e DISTINTAS', () => {
    expect(STORAGE_KEY).toBe('estrelinha.admin.nav-rail')
    expect(CHAVE_DOS_GRUPOS).toBe('estrelinha.admin.nav-collapsed')
    expect(STORAGE_KEY).not.toBe(CHAVE_DOS_GRUPOS)
  })

  it('o trilho NÃO lê nem escreve a chave dos grupos colapsados', () => {
    const storage = fakeStorage({ [CHAVE_DOS_GRUPOS]: JSON.stringify(['Catálogo']) })
    const ler = vi.spyOn(storage, 'getItem')
    const gravar = vi.spyOn(storage, 'setItem')
    const remover = vi.spyOn(storage, 'removeItem')

    const { result } = renderHook(() => useNavRail(true, storage))
    act(() => result.current.alternar())
    act(() => result.current.alternar())

    const chavesTocadas = [...ler.mock.calls, ...gravar.mock.calls, ...remover.mock.calls].map(
      ([chave]) => chave,
    )
    expect(chavesTocadas.length).toBeGreaterThan(0)
    expect(chavesTocadas).not.toContain(CHAVE_DOS_GRUPOS)
    // E o que estava guardado lá continua intacto.
    expect(storage.getItem(CHAVE_DOS_GRUPOS)).toBe(JSON.stringify(['Catálogo']))
  })
})
