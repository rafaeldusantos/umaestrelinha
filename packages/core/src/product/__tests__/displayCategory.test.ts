import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  displayCategoryLinksFromRows,
  displayCategorySlug,
  embeddedDisplayCategory,
  pickDisplayCategory,
} from '../displayCategory'
import { normalizeCategoryLinks } from '../index'

// A régua da categoria de exibição (`PST-06` AC 3), no dono único — feature 61.
//
// Os casos da régua moraram em DOIS lugares até aqui: em `displayCategory.test.ts` da loja (que
// continua lá, intocado, provando que a delegação não mudou o comportamento) e numa cópia no teste
// da edge function `mercado-pago`, que provava a cópia da régua. A cópia saiu; os casos vieram.

const vinculo = (category_id: string, position: number, sort_order: number | null, slug = category_id) => ({
  category_id,
  position,
  category: sort_order === null ? null : { slug, sort_order },
})

describe('pickDisplayCategory — a régua', () => {
  it('menor sort_order vence, não a primeira do vínculo', () => {
    expect(pickDisplayCategory([vinculo('b', 0, 5), vinculo('a', 9, 1)])?.slug).toBe('a')
  })

  it('empate em sort_order ⇒ menor position', () => {
    expect(pickDisplayCategory([vinculo('b', 0, 5), vinculo('a', 1, 5)])?.slug).toBe('b')
    expect(pickDisplayCategory([vinculo('b', 4, 0), vinculo('a', 0, 0)])?.slug).toBe('a')
  })

  it('empate nos dois ⇒ menor category_id — determinístico em qualquer ordem de chegada', () => {
    const z = vinculo('z', 0, 0)
    const m = vinculo('m', 0, 0)
    expect(pickDisplayCategory([z, m])?.slug).toBe('m')
    expect(pickDisplayCategory([m, z])?.slug).toBe('m')
  })

  it('vínculo sem categoria resolvida não concorre', () => {
    expect(pickDisplayCategory([vinculo('a', 0, null), vinculo('b', 5, 9)])?.slug).toBe('b')
  })

  it('sem vínculo, ou nenhum resolvido ⇒ null', () => {
    expect(pickDisplayCategory(null)).toBeNull()
    expect(pickDisplayCategory(undefined)).toBeNull()
    expect(pickDisplayCategory([])).toBeNull()
    expect(pickDisplayCategory([vinculo('a', 0, null)])).toBeNull()
  })

  it('devolve a MESMA categoria que recebeu — a loja precisa do objeto inteiro (nome do selo)', () => {
    const categoria = { slug: 'anime', sort_order: 1, name: 'Anime', id: 'anime' }
    expect(pickDisplayCategory([{ category_id: 'anime', position: 0, category: categoria }])).toBe(categoria)
  })

  it('não reordena a lista recebida', () => {
    const lista = [vinculo('b', 0, 5), vinculo('a', 9, 1)]
    pickDisplayCategory(lista)
    expect(lista.map(l => l.category_id)).toEqual(['b', 'a'])
  })
})

describe('displayCategorySlug — o item_category do GA4', () => {
  it('o slug da escolhida, aparado', () => {
    expect(displayCategorySlug([vinculo('b', 0, 5), vinculo('a', 0, 1, '  joias-afetivas ')])).toBe(
      'joias-afetivas',
    )
  })

  it('escolhida sem slug legível ⇒ null, nunca string vazia', () => {
    expect(displayCategorySlug([{ category_id: 'a', position: 0, category: { slug: '  ', sort_order: 0 } }])).toBeNull()
    expect(displayCategorySlug([])).toBeNull()
  })
})

