import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// PFM-01 (parcial): o estado sai da página para que a validação de PFM-11 tenha onde morar. O que
// se prova aqui é a CARGA do modelo novo (`options`, `product_variants`, `product_categories`) e o
// `isDirty` que não confunde carga com edição.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@nanapin/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  emptyProductForm,
  productRowToForm,
  useProductForm,
  PRODUCT_FORM_SELECT,
} from './useProductForm'

const dbRow = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  description: '<p>Lua prateada</p>',
  category_id: 'cat-anime',
  tags: ['anime', 'sailor moon'],
  base_price: 5.9,
  original_price: 7.9,
  cost_price: 2.1,
  stock_total: 30,
  low_stock_threshold: 4,
  options: [
    { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 },
    { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
  ],
  stock_policy: 'backorder',
  production_lead_days: 3,
  images: [{ url: 'sailor.webp', alt: 'Lua prateada', source: 'upload' }],
  is_active: true,
  is_featured: true,
  is_new: false,
  video_url: 'https://youtube.com/watch?v=x',
  weight_kg: 0.018,
  width_cm: 12,
  height_cm: 3,
  length_cm: 17,
  seo_title: 'Botton Sailor Moon',
  seo_description: 'O botton da Lua',
  scheduled_at: '2026-09-01T10:00:00+00:00',
  related_product_ids: ['p2'],
  buy_together_ids: ['p3'],
  product_variants: [
    {
      id: 'v-45-fosco',
      product_id: 'p1',
      option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
      price: 7.9,
      stock: 12,
      sku: 'SLR-45-FOS',
      is_active: true,
      position: 1,
    },
    {
      id: 'v-35-fosco',
      product_id: 'p1',
      option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' },
      price: 5.9,
      stock: 8,
      is_active: false,
      position: 0,
    },
  ],
  product_categories: [
    { category_id: 'cat-kpop', position: 1 },
    { category_id: 'cat-anime', position: 0 },
  ],
  // A coluna JSONB legada segue no banco até VAR-13. Se o hook a lesse, a grade viria sem preço.
  variants: [{ size: '4,5cm', finish: 'Fosco', stock: 99 }],
  ...over,
})

/** Encena `from('products').select(...).eq('id', …).maybeSingle()`. */
const respondWith = (row: unknown, error: unknown = null) => {
  const selectSpy = vi.fn()
  fromMock.mockReturnValue({
    select: (columns: string) => {
      selectSpy(columns)
      return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error }) }) }
    },
  })
  return selectSpy
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('productRowToForm — carga do modelo novo', () => {
  it('carrega options na ordem de position', () => {
    const form = productRowToForm(dbRow())
    expect(form.options.map(o => o.name)).toEqual(['Tamanho', 'Acabamento'])
    expect(form.options[0].values).toEqual(['3,5 cm', '4,5 cm'])
  })

  it('carrega variants da TABELA product_variants, não do JSONB legado', () => {
    const form = productRowToForm(dbRow())
    expect(form.variants).toHaveLength(2)
    expect(form.variants.map(v => v.id).sort()).toEqual(['v-35-fosco', 'v-45-fosco'])
    // Prova de que o JSONB não foi lido: ele tem `stock: 99`, que não existe na tabela.
    expect(form.variants.some(v => v.stock === 99)).toBe(false)
  })

  it('preserva preço e is_active de cada linha da grade — inclusive a pausada', () => {
    const form = productRowToForm(dbRow())
    const pausada = form.variants.find(v => v.id === 'v-35-fosco')!
    expect(pausada.is_active).toBe(false)
    expect(pausada.price).toBe(5.9)
  })

  it('carrega category_ids de product_categories, na ordem de position', () => {
    expect(productRowToForm(dbRow()).category_ids).toEqual(['cat-anime', 'cat-kpop'])
  })

  it('carrega stock_policy e production_lead_days', () => {
    const form = productRowToForm(dbRow())
    expect(form.stock_policy).toBe('backorder')
    expect(form.production_lead_days).toBe(3)
  })

  it('images passa por normalizeImages — jsonb com alt preservado', () => {
    expect(productRowToForm(dbRow()).images).toEqual([
      { url: 'sailor.webp', alt: 'Lua prateada', source: 'upload' },
    ])
  })

  it('images em string[] (legado) ainda carrega — a ordem de deploy não importa', () => {
    expect(productRowToForm(dbRow({ images: ['legado.webp'] })).images).toEqual([
      { url: 'legado.webp', alt: null, source: 'upload' },
    ])
  })

  it('produto sem grade abre com options e variants vazios, nunca undefined', () => {
    const form = productRowToForm(dbRow({ options: null, product_variants: null }))
    expect(form.options).toEqual([])
    expect(form.variants).toEqual([])
  })

  it('mantém os campos que a página já editava: preço, dimensões, SEO e agendamento', () => {
    const form = productRowToForm(dbRow())
    expect(form.price).toBe(5.9)
    expect(form.compare_price).toBe(7.9)
    expect(form.cost_price).toBe(2.1)
    expect(form.weight_kg).toBe(0.018)
    expect([form.width_cm, form.height_cm, form.length_cm]).toEqual([12, 3, 17])
    expect(form.seo_title).toBe('Botton Sailor Moon')
    // `datetime-local` só aceita `YYYY-MM-DDTHH:mm` — era o corte que a página fazia.
    expect(form.scheduled_at).toBe('2026-09-01T10:00')
  })


  it('tags carregam como TOKENS, não como texto por vírgula (T31)', () => {
    // A coluna `products.tags` sempre foi `text[]`; era a UI que a achatava em string, e foi assim
    // que `Naruto`, `naruto` e `naruto ` viraram três tags no catálogo.
    expect(productRowToForm(dbRow()).tags).toEqual(['anime', 'sailor moon'])
  })

  it('tag não-string vinda do banco é descartada em vez de virar chip inválido', () => {
    expect(productRowToForm(dbRow({ tags: ['anime', 42, null] })).tags).toEqual(['anime'])
  })

  it('duplicar acrescenta "(cópia)" ao nome e ZERA o slug — dois slugs iguais violam o UNIQUE', () => {
    const form = productRowToForm(dbRow(), { asCopy: true })
    expect(form.name).toBe('Botton Sailor Moon (cópia)')
    expect(form.slug).toBe('')
  })
})

