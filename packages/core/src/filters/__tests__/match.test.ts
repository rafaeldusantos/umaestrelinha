import { describe, expect, it } from 'vitest'
import { matchProduct, resolveSelection, variantCarries } from '../match.ts'
import type { MatchOptions } from '../match.ts'
import type { FilterCatalog, FilterableProduct, FilterableVariant, OptionMark } from '../types.ts'

// VFL-09..11, VFL-13 — quem passa pela seleção, e em qual variação o card abre.
//
// As fixtures divergem de propósito (`L-013`): o preço da variação nunca é o da peça, a variação de
// menor posição nunca é a que tem estoque, e a peça "tem" os dois valores somados sem que uma
// variação só tenha os dois — que é a leitura errada que o sensor do fim do arquivo reproduz.

const CATALOGO: FilterCatalog = {
  groups: [
    { id: 'G-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0 },
    { id: 'G-tipo', name: 'Tipo de joia', slug: 'tipo', is_active: true, sort_order: 1 },
    { id: 'G-off', name: 'Desligado', slug: 'desligado', is_active: false, sort_order: 2 },
  ],
  values: [
    { id: 'prata', group_id: 'G-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
    { id: 'ouro', group_id: 'G-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 1 },
    { id: 'chaveiro', group_id: 'G-tipo', name: 'Chaveiro', slug: 'chaveiro', sort_order: 0 },
    { id: 'pingente', group_id: 'G-tipo', name: 'Pingente', slug: 'pingente', sort_order: 1 },
    { id: 'off-v', group_id: 'G-off', name: 'X', slug: 'x', sort_order: 0 },
  ],
}

interface V extends FilterableVariant {
  price: number | null
  stock: number
}
interface P extends FilterableProduct<V> {
  id: string
  price: number
  stock: number
}

const v = (id: string, option_values: Record<string, string>, extra: Partial<V> = {}): V => ({
  id,
  option_values,
  is_active: true,
  position: 0,
  price: null,
  stock: 1,
  ...extra,
})

const m = (option_name: string, option_value: string, value_id: string): OptionMark => ({ option_name, option_value, value_id })

const peca = (extra: Partial<P> = {}): P => ({ id: 'p', price: 50, stock: 5, filter_value_ids: [], ...extra })

/** O sistema da loja, em miniatura: faixa de preço e "disponível", na peça e na variação. */
const sistema = (faixa: [number, number], soDisponivel = false): MatchOptions<P> => ({
  productPass: x => x.price >= faixa[0] && x.price <= faixa[1] && (!soDisponivel || x.stock > 0),
  variantPass: (va, x) => {
    const preco = va.price ?? x.price
    return preco >= faixa[0] && preco <= faixa[1] && (!soDisponivel || va.stock > 0)
  },
  prefer: va => va.stock > 0,
})

// "Prata 925 em pingente, folheado em chaveiro": a peça carrega os dois valores somados, nenhuma
// variação carrega os dois juntos.
const CRUZADA = peca({
  option_marks: [
    m('Cor', 'Prata 925', 'prata'),
    m('Cor', 'Folheado', 'ouro'),
    m('Tipo', 'Pingente', 'pingente'),
    m('Tipo', 'Chaveiro', 'chaveiro'),
  ],
  variants: [
    v('prata-pingente', { Cor: 'Prata 925', Tipo: 'Pingente' }, { position: 0 }),
    v('folheado-chaveiro', { Cor: 'Folheado', Tipo: 'Chaveiro' }, { position: 1 }),
  ],
})

describe('VFL-09 — a peça toda OU a opção, e os grupos restantes pela MESMA variação', () => {
  it('a marcação na peça toda basta, sem variação nenhuma', () => {
    const r = matchProduct(peca({ filter_value_ids: ['prata'] }), { acabamento: ['prata-925'] }, CATALOGO)
    expect(r).toEqual({ passes: true, variant: null })
  })

  it('a marcação por opção basta, e devolve a variação que a carrega', () => {
    const r = matchProduct(CRUZADA, { acabamento: ['prata-925'] }, CATALOGO)
    expect(r.passes).toBe(true)
    expect(r.variant?.id).toBe('prata-pingente')
  })

  it('sem marcação nenhuma do valor, a peça não passa', () => {
    const r = matchProduct(peca({ variants: [v('a', { Cor: 'Prata 925' })] }), { acabamento: ['prata-925'] }, CATALOGO)
    expect(r).toEqual({ passes: false, variant: null })
  })

  it('OU dentro do grupo também vale por opção: prata OU ouro casa a variação de folheado', () => {
    const p = peca({ option_marks: [m('Cor', 'Folheado', 'ouro')], variants: [v('f', { Cor: 'Folheado' })] })
    expect(matchProduct(p, { acabamento: ['prata-925', 'ouro'] }, CATALOGO).variant?.id).toBe('f')
  })

  it('Prata 925 + Chaveiro em variações DIFERENTES não passa', () => {
    const r = matchProduct(CRUZADA, { acabamento: ['prata-925'], tipo: ['chaveiro'] }, CATALOGO)
    expect(r).toEqual({ passes: false, variant: null })
  })

  it('o par: Prata 925 + Pingente na mesma variação passa, e abre nela', () => {
    const r = matchProduct(CRUZADA, { acabamento: ['prata-925'], tipo: ['pingente'] }, CATALOGO)
    expect(r.passes).toBe(true)
    expect(r.variant?.id).toBe('prata-pingente')
  })

  it('grupo satisfeito na peça toda não restringe: Prata (peça toda) + Chaveiro (opção) abre no chaveiro', () => {
    const p = peca({
      filter_value_ids: ['prata'],
      option_marks: [m('Tipo', 'Chaveiro', 'chaveiro')],
      variants: [v('pingente', { Tipo: 'Pingente' }, { position: 0 }), v('chav', { Tipo: 'Chaveiro' }, { position: 1 })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'], tipo: ['chaveiro'] }, CATALOGO).variant?.id).toBe('chav')
  })

  it('grupo inativo e slug desconhecido não restringem, como na 66', () => {
    expect(matchProduct(peca(), { desligado: ['x'], cor: ['azul'] }, CATALOGO)).toEqual({ passes: true, variant: null })
  })
})

describe('VFL-13 — passa pela peça toda ⇒ `variant: null` (o card de hoje)', () => {
  it('sem seleção, a peça passa sem variação, mesmo tendo marcação por opção', () => {
    expect(matchProduct(CRUZADA, {}, CATALOGO)).toEqual({ passes: true, variant: null })
  })

  it('a peça toda VENCE a opção: marcada nos dois, abre como hoje', () => {
    const p = { ...CRUZADA, filter_value_ids: ['prata'] }
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO)).toEqual({ passes: true, variant: null })
  })

  it('pela peça toda, o sistema que vale é o da PEÇA (productPass)', () => {
    const p = peca({ filter_value_ids: ['prata'], price: 90, variants: [v('barata', {}, { price: 10 })] })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 80])).passes).toBe(false)
  })
})

