import { describe, expect, it } from 'vitest'
import { cartesian, diffGrid, skuFromParts, optionValuesKey } from '../grid'
import type { OptionValues, ProductOption } from '@nanapin/supabase/types'

// Testes derivados de PFM-07 (AC 4), PFM-08 (AC 6, 14) e do "Done when" da T10.

const opt = (name: string, values: string[], position: number): ProductOption => ({
  name, values, position,
})

const TAMANHO = opt('Tamanho', ['3,5 cm', '4,5 cm', '5,5 cm'], 0)
const ACABAMENTO = opt('Acabamento', ['Brilhante', 'Fosco'], 1)

describe('cartesian', () => {
  it('3 × 2 devolve 6 combinações', () => {
    expect(cartesian([TAMANHO, ACABAMENTO])).toHaveLength(6)
  })

  it('o PRIMEIRO eixo varia mais devagar — é o que agrupa a grade por ele', () => {
    expect(cartesian([TAMANHO, ACABAMENTO]).map(c => `${c.Tamanho}/${c.Acabamento}`)).toEqual([
      '3,5 cm/Brilhante', '3,5 cm/Fosco',
      '4,5 cm/Brilhante', '4,5 cm/Fosco',
      '5,5 cm/Brilhante', '5,5 cm/Fosco',
    ])
  })

  it('respeita position, não a ordem do array', () => {
    const inverted = [opt('Acabamento', ['Fosco'], 1), opt('Tamanho', ['4,5 cm'], 0)]
    expect(Object.keys(cartesian(inverted)[0])).toEqual(['Tamanho', 'Acabamento'])
  })

  it('1 eixo com 3 valores → 3 combinações', () => {
    expect(cartesian([TAMANHO])).toHaveLength(3)
  })

  it('0 eixos → []', () => {
    expect(cartesian([])).toEqual([])
  })

  it('3 eixos multiplicam (3 × 2 × 2 = 12)', () => {
    expect(cartesian([TAMANHO, ACABAMENTO, opt('Cor', ['Rosa', 'Azul'], 2)])).toHaveLength(12)
  })

  it('eixo sem valores é ignorado — eixo recém-criado não pode zerar a grade na tela', () => {
    expect(cartesian([TAMANHO, opt('Cor', [], 1)])).toHaveLength(3)
  })

  it('valores vazios ou em branco são descartados', () => {
    expect(cartesian([opt('Tamanho', ['P', '', '  ', 'G'], 0)]).map(c => c.Tamanho)).toEqual(['P', 'G'])
  })

  it('eixo sem nome é ignorado', () => {
    expect(cartesian([opt('  ', ['x'], 0)])).toEqual([])
  })
})

describe('optionValuesKey — a comparação não pode depender da ordem das chaves', () => {
  it('mesma combinação em ordens diferentes tem a mesma chave', () => {
    expect(optionValuesKey({ Tamanho: 'P', Cor: 'Rosa' }))
      .toBe(optionValuesKey({ Cor: 'Rosa', Tamanho: 'P' }))
  })

  it('combinações diferentes têm chaves diferentes', () => {
    expect(optionValuesKey({ Tamanho: 'P' })).not.toBe(optionValuesKey({ Tamanho: 'G' }))
  })
})

describe('diffGrid', () => {
  const variant = (values: OptionValues, price: number | null, stock: number) => ({
    option_values: values, price, stock, sku: 'SKU-X',
  })

  it('preserva preço e estoque das linhas que sobrevivem — regerar não é recomeçar', () => {
    const current = [variant({ Tamanho: '3,5 cm' }, 14.9, 18)]
    const next = [{ Tamanho: '3,5 cm' }, { Tamanho: '4,5 cm' }]
    const d = diffGrid(current, next)

    expect(d.toKeep).toHaveLength(1)
    expect(d.toKeep[0].price).toBe(14.9)
    expect(d.toKeep[0].stock).toBe(18)
    expect(d.toKeep[0]).toBe(current[0]) // é o objeto ORIGINAL, não uma cópia reconstruída
  })

  it('combinação nova entra em toCreate', () => {
    const d = diffGrid([variant({ Tamanho: '3,5 cm' }, 14.9, 5)], [
      { Tamanho: '3,5 cm' }, { Tamanho: '4,5 cm' },
    ])
    expect(d.toCreate).toEqual([{ Tamanho: '4,5 cm' }])
  })

  it('reduzir de 3 eixos para 2 põe as órfãs em toRemove, NUNCA em toCreate', () => {
    const current = [
      variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' }, 14.9, 3),
      variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco', Cor: 'Azul' }, 14.9, 2),
    ]
    const d = diffGrid(current, cartesian([opt('Tamanho', ['3,5 cm'], 0), opt('Acabamento', ['Fosco'], 1)]))

    expect(d.toRemove).toHaveLength(2)
    expect(d.toKeep).toHaveLength(0)
    expect(d.toCreate).toEqual([{ Tamanho: '3,5 cm', Acabamento: 'Fosco' }])
    expect(d.toRemove.every(v => !d.toCreate.includes(v.option_values))).toBe(true)
  })

  it('a ordem das chaves do jsonb não faz a linha parecer nova', () => {
    // Simula o que volta do Postgres: chaves em ordem diferente da que foi gravada.
    const current = [variant({ Acabamento: 'Fosco', Tamanho: '3,5 cm' }, 14.9, 7)]
    const d = diffGrid(current, [{ Tamanho: '3,5 cm', Acabamento: 'Fosco' }])
    expect(d.toKeep).toHaveLength(1)
    expect(d.toCreate).toHaveLength(0)
    expect(d.toRemove).toHaveLength(0)
  })

  it('grade vazia + cruzamento novo = tudo em toCreate', () => {
    const next = cartesian([TAMANHO, ACABAMENTO])
    const d = diffGrid([], next)
    expect(d.toCreate).toHaveLength(6)
    expect(d.toKeep).toHaveLength(0)
    expect(d.toRemove).toHaveLength(0)
  })

  it('cruzamento vazio manda tudo para toRemove, sem apagar nada por conta própria', () => {
    const current = [variant({ Tamanho: '3,5 cm' }, 14.9, 1)]
    const d = diffGrid(current, [])
    expect(d.toRemove).toHaveLength(1)
    expect(d.toCreate).toHaveLength(0)
  })

  it('variação legada com option_values vazio vira órfã quando há cruzamento', () => {
    // É o estado das 10 linhas que a T2 migrou: option_values = {}.
    const d = diffGrid([variant({}, null, 20)], [{ Tamanho: '3,5 cm' }])
    expect(d.toRemove).toHaveLength(1)
    expect(d.toCreate).toEqual([{ Tamanho: '3,5 cm' }])
  })
})

