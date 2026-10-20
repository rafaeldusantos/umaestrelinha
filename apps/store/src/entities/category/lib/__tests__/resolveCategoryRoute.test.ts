import { describe, expect, it } from 'vitest'
import { resolveCategoryRoute as daLoja } from '../resolveCategoryRoute'
import { resolveCategoryRoute as deCore } from '@estrelinha/core/page'

/**
 * Feature 69, T02 — a regra mudou de casa para `@estrelinha/core/page`, e os 13 casos que moravam
 * aqui foram com ela (`packages/core/src/page/__tests__/categoryRoute.test.ts`, sem uma asserção
 * mudada). O que sobra para a loja provar é que ela NÃO tem uma segunda escrita: o que a
 * `CategoryPage` chama é a MESMA função — identidade (`toBe`), não igualdade de resultado, que uma
 * cópia colada também satisfaria.
 */
describe('resolveCategoryRoute da loja', () => {
  it('é a função de core, por referência — nenhuma cópia', () => {
    expect(daLoja).toBe(deCore)
  })
})
