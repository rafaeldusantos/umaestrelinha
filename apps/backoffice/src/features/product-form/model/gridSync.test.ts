import { describe, expect, it } from 'vitest'
import type { OptionValues, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { syncGrid, type GridDefaults, type GridSyncState, type OptionsChange } from './gridSync'
import { isTempVariantId } from './persistProduct'

// Feature 81, T01 — a grade acompanha as opções (OPV-01..03, 05..07, 09, 23, 24).
//
// As asserções são sobre a GRADE resultante (linhas, campos, identidade de objeto), nunca sobre o
// que a função chamou por dentro.

const DEFAULTS: GridDefaults = { price: 89.9, compare_price: 120, weight_kg: 0.05 }

const opt = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

const row = (id: string, option_values: OptionValues, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
  product_id: 'p1',
  option_values,
  name: null,
  sku: `SKU-${id}`,
  price: 50,
  compare_price: 70,
  stock: 7,
  weight_kg: 0.2,
  image_url: `https://img/${id}.webp`,
  is_active: false,
  position: 0,
  ...over,
})

const sync = (
  state: GridSyncState,
  next: ProductOption[],
  change: OptionsChange,
  defaults: GridDefaults = DEFAULTS,
) => syncGrid(state, next, change, defaults, 'p1')

const keys = (variants: readonly ProductVariant[]) =>
  variants.map(v => JSON.stringify(Object.entries(v.option_values).sort()))

describe('OPV-01/02 — a linha nasce no mesmo gesto, ativa e com os padrões', () => {
  it('independent test: Tamanho com 3,5 cm e 4,5 cm num produto sem grade dá duas linhas ativas com 89,90 / 120,00 / 0,05', () => {
    const state: GridSyncState = { options: [opt('Tamanho', [], 0)], variants: [] }
    const next = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)]

    const r = sync(state, next, { kind: 'values', index: 0 })

    expect(r.skipped).toBeNull()
    expect(r.variants).toHaveLength(2)
    expect(r.variants.map(v => v.option_values)).toEqual([{ Tamanho: '3,5 cm' }, { Tamanho: '4,5 cm' }])
    for (const v of r.variants) {
      expect(v.is_active).toBe(true)
      expect(v.price).toBe(89.9)
      expect(v.compare_price).toBe(120)
      expect(v.weight_kg).toBe(0.05)
    }
  })

  it('a linha nova carrega exatamente OPV-02: estoque 0, sem SKU, sem imagem, sem nome, id temporário e o produto', () => {
    const state: GridSyncState = { options: [opt('Tamanho', [], 0)], variants: [] }
    const r = sync(state, [opt('Tamanho', ['3,5 cm'], 0)], { kind: 'values', index: 0 })

    const [nova] = r.variants
    expect(nova).toMatchObject({
      product_id: 'p1',
      option_values: { Tamanho: '3,5 cm' },
      name: null,
      sku: null,
      price: 89.9,
      compare_price: 120,
      stock: 0,
      weight_kg: 0.05,
      image_url: null,
      is_active: true,
      position: 0,
    })
    expect(isTempVariantId(nova.id)).toBe(true)
  })

  it('padrão zero vira null nos três campos — a linha nasce ativa e SEM preço, nunca com preço 0', () => {
    const state: GridSyncState = { options: [opt('Tamanho', [], 0)], variants: [] }
    const r = sync(state, [opt('Tamanho', ['3,5 cm'], 0)], { kind: 'values', index: 0 }, {
      price: 0,
      compare_price: 0,
      weight_kg: 0,
    })

    expect(r.variants[0].price).toBeNull()
    expect(r.variants[0].compare_price).toBeNull()
    expect(r.variants[0].weight_kg).toBeNull()
    expect(r.variants[0].is_active).toBe(true)
  })

  it('acrescentar um valor cria SÓ as combinações novas do cruzamento (2 opções: + 1 valor ⇒ + 2 linhas)', () => {
    const options = [opt('Tamanho', ['3,5 cm'], 0), opt('Cor', ['Rosa', 'Azul'], 1)]
    const variants = [
      // Posições 0 e 1, como a grade gravada tem (a fixture antiga deixava as duas em 0 — a régua
      // da posição nova passou a ser "depois da maior que ficou", QA da 81).
      row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' }, { position: 0 }),
      row('b', { Tamanho: '3,5 cm', Cor: 'Azul' }, { position: 1 }),
    ]
    const next = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0), opt('Cor', ['Rosa', 'Azul'], 1)]

    const r = sync({ options, variants }, next, { kind: 'values', index: 0 })

    expect(r.variants).toHaveLength(4)
    expect(r.variants.slice(2).map(v => v.option_values)).toEqual([
      { Tamanho: '4,5 cm', Cor: 'Rosa' },
      { Tamanho: '4,5 cm', Cor: 'Azul' },
    ])
    expect(r.variants.slice(2).every(v => isTempVariantId(v.id) && v.is_active)).toBe(true)
    expect(r.variants.slice(2).map(v => v.position)).toEqual([2, 3])
  })
})

