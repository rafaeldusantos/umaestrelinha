// PLS-06 — a aritmética do lote e o desfazer.
//
// Os preços dos casos vêm da spec (`Aumentar 10%` conferido contra cálculo manual de 3 linhas), e a
// conta está escrita no comentário de cada teste. Se um dia a implementação divergir, o número
// esperado continua conferível a olho, sem rodar nada.

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminListRow } from '@/entities/product/api/productQuery'

import { buildBulkPatch, roundToEnding90, snapshotFor, type BulkFields } from './buildBulkPatch'
import { UNDO_TTL_MS, useUndoBuffer } from './useUndoBuffer'

let seq = 0
const variant = (over: Record<string, unknown> = {}) => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 7.9,
  compare_price: null,
  stock: 5,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
}) as AdminListRow['variants'][number]

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Produto',
  slug: 'produto',
  price: 10,
  compare_price: null,
  images: [],
  tags: [],
  is_active: true,
  stock_total: 10,
  low_stock_threshold: 5,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: [],
  seo_title: null,
  seo_description: null,
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: null,
  ...over,
})

/** As três linhas conhecidas do teste independente da spec. */
const TRES = [
  row({ id: 'a', name: 'A', price: 14.9 }),
  row({ id: 'b', name: 'B', price: 18.4 }),
  row({ id: 'c', name: 'C', price: 5.9 }),
]

const fields = (over: BulkFields = {}): BulkFields => over

describe('buildBulkPatch — só o que está ligado muda (PLS-06 AC 3)', () => {
  it('campo desligado NÃO entra no patch', () => {
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'set', value: 9.9, endingIn90: false } }))

    expect(patches).toHaveLength(3)
    for (const patch of patches) {
      expect(Object.keys(patch.values)).toEqual(['base_price'])
    }
  })

  it('nenhum campo ligado não gera patch nenhum', () => {
    expect(buildBulkPatch(TRES, fields()).patches).toEqual([])
  })

  it('dois campos ligados entram juntos, e só eles', () => {
    const { patches } = buildBulkPatch(
      [row({ id: 'a' })],
      fields({ price: { mode: 'set', value: 9.9, endingIn90: false }, status: { mode: 'pause' } }),
    )

    expect(patches[0].values).toEqual({ base_price: 9.9, is_active: false })
  })
})

describe('buildBulkPatch — preço (PLS-06 AC 4)', () => {
  it('`Aumentar 10%` bate com o cálculo manual das três linhas', () => {
    // 14,90 × 1,1 = 16,39 · 18,40 × 1,1 = 20,24 · 5,90 × 1,1 = 6,49
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'increase', value: 10, endingIn90: false } }))

    expect(patches.map(p => p.values.base_price)).toEqual([16.39, 20.24, 6.49])
  })

  it('`Diminuir 20%` bate com o cálculo manual', () => {
    // 14,90 × 0,8 = 11,92 · 18,40 × 0,8 = 14,72 · 5,90 × 0,8 = 4,72
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'decrease', value: 20, endingIn90: false } }))

    expect(patches.map(p => p.values.base_price)).toEqual([11.92, 14.72, 4.72])
  })

  it('`Definir valor` ignora o preço anterior', () => {
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'set', value: 12.5, endingIn90: false } }))

    expect(patches.map(p => p.values.base_price)).toEqual([12.5, 12.5, 12.5])
  })

  it('`terminar em ,90` sobe para o próximo ,90 — nunca desfaz o aumento pedido', () => {
    // 16,39 → 16,90 (e não 15,90, que seria um aumento de 6,7% em vez dos 10% pedidos)
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'increase', value: 10, endingIn90: true } }))

    expect(patches.map(p => p.values.base_price)).toEqual([16.9, 20.9, 6.9])
  })

  it('preço que já termina em ,90 não se mexe', () => {
    expect(roundToEnding90(14.9)).toBe(14.9)
    expect(roundToEnding90(0.9)).toBe(0.9)
  })

  it('preço abaixo de 0,90 sobe para o piso', () => {
    expect(roundToEnding90(0.1)).toBe(0.9)
  })

  it('`Arredondar` sozinho só aplica o ,90, sem mexer no valor', () => {
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'round', value: 0, endingIn90: true } }))

    expect(patches.map(p => p.values.base_price)).toEqual([14.9, 18.9, 5.9])
  })

  it('preço nunca fica negativo', () => {
    const { patches } = buildBulkPatch(TRES, fields({ price: { mode: 'decrease', value: 500, endingIn90: false } }))

    expect(patches.every(p => (p.values.base_price as number) >= 0)).toBe(true)
  })
})

