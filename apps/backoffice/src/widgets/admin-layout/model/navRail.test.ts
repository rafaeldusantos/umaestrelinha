// Feature 47 — a preferência do trilho.
//
// O que este arquivo trava é a **direção do default** e o que a ausência da chave significa. As duas
// erram sem quebrar nada: guardar `'recolhido'` em vez de `'expandido'` faria o dia em que o padrão
// mudasse não alcançar quem nunca mexeu, e ler a chave do `navCollapse` faria um botão apagar o que
// o outro guarda.

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY, readExpanded, useNavRail } from './navRail'
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

describe('readExpanded — FOCO-06: só o valor exato conta', () => {
  it('chave ausente lê como NÃO expandido — a ausência é o padrão', () => {
    expect(readExpanded(fakeStorage())).toBe(false)
  })

  it('o valor `expandido` liga', () => {
    expect(readExpanded(fakeStorage({ [STORAGE_KEY]: 'expandido' }))).toBe(true)
  })

  it('valor de lixo lê como ausente, em vez de virar um terceiro estado', () => {
    expect(readExpanded(fakeStorage({ [STORAGE_KEY]: 'true' }))).toBe(false)
    expect(readExpanded(fakeStorage({ [STORAGE_KEY]: '{}' }))).toBe(false)
    expect(readExpanded(fakeStorage({ [STORAGE_KEY]: '' }))).toBe(false)
    expect(readExpanded(fakeStorage({ [STORAGE_KEY]: 'EXPANDIDO' }))).toBe(false)
  })

  it('storage que LANÇA ao ler devolve o padrão, sem subir exceção', () => {
    expect(() => readExpanded(storageQueLanca())).not.toThrow()
    expect(readExpanded(storageQueLanca())).toBe(false)
  })
})

describe('useNavRail — FOCO-05: o padrão da rota, e o override gravado', () => {
  it('em rota de foco, sem chave, nasce RECOLHIDO', () => {
    const { result } = renderHook(() => useNavRail(true, fakeStorage()))
    expect(result.current.recolhido).toBe(true)
  })

  it('FOCO-07: fora de rota de foco nunca recolhe, mesmo com a preferência gravada', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'expandido' })
    expect(renderHook(() => useNavRail(false, storage)).result.current.recolhido).toBe(false)
    expect(renderHook(() => useNavRail(false, fakeStorage())).result.current.recolhido).toBe(false)
  })

  it('com `expandido` gravado, a rota de foco abre expandida', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'expandido' })
    expect(renderHook(() => useNavRail(true, storage)).result.current.recolhido).toBe(false)
  })

  it('expandir GRAVA `expandido`', () => {
    const storage = fakeStorage()
    const { result } = renderHook(() => useNavRail(true, storage))

    act(() => result.current.alternar())

    expect(result.current.recolhido).toBe(false)
    expect(storage.getItem(STORAGE_KEY)).toBe('expandido')
  })

  it('FOCO-05: recolher de volta REMOVE a chave — não grava `recolhido`', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'expandido' })
    const remover = vi.spyOn(storage, 'removeItem')
    const { result } = renderHook(() => useNavRail(true, storage))

    act(() => result.current.alternar())

    expect(result.current.recolhido).toBe(true)
    expect(remover).toHaveBeenCalledWith(STORAGE_KEY)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('a preferência sobrevive à remontagem — é de pessoa, não de visita', () => {
    const storage = fakeStorage()
    const primeira = renderHook(() => useNavRail(true, storage))
    act(() => primeira.result.current.alternar())
    primeira.unmount()

    expect(renderHook(() => useNavRail(true, storage)).result.current.recolhido).toBe(false)
  })

  it('FOCO-06: storage que LANÇA ao gravar não impede o estado em memória de alternar', () => {
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
