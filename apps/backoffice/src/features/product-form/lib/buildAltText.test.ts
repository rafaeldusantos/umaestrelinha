// PMD-01 AC 2 (A20, `AD-011`): a geração de alt-text é template puro, não IA.

import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildAltText } from './buildAltText'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildAltText', () => {
  it('junta nome do produto e rótulo com o separador do design', () => {
    expect(buildAltText('Botton Sailor Moon — Lua Prateada', 'Na mão')).toBe(
      'Botton Sailor Moon — Lua Prateada · Na mão',
    )
  })

  it('é determinístico — a mesma entrada dá a mesma saída', () => {
    const first = buildAltText('Botton Sailor Moon — Lua Prateada', 'Na mão')
    const second = buildAltText('Botton Sailor Moon — Lua Prateada', 'Na mão')
    expect(first).toBe(second)
  })

  it('NÃO chama serviço externo — nenhum fetch no caminho', () => {
    // O `fetch` estourando é a asserção: se a implementação um dia virar chamada de rede, este
    // teste quebra em vez de passar calado com um mock complacente.
    const fetchSpy = vi.fn(() => {
      throw new Error('buildAltText não pode chamar a rede')
    })
    vi.stubGlobal('fetch', fetchSpy)

    expect(buildAltText('Botton Sailor Moon', 'Na mão')).toBe('Botton Sailor Moon · Na mão')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sem rótulo, devolve só o nome do produto', () => {
    expect(buildAltText('Botton Sailor Moon')).toBe('Botton Sailor Moon')
  })

  it('rótulo em branco conta como ausente — não deixa separador solto', () => {
    expect(buildAltText('Botton Sailor Moon', '   ')).toBe('Botton Sailor Moon')
    expect(buildAltText('Botton Sailor Moon', null)).toBe('Botton Sailor Moon')
  })

  it('produto sem nome devolve null — nunca string vazia', () => {
    expect(buildAltText('')).toBeNull()
    expect(buildAltText('   ')).toBeNull()
    expect(buildAltText('   ', 'Na mão')).toBeNull()
  })

  it('apara espaços das pontas de nome e rótulo', () => {
    expect(buildAltText('  Botton Sailor Moon  ', '  Na mão  ')).toBe('Botton Sailor Moon · Na mão')
  })
})
