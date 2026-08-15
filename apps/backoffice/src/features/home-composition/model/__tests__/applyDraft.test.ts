// Feature 25 — o rascunho por cima do que está salvo (`PRV-09`).
//
// Esta é a tradução entre duas formas: `DraftItem` (a lista arrastável da tela, com `key` de
// interface) e `HomeSectionItem` (o que a loja lê). Falhar aqui não quebra nada visível no painel —
// a prévia é que mostraria a seção errada, ou a ordem errada, e a dona leria isso como "a loja está
// diferente do que eu configurei".

import { describe, expect, it } from 'vitest'
import type { HomeSection } from '@estrelinha/core/home'
import { applyDraft } from '../sectionDraft'
import type { DraftItem } from '../sectionDraft'

const secao = (id: string, over: Partial<HomeSection> = {}): HomeSection => ({
  id,
  type: 'banner_grid',
  position: 0,
  active: true,
  config: { title: `titulo de ${id}` },
  items: [],
  ...over,
})

const item = (over: Partial<DraftItem> & { key: string }): DraftItem => ({
  category_id: null,
  product_id: null,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: null,
  ...over,
})

const SECOES = [secao('a'), secao('b'), secao('c')]

describe('applyDraft — sem rascunho, a lista passa intacta', () => {
  it('sem seção aberta devolve as mesmas seções', () => {
    expect(applyDraft(SECOES, null, { config: { title: 'x' }, items: [] })).toEqual(SECOES)
  })

  it('sem rascunho devolve as mesmas seções', () => {
    expect(applyDraft(SECOES, 'b', null)).toEqual(SECOES)
  })

  it('devolve uma CÓPIA — a lista do hook não pode ser mutada pela prévia', () => {
    const saida = applyDraft(SECOES, null, null)
    expect(saida).not.toBe(SECOES)
    expect(saida).toEqual(SECOES)
  })
})

describe('applyDraft — só a seção aberta é sobrescrita', () => {
  it('as outras seções ficam idênticas, na mesma ordem', () => {
    const saida = applyDraft(SECOES, 'b', { config: { title: 'novo' }, items: [] })

    expect(saida.map(s => s.id)).toEqual(['a', 'b', 'c'])
    expect(saida[0]).toBe(SECOES[0])
    expect(saida[2]).toBe(SECOES[2])
  })

  it('o `config` do rascunho substitui o salvo', () => {
    const saida = applyDraft(SECOES, 'b', { config: { title: 'novo' }, items: [] })
    expect(saida[1].config).toEqual({ title: 'novo' })
  })

  it('`config` vazio APAGA o que estava salvo — a prévia mostra o que a dona deixou, não o antigo', () => {
    const saida = applyDraft(SECOES, 'b', { config: {}, items: [] })
    expect(saida[1].config).toEqual({})
  })
})

describe('applyDraft — a curadoria vira item da loja', () => {
  it('a `position` sai do ÍNDICE: quem manda é a ordem da lista arrastável', () => {
    const saida = applyDraft(SECOES, 'a', {
      config: {},
      items: [item({ key: 'k2', category_id: 'cat-2' }), item({ key: 'k1', category_id: 'cat-1' })],
    })

    expect(saida[0].items?.map(i => [i.category_id, i.position])).toEqual([
      ['cat-2', 0],
      ['cat-1', 1],
    ])
  })

  it('o `id` do item é a `key` de rascunho — a loja só o usa como chave de React', () => {
    const saida = applyDraft(SECOES, 'a', {
      config: {},
      items: [item({ key: 'rascunho-7' })],
    })
    expect(saida[0].items?.[0].id).toBe('rascunho-7')
  })

  it('`section_id` aponta a seção certa', () => {
    const saida = applyDraft(SECOES, 'c', { config: {}, items: [item({ key: 'k' })] })
    expect(saida[2].items?.[0].section_id).toBe('c')
  })

  it('lista vazia é lista vazia — e é o que faz a prévia voltar à derivação automática', () => {
    const comItens = [secao('a', { items: [{ id: 'x' } as never] }), secao('b')]
    const saida = applyDraft(comItens, 'a', { config: {}, items: [] })
    expect(saida[0].items).toEqual([])
  })

  it('carrega os campos de destino e de arte', () => {
    const saida = applyDraft(SECOES, 'a', {
      config: {},
      items: [
        item({
          key: 'k',
          category_id: 'cat',
          product_id: null,
          href: '/promo',
          image_url: 'arte.webp',
          alt: 'Arte da campanha',
          label_snapshot: 'Leite materno',
        }),
      ],
    })

    expect(saida[0].items?.[0]).toMatchObject({
      category_id: 'cat',
      product_id: null,
      href: '/promo',
      image_url: 'arte.webp',
      alt: 'Arte da campanha',
      label_snapshot: 'Leite materno',
    })
  })
})