describe('skuFromParts', () => {
  it('o exemplo do desenho: botton-sailor-moon + 4,5 cm + Brilhante → SLR-45-BRI', () => {
    expect(skuFromParts('botton-sailor-moon', { Tamanho: '4,5 cm', Acabamento: 'Brilhante' },
      [TAMANHO, ACABAMENTO])).toBe('SLR-45-BRI')
  })

  it('é estável: a mesma entrada dá sempre a mesma saída', () => {
    const a = skuFromParts('botton-sailor-moon', { Tamanho: '4,5 cm', Acabamento: 'Fosco' }, [TAMANHO, ACABAMENTO])
    const b = skuFromParts('botton-sailor-moon', { Acabamento: 'Fosco', Tamanho: '4,5 cm' }, [TAMANHO, ACABAMENTO])
    expect(a).toBe(b)
  })

  it('a ordem vem de position, não da ordem das chaves', () => {
    expect(skuFromParts('sailor', { Acabamento: 'Fosco', Tamanho: '3,5 cm' }, [TAMANHO, ACABAMENTO]))
      .toBe('SLR-35-FOS')
  })

  it('sem options, cai na ordem alfabética dos eixos — ainda determinístico', () => {
    expect(skuFromParts('sailor', { Tamanho: '3,5 cm', Acabamento: 'Fosco' }))
      .toBe('SLR-FOS-35') // Acabamento antes de Tamanho
  })

  it('palavras genéricas do slug são descartadas', () => {
    expect(skuFromParts('botton-naruto', { Tamanho: '3,5 cm' }, [TAMANHO])).toBe('NRT-35')
    expect(skuFromParts('pin-naruto', { Tamanho: '3,5 cm' }, [TAMANHO])).toBe('NRT-35')
    expect(skuFromParts('kit-naruto', { Tamanho: '3,5 cm' }, [TAMANHO])).toBe('NRT-35')
  })

  it('dígitos ganham de letras no valor — é o que distingue tamanhos', () => {
    expect(skuFromParts('sailor', { Tamanho: '3,5 cm' }, [TAMANHO])).toBe('SLR-35')
    expect(skuFromParts('sailor', { Tamanho: '5,5 cm' }, [TAMANHO])).toBe('SLR-55')
  })

  it('valor sem dígito usa três letras', () => {
    expect(skuFromParts('sailor', { Acabamento: 'Brilhante' }, [ACABAMENTO])).toBe('SLR-BRI')
    expect(skuFromParts('sailor', { Acabamento: 'Fosco' }, [ACABAMENTO])).toBe('SLR-FOS')
  })

  it('palavra curta não vira prefixo vazio', () => {
    expect(skuFromParts('gojo', {})).toBe('GOJ')
    expect(skuFromParts('ab', {})).toBe('AB')
  })

  it('acento no slug não vaza para o SKU', () => {
    expect(skuFromParts('bottons-nostálgico', { Tamanho: '3,5 cm' }, [TAMANHO])).toMatch(/^[A-Z0-9-]+$/)
  })

  it('sem valores devolve só o prefixo', () => {
    expect(skuFromParts('botton-sailor-moon', {})).toBe('SLR')
    expect(skuFromParts('botton-sailor-moon', null)).toBe('SLR')
  })

  it('slug vazio não estoura', () => {
    expect(skuFromParts('', { Tamanho: '3,5 cm' }, [TAMANHO])).toBe('35')
  })

  it('eixo órfão entra no fim, como no variantLabel — rótulo e SKU não discordam', () => {
    expect(skuFromParts('sailor', { Tamanho: '3,5 cm', Estampa: 'Holo' }, [TAMANHO]))
      .toBe('SLR-35-HOL')
  })

  it('valor em branco não vira separador solto', () => {
    expect(skuFromParts('sailor', { Tamanho: '3,5 cm', Acabamento: '  ' }, [TAMANHO, ACABAMENTO]))
      .toBe('SLR-35')
  })
})
