import { describe, expect, it } from 'vitest'
import { RESERVED_FILTER_KEYS } from '../rules.ts'
import type { FilterCatalog } from '../types.ts'
import {
  DEFAULT_FILTER_SORT,
  FILTER_SORT_OPTIONS,
  FILTER_SYSTEM_PARAMS,
  defaultFilterState,
  parseFilterParams,
  writeFilterParams,
  type FilterState,
} from '../url.ts'

// FLT-29..34 — o estado da listagem ⇄ a URL.

const CATALOGO: FilterCatalog = {
  groups: [
    { id: 'G-tipo', name: 'Tipo', slug: 'tipo', is_active: true, sort_order: 2 },
    { id: 'G-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 1 },
    { id: 'G-off', name: 'Desligado', slug: 'desligado', is_active: false, sort_order: 0 },
  ],
  values: [
    { id: 'prata', group_id: 'G-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 1 },
    { id: 'ouro', group_id: 'G-acab', name: 'Ouro', slug: 'ouro', sort_order: 0 },
    { id: 'anel', group_id: 'G-tipo', name: 'Anel', slug: 'anel', sort_order: 0 },
    { id: 'tipo-ouro', group_id: 'G-tipo', name: 'Ouro', slug: 'ouro-tipo', sort_order: 1 },
    { id: 'x', group_id: 'G-off', name: 'X', slug: 'x', sort_order: 0 },
  ],
}
const BOUNDS: [number, number] = [5, 120]

const ler = (qs: string) => parseFilterParams(new URLSearchParams(qs), CATALOGO, BOUNDS)
const escrever = (state: FilterState, qs = '') =>
  writeFilterParams(new URLSearchParams(qs), state, CATALOGO, BOUNDS)

const CHEIO: FilterState = {
  priceRange: [10, 80],
  inStockOnly: true,
  onSaleOnly: true,
  newOnly: true,
  selection: { acabamento: ['ouro', 'prata-925'], tipo: ['anel'] },
  sort: 'menor-preco',
}

describe('o vocabulário', () => {
  it('as chaves de sistema são reservadas — nenhum grupo pode ter o slug delas', () => {
    for (const k of Object.values(FILTER_SYSTEM_PARAMS)) expect(RESERVED_FILTER_KEYS).toContain(k)
  })

  it('as ordens são as da loja, e o padrão é relevância', () => {
    expect([...FILTER_SORT_OPTIONS]).toEqual(['relevancia', 'menor-preco', 'maior-preco', 'novidades'])
    expect(DEFAULT_FILTER_SORT).toBe('relevancia')
  })
})

describe('FLT-29 — escrever', () => {
  it('o estado cheio vira a URL da spec, na ordem: grupos (do painel), preço, estoque, desconto, novidades, ordem', () => {
    expect(decodeURIComponent(escrever(CHEIO).toString())).toBe(
      'acabamento=ouro,prata-925&tipo=anel&preco=10-80&estoque=1&desconto=1&novidades=1&ordem=menor-preco',
    )
  })

  it('valores saem na ordem do painel, não na de clique', () => {
    const s = escrever({ ...defaultFilterState(BOUNDS), selection: { acabamento: ['prata-925', 'ouro'] } })
    expect(s.get('acabamento')).toBe('ouro,prata-925')
  })

  it('a escrita não altera os params de entrada', () => {
    const entrada = new URLSearchParams('q=anel')
    writeFilterParams(entrada, CHEIO, CATALOGO, BOUNDS)
    expect(entrada.toString()).toBe('q=anel')
  })
})

describe('FLT-30 — ler', () => {
  it('ida e volta: o estado cheio sobrevive', () => {
    expect(parseFilterParams(escrever(CHEIO), CATALOGO, BOUNDS)).toEqual(CHEIO)
  })

  it('a vírgula codificada (%2C) também é lida', () => {
    expect(ler('acabamento=ouro%2Cprata-925').selection).toEqual({ acabamento: ['ouro', 'prata-925'] })
  })

  it('a URL vazia dá o estado padrão', () => {
    expect(ler('')).toEqual(defaultFilterState(BOUNDS))
  })
})

describe('FLT-31 — o que não se reconhece é ignorado', () => {
  it('grupo desconhecido, valor inexistente e grupo inativo', () => {
    expect(ler('cor=azul&acabamento=nao-existe,ouro&desligado=x').selection).toEqual({ acabamento: ['ouro'] })
  })

  it('valor de OUTRO grupo não entra', () => {
    expect(ler('tipo=ouro').selection).toEqual({})
  })

  it('grupo cujos valores são todos inválidos não aparece na seleção', () => {
    expect(ler('acabamento=,,%20').selection).toEqual({})
  })

  it('ordem desconhecida cai no padrão', () => {
    expect(ler('ordem=aleatoria').sort).toBe('relevancia')
    expect(ler('ordem=maior-preco').sort).toBe('maior-preco')
  })

  it('interruptor só com 1', () => {
    expect(ler('estoque=true&desconto=0&novidades=sim')).toMatchObject({
      inStockOnly: false,
      onSaleOnly: false,
      newOnly: false,
    })
    expect(ler('estoque=1').inStockOnly).toBe(true)
  })

  it('preço recortado à faixa', () => {
    expect(ler('preco=0-500').priceRange).toEqual([5, 120])
    expect(ler('preco=10-500').priceRange).toEqual([10, 120])
    expect(ler('preco=1-50').priceRange).toEqual([5, 50])
  })

  it('preço invertido é desvirado', () => {
    expect(ler('preco=80-10').priceRange).toEqual([10, 80])
  })

  it('preço malformado ou fora da faixa inteira: ignorado', () => {
    for (const raw of ['abc', '10', '10-', '-10-20', '200-300', '1-2', '10-80-90']) {
      expect(ler(`preco=${raw}`).priceRange).toEqual([5, 120])
    }
  })

  it('preço com decimal', () => {
    expect(ler('preco=10.5-79.9').priceRange).toEqual([10.5, 79.9])
  })
})

describe('FLT-32 — estado padrão ⇒ nenhum parâmetro de filtro', () => {
  it('URL vazia', () => {
    expect(escrever(defaultFilterState(BOUNDS)).toString()).toBe('')
  })

  it('voltar ao padrão APAGA o que estava na URL', () => {
    const suja = escrever(CHEIO).toString()
    expect(escrever(defaultFilterState(BOUNDS), suja).toString()).toBe('')
  })

  it('preço igual (ou mais largo que) a faixa não vira parâmetro', () => {
    expect(escrever({ ...defaultFilterState(BOUNDS), priceRange: [0, 999] }).has('preco')).toBe(false)
  })

  // Verificação independente (2026-10-18): `CHEIO` move as DUAS pontas, e por isso trocar o `&&` de
  // "faixa intocada" por `||` sobrevivia — mexer só no máximo nunca escrevia `preco`, e com o estado
  // morando na URL o filtro de preço deixava de valer. Os dois casos abaixo são o par de um lado só.
  it('mexer só no máximo vira parâmetro', () => {
    expect(escrever({ ...defaultFilterState(BOUNDS), priceRange: [5, 80] }).get('preco')).toBe('5-80')
  })

  it('mexer só no mínimo vira parâmetro', () => {
    expect(escrever({ ...defaultFilterState(BOUNDS), priceRange: [10, 120] }).get('preco')).toBe('10-120')
  })

  it('a seleção vazia de um grupo não deixa a chave para trás', () => {
    const s = escrever({ ...defaultFilterState(BOUNDS), selection: { acabamento: [] } }, 'acabamento=ouro')
    expect(s.has('acabamento')).toBe(false)
  })
})

describe('FLT-34 — o que não é filtro é preservado', () => {
  it('q, pagina, utm_*, gclid, fbclid e chave desconhecida ficam', () => {
    const s = escrever(CHEIO, 'q=anel&utm_source=ig&utm_campaign=maes&gclid=abc&fbclid=def&pagina=2&xyz=1')
    for (const [k, v] of [
      ['q', 'anel'],
      ['utm_source', 'ig'],
      ['utm_campaign', 'maes'],
      ['gclid', 'abc'],
      ['fbclid', 'def'],
      ['pagina', '2'],
      ['xyz', '1'],
    ]) {
      expect(s.get(k)).toBe(v)
    }
    expect(s.get('acabamento')).toBe('ouro,prata-925')
  })

  it('e voltar ao padrão também os preserva', () => {
    const s = escrever(defaultFilterState(BOUNDS), 'q=anel&acabamento=ouro&utm_source=ig&ordem=menor-preco')
    expect(s.toString()).toBe('q=anel&utm_source=ig')
  })

  it('a chave de um grupo INATIVO que estava na URL é limpa pela escrita (é chave de filtro do catálogo)', () => {
    expect(escrever(defaultFilterState(BOUNDS), 'desligado=x').has('desligado')).toBe(false)
  })
})