describe('OPV-03 — linha que continua no cruzamento fica intacta', () => {
  it('é o MESMO objeto (preço, preço "de", estoque, peso, SKU, imagem e ativa inalterados)', () => {
    const options = [opt('Tamanho', ['3,5 cm'], 0)]
    const original = row('a', { Tamanho: '3,5 cm' })
    const r = sync({ options, variants: [original] }, [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)], {
      kind: 'values',
      index: 0,
    })

    expect(r.variants[0]).toBe(original)
    expect(r.variants[0]).toMatchObject({
      price: 50,
      compare_price: 70,
      stock: 7,
      weight_kg: 0.2,
      sku: 'SKU-a',
      image_url: 'https://img/a.webp',
      is_active: false,
    })
  })
})

describe('OPV-04 (lado puro) — remover um valor', () => {
  const options = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)]
  const next = [opt('Tamanho', ['3,5 cm'], 0)]

  it('a linha temporária que usava o valor sai da grade, sem consulta', () => {
    const temp = row('tmp-x', { Tamanho: '4,5 cm' })
    const fica = row('a', { Tamanho: '3,5 cm' })
    const r = sync({ options, variants: [fica, temp] }, next, { kind: 'values', index: 0 })

    expect(r.variants).toEqual([fica])
    expect(r.orphans).toEqual([])
  })

  it('a linha com id REAL fica na grade e vai para `orphans` — quem decide tirá-la é a consulta de pedidos', () => {
    const real = row('real-45', { Tamanho: '4,5 cm' })
    const fica = row('a', { Tamanho: '3,5 cm' })
    const r = sync({ options, variants: [fica, real] }, next, { kind: 'values', index: 0 })

    expect(r.variants).toContain(real)
    expect(r.variants).toHaveLength(2)
    expect(r.orphans).toEqual([real])
  })
})

describe('OPV-05 — renomear a opção', () => {
  it('as linhas passam a usar o nome novo, sem criar nem remover nenhuma, e sem perder valor nem preço', () => {
    const options = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)]
    const variants = [row('a', { Tamanho: '3,5 cm' }), row('b', { Tamanho: '4,5 cm' })]
    const r = sync({ options, variants }, [opt('Medida', ['3,5 cm', '4,5 cm'], 0)], {
      kind: 'rename',
      index: 0,
    })

    expect(r.variants.map(v => v.id)).toEqual(['a', 'b'])
    expect(r.variants.map(v => v.option_values)).toEqual([{ Medida: '3,5 cm' }, { Medida: '4,5 cm' }])
    expect(r.variants.map(v => v.price)).toEqual([50, 50])
    expect(r.orphans).toEqual([])
    expect(r.options).toEqual([opt('Medida', ['3,5 cm', '4,5 cm'], 0)])
  })
})