describe('useProductForm — carga e isDirty', () => {
  it('produto novo nasce com os defaults e não consulta o banco', async () => {
    const { result } = renderHook(() => useProductForm())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.form).toEqual(emptyProductForm())
    expect(result.current.isEdit).toBe(false)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('produto existente é carregado pelo select que traz a grade e os vínculos', async () => {
    const selectSpy = respondWith(dbRow())

    const { result } = renderHook(() => useProductForm('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(selectSpy).toHaveBeenCalledWith(PRODUCT_FORM_SELECT)
    expect(PRODUCT_FORM_SELECT).toContain('product_variants(*)')
    expect(PRODUCT_FORM_SELECT).toContain('product_categories(category_id, position)')
    expect(result.current.form.name).toBe('Botton Sailor Moon')
    expect(result.current.form.variants).toHaveLength(2)
    expect(result.current.form.category_ids).toEqual(['cat-anime', 'cat-kpop'])
    expect(result.current.isEdit).toBe(true)
  })

  it('a CARGA não suja o formulário — abrir e sair sem tocar em nada não é alteração', async () => {
    respondWith(dbRow())

    const { result } = renderHook(() => useProductForm('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isDirty).toBe(false)
  })

  it('isDirty vira true na primeira edição real', async () => {
    respondWith(dbRow())
    const { result } = renderHook(() => useProductForm('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setField('name', 'Outro nome'))

    expect(result.current.isDirty).toBe(true)
    expect(result.current.form.name).toBe('Outro nome')
  })

  it('setFields altera vários campos numa transição só e mantém o resto', async () => {
    const { result } = renderHook(() => useProductForm())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setFields({ name: 'Botton novo', slug: 'botton-novo' }))

    expect(result.current.form.name).toBe('Botton novo')
    expect(result.current.form.slug).toBe('botton-novo')
    expect(result.current.form.weight_kg).toBe(0.1)
  })

  it('markSaved zera o isDirty sem tocar no conteúdo', async () => {
    const { result } = renderHook(() => useProductForm())
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setField('name', 'Botton novo'))

    act(() => result.current.markSaved())

    expect(result.current.isDirty).toBe(false)
    expect(result.current.form.name).toBe('Botton novo')
  })

  it('falha na leitura deixa os defaults e sai do loading — o admin não fica preso na tela', async () => {
    respondWith(null, { message: 'permission denied' })

    const { result } = renderHook(() => useProductForm('p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.form.name).toBe('')
  })

  it('duplicar carrega da origem sem virar edição — isEdit false e productId null', async () => {
    respondWith(dbRow())

    const { result } = renderHook(() => useProductForm(undefined, 'p1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.form.name).toBe('Botton Sailor Moon (cópia)')
    expect(result.current.isEdit).toBe(false)
    expect(result.current.productId).toBeNull()
  })
})
