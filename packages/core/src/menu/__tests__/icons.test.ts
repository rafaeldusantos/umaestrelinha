import { describe, expect, it } from 'vitest'
import {
  MENU_BRAND_ICON_KEYS,
  MENU_ICON_GROUPS,
  MENU_ICON_KEYS,
  MENU_ICON_LABELS,
  MENU_SYSTEM_ICON_KEYS,
  menuIconKey,
} from '../icons'

// ---------------------------------------------------------------------------
// NAV-21 — um dono só do conjunto
// ---------------------------------------------------------------------------
describe('o catálogo de chaves (NAV-21)', () => {
  it('tem as 39 chaves do conjunto da loja — âncora de contagem', () => {
    // Sem âncora, uma lista que encolhesse pela metade passaria em silêncio: todo teste abaixo
    // continuaria verde com uma chave só. 39 é o registro `ESTRELINHA_ICONS` menos o `pix`, que é
    // marca de meio de pagamento e não obedece às regras do conjunto: 29 da marca e 10 do sistema.
    expect(MENU_ICON_KEYS).toHaveLength(39)
    expect(MENU_ICON_KEYS).toContain('corrente')
    expect(MENU_ICON_KEYS).toContain('pingente')
    expect(MENU_ICON_KEYS).toContain('gota-afetiva')
    expect(MENU_ICON_KEYS).toContain('gravacao')
  })

  it('não inclui o pix — a marca do arranjo não é ícone de departamento', () => {
    expect(MENU_ICON_KEYS as readonly string[]).not.toContain('pix')
  })

  it('nenhuma chave se repete', () => {
    expect(new Set(MENU_ICON_KEYS).size).toBe(MENU_ICON_KEYS.length)
  })

  it('toda chave casa com a régua que a migration usa para limpar categories.icon', () => {
    // A migration zera `icon` que não case `^[a-z][a-z0-9-]*$`. Uma chave com maiúscula ou acento
    // seria apagada pelo banco e degradaria para "sem ícone" — em silêncio, e só em produção.
    const foraDaRegua = MENU_ICON_KEYS.filter(k => !/^[a-z][a-z0-9-]*$/.test(k))
    expect(foraDaRegua).toEqual([])
  })

  it('toda chave tem rótulo, e nenhum rótulo é vazio', () => {
    const semRotulo = MENU_ICON_KEYS.filter(k => !MENU_ICON_LABELS[k]?.trim())
    expect(semRotulo).toEqual([])
    expect(Object.keys(MENU_ICON_LABELS)).toHaveLength(MENU_ICON_KEYS.length)
  })
})

describe('os ícones do sistema', () => {
  const DO_SISTEMA = [
    'etiqueta',
    'porcentagem',
    'presente',
    'coracao',
    'cupom',
    'frete',
    'calendario',
    'informacao',
    'duvida',
    'inicio',
  ]

  it('são os dez, nesta ordem, e todos fazem parte do catálogo', () => {
    expect([...MENU_SYSTEM_ICON_KEYS]).toEqual(DO_SISTEMA)
    for (const chave of DO_SISTEMA) expect(MENU_ICON_KEYS as readonly string[]).toContain(chave)
  })

  it('cada um tem o rótulo que a dona lê no seletor', () => {
    const rotulos = DO_SISTEMA.map(chave => MENU_ICON_LABELS[chave as keyof typeof MENU_ICON_LABELS])
    expect(rotulos).toEqual([
      'Etiqueta',
      'Porcentagem',
      'Presente',
      'Coração',
      'Cupom',
      'Frete',
      'Calendário',
      'Informação',
      'Dúvida',
      'Início',
    ])
  })

  it('nenhuma chave nem rótulo do sistema fala de mecha ou de unha — a busca do seletor conta esses', () => {
    const textos = MENU_SYSTEM_ICON_KEYS.flatMap(chave => [chave, MENU_ICON_LABELS[chave]])
    expect(textos.filter(t => /mecha|unha/i.test(t))).toEqual([])
  })

  it('uma chave do sistema é lida como ela mesma', () => {
    expect(menuIconKey('etiqueta')).toBe('etiqueta')
    expect(menuIconKey('  Calendario ')).toBe('calendario')
    expect(menuIconKey('inicio')).toBe('inicio')
  })
})

describe('os grupos do seletor', () => {
  it('são dois, marca e sistema, nesta ordem', () => {
    expect(MENU_ICON_GROUPS.map(g => g.id)).toEqual(['marca', 'sistema'])
    expect(MENU_ICON_GROUPS[0].keys).toBe(MENU_BRAND_ICON_KEYS)
    expect(MENU_ICON_GROUPS[1].keys).toBe(MENU_SYSTEM_ICON_KEYS)
  })

  it('cobrem o catálogo inteiro, sem sobreposição', () => {
    const juntos = MENU_ICON_GROUPS.flatMap(g => [...g.keys])
    expect(juntos).toHaveLength(MENU_ICON_KEYS.length)
    expect(new Set(juntos)).toEqual(new Set(MENU_ICON_KEYS))
    const daMarca = new Set<string>(MENU_BRAND_ICON_KEYS)
    expect(MENU_SYSTEM_ICON_KEYS.filter(chave => daMarca.has(chave))).toEqual([])
  })

  it('a marca continua com as 29 de antes — os ícones já gravados não mudam', () => {
    expect(MENU_BRAND_ICON_KEYS).toHaveLength(29)
    expect(MENU_BRAND_ICON_KEYS).toContain('gota-afetiva')
    expect(MENU_BRAND_ICON_KEYS).toContain('unha')
    expect(menuIconKey('gota-afetiva')).toBe('gota-afetiva')
  })
})

// ---------------------------------------------------------------------------
// NAV-19 — chave inválida degrada para "sem ícone", nunca quebra a barra
// ---------------------------------------------------------------------------
describe('menuIconKey (NAV-19)', () => {
  it('devolve a chave quando ela é do conjunto', () => {
    expect(menuIconKey('corrente')).toBe('corrente')
    expect(menuIconKey('flor-prensada')).toBe('flor-prensada')
  })

  const invalidos: [string, unknown][] = [
    ['emoji do catálogo anterior', '🎸'],
    ['string vazia', ''],
    ['só espaço', '   '],
    ['null', null],
    ['undefined', undefined],
    ['número', 42],
    ['objeto', { key: 'corrente' }],
    ['array', ['corrente']],
    ['chave desconhecida', 'foguete'],
    ['chave quase certa', 'correntes'],
    ['o pix, que está fora do conjunto', 'pix'],
  ]

  it.each(invalidos)('%s devolve null', (_label, raw) => {
    expect(menuIconKey(raw)).toBeNull()
  })

  it('tolera espaço nas bordas e caixa — valor que chegou por SQL na mão', () => {
    expect(menuIconKey('  corrente  ')).toBe('corrente')
    expect(menuIconKey('Corrente')).toBe('corrente')
    expect(menuIconKey('GOTA-AFETIVA')).toBe('gota-afetiva')
  })

  it('o mesmo ícone pode ser escolhido por dois itens — não é chave', () => {
    expect(menuIconKey('pingente')).toBe(menuIconKey('pingente'))
  })
})
