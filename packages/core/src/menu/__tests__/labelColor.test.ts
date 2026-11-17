import { describe, expect, it } from 'vitest'
import {
  MENU_LABEL_BAR_BACKGROUNDS,
  MENU_LABEL_SHEET_BACKGROUND,
  menuLabelColorApproval,
  menuLabelColorFor,
  menuLabelColorRefusal,
  menuLabelColorSurfaceRefusal,
  menuLabelColorsOf,
} from '../index.ts'

/**
 * A cor do rótulo de um item principal do menu: uma para a barra escura do computador, outra para a
 * folha branca do celular. A leitura é tolerante (o jsonb pode ter sido escrito à mão) e a régua de
 * contraste é a mesma para o painel, que recusa antes de gravar, e para quem mais ler o documento.
 *
 * As razões esperadas abaixo foram medidas à parte (WCAG 2.1) contra os fundos da barra — `primary`
 * do Padrão #34495E e do Black Friday #1C1A18 — e contra o branco da folha.
 */

describe('menuLabelColorsOf — só #RRGGBB é cor', () => {
  it('aceita as duas cores no formato #RRGGBB, como estão escritas', () => {
    expect(menuLabelColorsOf({ bar: '#F7F3EC', sheet: '#23303a' })).toEqual({
      bar: '#F7F3EC',
      sheet: '#23303a',
    })
  })

  it.each([
    ['curta', '#FFF'],
    ['sem cerquilha', 'F7F3EC'],
    ['com espaço', ' #F7F3EC'],
    ['dígito fora do hexadecimal', '#GGGGGG'],
    ['nome de cor', 'red'],
    ['número', 0xf7f3ec],
    ['vazio', ''],
    ['null', null],
  ])('%s vira "sem cor"', (_rotulo, valor) => {
    expect(menuLabelColorsOf({ bar: valor, sheet: valor })).toEqual({ bar: null, sheet: null })
  })

  it.each([
    ['ausente', undefined],
    ['null', null],
    ['texto', '#F7F3EC'],
    ['array', ['#F7F3EC', '#23303A']],
  ])('campo inteiro %s vira as duas superfícies sem cor', (_rotulo, bruto) => {
    expect(menuLabelColorsOf(bruto)).toEqual({ bar: null, sheet: null })
  })

  it('uma superfície inválida não leva a outra junto', () => {
    expect(menuLabelColorsOf({ bar: 'azul', sheet: '#23303A' })).toEqual({ bar: null, sheet: '#23303A' })
  })
})

describe('menuLabelColorFor — a cor de cada superfície', () => {
  it('a barra do computador lê `bar`, a folha do celular lê `sheet`', () => {
    const cores = { bar: '#F7F3EC', sheet: '#23303A' }
    expect(menuLabelColorFor(cores, 'desktop')).toBe('#F7F3EC')
    expect(menuLabelColorFor(cores, 'mobile')).toBe('#23303A')
  })

  it('sem cor na superfície, ou cor fora do formato, é null — o rótulo fica como hoje', () => {
    expect(menuLabelColorFor({ bar: null, sheet: '#23303A' }, 'desktop')).toBeNull()
    expect(menuLabelColorFor({ bar: '#F7F3EC', sheet: 'escuro' }, 'mobile')).toBeNull()
    expect(menuLabelColorFor(undefined, 'desktop')).toBeNull()
  })
})

describe('os fundos', () => {
  it('a barra é o `primary` de cada perfil; a folha é branca', () => {
    expect(MENU_LABEL_BAR_BACKGROUNDS).toEqual({ padrao: '#34495E', 'black-friday': '#1C1A18' })
    expect(MENU_LABEL_SHEET_BACKGROUND).toBe('#FFFFFF')
  })
})

describe('menuLabelColorRefusal — abaixo de 4,5:1 não grava', () => {
  it('sem cor nenhuma, grava', () => {
    expect(menuLabelColorRefusal({ bar: null, sheet: null })).toBeNull()
    expect(menuLabelColorRefusal(undefined)).toBeNull()
  })

  it('cor fora do formato é "sem cor", e não recusa', () => {
    expect(menuLabelColorRefusal({ bar: '#FFF', sheet: 'branco' })).toBeNull()
  })

  it('recusa a cor da barra que fica abaixo de 4,5:1 no Padrão, com a medida e o perfil', () => {
    // #B8945F: 3,29:1 sobre a barra do Padrão, 6,15:1 sobre a do Black Friday.
    const recusa = menuLabelColorRefusal({ bar: '#B8945F', sheet: null })
    expect(recusa).toContain('3,3:1')
    expect(recusa).toContain('Padrão')
    expect(recusa).toContain('barra do computador')
    expect(recusa).toContain('4,5:1')
  })

  it('a barra é medida também no Black Friday: a frase traz o perfil em que a cor fica pior', () => {
    // #222222: 1,71:1 no Padrão e 1,09:1 no Black Friday — o pior é o Black Friday.
    const recusa = menuLabelColorRefusal({ bar: '#222222', sheet: null })
    expect(recusa).toContain('1,1:1')
    expect(recusa).toContain('Black Friday')
    expect(recusa).not.toContain('1,7:1')
  })

  it('recusa a cor da folha abaixo de 4,5:1 sobre o branco, com a medida', () => {
    // #777777: 4,48:1 sobre branco — arredondaria para 4,5, e a frase não pode dizer o piso.
    const recusa = menuLabelColorRefusal({ bar: null, sheet: '#777777' })
    expect(recusa).toContain('4,4:1')
    expect(recusa).toContain('lista do celular')
  })

  it('aceita a cor que atinge o piso nas duas superfícies', () => {
    // #ADBBC9: 4,75:1 no Padrão (8,86 no Black Friday); #767676: 4,54:1 sobre branco.
    expect(menuLabelColorRefusal({ bar: '#ADBBC9', sheet: '#767676' })).toBeNull()
  })

  it('a barra é cobrada antes da folha', () => {
    const recusa = menuLabelColorRefusal({ bar: '#B8945F', sheet: '#777777' })
    expect(recusa).toContain('barra do computador')
  })
})

describe('a medida de cada campo, para o painel mostrar', () => {
  it('a recusa de uma superfície só olha a cor dela', () => {
    expect(menuLabelColorSurfaceRefusal('#B8945F', 'desktop')).toContain('3,3:1')
    expect(menuLabelColorSurfaceRefusal('#B8945F', 'mobile')).toContain('2,8:1')
    expect(menuLabelColorSurfaceRefusal(null, 'desktop')).toBeNull()
  })

  it('a aprovação traz a medida pior e só sai quando a cor passa', () => {
    // #F7F3EC: 8,40:1 no Padrão, 15,69:1 no Black Friday — a frase diz a menor.
    expect(menuLabelColorApproval('#F7F3EC', 'desktop')).toContain('8,4:1')
    expect(menuLabelColorApproval('#767676', 'mobile')).toContain('4,5:1')
    expect(menuLabelColorApproval('#777777', 'mobile')).toBeNull()
    expect(menuLabelColorApproval(null, 'mobile')).toBeNull()
    expect(menuLabelColorApproval('#12', 'mobile')).toBeNull()
  })
})