describe('buildBulkPatch — estoque e ignorados (PLS-06 AC 5)', () => {
  it('produto com `stock_policy: none` é ignorado e CONTADO no aviso', () => {
    const selection = [row({ id: 'a' }), row({ id: 'b', stock_policy: 'none' })]

    const result = buildBulkPatch(selection, fields({ stock: { mode: 'set', value: 5 } }))

    expect(result.patches).toHaveLength(1)
    expect(result.ignored).toEqual([
      { id: 'b', name: 'Produto', field: 'stock', reason: 'não controla estoque' },
    ])
    expect(result.preview.warnings).toContain('1 produto(s) ignorado(s) no campo Estoque')
  })

  it('produto com grade vendável também é ignorado — o saldo é por variação', () => {
    const comGrade = row({
      id: 'g',
      options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
      variants: [variant()],
    })

    const result = buildBulkPatch([comGrade], fields({ stock: { mode: 'set', value: 5 } }))

    expect(result.patches).toEqual([])
    expect(result.ignored[0].reason).toBe('estoque é por variação')
  })

  it('`Somar` e `Subtrair` partem do saldo atual', () => {
    const selection = [row({ id: 'a', stock_total: 10 })]

    expect(buildBulkPatch(selection, fields({ stock: { mode: 'add', value: 5 } })).patches[0].values)
      .toEqual({ stock_total: 15 })
    expect(buildBulkPatch(selection, fields({ stock: { mode: 'subtract', value: 4 } })).patches[0].values)
      .toEqual({ stock_total: 6 })
  })

  it('subtrair demais para em zero, não em negativo', () => {
    const { patches } = buildBulkPatch([row({ id: 'a', stock_total: 3 })], fields({ stock: { mode: 'subtract', value: 10 } }))

    expect(patches[0].values).toEqual({ stock_total: 0 })
  })
})

describe('buildBulkPatch — status, tags e prévia (PLS-06 AC 7-8)', () => {
  it('`Ativar` e `Pausar` mexem só no `is_active`', () => {
    expect(buildBulkPatch([row({ id: 'a' })], fields({ status: { mode: 'activate' } })).patches[0].values)
      .toEqual({ is_active: true })
    expect(buildBulkPatch([row({ id: 'a' })], fields({ status: { mode: 'pause' } })).patches[0].values)
      .toEqual({ is_active: false })
  })

  it('`Adicionar` tag não duplica o que já existe', () => {
    const selection = [row({ id: 'a', tags: ['anime'] })]

    const { patches } = buildBulkPatch(selection, fields({ tags: { mode: 'add', values: ['anime', 'kpop'] } }))

    expect(patches[0].values).toEqual({ tags: ['anime', 'kpop'] })
  })

  it('`Remover` tag tira só as pedidas', () => {
    const selection = [row({ id: 'a', tags: ['anime', 'kpop'] })]

    const { patches } = buildBulkPatch(selection, fields({ tags: { mode: 'remove', values: ['kpop'] } }))

    expect(patches[0].values).toEqual({ tags: ['anime'] })
  })

  it('a prévia mostra antes → depois e o ticket médio dos dois lados', () => {
    // média antes = (14,90 + 18,40 + 5,90) / 3 = 13,07 · depois com +10% = 14,37
    const { preview } = buildBulkPatch(TRES, fields({ price: { mode: 'increase', value: 10, endingIn90: false } }))

    expect(preview.rows).toEqual([
      { id: 'a', name: 'A', before: 14.9, after: 16.39 },
      { id: 'b', name: 'B', before: 18.4, after: 20.24 },
      { id: 'c', name: 'C', before: 5.9, after: 6.49 },
    ])
    expect(preview.avgBefore).toBe(13.07)
    expect(preview.avgAfter).toBe(14.37)
  })

  it('sem campo de preço ligado, não há ticket médio para mostrar', () => {
    const { preview } = buildBulkPatch(TRES, fields({ status: { mode: 'pause' } }))

    expect(preview.avgBefore).toBeNull()
    expect(preview.avgAfter).toBeNull()
  })

  it('substituir categorias avisa que remove as atuais', () => {
    const { preview } = buildBulkPatch(TRES, fields({ categories: { mode: 'replace', values: ['c1'] } }))

    expect(preview.warnings).toContain(
      'Substituir categorias remove as categorias atuais dos produtos selecionados',
    )
  })
})