describe('VFL-10 — por opção, preço e estoque são os DA VARIAÇÃO', () => {
  const p = peca({
    price: 50,
    option_marks: [m('Cor', 'Prata 925', 'prata')],
    variants: [v('cara', { Cor: 'Prata 925' }, { price: 95 })],
  })

  it('a peça dentro da faixa e a variação fora: não passa', () => {
    expect(p.price).toBeLessThanOrEqual(80)
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 80]))).toEqual({
      passes: false,
      variant: null,
    })
  })

  it('a variação dentro da faixa (e a peça fora): passa', () => {
    const q = { ...p, price: 200 }
    expect(matchProduct(q, { acabamento: ['prata-925'] }, CATALOGO, sistema([90, 100])).variant?.id).toBe('cara')
  })

  it('variação sem preço próprio usa o da peça', () => {
    const q = peca({ price: 60, option_marks: p.option_marks, variants: [v('base', { Cor: 'Prata 925' }, { price: null })] })
    expect(matchProduct(q, { acabamento: ['prata-925'] }, CATALOGO, sistema([55, 65])).variant?.id).toBe('base')
    expect(matchProduct(q, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 50])).passes).toBe(false)
  })

  it('"Disponível" ligado: a variação esgotada não é candidata, com a peça em estoque', () => {
    const q = peca({ stock: 9, option_marks: p.option_marks, variants: [v('esgotada', { Cor: 'Prata 925' }, { stock: 0 })] })
    expect(matchProduct(q, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 999], true)).passes).toBe(false)
    expect(matchProduct(q, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 999], false)).variant?.id).toBe('esgotada')
  })

  it('sem `variantPass`, a variação cai no filtro da PEÇA — nunca passa sem sistema nenhum', () => {
    const opts: MatchOptions<P> = { productPass: x => x.price <= 40 }
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, opts).passes).toBe(false)
  })
})

describe('VFL-11 — qual variação abre: a de menor posição, preferindo a com estoque', () => {
  const marks = [m('Cor', 'Prata 925', 'prata')]

  it('menor `position`, não a ordem de chegada', () => {
    const p = peca({
      option_marks: marks,
      variants: [v('pos2', { Cor: 'Prata 925', Letra: 'B' }, { position: 2 }), v('pos1', { Cor: 'Prata 925', Letra: 'A' }, { position: 1 })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 999])).variant?.id).toBe('pos1')
  })

  it('a com estoque vence a de menor posição esgotada', () => {
    const p = peca({
      option_marks: marks,
      variants: [
        v('pos0-esgotada', { Cor: 'Prata 925', Letra: 'A' }, { position: 0, stock: 0 }),
        v('pos1-esgotada', { Cor: 'Prata 925', Letra: 'B' }, { position: 1, stock: 0 }),
        v('pos2-com', { Cor: 'Prata 925', Letra: 'C' }, { position: 2, stock: 3 }),
        v('pos3-com', { Cor: 'Prata 925', Letra: 'D' }, { position: 3, stock: 3 }),
      ],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 999])).variant?.id).toBe('pos2-com')
  })

  it('nenhuma com estoque (e "Disponível" desligado): a de menor posição', () => {
    const p = peca({
      option_marks: marks,
      variants: [v('b', { Cor: 'Prata 925' }, { position: 5, stock: 0 }), v('a', { Cor: 'Prata 925' }, { position: 4, stock: 0 })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO, sistema([0, 999])).variant?.id).toBe('a')
  })

  it('posição ausente: vale a ordem de chegada', () => {
    const p = peca({
      option_marks: marks,
      variants: [v('primeira', { Cor: 'Prata 925' }, { position: null }), v('segunda', { Cor: 'Prata 925' }, { position: null })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).variant?.id).toBe('primeira')
  })
})