describe('OPV-06 — nova opção num produto que já tem linhas (A4)', () => {
  it('cada linha existente ganha o PRIMEIRO valor da nova opção, mantendo o resto; as outras combinações nascem com os padrões', () => {
    const tamanho = opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)
    const a = row('a', { Tamanho: '3,5 cm' }, { price: 10 })
    const b = row('b', { Tamanho: '4,5 cm' }, { price: 20 })

    // A tela acrescenta a opção vazia...
    const s1 = sync({ options: [tamanho], variants: [a, b] }, [tamanho, opt('', [], 1)], { kind: 'addOption' })
    expect(s1.variants).toEqual([a, b])
    // ...dá nome...
    const s2 = sync({ options: s1.options, variants: s1.variants }, [tamanho, opt('Cor', [], 1)], {
      kind: 'rename',
      index: 1,
    })
    // ...e acrescenta os valores.
    const r = sync({ options: s2.options, variants: s2.variants }, [tamanho, opt('Cor', ['Rosa', 'Azul'], 1)], {
      kind: 'values',
      index: 1,
    })

    expect(r.variants).toHaveLength(4)
    expect(r.variants[0]).toMatchObject({ id: 'a', price: 10, option_values: { Tamanho: '3,5 cm', Cor: 'Rosa' } })
    expect(r.variants[1]).toMatchObject({ id: 'b', price: 20, option_values: { Tamanho: '4,5 cm', Cor: 'Rosa' } })
    expect(r.variants.slice(2).map(v => v.option_values)).toEqual([
      { Tamanho: '3,5 cm', Cor: 'Azul' },
      { Tamanho: '4,5 cm', Cor: 'Azul' },
    ])
    expect(r.variants.slice(2).every(v => v.is_active && v.price === 89.9)).toBe(true)
    expect(r.orphans).toEqual([])
  })

  it('a linha que JÁ tem a chave (vendida e pausada de antes) não recebe o primeiro valor — ela não ressuscita', () => {
    // Tamanho foi esvaziado e a linha vendida ficou com a chave antiga.
    const vendida = row('vendida', { Tamanho: '5,5 cm', Cor: 'Rosa' }, { is_active: false })
    const viva = row('viva', { Cor: 'Rosa' })
    const options = [opt('Tamanho', [], 0), opt('Cor', ['Rosa'], 1)]
    const next = [opt('Tamanho', ['3,5 cm'], 0), opt('Cor', ['Rosa'], 1)]

    const r = sync({ options, variants: [vendida, viva] }, next, { kind: 'values', index: 0 })

    expect(r.variants.find(v => v.id === 'vendida')?.option_values).toEqual({ Tamanho: '5,5 cm', Cor: 'Rosa' })
    expect(r.variants.find(v => v.id === 'viva')?.option_values).toEqual({ Tamanho: '3,5 cm', Cor: 'Rosa' })
    expect(r.orphans.map(v => v.id)).toEqual(['vendida'])
  })
  it('opção NOVA cujo nome uma linha antiga já carrega: a linha mantém o próprio valor e segue órfã', () => {
    // Linha de grade divergente do banco (A4): tem `Tamanho` sem a opção existir no editor.
    const viva = row('viva', { Cor: 'Rosa' })
    const antiga = row('antiga', { Cor: 'Rosa', Tamanho: '9 cm' }, { is_active: false })
    const cor = opt('Cor', ['Rosa'], 0)

    const s1 = sync({ options: [cor], variants: [viva, antiga] }, [cor, opt('', [], 1)], { kind: 'addOption' })
    // Os valores vêm ANTES do nome: a reconciliação é pulada (`incomplete`) e o refletido segue sem
    // nome — quando o nome chega, a opção entra na grade de uma vez.
    const s2 = sync({ options: s1.options, variants: s1.variants }, [cor, opt('', ['3,5 cm'], 1)], {
      kind: 'values',
      index: 1,
    })
    expect(s2.skipped).toBe('incomplete')
    const r = sync({ options: s2.options, variants: s2.variants }, [cor, opt('Tamanho', ['3,5 cm'], 1)], {
      kind: 'rename',
      index: 1,
    })

    expect(r.variants.find(v => v.id === 'antiga')?.option_values).toEqual({ Cor: 'Rosa', Tamanho: '9 cm' })
    expect(r.variants.find(v => v.id === 'viva')?.option_values).toEqual({ Cor: 'Rosa', Tamanho: '3,5 cm' })
    expect(r.orphans.map(v => v.id)).toEqual(['antiga'])
  })
})

