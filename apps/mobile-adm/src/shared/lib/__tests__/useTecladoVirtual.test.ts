// Feature `75` · T19 — o teclado virtual (design §3.9; `MAA-32`, R1, Q4).
//
// No Chrome Android ≥ 108 o teclado SOBREPÕE o conteúdo `fixed`, e no iOS Safari ele nunca redimensiona
// o layout viewport: a folha do rastreio sobe pelo deslocamento que `visualViewport` mede. Aqui o
// `visualViewport` é DUBLADO (jsdom não o tem); a prova de verdade é o navegador (`prova-navegador.md`).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useTecladoVirtual } from '../useTecladoVirtual'

type Ouvinte = () => void
const criarViewport = (height: number, offsetTop = 0) => {
  const ouvintes = { resize: new Set<Ouvinte>(), scroll: new Set<Ouvinte>() }
  const registro = { adicionados: [] as [string, Ouvinte][], removidos: [] as [string, Ouvinte][] }
  const vv = {
    height,
    offsetTop,
    addEventListener: (tipo: 'resize' | 'scroll', f: Ouvinte) => {
      registro.adicionados.push([tipo, f])
      ouvintes[tipo].add(f)
    },
    removeEventListener: (tipo: 'resize' | 'scroll', f: Ouvinte) => {
      registro.removidos.push([tipo, f])
      ouvintes[tipo].delete(f)
    },
    disparar: (tipo: 'resize' | 'scroll') => ouvintes[tipo].forEach((f) => f()),
    ouvintes,
    registro,
  }
  return vv
}

const original = Object.getOwnPropertyDescriptor(window, 'visualViewport')
const definirViewport = (vv: unknown) => Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true })

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true, writable: true })
})
afterEach(() => {
  if (original) Object.defineProperty(window, 'visualViewport', original)
  else delete (window as { visualViewport?: unknown }).visualViewport
})

describe('useTecladoVirtual', () => {
  it('sem `visualViewport` ⇒ 0', () => {
    definirViewport(undefined)
    expect(renderHook(() => useTecladoVirtual()).result.current).toBe(0)
  })

  it('com o `visualViewport` reduzido pelo teclado ⇒ `innerHeight − (height + offsetTop)`', () => {
    definirViewport(criarViewport(508, 0))
    expect(renderHook(() => useTecladoVirtual()).result.current).toBe(336)
  })

  it('o `offsetTop` (a página rolada sob o teclado) entra na conta', () => {
    definirViewport(criarViewport(508, 40))
    expect(renderHook(() => useTecladoVirtual()).result.current).toBe(296)
  })

  it('piso 0: o viewport visual MAIOR que o layout (zoom, barra que some) nunca dá negativo', () => {
    definirViewport(criarViewport(900, 0))
    expect(renderHook(() => useTecladoVirtual()).result.current).toBe(0)
  })

  it('reage a `resize` E a `scroll` do `visualViewport`', () => {
    const vv = criarViewport(844, 0)
    definirViewport(vv)
    const { result } = renderHook(() => useTecladoVirtual())
    expect(result.current).toBe(0)
    act(() => {
      vv.height = 508
      vv.disparar('resize')
    })
    expect(result.current).toBe(336)
    act(() => {
      vv.offsetTop = 100
      vv.disparar('scroll')
    })
    expect(result.current).toBe(236)
    act(() => {
      vv.height = 844
      vv.offsetTop = 0
      vv.disparar('resize')
    })
    expect(result.current).toBe(0)
  })

  it('no desmonte, os ouvintes saem pelo MESMO handler que entrou (identidade, lição da `47`)', () => {
    const vv = criarViewport(844, 0)
    definirViewport(vv)
    const { unmount } = renderHook(() => useTecladoVirtual())
    expect(vv.registro.adicionados.map(([t]) => t).sort()).toEqual(['resize', 'scroll'])
    unmount()
    for (const [tipo, f] of vv.registro.adicionados) {
      expect(vv.registro.removidos).toContainEqual([tipo, f])
    }
    expect(vv.ouvintes.resize.size).toBe(0)
    expect(vv.ouvintes.scroll.size).toBe(0)
  })
})

describe('o viewport do app não muda (Q4)', () => {
  it('o `index.html` mantém o viewport de antes, sem `interactive-widget`', () => {
    const html = readFileSync(resolve(__dirname, '../../../../index.html'), 'utf8')
    const metas = html.match(/<meta name="viewport"[^>]*>/g) ?? []
    expect(metas).toEqual(['<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />'])
    expect(html).not.toMatch(/interactive-widget/)
  })
})
