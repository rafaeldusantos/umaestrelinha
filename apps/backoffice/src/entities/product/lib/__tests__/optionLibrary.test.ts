import { describe, expect, it } from 'vitest'
import type { ProductOption } from '@estrelinha/supabase/types'
import {
  buildOptionLibrary,
  findLibraryEntry,
  OPTION_SET_LIMIT,
  remainingValues,
  suggestOptionNames,
  suggestOptionValues,
  suggestValueSets,
  type OptionLibraryEntry,
} from '../optionLibrary'

// Feature 81, T03 — a biblioteca de opções derivada do catálogo (OPV-18..20, A2, A3).
//
// As fixtures foram escolhidas para que a ordem ALFABÉTICA e a ordem PEDIDA discordem (L-038): uma
// implementação que só ordenasse em ordem alfabética passaria com valores que já estivessem em
// ordem alfabética.

const p = (...options: [string, string[]][]): { options: ProductOption[] } => ({
  options: options.map(([name, values], position) => ({ name, values, position })),
})

describe('buildOptionLibrary — os nomes (A2, A3)', () => {
  it('agrupa grafias pela dobra, conta PRODUTOS e exibe a grafia mais usada', () => {
    const lib = buildOptionLibrary([
      p(['tamanho', ['P']]),
      p(['Tamanho', ['M']]),
      p(['Tamanho ', ['G']]),
      p(['TAMANHO', ['P']]),
    ])
    expect(lib).toHaveLength(1)
    expect(lib[0].name).toBe('Tamanho')
    expect(lib[0].count).toBe(4)
  })

  it('o mais usado vem primeiro; no empate, ordem alfabética pt-BR (Ácido antes de Banho)', () => {
    const lib = buildOptionLibrary([
      p(['Banho', ['Ouro']], ['Ácido', ['Sim']]),
      p(['Cor', ['Rosa']]),
      p(['Cor', ['Azul']]),
      p(['Banho', ['Prata']]),
      p(['Ácido', ['Não']]),
      p(['Cor', ['Verde']]),
    ])
    // Cor: 3 · Banho: 2 · Ácido: 2. Por código de caractere, "Á" viria DEPOIS de "B".
    expect(lib.map(e => [e.name, e.count])).toEqual([
      ['Cor', 3],
      ['Ácido', 2],
      ['Banho', 2],
    ])
  })

  it('a contagem é por PRODUTO: o mesmo nome duas vezes numa peça conta uma', () => {
    const lib = buildOptionLibrary([p(['Cor', ['Rosa']], [' cor', ['Azul']]), p(['Cor', ['Verde']])])
    expect(lib[0].count).toBe(2)
  })

  it('nome vazio ou só espaço não entra', () => {
    expect(buildOptionLibrary([p(['  ', ['A']], ['', ['B']])])).toEqual([])
  })

  it('opções nulas ou produto sem opções não quebram', () => {
    expect(buildOptionLibrary([{ options: null }, { options: [] }])).toEqual([])
  })
})

describe('buildOptionLibrary — os valores (A2)', () => {
  it('começam pela sequência do produto mais representativo, NÃO pela ordem alfabética', () => {
    const lib = buildOptionLibrary([
      p(['Tamanho', ['5,5 cm']]),
      p(['Tamanho', ['5,5 cm', '3,5 cm', '4,5 cm']]), // 1º com mais valores: é a sequência
      p(['Tamanho', ['4,5 cm', '3,5 cm', '5,5 cm']]), // mesmo tamanho, mas veio depois
    ])
    expect(lib[0].values).toEqual(['5,5 cm', '3,5 cm', '4,5 cm'])
  })

  it('os valores fora da sequência vêm depois, por uso, e no empate pela ordem em que apareceram', () => {
    const lib = buildOptionLibrary([
      p(['Cor', ['Rosa', 'Azul', 'Verde']]),
      p(['Cor', ['Lilás']]),
      p(['Cor', ['Amarelo']]),
      p(['Cor', ['Amarelo']]),
      p(['Cor', ['Branco']]),
    ])
    // Amarelo (2) antes de Lilás e Branco (1 cada); Lilás antes de Branco por ter aparecido antes.
    // Em ordem alfabética seria Amarelo, Branco, Lilás.
    expect(lib[0].values).toEqual(['Rosa', 'Azul', 'Verde', 'Amarelo', 'Lilás', 'Branco'])
  })

  it('valores repetidos pela dobra e vazios são descartados', () => {
    const lib = buildOptionLibrary([p(['Cor', ['Rosa', ' rosa ', '', '  ', 'Azul']]), p(['cor', ['AZUL']])])
    expect(lib[0].values).toEqual(['Rosa', 'Azul'])
  })
})

