// Feature 66 — o recorte puro da marcação em massa (T09, T12).

import { describe, expect, it } from 'vitest'
import type { ProdutoParaMarcar } from '@/entities/product'
import { RECORTE_INICIAL, dividirSelecao, produtosLabel, recortar, tagsComContagem } from '../recorte'

const p = (id: string, name: string, extra: Partial<ProdutoParaMarcar> = {}): ProdutoParaMarcar => ({
  id, name, slug: id, is_active: true, base_price: null, tags: [], category_ids: [], ...extra,
})

const POOL = Array.from({ length: 30 }, (_, i) => p(`p${i}`, `Anel ${String(i).padStart(2, '0')}`))

describe('recortar', () => {
  it('SEM teto: com 30 que casam, devolve as 30 (a busca de seletor corta em 20)', () => {
    expect(recortar(POOL, { ...RECORTE_INICIAL, termo: 'anel' }, new Set())).toHaveLength(30)
  })

  it('tag e categoria combinam por E', () => {
    const pool = [
      p('a', 'A', { tags: ['x'], category_ids: ['c1'] }),
      p('b', 'B', { tags: ['x'], category_ids: ['c2'] }),
      p('c', 'C', { tags: ['y'], category_ids: ['c1'] }),
    ]
    expect(recortar(pool, { ...RECORTE_INICIAL, tag: 'x', categoria: 'c1' }, new Set()).map(x => x.id)).toEqual(['a'])
  })
})

describe('tagsComContagem', () => {
  it('conta cada peça uma vez por tag, mesmo com a tag repetida nela', () => {
    expect(tagsComContagem([p('a', 'A', { tags: ['x', 'x'] }), p('b', 'B', { tags: ['x', 'y'] })])).toEqual([
      { tag: 'x', total: 2 },
      { tag: 'y', total: 1 },
    ])
  })
})

describe('dividirSelecao', () => {
  it('marcar leva tudo; remover só o que está marcado', () => {
    expect(dividirSelecao(new Set(['a', 'b']), new Set(['b', 'z']))).toEqual({ marcar: ['a', 'b'], remover: ['b'] })
  })
})

describe('produtosLabel', () => {
  it('singular e plural', () => {
    expect(produtosLabel(1)).toBe('1 produto')
    expect(produtosLabel(0)).toBe('0 produtos')
    expect(produtosLabel(18)).toBe('18 produtos')
  })
})