describe('OPV-07 — remover uma opção inteira (A5)', () => {
  const options = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0), opt('Cor', ['Rosa', 'Azul'], 1)]
  const next = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)]

  it('a PRIMEIRA linha de cada combinação restante sobrevive sem a chave; as outras com id real viram órfãs', () => {
    const a = row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' }, { price: 11 })
    const b = row('b', { Tamanho: '3,5 cm', Cor: 'Azul' }, { price: 12 })
    const c = row('c', { Tamanho: '4,5 cm', Cor: 'Azul' }, { price: 13 })
    const d = row('d', { Tamanho: '4,5 cm', Cor: 'Rosa' }, { price: 14 })

    const r = sync({ options, variants: [a, b, c, d] }, next, { kind: 'removeOption', index: 1 })

    const sobreviventes = r.variants.filter(v => !r.orphans.includes(v))
    expect(sobreviventes.map(v => [v.id, v.price, v.option_values])).toEqual([
      ['a', 11, { Tamanho: '3,5 cm' }],
      ['c', 13, { Tamanho: '4,5 cm' }],
    ])
    expect(r.orphans.map(v => v.id)).toEqual(['b', 'd'])
    // nenhuma linha nova: o cruzamento restante já está coberto
    expect(r.variants.some(v => isTempVariantId(v.id))).toBe(false)
  })

  it('a linha temporária que perde a colisão some da grade', () => {
    const a = row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' })
    const t = row('tmp-9', { Tamanho: '3,5 cm', Cor: 'Azul' })
    const r = sync({ options, variants: [a, t] }, next, { kind: 'removeOption', index: 1 })

    expect(r.variants.map(v => v.id)).not.toContain('tmp-9')
    expect(r.variants.find(v => v.id === 'a')?.option_values).toEqual({ Tamanho: '3,5 cm' })
  })
})

describe('OPV-09 — opções mudam sem mudar o cruzamento: mesma referência', () => {
  const options = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0), opt('Cor', ['Rosa'], 1)]
  const variants = [
    row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' }),
    row('b', { Tamanho: '4,5 cm', Cor: 'Rosa' }),
  ]

  it('reordenar as opções (`move`) não muda a grade', () => {
    const next = [opt('Cor', ['Rosa'], 0), opt('Tamanho', ['3,5 cm', '4,5 cm'], 1)]
    const r = sync({ options, variants }, next, { kind: 'move', from: 1, to: 0 })
    expect(r.variants).toBe(variants)
    expect(r.orphans).toEqual([])
  })

  it('acrescentar uma opção sem valores não muda a grade', () => {
    const next = [...options, opt('Acabamento', [], 2)]
    const r = sync({ options, variants }, next, { kind: 'addOption' })
    expect(r.variants).toBe(variants)
  })

  it('dar nome a uma opção sem valores não muda a grade', () => {
    const s = { options: [...options, opt('', [], 2)], variants }
    const r = sync(s, [...options, opt('Acabamento', [], 2)], { kind: 'rename', index: 2 })
    expect(r.variants).toBe(variants)
  })

  it('reconciliar de novo com o mesmo cruzamento é no-op', () => {
    const r = sync({ options, variants }, options, { kind: 'values', index: 0 })
    expect(r.variants).toBe(variants)
  })
})

