import { describe, expect, it } from 'vitest'
import { buildChecklist, canPublish, computeMargin, pendingCount } from './checklist'
import { emptyProductForm, type ProductFormState } from './useProductForm'
import type { ProductVariant } from '@nanapin/supabase/types'

// PFM-14 (P1.7 AC 12-13): 6 itens com atalho; pendência bloqueia *Salvar e publicar* e libera
// *Salvar rascunho*. PFM-12 (AC 4-5): margem só com `price > 0` — o defeito 11 renderizava
// `-Infinity` na tela.

const READY: Partial<ProductFormState> = {
  name: 'Botton Sailor Moon',
  category_ids: ['cat-anime'],
  images: [{ url: 'sailor.webp', alt: null, source: 'upload' }],
  weight_kg: 0.018,
  seo_title: 'Botton Sailor Moon',
  seo_description: 'O botton da Lua Prateada',
}

const form = (over: Partial<ProductFormState> = {}): ProductFormState => ({
  ...emptyProductForm(),
  ...READY,
  ...over,
})

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const TAMANHO = { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }
const item = (f: ProductFormState, id: string) => buildChecklist(f).find(i => i.id === id)!

describe('buildChecklist — os 6 itens de P1.7 AC 12', () => {
  it('avalia exatamente 6 itens, na ordem da spec', () => {
    expect(buildChecklist(form()).map(i => i.id)).toEqual([
      'name',
      'category',
      'image',
      'weight',
      'grid',
      'seo',
    ])
  })

  it('produto completo passa em todos e libera publicar', () => {
    const items = buildChecklist(form())
    expect(items.every(i => i.ok)).toBe(true)
    expect(canPublish(items)).toBe(true)
    expect(pendingCount(items)).toBe(0)
  })

  it('nome vazio reprova o item nome', () => {
    expect(item(form({ name: '  ' }), 'name').ok).toBe(false)
  })

  it('sem categoria reprova; category_id do Select único (pré-T31) conta como categoria', () => {
    expect(item(form({ category_ids: [], category_id: '' }), 'category').ok).toBe(false)
    expect(item(form({ category_ids: [], category_id: 'cat-anime' }), 'category').ok).toBe(true)
  })

  it('sem imagem reprova o item imagem', () => {
    expect(item(form({ images: [] }), 'image').ok).toBe(false)
  })

  it('peso zerado reprova — sem ele o frete sai pelo fallback', () => {
    expect(item(form({ weight_kg: 0 }), 'weight').ok).toBe(false)
  })

  it('SEO exige título E descrição', () => {
    expect(item(form({ seo_title: '' }), 'seo').ok).toBe(false)
    expect(item(form({ seo_description: '' }), 'seo').ok).toBe(false)
  })

  it('cada item pendente traz atalho (focusField) e aba', () => {
    const pendentes = buildChecklist(
      form({ name: '', category_ids: [], category_id: '', images: [], weight_kg: 0, seo_title: '' }),
    ).filter(i => !i.ok)
    expect(pendentes).toHaveLength(5)
    pendentes.forEach(i => {
      expect(i.focusField).toBeTruthy()
      expect(i.tab).toBeTruthy()
      expect(i.hint).toBeTruthy()
    })
  })

  it('item aprovado não tem hint', () => {
    expect(item(form(), 'name').hint).toBeNull()
  })
})

describe('buildChecklist — item da grade', () => {
  it('produto sem eixo passa no item grade — é produto simples, não tem grade', () => {
    expect(item(form({ options: [], variants: [] }), 'grid').ok).toBe(true)
  })

  it('variação ativa sem preço reprova, e o hint diz quantas', () => {
    const it0 = item(
      form({ options: [TAMANHO], variants: [variant({ price: null }), variant({ price: null })] }),
      'grid',
    )
    expect(it0.ok).toBe(false)
    expect(it0.hint).toContain('2')
  })

  it('grade com TODAS as variações pausadas reprova (edge case da spec)', () => {
    // Sem esta metade o item passaria: uma grade toda pausada não tem nenhuma linha "ativa sem
    // preço" para reclamar, e o produto iria à loja sem nada vendável.
    const it0 = item(
      form({ options: [TAMANHO], variants: [variant({ is_active: false }), variant({ is_active: false })] }),
      'grid',
    )
    expect(it0.ok).toBe(false)
    expect(it0.hint).toContain('Nenhuma variação ativa')
  })

  it('grade com uma linha vendável e nenhuma pendente passa', () => {
    expect(
      item(form({ options: [TAMANHO], variants: [variant({ price: 7.9, is_active: true })] }), 'grid').ok,
    ).toBe(true)
  })

  it('eixo cadastrado mas nenhuma linha ainda reprova — grade declarada e vazia', () => {
    expect(item(form({ options: [TAMANHO], variants: [] }), 'grid').ok).toBe(false)
  })
})

describe('canPublish / pendingCount — P1.7 AC 13', () => {
  it('um item pendente bloqueia publicar', () => {
    expect(canPublish(buildChecklist(form({ images: [] })))).toBe(false)
  })

  it('pendingCount conta os itens reprovados', () => {
    expect(pendingCount(buildChecklist(form({ images: [], weight_kg: 0 })))).toBe(2)
  })
})

describe('computeMargin — PFM-12', () => {
  it('price 20 e cost 8 dão 60% e lucro de 12', () => {
    expect(computeMargin(20, 8)).toEqual({ percent: 60, profit: 12 })
  })

  it('a apresentação com uma casa decimal bate com a spec', () => {
    expect(computeMargin(20, 8)!.percent.toFixed(1)).toBe('60.0')
  })

  it('price 0 com cost > 0 devolve null — é o -Infinity do defeito 11', () => {
    expect(computeMargin(0, 8)).toBeNull()
  })

  it('price negativo devolve null', () => {
    expect(computeMargin(-5, 8)).toBeNull()
  })

  it('cost 0 devolve null — sem custo não há margem para mostrar', () => {
    expect(computeMargin(20, 0)).toBeNull()
  })

  it('valores não finitos devolvem null, nunca NaN na tela', () => {
    expect(computeMargin(Number.NaN, 8)).toBeNull()
    expect(computeMargin(20, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('custo maior que o preço dá margem negativa — é informação real, não erro', () => {
    expect(computeMargin(10, 15)).toEqual({ percent: -50, profit: -5 })
  })
})
