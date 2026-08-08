// PLS-04 — o que cada coluna mostra e o que dá para editar na linha.

import { describe, expect, it } from 'vitest'
import { formatPrice } from '@nanapin/core/formatters'
import type { AdminListRow } from '@/entities/product/api/productQuery'

import {
  hasIncompleteGrid,
  hasSellableGrid,
  PRICE_LOCKED_REASON,
  priceCell,
  rowBadges,
  statusCell,
  stockCell,
} from './rowSummary'
import { buildChips } from './filterChips'
import { defaultPrefs, isVisible, toggleColumn } from './columns'
import { readSavedViews, upsertView } from './savedViews'
import { emptyFilters } from '@/entities/product/api/productQuery'

let seq = 0
const variant = (over: Partial<AdminListRow['variants'][number]> = {}) => ({
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
})

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  price: 4.9,
  compare_price: null,
  images: [{ url: 'a.webp', alt: null, source: 'upload' }],
  tags: [],
  is_active: true,
  stock_total: 12,
  low_stock_threshold: 5,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: [],
  seo_title: 'SEO',
  seo_description: 'SEO',
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
  ...over,
})

const GRADE = {
  options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 0 }],
  variants: [variant({ price: 14.9 }), variant({ price: 18.4 }), variant({ price: 16.9 })],
}

describe('priceCell — faixa e trava (PLS-04 AC 9)', () => {
  it('produto sem grade mostra o preço único e é editável', () => {
    expect(priceCell(row({ price: 5.9 }))).toEqual({ kind: 'single', price: 5.9, editable: true })
  })

  it('produto com grade mostra a faixa, a contagem, e NÃO é editável', () => {
    const cell = priceCell(row(GRADE))

    expect(cell).toEqual({
      kind: 'range',
      min: 14.9,
      max: 18.4,
      count: 3,
      editable: false,
      reason: PRICE_LOCKED_REASON,
    })
  })

  it('a trava vem com explicação — desabilitar calado lê como bug', () => {
    const cell = priceCell(row(GRADE))

    expect(cell.kind === 'range' && cell.reason).toContain('grade de variações')
  })

  it('variação pausada não entra na faixa', () => {
    const cell = priceCell(
      row({ options: GRADE.options, variants: [variant({ price: 3.9, is_active: false }), variant({ price: 14.9 })] }),
    )

    expect(cell.kind === 'range' && cell.min).toBe(14.9)
  })

  it('grade sem eixo declarado NÃO trava o preço — é produto simples (PST-10)', () => {
    const cell = priceCell(row({ options: [], variants: [variant({ price: 9.9 })] }))

    expect(cell).toEqual({ kind: 'single', price: 4.9, editable: true })
  })
})

describe('stockCell — política e grade (PLS-04 AC 10)', () => {
  it('`none` mostra `sempre disponível` e não é editável', () => {
    expect(stockCell(row({ stock_policy: 'none' }))).toEqual({
      kind: 'always',
      editable: false,
      label: 'sempre disponível',
    })
  })

  it('produto com grade soma o saldo das linhas ativas e não é editável na célula', () => {
    const cell = stockCell(
      row({ options: GRADE.options, variants: [variant({ stock: 4 }), variant({ stock: 6 }), variant({ stock: 99, is_active: false })] }),
    )

    expect(cell).toMatchObject({ kind: 'grid', total: 10, editable: false })
  })

  it('produto simples mostra o saldo e é editável', () => {
    expect(stockCell(row({ stock_total: 12 }))).toEqual({
      kind: 'number', total: 12, editable: true, low: false,
    })
  })

  it('saldo abaixo do limiar acende o aviso de estoque baixo', () => {
    expect(stockCell(row({ stock_total: 3, low_stock_threshold: 5 }))).toMatchObject({ low: true })
  })
})

