import { describe, expect, it } from 'vitest'
import { foldTokens, groupSuggestions, suggestMarks, suggestionReason, termMatches } from '../suggest.ts'
import type { SuggestableProduct, Suggestion, SuggestionDismissal } from '../suggest.ts'
import {
  FILTER_NAME_MAX,
  FILTER_OPTION_TEXT_MAX,
  FILTER_SUGGEST_TERMS_MAX,
  FILTER_SUGGEST_TERM_MAX,
  suggestTermRefusal,
} from '../rules.ts'
import type { FilterCatalog, FilterableVariant, OptionMark } from '../types.ts'

// VFL-18..22, VFL-29..31, VFL-35..37 — as sugestões e o motivo de cada uma.
//
// Os textos dos casos são os MEDIDOS no catálogo local em 2026-10-18 (`context.md`), não exemplos
// inventados: é contra eles que a regra de casamento tem de acertar.

describe('foldTokens e termMatches — a dobra e os tokens contíguos', () => {
  it('dobra acento, caixa e pontuação', () => {
    expect(foldTokens('Aço Inoxidável — (Natural)')).toEqual(['aco', 'inoxidavel', 'natural'])
    expect(foldTokens('')).toEqual([])
    expect(foldTokens(null)).toEqual([])
  })

  it('"Prata 925 Folheado a Ouro Rose" casa Prata 925 E Folheado a ouro rosé', () => {
    expect(termMatches('Prata 925', 'Prata 925 Folheado a Ouro Rose')).toBe(true)
    expect(termMatches('Folheado a ouro rosé', 'Prata 925 Folheado a Ouro Rose')).toBe(true)
  })

  it('"Aço inoxidavel natural" casa "Aço inoxidável" (acento só de um lado)', () => {
    expect(termMatches('Aço inoxidável', 'Aço inoxidavel natural')).toBe(true)
  })

  it('"Ouro" casa "Folheado a Ouro Branco" (aceito: a Adri aprova)', () => {
    expect(termMatches('Ouro', 'Folheado a Ouro Branco')).toBe(true)
  })

  it('"Prata" NÃO casa "Prateado": token inteiro, nunca prefixo', () => {
    expect(termMatches('Prata', 'Prateado')).toBe(false)
    // "Prateado" não começa por "prata", então ele sozinho não distingue token de prefixo; este sim
    expect(termMatches('Prata', 'Prataria fina')).toBe(false)
  })

  it('contíguos e na ordem: "Folheado a ouro" não casa "Ouro folheado a prata"', () => {
    // os três tokens estão lá, fora de ordem — só a régua de contiguidade recusa
    expect(termMatches('Folheado a ouro', 'Ouro folheado a prata')).toBe(false)
  })

  it('termo sem token não casa nada', () => {
    expect(termMatches('—', 'Prata — 925')).toBe(false)
  })
})