describe('snapshotFor — o que o desfazer regrava (PLS-06 AC 9)', () => {
  it('guarda só as colunas que o patch toca', () => {
    const selection = [row({ id: 'a', price: 14.9, stock_total: 7, tags: ['anime'] })]
    const { patches } = buildBulkPatch(selection, fields({ price: { mode: 'increase', value: 10, endingIn90: false } }))

    expect(snapshotFor(selection, patches)).toEqual([{ id: 'a', values: { base_price: 14.9 } }])
  })

  it('o snapshot é o valor ANTERIOR, não o novo', () => {
    const selection = [row({ id: 'a', price: 14.9 })]
    const { patches } = buildBulkPatch(selection, fields({ price: { mode: 'set', value: 99, endingIn90: false } }))

    expect(patches[0].values.base_price).toBe(99)
    expect(snapshotFor(selection, patches)[0].values.base_price).toBe(14.9)
  })
})

describe('useUndoBuffer — prazo e memória (PLS-06 AC 10, A23)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('guarda o snapshot e o devolve no desfazer', () => {
    const { result } = renderHook(() => useUndoBuffer())

    act(() => result.current.capture({ snapshot: [{ id: 'p1', values: { base_price: 5 } }], label: '1 alterado' }))
    expect(result.current.pending?.label).toBe('1 alterado')

    let taken: unknown
    act(() => { taken = result.current.take() })

    expect(taken).toEqual([{ id: 'p1', values: { base_price: 5 } }])
    expect(result.current.pending).toBeNull()
  })

  it('depois de 30 s o desfazer some — a operação vira definitiva', () => {
    const { result } = renderHook(() => useUndoBuffer())

    act(() => result.current.capture({ snapshot: [{ id: 'p1', values: {} }], label: 'x' }))
    act(() => { vi.advanceTimersByTime(UNDO_TTL_MS - 1) })
    expect(result.current.pending).not.toBeNull()

    act(() => { vi.advanceTimersByTime(1) })

    expect(result.current.pending).toBeNull()
    expect(result.current.take()).toBeNull()
  })

  it('desfazer é de uma vez só — a segunda chamada não regrava nada', () => {
    const { result } = renderHook(() => useUndoBuffer())

    act(() => result.current.capture({ snapshot: [{ id: 'p1', values: {} }], label: 'x' }))
    act(() => { result.current.take() })

    expect(result.current.take()).toBeNull()
  })

  it('lote sem nenhuma linha alterada não oferece desfazer', () => {
    const { result } = renderHook(() => useUndoBuffer())

    act(() => result.current.capture({ snapshot: [], label: 'nada' }))

    expect(result.current.pending).toBeNull()
  })

  it('o buffer vive em memória: nada é escrito em storage (some no reload)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useUndoBuffer())

    act(() => result.current.capture({ snapshot: [{ id: 'p1', values: {} }], label: 'x' }))

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
})