describe('statusCell — PLS-04 AC 12', () => {
  const agora = new Date('2026-08-01T12:00:00Z')

  it('produto ativo com saldo é `Ativo`', () => {
    expect(statusCell(row(), agora).kind).toBe('ativo')
  })

  it('produto inativo é `Rascunho`', () => {
    expect(statusCell(row({ is_active: false }), agora)).toEqual({ kind: 'rascunho', label: 'Rascunho' })
  })

  it('produto que controla estoque e zerou é `Esgotado`', () => {
    expect(statusCell(row({ stock_total: 0 }), agora).kind).toBe('esgotado')
  })

  it('`none` com saldo zero NÃO é esgotado — ele nunca esgota', () => {
    expect(statusCell(row({ stock_total: 0, stock_policy: 'none' }), agora).kind).toBe('ativo')
  })

  it('agendamento no futuro vence `Ativo` e mostra a data', () => {
    const status = statusCell(row({ scheduled_at: '2026-09-05T10:00:00Z' }), agora)

    expect(status.kind).toBe('agendado')
    expect(status.label).toContain('05/09')
  })

  it('agendamento no passado não segura o status', () => {
    expect(statusCell(row({ scheduled_at: '2026-07-01T10:00:00Z' }), agora).kind).toBe('ativo')
  })
})

describe('rowBadges — pendências na coluna Produto (PLS-04 AC 11)', () => {
  it('produto sem imagem acende `sem imagem`', () => {
    expect(rowBadges(row({ images: [] }))).toContain('sem imagem')
  })

  it('variação ativa com `options` vazio acende `grade incompleta` (PST-10)', () => {
    expect(rowBadges(row({ options: [], variants: [variant()] }))).toContain('grade incompleta')
    expect(hasIncompleteGrid(row(GRADE))).toBe(false)
  })

  it('SEO em branco acende `sem SEO`', () => {
    expect(rowBadges(row({ seo_title: '  ' }))).toContain('sem SEO')
    expect(rowBadges(row({ seo_description: null }))).toContain('sem SEO')
  })

  it('produto completo não acende badge nenhum', () => {
    expect(rowBadges(row(GRADE))).toEqual([])
    expect(hasSellableGrid(row(GRADE))).toBe(true)
  })
})

describe('buildChips — filtros ativos viram chip (PLS-02 AC 5)', () => {
  it('categoria vira chip com o nome, não com o id', () => {
    const chips = buildChips({ ...emptyFilters(), categoryIds: ['cat-anime'] }, { 'cat-anime': 'Anime' })

    expect(chips.map(c => c.label)).toEqual(['Categoria: Anime'])
  })

  it('o `×` do chip remove só aquele filtro', () => {
    const filters = { ...emptyFilters(), categoryIds: ['c1', 'c2'], tags: ['anime'] }
    const chips = buildChips(filters, { c1: 'Um', c2: 'Dois' })

    expect(chips.find(c => c.key === 'cat-c1')!.clear(filters)).toEqual({
      ...filters,
      categoryIds: ['c2'],
    })
  })

  it('faixa de preço vira um chip só, formatado em pt-BR', () => {
    const chips = buildChips({ ...emptyFilters(), priceMin: 5, priceMax: 20 }, {})

    // Montado com `formatPrice` de propósito: o `Intl` emite NBSP depois do `R$`, e fixar o
    // caractere invisível no literal é a armadilha que já mordeu na feature 07.
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe(`Preço: ${formatPrice(5)} a ${formatPrice(20)}`)
  })

  it('sem filtro, sem chip', () => {
    expect(buildChips(emptyFilters(), {})).toEqual([])
  })
})

describe('colunas e visões salvas (PLS-09 AC 13, PLS-02 AC 4)', () => {
  it('esconder e mostrar coluna alterna a preferência', () => {
    const prefs = toggleColumn(defaultPrefs(), 'estoque')

    expect(isVisible(prefs, 'estoque')).toBe(false)
    expect(isVisible(toggleColumn(prefs, 'estoque'), 'estoque')).toBe(true)
  })

  it('a coluna Produto não se esconde — sem ela a linha não identifica nada', () => {
    expect(toggleColumn(defaultPrefs(), 'produto')).toEqual(defaultPrefs())
  })

  it('visão com nome repetido substitui a anterior, não duplica', () => {
    const primeira = { id: 'promo', name: 'Promo', filters: emptyFilters() }
    const segunda = { id: 'promo', name: 'promo', filters: { ...emptyFilters(), view: 'ativos' as const } }

    const next = upsertView([primeira], segunda)

    expect(next).toHaveLength(1)
    expect(next[0].filters.view).toBe('ativos')
  })

  it('`localStorage` corrompido devolve lista vazia, não derruba a tela', () => {
    const storage = { getItem: () => '{isso não é json', setItem: () => {} } as unknown as Storage

    expect(readSavedViews(storage)).toEqual([])
  })
})