const CATALOGO: FilterCatalog = {
  groups: [
    { id: 'G-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0 },
    { id: 'G-tipo', name: 'Tipo de joia', slug: 'tipo', is_active: false, sort_order: 1 },
  ],
  values: [
    { id: 'prata', group_id: 'G-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
    { id: 'rose', group_id: 'G-acab', name: 'Folheado a ouro rosé', slug: 'rose', sort_order: 1 },
    { id: 'ouro', group_id: 'G-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 2, suggest_terms: ['Dourado'] },
    // grupo DESLIGADO: sugere do mesmo jeito (a Adri cura antes de ligar)
    { id: 'pingente', group_id: 'G-tipo', name: 'Pingente', slug: 'pingente', sort_order: 0 },
  ],
}

const va = (id: string, option_values: Record<string, string>, extra: Partial<FilterableVariant> = {}): FilterableVariant => ({
  id,
  option_values,
  is_active: true,
  position: 0,
  ...extra,
})
const mk = (option_name: string, option_value: string, value_id: string): OptionMark => ({ option_name, option_value, value_id })

const produto = (extra: Partial<SuggestableProduct>): SuggestableProduct => ({
  id: 'p',
  name: 'Peça',
  tags: [],
  filter_value_ids: [],
  option_marks: [],
  variants: [],
  ...extra,
})

const resumo = (lista: Suggestion[]) =>
  lista.map(s => [s.product_id, s.value_id, s.source, s.option_name, s.option_value, s.evidence].join(' | '))

describe('suggestMarks — as três fontes e os seus alvos', () => {
  it('fonte opção: o texto da variação ativa sugere POR OPÇÃO, um por valor que casa', () => {
    const p = produto({ variants: [va('a', { Cor: 'Prata 925 Folheado a Ouro Rose' })] })
    expect(resumo(suggestMarks({ catalog: CATALOGO, products: [p] }))).toEqual([
      'p | prata | option | Cor | Prata 925 Folheado a Ouro Rose | Prata 925 Folheado a Ouro Rose',
      'p | rose | option | Cor | Prata 925 Folheado a Ouro Rose | Prata 925 Folheado a Ouro Rose',
      'p | ouro | option | Cor | Prata 925 Folheado a Ouro Rose | Prata 925 Folheado a Ouro Rose',
    ])
  })

  it('fonte nome: sugere na PEÇA TODA, com o termo que casou', () => {
    const p = produto({ name: 'Colar Pingente Coração' })
    expect(resumo(suggestMarks({ catalog: CATALOGO, products: [p] }))).toEqual(['p | pingente | name |  |  | Pingente'])
  })

  it('fonte tag: `Prata925` casa "Prata 925" sem os espaços, e sugere na peça toda', () => {
    const p = produto({ tags: ['Novidade', 'Prata925'] })
    expect(resumo(suggestMarks({ catalog: CATALOGO, products: [p] }))).toEqual(['p | prata | tag |  |  | Prata925'])
  })

  it('o termo extra do valor sugere: "Dourado" ⇒ Folheado a ouro', () => {
    const p = produto({ variants: [va('a', { Cor: 'Dourado' })] })
    expect(resumo(suggestMarks({ catalog: CATALOGO, products: [p] }))).toEqual(['p | ouro | option | Cor | Dourado | Dourado'])
  })

  it('variação INATIVA não sugere', () => {
    const p = produto({ variants: [va('off', { Cor: 'Prata 925' }, { is_active: false })] })
    expect(suggestMarks({ catalog: CATALOGO, products: [p] })).toEqual([])
  })

  it('o mesmo texto em dois eixos são duas sugestões, uma por eixo', () => {
    const p = produto({ variants: [va('a', { Cor: 'Prata 925', 'Tipos de elo': 'Prata 925' })] })
    expect(suggestMarks({ catalog: CATALOGO, products: [p] }).map(s => s.option_name)).toEqual(['Cor', 'Tipos de elo'])
  })

  it('o mesmo par (eixo, texto) em várias variações vira UMA sugestão', () => {
    const p = produto({ variants: ['A', 'B', 'C'].map((l, i) => va(l, { Cor: 'Prata 925', Letra: l }, { position: i })) })
    expect(suggestMarks({ catalog: CATALOGO, products: [p] })).toHaveLength(1)
  })
})

describe('VFL-22 — a sugestão some quando já está marcada ou foi recusada', () => {
  const P = produto({ name: 'Pingente Prata 925', tags: ['Prata925'], variants: [va('a', { Cor: 'Prata 925' })] })
  const fontes = (dismissals: SuggestionDismissal[] = [], extra: Partial<SuggestableProduct> = {}) =>
    suggestMarks({ catalog: CATALOGO, products: [{ ...P, ...extra }], dismissals })
      .filter(s => s.value_id === 'prata')
      .map(s => s.source)

  it('a régua: sem marcação nem recusa, prata vem pelas três fontes', () => {
    expect(fontes()).toEqual(['option', 'name', 'tag'])
  })

  it('já marcada por opção: a da opção some, as da peça toda ficam', () => {
    expect(fontes([], { option_marks: [mk('Cor', 'Prata 925', 'prata')] })).toEqual(['name', 'tag'])
  })

  it('já marcada na peça toda: as da peça toda somem; a da opção fica, avisando a troca (VFL-27)', () => {
    const lista = suggestMarks({ catalog: CATALOGO, products: [{ ...P, filter_value_ids: ['prata'] }] }).filter(s => s.value_id === 'prata')
    expect(lista.map(s => [s.source, s.replacesWholeMark])).toEqual([['option', true]])
  })

  it('sem marcação na peça toda, a da opção não avisa troca nenhuma', () => {
    const op = suggestMarks({ catalog: CATALOGO, products: [P] }).find(s => s.source === 'option' && s.value_id === 'prata')
    expect(op?.replacesWholeMark).toBe(false)
  })

  it('recusada por opção: só a da opção some', () => {
    expect(fontes([{ product_id: 'p', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' }])).toEqual(['name', 'tag'])
  })

  it('a recusa da peça toda cala AS DUAS fontes de peça toda (nome e tag), e não a da opção', () => {
    expect(fontes([{ product_id: 'p', value_id: 'prata', option_name: '', option_value: '' }])).toEqual(['option'])
  })

  it('recusa de OUTRA peça ou de OUTRO valor não cala nada', () => {
    expect(
      fontes([
        { product_id: 'outra', value_id: 'prata', option_name: '', option_value: '' },
        { product_id: 'p', value_id: 'ouro', option_name: 'Cor', option_value: 'Prata 925' },
      ]),
    ).toEqual(['option', 'name', 'tag'])
  })
})

describe('VFL-18 — o motivo literal de cada fonte', () => {
  it('opção, nome e tag', () => {
    expect(suggestionReason({ source: 'option', option_name: 'Cor', evidence: 'Folheado a Ouro Rosé' })).toBe('Opção Cor = Folheado a Ouro Rosé')
    expect(suggestionReason({ source: 'name', option_name: '', evidence: 'Pingente' })).toBe("Nome contém 'pingente'")
    expect(suggestionReason({ source: 'tag', option_name: '', evidence: 'Prata925' })).toBe("Tag 'Prata925'")
  })
})

describe('groupSuggestions — um grupo por motivo', () => {
  const pecas = ['a', 'b', 'c'].map(id =>
    produto({ id, name: `Pingente ${id}`, variants: [va(id, { Cor: 'Prata 925' })] }),
  )
  const grupos = groupSuggestions(suggestMarks({ catalog: CATALOGO, products: [...pecas, produto({ id: 'd', variants: [va('d', { 'Tipo de Elo': 'Prata 925' })] })] }))

  it('"Opção Cor = Prata 925" em três peças é UMA linha, com as três', () => {
    const g = grupos.find(x => x.reason === 'Opção Cor = Prata 925')
    expect(g?.suggestions.map(s => s.product_id)).toEqual(['a', 'b', 'c'])
    expect(g).toMatchObject({ source: 'option', value_id: 'prata', target: 'option' })
  })

  it('o nome em três peças, com o mesmo termo, é UMA linha de alvo peça toda', () => {
    const g = grupos.find(x => x.reason === "Nome contém 'pingente'")
    expect(g?.suggestions).toHaveLength(3)
    expect(g?.target).toBe('product')
  })

  it('outra grafia do eixo é outra linha: o motivo mostra de onde vem', () => {
    expect(grupos.find(x => x.reason === 'Opção Tipo de Elo = Prata 925')?.suggestions.map(s => s.product_id)).toEqual(['d'])
  })

  it('o mesmo motivo para outro valor é outra linha', () => {
    const doisValores = groupSuggestions(suggestMarks({ catalog: CATALOGO, products: [produto({ variants: [va('x', { Cor: 'Prata 925 Folheado a Ouro Rose' })] })] }))
    expect(doisValores.map(g => g.value_id).sort()).toEqual(['ouro', 'prata', 'rose'])
    expect(new Set(doisValores.map(g => g.reason)).size).toBe(1)
  })

  it('ordem: mais peças primeiro', () => {
    expect(grupos.map(g => g.suggestions.length)).toEqual([...grupos.map(g => g.suggestions.length)].sort((a, b) => b - a))
    expect(grupos[0].suggestions.length).toBe(3)
  })

  it('a chave é estável entre duas execuções', () => {
    const outra = groupSuggestions(suggestMarks({ catalog: CATALOGO, products: pecas }))
    expect(outra.map(g => g.key)).toEqual(groupSuggestions(suggestMarks({ catalog: CATALOGO, products: pecas })).map(g => g.key))
  })
})

describe('os números da 67', () => {
  it('10 termos de até 40 caracteres, e 120 no texto da opção', () => {
    expect(FILTER_SUGGEST_TERMS_MAX).toBe(10)
    expect(FILTER_SUGGEST_TERM_MAX).toBe(40)
    expect(FILTER_OPTION_TEXT_MAX).toBe(120)
  })

  it('o termo e o nome hoje coincidem em 40, mas são constantes diferentes', () => {
    expect(FILTER_SUGGEST_TERM_MAX).toBe(FILTER_NAME_MAX)
  })
})

describe('suggestTermRefusal — VFL-37', () => {
  const nome = 'Folheado a ouro'

  it('vazio (e só espaço) é recusado', () => {
    expect(suggestTermRefusal('', [], nome)).toBe('Escreva o termo.')
    expect(suggestTermRefusal('   ', [], nome)).toBe('Escreva o termo.')
  })

  it('repetido, sem diferenciar maiúscula e acento', () => {
    expect(suggestTermRefusal('dourado', ['Dourado'], nome)).toBe('Este termo já está na lista.')
    expect(suggestTermRefusal('Rosé', ['rose'], nome)).toBe('Este termo já está na lista.')
  })

  it('igual ao nome do valor, com ou sem acento e caixa', () => {
    expect(suggestTermRefusal('FOLHEADO A OURO', [], nome)).toBe('O nome do valor já sugere sozinho.')
    expect(suggestTermRefusal('Aço', [], 'aco')).toBe('O nome do valor já sugere sozinho.')
  })

  it('acima de 40 caracteres, contado sem aparar', () => {
    expect(suggestTermRefusal('a'.repeat(41), [], nome)).toBe('O termo pode ter até 40 caracteres.')
    expect(suggestTermRefusal('a'.repeat(40), [], nome)).toBeNull()
  })

  it('o 11º termo é recusado; o 10º passa', () => {
    const nove = Array.from({ length: 9 }, (_, i) => `t${i}`)
    expect(suggestTermRefusal('novo', nove, nome)).toBeNull()
    expect(suggestTermRefusal('novo', [...nove, 't9'], nome)).toBe('Um valor aceita até 10 termos.')
  })

  it('só pontuação não tem token e é recusado', () => {
    expect(suggestTermRefusal('—!', [], nome)).toBe('O termo precisa ter letras ou números.')
  })

  it('o inverso: um termo novo e diferente passa', () => {
    expect(suggestTermRefusal('Dourado', ['Amarelo'], nome)).toBeNull()
  })
})
