import { describe, expect, it } from 'vitest'
import {
  FREE_SHIPPING_REGIONS,
  REGION_LABELS,
  REGION_STATES,
  effectiveRegions,
  regionOfCep,
  regionsLabel,
  regionsWithStates,
} from '../region.ts'

// A região do CEP tem UM dono: nenhuma tela e nenhuma function decide região por conta própria.
// As faixas são as dos Correios, pelos cinco primeiros dígitos.

describe('regionOfCep — a primeira e a última posição de cada faixa', () => {
  it.each([
    // Sudeste: SP 01000 … MG 39999
    ['01000-000', 'sudeste'],
    ['39999-999', 'sudeste'],
    // Nordeste
    ['40000-000', 'nordeste'],
    ['65999-999', 'nordeste'],
    // Norte, a faixa principal (PA, AM, AC, AP, RR)
    ['66000-000', 'norte'],
    ['69999-999', 'norte'],
    // Centro-Oeste: DF/GO
    ['70000-000', 'centro-oeste'],
    ['76799-999', 'centro-oeste'],
    // Norte: RO
    ['76800-000', 'norte'],
    ['76999-999', 'norte'],
    // Norte: TO
    ['77000-000', 'norte'],
    ['77999-999', 'norte'],
    // Centro-Oeste: MT
    ['78000-000', 'centro-oeste'],
    ['78899-999', 'centro-oeste'],
    // Norte: RO (a segunda faixa)
    ['78900-000', 'norte'],
    ['78999-999', 'norte'],
    // Centro-Oeste: MS
    ['79000-000', 'centro-oeste'],
    ['79999-999', 'centro-oeste'],
    // Sul: PR 80000 … RS 99999
    ['80000-000', 'sul'],
    ['99999-999', 'sul'],
  ])('%s ⇒ %s', (cep, regiao) => {
    expect(regionOfCep(cep)).toBe(regiao)
  })

  it('aceita o CEP com e sem máscara, e com espaço em volta', () => {
    expect(regionOfCep('01310100')).toBe('sudeste')
    expect(regionOfCep('01310-100')).toBe('sudeste')
    expect(regionOfCep(' 90010-000 ')).toBe('sul')
    expect(regionOfCep('40010000')).toBe('nordeste')
  })

  it.each([
    ['vazio', ''],
    ['nulo', null],
    ['indefinido', undefined],
    ['incompleto', '0131'],
    ['incompleto com máscara', '01310-10'],
    ['longo demais', '013101000'],
    ['com letras', '0131a-100'],
    ['com letras no lugar de dígitos, ainda com oito dígitos', '01a310100'],
    ['00000-000, fora de toda faixa', '00000-000'],
    ['00999-999, fora de toda faixa', '00999-999'],
  ])('%s ⇒ desconhecida (null)', (_nome, cep) => {
    expect(regionOfCep(cep as string)).toBeNull()
  })
})

describe('as cinco regiões — slugs, rótulos e estados', () => {
  it('a ordem fixa é Sul, Sudeste, Centro-Oeste, Nordeste, Norte', () => {
    expect(FREE_SHIPPING_REGIONS).toEqual(['sul', 'sudeste', 'centro-oeste', 'nordeste', 'norte'])
  })

  it('a lista é congelada — ninguém a altera por referência', () => {
    expect(Object.isFrozen(FREE_SHIPPING_REGIONS)).toBe(true)
  })

  it('cada região tem o rótulo da spec', () => {
    expect(REGION_LABELS).toEqual({
      norte: 'Norte',
      nordeste: 'Nordeste',
      'centro-oeste': 'Centro-Oeste',
      sudeste: 'Sudeste',
      sul: 'Sul',
    })
  })

  it('cada região tem os estados da spec', () => {
    expect(REGION_STATES).toEqual({
      norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
      nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
      'centro-oeste': ['DF', 'GO', 'MT', 'MS'],
      sudeste: ['SP', 'RJ', 'MG', 'ES'],
      sul: ['PR', 'SC', 'RS'],
    })
  })
})

describe('effectiveRegions — campo ausente vale as cinco', () => {
  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['não é lista', 'sul'],
    ['objeto', { sul: true }],
  ])('%s ⇒ as cinco', (_nome, valor) => {
    expect(effectiveRegions(valor)).toEqual([...FREE_SHIPPING_REGIONS])
  })

  it('lista: só os slugs válidos, sem repetição, na ordem fixa', () => {
    expect(effectiveRegions(['sudeste', 'xyz', 'sul', 'sudeste', 3])).toEqual(['sul', 'sudeste'])
  })

  it('lista vazia continua vazia — não vira as cinco', () => {
    expect(effectiveRegions([])).toEqual([])
  })
})

describe('regionsLabel — o rótulo das regiões, num dono só', () => {
  it('Sul + Sudeste ⇒ "Sul e Sudeste", em qualquer ordem de entrada', () => {
    expect(regionsLabel(['sudeste', 'sul'])).toBe('Sul e Sudeste')
    expect(regionsLabel(['sul', 'sudeste'])).toBe('Sul e Sudeste')
  })

  it('uma só', () => {
    expect(regionsLabel(['nordeste'])).toBe('Nordeste')
  })

  it('três, com vírgula e "e" antes da última, na ordem fixa', () => {
    expect(regionsLabel(['norte', 'sul', 'centro-oeste'])).toBe('Sul, Centro-Oeste e Norte')
  })

  it('as cinco ⇒ nenhum rótulo: os textos não falam de região', () => {
    expect(regionsLabel(['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'])).toBeNull()
  })

  it('lista vazia ⇒ nenhum rótulo', () => {
    expect(regionsLabel([])).toBeNull()
  })
})

describe('regionsWithStates — o trecho de regiões da frase do ⓘ', () => {
  it('Sul + Sudeste', () => {
    expect(regionsWithStates(['sudeste', 'sul'])).toBe(
      'no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES)',
    )
  })

  it('o artigo é "no" para todas', () => {
    expect(regionsWithStates(['norte', 'nordeste', 'centro-oeste'])).toBe(
      'no Centro-Oeste (DF, GO, MT, MS), no Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE) e no Norte (AC, AP, AM, PA, RO, RR, TO)',
    )
  })

  it('as cinco ou nenhuma ⇒ null', () => {
    expect(regionsWithStates([...FREE_SHIPPING_REGIONS])).toBeNull()
    expect(regionsWithStates([])).toBeNull()
  })
})
