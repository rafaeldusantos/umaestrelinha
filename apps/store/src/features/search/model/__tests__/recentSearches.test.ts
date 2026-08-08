import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { readRecentSearches, pushRecentSearch, clearRecentSearches } from '../recentSearches'

const KEY = 'nanapin-recent-searches'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('recentSearches', () => {
  it('guarda o mais recente no topo', () => {
    pushRecentSearch('naruto')
    expect(pushRecentSearch('one piece')).toEqual(['one piece', 'naruto'])
    expect(readRecentSearches()).toEqual(['one piece', 'naruto'])
  })

  it('repetido sobe em vez de duplicar, sem diferenciar caixa', () => {
    pushRecentSearch('naruto')
    pushRecentSearch('kpop')
    expect(pushRecentSearch('NARUTO')).toEqual(['NARUTO', 'kpop'])
  })

  it('guarda no máximo 5', () => {
    ;['a1', 'b2', 'c3', 'd4', 'e5', 'f6'].forEach(pushRecentSearch)
    expect(readRecentSearches()).toEqual(['f6', 'e5', 'd4', 'c3', 'b2'])
  })

  it('ignora termo vazio e limpa tudo', () => {
    pushRecentSearch('naruto')
    expect(pushRecentSearch('   ')).toEqual(['naruto'])
    expect(clearRecentSearches()).toEqual([])
    expect(readRecentSearches()).toEqual([])
  })

  it('sobrevive a conteúdo inválido no storage', () => {
    localStorage.setItem(KEY, 'não é json')
    expect(readRecentSearches()).toEqual([])
    localStorage.setItem(KEY, JSON.stringify(['ok', 42, '', null]))
    expect(readRecentSearches()).toEqual(['ok'])
  })

  it('não quebra quando o storage lança (Safari privado)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readRecentSearches()).toEqual([])
    // Sem storage o termo não persiste, mas a lista devolvida segue coerente com o que a pessoa
    // acabou de fazer — a busca não pode piorar por causa de uma restrição do navegador.
    expect(pushRecentSearch('naruto')).toEqual(['naruto'])
  })
})
