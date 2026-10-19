// Feature 67 (T08) — a fila como a tela a lê: recortes, título do motivo e as colunas de cada peça.

import { describe, expect, it } from 'vitest'
import type { AdminFilterGroup } from '@/entities/filter'
import type { ProdutoParaMarcar } from '@/entities/product'
import {
  RECORTE_DA_FILA_INICIAL,
  linhasDoMotivo,
  montarFila,
  recortarFila,
  tituloDoMotivo,
  totalPendente,
  valoresPorId,
} from '../fila'

const grupos: AdminFilterGroup[] = [
  {
    id: 'acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0, created_at: '',
    values: [
      { id: 'prata', group_id: 'acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0, marked_count: 0, suggest_terms: [] },
      { id: 'rose', group_id: 'acab', name: 'Folheado a ouro rosé', slug: 'rose', sort_order: 1, marked_count: 0, suggest_terms: [] },
    ],
  },
  {
    id: 'tipo', name: 'Tipo de joia', slug: 'tipo', is_active: false, sort_order: 1, created_at: '',
    values: [{ id: 'chav', group_id: 'tipo', name: 'Chaveiro', slug: 'chaveiro', sort_order: 0, marked_count: 0, suggest_terms: [] }],
  },
]

const peca = (id: string, extra: Partial<ProdutoParaMarcar> = {}): ProdutoParaMarcar => ({
  id, name: `Peça ${id}`, slug: id, is_active: true, base_price: 1, tags: [], category_ids: [], thumb: null,
  options: [], variants: [], filter_value_ids: [], option_marks: [], ...extra,
})

const v = (id: string, option_values: Record<string, string>, is_active = true) => ({ id, option_values, is_active, position: 0 })

const produtos = [
  peca('a', {
    variants: [v('a1', { Cor: 'Prata 925' }), v('a2', { Cor: 'Prata 925' }), v('a3', { Cor: 'Folheado a Ouro Rosé' }), v('a4', { Cor: 'Ouro' }, false)],
    filter_value_ids: ['prata'],
  }),
  peca('b', { variants: [v('b1', { Cor: 'Prata 925' }), v('b2', { 'Tipos de elo': 'Chaveiro' })] }),
  peca('c', { name: 'Chaveiro Coração', tags: ['Prata925'] }),
]

const fila = montarFila(grupos, produtos, [])
const valores = valoresPorId(grupos)

describe('montarFila — a regra é a de core', () => {
  it('um motivo por (fonte, eixo, evidência, valor, alvo), mais peças primeiro', () => {
    expect(fila.map(g => [g.reason, g.suggestions.length])).toEqual([
      ['Opção Cor = Prata 925', 2],
      ["Nome contém 'chaveiro'", 1],
      ['Opção Cor = Folheado a Ouro Rosé', 1],
      ['Opção Tipos de elo = Chaveiro', 1],
      ["Tag 'Prata925'", 1],
    ])
    expect(totalPendente(fila)).toBe(6)
  })

  it('sem grupo, sem fila', () => {
    expect(montarFila([], produtos, [])).toEqual([])
  })

  it('a recusa cala', () => {
    expect(
      totalPendente(montarFila(grupos, produtos, [{ product_id: 'c', value_id: 'prata', option_name: '', option_value: '' }])),
    ).toBe(5)
  })
})

describe('recortarFila — VFL-25', () => {
  const r = (p: Partial<typeof RECORTE_DA_FILA_INICIAL>) =>
    recortarFila(fila, { ...RECORTE_DA_FILA_INICIAL, ...p }, valores).map(g => g.reason)

  it('por grupo de filtro (o grupo do valor sugerido)', () => {
    expect(r({ grupo: 'tipo' })).toEqual(["Nome contém 'chaveiro'", 'Opção Tipos de elo = Chaveiro'])
  })

  it('por fonte', () => {
    expect(r({ fonte: 'option' })).toEqual([
      'Opção Cor = Prata 925',
      'Opção Cor = Folheado a Ouro Rosé',
      'Opção Tipos de elo = Chaveiro',
    ])
    expect(r({ fonte: 'name' })).toEqual(["Nome contém 'chaveiro'"])
    expect(r({ fonte: 'tag' })).toEqual(["Tag 'Prata925'"])
  })

  it('pela busca, com a dobra (sem acento, sem caixa), no motivo ou no valor', () => {
    expect(r({ termo: 'ROSE' })).toEqual(['Opção Cor = Folheado a Ouro Rosé'])
    expect(r({ termo: 'tipo de joia' })).toEqual([])
    expect(r({ termo: 'chaveiro' })).toEqual(["Nome contém 'chaveiro'", 'Opção Tipos de elo = Chaveiro'])
  })

  it('por valor (o atalho da marcação em massa)', () => {
    expect(r({ valor: 'prata' })).toEqual(['Opção Cor = Prata 925', "Tag 'Prata925'"])
  })
})

describe('o motivo aberto — VFL-18', () => {
  it('o título diz o eixo, o texto, o grupo e o valor', () => {
    expect(tituloDoMotivo(fila[0], valores.get('prata'))).toBe('Cor = “Prata 925” ⇒ Acabamento › Prata 925')
    expect(tituloDoMotivo(fila[4], valores.get('prata'))).toBe("Tag 'Prata925' ⇒ Acabamento › Prata 925")
  })

  it('cada peça: variações que casam de quantas ativas, os outros textos do eixo, e o "Hoje"', () => {
    const mapa = new Map(produtos.map(p => [p.id, p]))
    const linhas = linhasDoMotivo(fila[0], mapa)
    expect(linhas.map(l => [l.produto.id, l.casam, l.ativas, l.tambem, l.hoje])).toEqual([
      ['a', 2, 3, ['Folheado a Ouro Rosé'], 'troca'],
      ['b', 1, 2, [], 'sem'],
    ])
  })
})