describe('findLibraryEntry', () => {
  const lib: OptionLibraryEntry[] = [
    { name: 'Tamanho', count: 3, values: ['P'], sets: [] },
    { name: 'Coração', count: 1, values: ['Sim'], sets: [] },
  ]

  it('acha pela dobra (caixa, acento e espaço nas pontas)', () => {
    expect(findLibraryEntry(lib, ' TAMANHO ')).toBe(lib[0])
    expect(findLibraryEntry(lib, 'coracao')).toBe(lib[1])
  })

  it('nome desconhecido ou vazio ⇒ null', () => {
    expect(findLibraryEntry(lib, 'Estampa')).toBeNull()
    expect(findLibraryEntry(lib, '   ')).toBeNull()
  })
})

describe('suggestOptionNames — OPV-18', () => {
  const lib = buildOptionLibrary([
    p(['Tamanho', ['P']]),
    p(['Tamanho', ['M']]),
    p(['Tampa', ['Sim']]),
    p(['Cor', ['Rosa']]),
  ])

  it('"tam" traz os nomes que casam pela dobra, na ordem da biblioteca', () => {
    expect(suggestOptionNames(lib, 'TAM').map(e => e.name)).toEqual(['Tamanho', 'Tampa'])
  })

  it('campo vazio traz os mais usados, até o limite', () => {
    expect(suggestOptionNames(lib, '').map(e => e.name)).toEqual(['Tamanho', 'Cor', 'Tampa'])
    expect(suggestOptionNames(lib, '', 2)).toHaveLength(2)
  })

  it('o limite padrão é 8', () => {
    const muitos = buildOptionLibrary(Array.from({ length: 12 }, (_, i) => p([`Opção ${i}`, ['x']])))
    expect(suggestOptionNames(muitos, 'opcao')).toHaveLength(8)
  })
})

describe('suggestOptionValues — OPV-20', () => {
  const entry: OptionLibraryEntry = {
    name: 'Tamanho',
    count: 5,
    values: ['3,5 cm', '4,5 cm', '5,5 cm', 'Único'],
    sets: [],
  }

  it('traz os valores que casam e que a opção ainda NÃO tem (comparação pela dobra)', () => {
    expect(suggestOptionValues(entry, 'cm', ['4,5 CM'])).toEqual(['3,5 cm', '5,5 cm'])
  })

  it('casa sem acento', () => {
    expect(suggestOptionValues(entry, 'unico', [])).toEqual(['Único'])
  })

  it('nome desconhecido não sugere nada', () => {
    expect(suggestOptionValues(null, 'cm', [])).toEqual([])
  })
})

// BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro — decidido em 2026-10-26 pela recomendação do
// QA: em vez da UNIÃO dos valores do catálogo, os CONJUNTOS que cada produto usa, agrupados pela dobra
// e ordenados pelo número de produtos. A fixture faz a ordem por contagem e a ordem alfabética
// discordarem: em ordem alfabética seria "16, 17, 18", "45cm, 50cm", "6mm, 8mm".
describe('buildOptionLibrary — os conjuntos de valores (OPV-19, A1)', () => {
  const catalogo = [
    p(['Tamanho', ['16', '17', '18']]),
    p(['Tamanho', ['45cm', '50cm']]),
    p(['Tamanho', ['6mm', '8mm']]),
    p(['Tamanho', ['8MM', '6mm']]), // o mesmo conjunto: pela dobra e sem importar a ordem
    p(['tamanho', [' 6mm ', '8mm']]),
    p(['Tamanho', ['45cm', '50cm']]),
    p(['Tamanho', ['Aro 9']]),
    p(['Tamanho', ['Aro 9']]),
    p(['Tamanho', ['Aro 9']]),
    p(['Tamanho', ['Aro 9']]),
    p(['Cor', ['Rosa']]),
  ]

  it('agrupa o conjunto de cada produto pela dobra e ordena por produtos, NÃO em ordem alfabética', () => {
    const tamanho = buildOptionLibrary(catalogo).find(e => e.name === 'Tamanho')!
    expect(tamanho.sets).toEqual([
      { values: ['Aro 9'], count: 4 },
      { values: ['6mm', '8mm'], count: 3 },
      { values: ['45cm', '50cm'], count: 2 },
      { values: ['16', '17', '18'], count: 1 },
    ])
  })

  // Verifier r2, G7 (N18): na fixture acima o último produto do conjunto, depois do `trim`, tem a mesma
  // grafia e ordem do primeiro — a asserção valia nos dois mundos. Aqui o seguinte discorda nas duas.
  it('o conjunto fica na grafia e na ordem do PRIMEIRO produto que o usou (A2)', () => {
    const lib = buildOptionLibrary([p(['Tamanho', ['6mm', '8mm']]), p(['Tamanho', ['8MM', '6MM']])])
    expect(lib[0].sets).toEqual([{ values: ['6mm', '8mm'], count: 2 }])
  })

  it('no empate de produtos, vale o conjunto que apareceu primeiro', () => {
    const lib = buildOptionLibrary([p(['Cor', ['Verde', 'Azul']]), p(['Cor', ['Amarelo']])])
    expect(lib[0].sets).toEqual([
      { values: ['Verde', 'Azul'], count: 1 },
      { values: ['Amarelo'], count: 1 },
    ])
  })

  it('opção sem valores não vira conjunto', () => {
    const lib = buildOptionLibrary([p(['Cor', []]), p(['Cor', ['Rosa']])])
    expect(lib[0].sets).toEqual([{ values: ['Rosa'], count: 1 }])
  })

  it('suggestValueSets: até 3, e cada um traz o que ainda falta na opção', () => {
    const tamanho = findLibraryEntry(buildOptionLibrary(catalogo), 'Tamanho')
    expect(OPTION_SET_LIMIT).toBe(3)
    expect(suggestValueSets(tamanho, [])).toEqual([
      { values: ['Aro 9'], count: 4, missing: ['Aro 9'] },
      { values: ['6mm', '8mm'], count: 3, missing: ['6mm', '8mm'] },
      { values: ['45cm', '50cm'], count: 2, missing: ['45cm', '50cm'] },
    ])
  })

  it('suggestValueSets: o conjunto já inteiro na opção (pela dobra) sai e dá lugar ao seguinte', () => {
    const tamanho = findLibraryEntry(buildOptionLibrary(catalogo), 'Tamanho')
    expect(suggestValueSets(tamanho, ['aro 9', '6MM'])).toEqual([
      { values: ['6mm', '8mm'], count: 3, missing: ['8mm'] },
      { values: ['45cm', '50cm'], count: 2, missing: ['45cm', '50cm'] },
      { values: ['16', '17', '18'], count: 1, missing: ['16', '17', '18'] },
    ])
  })

  it('suggestValueSets: nome desconhecido não sugere nada', () => {
    expect(suggestValueSets(null, [])).toEqual([])
  })
})

// BUG-20261026-sugestao-de-valores-some-no-primeiro-clique — decidido em 2026-10-26 pela recomendação
// do QA: os chips ficam enquanto houver sugestão não usada.
describe('remainingValues — os chips que ainda não foram usados', () => {
  const entry: OptionLibraryEntry = {
    name: 'Tamanho',
    count: 3,
    values: ['16', '17', '18', 'Aro 9'],
    sets: [],
  }

  it('tira os já presentes, pela dobra, e mantém a ordem do catálogo', () => {
    expect(remainingValues(entry, [' aro 9', '17'])).toEqual(['16', '18'])
  })

  it('com todos usados, não sobra nenhum', () => {
    expect(remainingValues(entry, ['16', '17', '18', 'ARO 9'])).toEqual([])
  })

  it('nome desconhecido não sugere nada', () => {
    expect(remainingValues(null, [])).toEqual([])
  })
})