describe('OPV-23 — duas opções com o mesmo nome (pela dobra)', () => {
  it('pula a reconciliação: grade intacta e o refletido não avança', () => {
    const options = [opt('Tamanho', ['3,5 cm'], 0), opt('Cor', ['Rosa'], 1)]
    const variants = [row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' })]
    const next = [opt('Tamanho', ['3,5 cm'], 0), opt(' tamanho', ['Rosa', 'Azul'], 1)]

    const r = sync({ options, variants }, next, { kind: 'rename', index: 1 })

    expect(r.skipped).toBe('duplicate')
    expect(r.variants).toBe(variants)
    expect(r.orphans).toEqual([])
    expect(r.options.map(o => o.name)).toEqual(['Tamanho', 'Cor'])
  })

  it('acentos e caixa contam como o mesmo nome (Coração × coracao)', () => {
    const options = [opt('Coração', ['A'], 0)]
    const r = sync({ options, variants: [] }, [opt('Coração', ['A'], 0), opt('coracao', ['B'], 1)], {
      kind: 'rename',
      index: 1,
    })
    expect(r.skipped).toBe('duplicate')
  })

  it('resolvido o conflito, a grade volta a acompanhar a partir do que refletia', () => {
    const options = [opt('Tamanho', ['3,5 cm'], 0), opt('Cor', ['Rosa'], 1)]
    const a = row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' })
    const s1 = sync({ options, variants: [a] }, [opt('Tamanho', ['3,5 cm'], 0), opt('Tamanho', ['Rosa'], 1)], {
      kind: 'rename',
      index: 1,
    })
    const r = sync({ options: s1.options, variants: s1.variants }, [opt('Tamanho', ['3,5 cm'], 0), opt('Tom', ['Rosa'], 1)], {
      kind: 'rename',
      index: 1,
    })

    expect(r.skipped).toBeNull()
    expect(r.variants).toHaveLength(1)
    expect(r.variants[0]).toMatchObject({ id: 'a', option_values: { Tamanho: '3,5 cm', Tom: 'Rosa' } })
  })
})

describe('OPV-24 — o nome apagado temporariamente não custa linhas', () => {
  it('com o nome vazio a grade não muda; ao digitar um nome novo, as linhas o adotam (OPV-05)', () => {
    const options = [opt('Tamanho', ['3,5 cm', '4,5 cm'], 0)]
    const variants = [row('a', { Tamanho: '3,5 cm' }), row('b', { Tamanho: '4,5 cm' })]

    const vazio = sync({ options, variants }, [opt('', ['3,5 cm', '4,5 cm'], 0)], { kind: 'rename', index: 0 })
    expect(vazio.skipped).toBe('incomplete')
    expect(vazio.variants).toBe(variants)

    const r = sync({ options: vazio.options, variants: vazio.variants }, [opt('Medida', ['3,5 cm', '4,5 cm'], 0)], {
      kind: 'rename',
      index: 0,
    })
    expect(r.skipped).toBeNull()
    expect(r.variants.map(v => v.id)).toEqual(['a', 'b'])
    expect(keys(r.variants)).toEqual(keys([row('x', { Medida: '3,5 cm' }), row('y', { Medida: '4,5 cm' })]))
    expect(r.orphans).toEqual([])
  })

  it('mover a opção enquanto o nome está vazio não desalinha o re-chaveamento', () => {
    const options = [opt('Tamanho', ['3,5 cm'], 0), opt('Cor', ['Rosa'], 1)]
    const a = row('a', { Tamanho: '3,5 cm', Cor: 'Rosa' })
    const s1 = sync({ options, variants: [a] }, [opt('', ['3,5 cm'], 0), opt('Cor', ['Rosa'], 1)], {
      kind: 'rename',
      index: 0,
    })
    const s2 = sync({ options: s1.options, variants: s1.variants }, [opt('Cor', ['Rosa'], 0), opt('', ['3,5 cm'], 1)], {
      kind: 'move',
      from: 0,
      to: 1,
    })
    const r = sync({ options: s2.options, variants: s2.variants }, [opt('Cor', ['Rosa'], 0), opt('Medida', ['3,5 cm'], 1)], {
      kind: 'rename',
      index: 1,
    })

    expect(r.variants).toHaveLength(1)
    expect(r.variants[0]).toMatchObject({ id: 'a', option_values: { Cor: 'Rosa', Medida: '3,5 cm' } })
  })
})

// QA da 81 (BUG-20261026-posicao-repetida-na-grade): a linha nova recebia `position` =
// quantidade de linhas que ficaram + índice. Quando uma linha do MEIO sai, as que ficaram guardam
// posições acima dessa contagem, e a nova colidia — medido no banco local: Aro 16/17/18 × Cor,
// tira 18, devolve 18 ⇒ posições 0, 1, 3, 4, 4, 5. A ordem da grade passa a depender da ordem de
// chegada do banco. A régua: nenhuma posição repetida, e a linha que fica continua o MESMO objeto.
describe('posição da linha nova — nunca repete a de uma linha que ficou', () => {
  it('tira um valor do meio do cruzamento e devolve: as posições continuam únicas', () => {
    const options = [opt('Aro', ['16', '17', '18'], 0), opt('Cor', ['Prata', 'Ouro'], 1)]
    const v = (id: string, aro: string, cor: string, position: number) =>
      row(id, { Aro: aro, Cor: cor }, { position })
    const grade = [
      v('a', '16', 'Prata', 0),
      v('b', '17', 'Prata', 1),
      v('c', '18', 'Prata', 2),
      v('d', '16', 'Ouro', 3),
      v('e', '17', 'Ouro', 4),
      v('f', '18', 'Ouro', 5),
    ]
    const sem18 = [opt('Aro', ['16', '17'], 0), opt('Cor', ['Prata', 'Ouro'], 1)]

    // As linhas têm id real: a 18 sai por `orphans` e a página a tira depois da consulta.
    const r1 = sync({ options, variants: grade }, sem18, { kind: 'values', index: 0 })
    const ficaram = r1.variants.filter(x => !r1.orphans.includes(x))
    const r2 = sync({ options: r1.options, variants: ficaram }, options, { kind: 'values', index: 0 })

    const posicoes = r2.variants.map(x => x.position)
    expect(new Set(posicoes).size).toBe(posicoes.length)
    for (const antiga of ficaram) expect(r2.variants).toContain(antiga)
  })
})