describe('o embed cru do PostgREST', () => {
  it('embeddedDisplayCategory: ausente ⇒ undefined; torto ⇒ null; bom ⇒ só slug e sort_order', () => {
    expect(embeddedDisplayCategory(undefined)).toBeUndefined()
    expect(embeddedDisplayCategory(null)).toBeNull()
    expect(embeddedDisplayCategory([])).toBeNull()
    expect(embeddedDisplayCategory({ name: 'Sem slug', sort_order: 1 })).toBeNull()
    expect(embeddedDisplayCategory({ slug: 'x', name: 'X', sort_order: 3 })).toEqual({ slug: 'x', sort_order: 3 })
    expect(embeddedDisplayCategory({ slug: 'x', sort_order: 'lixo' })).toEqual({ slug: 'x', sort_order: 0 })
  })

  it('categoria INATIVA é null — o servidor (service role) a veria, a loja (RLS) não', () => {
    expect(embeddedDisplayCategory({ slug: 'x', sort_order: 0, active: false })).toBeNull()
    expect(embeddedDisplayCategory({ slug: 'x', sort_order: 0, active: true })).toEqual({ slug: 'x', sort_order: 0 })
    // `active` ausente — o select não pediu a coluna — conta como ativa.
    expect(embeddedDisplayCategory({ slug: 'x', sort_order: 0 })).toEqual({ slug: 'x', sort_order: 0 })
    expect(
      displayCategorySlug(
        displayCategoryLinksFromRows([
          { category_id: 'off', position: 0, categories: { slug: 'desligada', sort_order: 0, active: false } },
          { category_id: 'on', position: 1, categories: { slug: 'ligada', sort_order: 5, active: true } },
        ]),
      ),
    ).toBe('ligada')
  })

  it('displayCategoryLinksFromRows lê o embed `categories` do vínculo', () => {
    expect(
      displayCategoryLinksFromRows([
        { category_id: 'c1', position: 2, categories: { slug: 'a', sort_order: 1, name: 'A' } },
        { category_id: '', position: 0, categories: { slug: 'b', sort_order: 0 } },
        { category_id: 'c3', categories: null },
        null,
      ]),
    ).toEqual([
      { category_id: 'c1', position: 2, category: { slug: 'a', sort_order: 1 } },
      { category_id: 'c3', position: 2, category: null },
    ])
    expect(displayCategoryLinksFromRows(null)).toEqual([])
  })

  it('a loja (normalizeCategoryLinks) e o servidor (displayCategoryLinksFromRows) leem o embed IGUAL', () => {
    const linhas = [
      { category_id: 'c2', position: 1, categories: { slug: 'linha-pet', name: 'Linha Pet', sort_order: 2 } },
      { category_id: 'c1', position: 0, categories: { slug: 'joias-afetivas', name: 'Joias', sort_order: 0 } },
      { category_id: 'c9', position: 3, categories: null },
    ]
    expect(normalizeCategoryLinks(linhas)).toEqual(displayCategoryLinksFromRows(linhas))
    expect(displayCategorySlug(normalizeCategoryLinks(linhas))).toBe('joias-afetivas')
  })

  it('sem o embed no select, o vínculo da loja continua como antes — sem a chave `category`', () => {
    expect(normalizeCategoryLinks([{ category_id: 'c1', position: 0 }])).toEqual([
      { category_id: 'c1', position: 0 },
    ])
  })
})

describe('o Deno alcança o dono', () => {
  // A edge function `mercado-pago` importa ESTE arquivo por caminho relativo. O Deno resolve o grafo
  // de tipos antes da primeira linha rodar: um import de alias (`@estrelinha/...`) ou sem `.ts`
  // derrubaria o worker. A régua mais simples que prova isso é a ausência de import.
  const FONTE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'displayCategory.ts'), 'utf8')
  const semComentario = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
  const IMPORTA = /^\s*(import|export)\s[^;]*\bfrom\s+['"]|\bimport\s*\(/m

  it('o arquivo não importa nada', () => {
    expect(FONTE.length).toBeGreaterThan(500)
    expect(IMPORTA.test(semComentario(FONTE))).toBe(false)
  })

  it('sensor: um import de tipo por alias é acusado — e a prosa que o cita não', () => {
    expect(IMPORTA.test("import type { Category } from '@estrelinha/supabase/types'")).toBe(true)
    expect(IMPORTA.test(semComentario("// import type { Category } from '@estrelinha/supabase/types'"))).toBe(false)
  })

  it('e a edge function o importa pelo ARQUIVO, nunca pelo barrel', () => {
    const fn = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../../../supabase/functions/mercado-pago/analytics.ts'),
      'utf8',
    )
    expect(fn).toContain('"../../../packages/core/src/product/displayCategory.ts"')
    expect(semComentario(fn)).not.toMatch(/packages\/core\/src\/product\/index|packages\/core\/src\/product["']/)
  })
})