describe('edge cases da spec', () => {
  it('variação INATIVA é ignorada, mesmo sendo a única que casa', () => {
    const p = peca({ option_marks: [m('Cor', 'Prata 925', 'prata')], variants: [v('off', { Cor: 'Prata 925' }, { is_active: false })] })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO)).toEqual({ passes: false, variant: null })
  })

  it('a inativa de menor posição é pulada, e abre a ativa seguinte', () => {
    const p = peca({
      option_marks: [m('Cor', 'Prata 925', 'prata')],
      variants: [v('off', { Cor: 'Prata 925' }, { is_active: false, position: 0 }), v('on', { Cor: 'Prata 925' }, { position: 1 })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).variant?.id).toBe('on')
  })

  it('variação sem a chave do eixo não casa a marcação daquele eixo', () => {
    const p = peca({ option_marks: [m('Cor', 'Prata 925', 'prata')], variants: [v('sem-cor', { Letra: 'A' })] })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).passes).toBe(false)
  })

  it('o mesmo texto em dois eixos são duas opções: marcar "Tipos de elo = Prata 925" não casa "Cor = Prata 925"', () => {
    const p = peca({
      option_marks: [m('Tipos de elo', 'Prata 925', 'prata')],
      variants: [v('cor', { Cor: 'Prata 925', 'Tipos de elo': 'Chaveiro' }, { position: 0 }), v('elo', { Cor: 'Ouro', 'Tipos de elo': 'Prata 925' }, { position: 1 })],
    })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).variant?.id).toBe('elo')
  })

  it('o texto é EXATO: outra grafia não casa', () => {
    const p = peca({ option_marks: [m('Cor', 'Prata 925', 'prata')], variants: [v('a', { Cor: 'prata 925' }), v('b', { cor: 'Prata 925' })] })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).passes).toBe(false)
  })

  it('`option_values` nulo não quebra e não casa', () => {
    const p = peca({ option_marks: [m('Cor', 'Prata 925', 'prata')], variants: [{ ...v('n', {}), option_values: null }] })
    expect(matchProduct(p, { acabamento: ['prata-925'] }, CATALOGO).passes).toBe(false)
  })

  it('a peça da 66 (sem `option_marks` nem `variants`) se comporta como antes', () => {
    expect(matchProduct({ filter_value_ids: ['prata'] }, { acabamento: ['prata-925'] }, CATALOGO)).toEqual({ passes: true, variant: null })
    expect(matchProduct({ filter_value_ids: [] }, { acabamento: ['prata-925'] }, CATALOGO)).toEqual({ passes: false, variant: null })
  })
})

describe('variantCarries', () => {
  const va = v('a', { Cor: 'Prata 925', Tipo: 'Chaveiro' })

  it('carrega quando o texto do eixo é o marcado E o valor está no conjunto', () => {
    expect(variantCarries(va, [m('Cor', 'Prata 925', 'prata')], new Set(['prata']))).toBe(true)
  })

  it('não carrega com o valor fora do conjunto, nem com marcação de outro texto', () => {
    expect(variantCarries(va, [m('Cor', 'Prata 925', 'prata')], new Set(['ouro']))).toBe(false)
    expect(variantCarries(va, [m('Cor', 'Folheado', 'prata')], new Set(['prata']))).toBe(false)
  })
})

describe('sensor — a leitura "basta a peça somar" reprova na MESMA régua', () => {
  /** A leitura errada: junta os valores da peça toda com os de toda opção marcada, e testa o conjunto. */
  const pecaSoma = (p: P, sel: Record<string, string[]>): boolean => {
    const soma = new Set([...p.filter_value_ids, ...(p.option_marks ?? []).map(x => x.value_id)])
    return [...resolveSelection(sel, CATALOGO).values()].every(ids => [...ids].some(id => soma.has(id)))
  }

  it('Prata + Chaveiro: a soma diz que passa; a regra diz que não', () => {
    const sel = { acabamento: ['prata-925'], tipo: ['chaveiro'] }
    expect(pecaSoma(CRUZADA, sel)).toBe(true)
    expect(matchProduct(CRUZADA, sel, CATALOGO).passes).not.toBe(pecaSoma(CRUZADA, sel))
  })
})
