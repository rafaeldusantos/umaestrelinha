import { describe, it, expect } from 'vitest'
import { appendImages, summarizeUploads } from './renderPlan'

// APP-04: "preservar as imagens existentes e sua ordem (a principal/primeira não muda) e
// adicionar os novos ao final; se o produto não tinha imagens, o primeiro render vira a principal."
describe('appendImages (APP-04)', () => {
  it('preserva as existentes, sua ordem e a principal; anexa os novos ao final', () => {
    const result = appendImages(['a', 'b'], ['c', 'd'])
    expect(result).toEqual(['a', 'b', 'c', 'd'])
    expect(result[0]).toBe('a') // principal inalterada
  })

  it('quando não há imagens existentes, o primeiro render vira a principal', () => {
    const result = appendImages([], ['x', 'y'])
    expect(result).toEqual(['x', 'y'])
    expect(result[0]).toBe('x') // primeiro render é a principal
  })

  it('sem novos renders, retorna as existentes inalteradas', () => {
    expect(appendImages(['a', 'b'], [])).toEqual(['a', 'b'])
  })

  it('não muta os arrays de entrada', () => {
    const existing = ['a']
    const added = ['b']
    appendImages(existing, added)
    expect(existing).toEqual(['a'])
    expect(added).toEqual(['b'])
  })
})

// APP-05: "WHEN parte dos uploads falha THEN o sistema SHALL anexar os que tiveram sucesso e
// reportar as falhas, sem travar a UI." (urls = não-nulos na ordem; failed = contagem de nulls)
describe('summarizeUploads (APP-05)', () => {
  it('sucesso parcial: coleta os não-nulos na ordem e conta as falhas', () => {
    expect(summarizeUploads(['u1', null, 'u2'])).toEqual({ urls: ['u1', 'u2'], failed: 1 })
  })

  it('preserva a ordem dos sucessos com múltiplas falhas intercaladas', () => {
    expect(summarizeUploads([null, 'u1', null, 'u2'])).toEqual({ urls: ['u1', 'u2'], failed: 2 })
  })

  it('todas as falhas: nenhuma url, failed igual ao total', () => {
    expect(summarizeUploads([null, null])).toEqual({ urls: [], failed: 2 })
  })

  it('todos os sucessos: todas as urls, zero falhas', () => {
    expect(summarizeUploads(['u1', 'u2', 'u3'])).toEqual({ urls: ['u1', 'u2', 'u3'], failed: 0 })
  })

  it('lista vazia: nenhuma url, zero falhas', () => {
    expect(summarizeUploads([])).toEqual({ urls: [], failed: 0 })
  })
})
