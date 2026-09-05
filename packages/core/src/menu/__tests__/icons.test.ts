import { describe, expect, it } from 'vitest'
import { MENU_ICON_KEYS, MENU_ICON_LABELS, menuIconKey } from '../icons'

// ---------------------------------------------------------------------------
// NAV-21 — um dono só do conjunto
// ---------------------------------------------------------------------------
describe('o catálogo de chaves (NAV-21)', () => {
  it('tem as 28 chaves do conjunto da loja — âncora de contagem', () => {
    // Sem âncora, uma lista que encolhesse pela metade passaria em silêncio: todo teste abaixo
    // continuaria verde com uma chave só. 28 é o registro `ESTRELINHA_ICONS` menos o `pix`, que é
    // marca de meio de pagamento e não obedece às regras do conjunto.
    expect(MENU_ICON_KEYS).toHaveLength(28)
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
