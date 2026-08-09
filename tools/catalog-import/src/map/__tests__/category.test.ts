import { describe, expect, it } from 'vitest'

import categories from '../../__fixtures__/categories.json' with { type: 'json' }
import type { RawCategory } from '../../nuvemshop/types.ts'
import { CURATED_EXCLUDED, CURATED_INACTIVE, mapCategories } from '../category.ts'

const reais = categories as RawCategory[]

/** Categoria mínima, para os casos que a fixture real não contém (pai depois da filha, ciclo). */
const cat = (over: Partial<RawCategory> & { id: number }): RawCategory => ({
  parent: 0,
  subcategories: [],
  visibility: 'visible',
  name: { pt: `Categoria ${over.id}` },
  handle: { pt: `categoria-${over.id}` },
  description: { pt: '' },
  seo_title: { pt: '' },
  seo_description: { pt: '' },
  created_at: '2025-07-03T00:41:41+00:00',
  updated_at: '2026-07-19T18:35:29+00:00',
  ...over,
})

describe('mapCategories — identidade da categoria (CAT-02, CAT-05)', () => {
  it('preserva o slug da origem', () => {
    const rows = mapCategories(reais)
    const joias = rows.find(r => r.nuvemshop_id === 32376553)!
    expect(joias.slug).toBe('joias-afetivas')
    expect(joias.name).toBe('Joias afetivas')
  })

  it('devolve `null` em description vazia, em vez de string vazia', () => {
    const rows = mapCategories([cat({ id: 1, description: { pt: '' } })])
    expect(rows[0].description).toBeNull()
  })

  it('trata `parent: 0` como raiz', () => {
    const rows = mapCategories([cat({ id: 1, parent: 0 })])
    expect(rows[0].parent_nuvemshop_id).toBeNull()
  })

  it('trata pai ausente da resposta como raiz, em vez de apontar para o que não existe', () => {
    const rows = mapCategories([cat({ id: 7, parent: 999999 })])
    expect(rows[0].parent_nuvemshop_id).toBeNull()
  })
})

describe('mapCategories — ordem topológica (CAT-05)', () => {
  it('emite toda pai antes de qualquer filha sua, mesmo quando a resposta traz a filha primeiro', () => {
    const rows = mapCategories([
      cat({ id: 20, parent: 10 }),
      cat({ id: 10, parent: 0, subcategories: [20] }),
    ])
    expect(rows.map(r => r.nuvemshop_id)).toEqual([10, 20])
  })

  it('emite avó, mãe e filha nessa ordem numa árvore de 3 níveis embaralhada', () => {
    const rows = mapCategories([
      cat({ id: 30, parent: 20 }),
      cat({ id: 20, parent: 10, subcategories: [30] }),
      cat({ id: 10, parent: 0, subcategories: [20] }),
    ])
    expect(rows.map(r => r.nuvemshop_id)).toEqual([10, 20, 30])
  })

  it('no catálogo real, nenhuma filha aparece antes da sua pai', () => {
    const rows = mapCategories(reais)
    // 39 na origem menos as 2 de `CURATED_EXCLUDED` (feature `23`).
    expect(rows).toHaveLength(37)
    const vistos = new Set<number>()
    for (const r of rows) {
      if (r.parent_nuvemshop_id !== null) {
        expect(vistos.has(r.parent_nuvemshop_id), `filha ${r.nuvemshop_id} antes da pai`).toBe(true)
      }
      vistos.add(r.nuvemshop_id)
    }
  })

  it('lança em vez de pendurar quando a hierarquia tem ciclo', () => {
    expect(() => mapCategories([
      cat({ id: 1, parent: 2 }),
      cat({ id: 2, parent: 1 }),
    ])).toThrow(/ciclo/)
  })
})

describe('mapCategories — sort_order derivado (CAT-05)', () => {
  it('usa o índice em `subcategories[]` do pai, que é a única ordem que a origem declara', () => {
    const rows = mapCategories([
      cat({ id: 10, parent: 0, subcategories: [30, 20] }),
      cat({ id: 20, parent: 10 }),
      cat({ id: 30, parent: 10 }),
    ])
    // A resposta traz 20 antes de 30, mas o PAI declara 30 primeiro — o pai vence.
    expect(rows.find(r => r.nuvemshop_id === 30)!.sort_order).toBe(0)
    expect(rows.find(r => r.nuvemshop_id === 20)!.sort_order).toBe(1)
  })

  it('cai para o índice entre irmãos quando o pai não lista a filha', () => {
    const rows = mapCategories([
      cat({ id: 10, parent: 0, subcategories: [] }),
      cat({ id: 20, parent: 10 }),
      cat({ id: 30, parent: 10 }),
    ])
    expect(rows.find(r => r.nuvemshop_id === 20)!.sort_order).toBe(0)
    expect(rows.find(r => r.nuvemshop_id === 30)!.sort_order).toBe(1)
  })

  it('ordena as raízes pelo índice na resposta', () => {
    const rows = mapCategories(reais)
    const raizes = rows.filter(r => r.parent_nuvemshop_id === null)
    // 10 raízes na origem menos as 2 excluídas, que eram raiz. A sequência segue CONTÍGUA: o corte
    // acontece antes da derivação, então excluir não deixa buraco na ordem da vitrine.
    expect(raizes).toHaveLength(8)
    expect(raizes.map(r => r.sort_order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(raizes[0].slug).toBe('joias-afetivas')
  })
})

describe('mapCategories — curadoria (CAT-11)', () => {
  it('lista exatamente as duas categorias desativadas, uma verificação por elemento', () => {
    expect(CURATED_INACTIVE.size).toBe(2)
    expect(CURATED_INACTIVE.has(35119124)).toBe(true) // Black Friday
    expect(CURATED_INACTIVE.has(34729760)).toBe(true) // Profissões
  })

  it('desativa as duas e nenhuma outra', () => {
    const rows = mapCategories(reais)
    const inativas = rows.filter(r => !r.active).map(r => r.nuvemshop_id).sort((a, b) => a - b)
    expect(inativas).toEqual([34729760, 35119124])
  })

  it('preserva o slug das duas — desativar não é apagar (CAT-02)', () => {
    const rows = mapCategories(reais)
    for (const id of CURATED_INACTIVE.keys()) {
      const row = rows.find(r => r.nuvemshop_id === id)!
      const origem = reais.find(c => c.id === id)!
      expect(row.slug, `slug da categoria ${id}`).toBe((origem.handle as { pt: string }).pt)
      expect(row.slug).not.toBe('')
    }
  })

  it('desativa também o que a origem esconde', () => {
    const rows = mapCategories([cat({ id: 1, visibility: 'hidden' })])
    expect(rows[0].active).toBe(false)
  })

  it('mantém ativas as 35 restantes do catálogo real', () => {
    const rows = mapCategories(reais)
    expect(rows.filter(r => r.active)).toHaveLength(35)
  })
})

// 23 · T19 — as excluídas, decisão do usuário em 2026-08-09.
describe('mapCategories — categorias excluídas por curadoria', () => {
  it('lista exatamente as duas categorias excluídas, uma verificação por elemento', () => {
    expect(CURATED_EXCLUDED.size).toBe(2)
    expect(CURATED_EXCLUDED.has(32509753)).toBe(true) // Brinquedos
    expect(CURATED_EXCLUDED.has(32697621)).toBe(true) // Rastreio
  })

  it('as duas listas são disjuntas — excluir e desativar são desfechos diferentes', () => {
    for (const id of CURATED_EXCLUDED.keys()) {
      expect(CURATED_INACTIVE.has(id), `${id} está nas duas listas`).toBe(false)
    }
  })

  it('a chave é `nuvemshop_id`: todo motivo é texto e toda chave é número', () => {
    for (const [id, motivo] of CURATED_EXCLUDED) {
      expect(typeof id).toBe('number')
      expect(motivo).not.toBe('')
    }
  })

  it('NÃO emite as excluídas — nem ativas, nem inativas', () => {
    const emitidos = mapCategories(reais).map(r => r.nuvemshop_id)
    for (const id of CURATED_EXCLUDED.keys()) {
      expect(emitidos, `emitiu a categoria excluída ${id}`).not.toContain(id)
    }
  })

  it('as duas EXISTEM na origem — sem isso o corte não estaria cortando nada', () => {
    for (const id of CURATED_EXCLUDED.keys()) {
      expect(reais.some(c => c.id === id), `${id} não está na fixture`).toBe(true)
    }
  })

  it('nenhuma filha pende das excluídas na fixture — senão `parentOf` a promoveria a raiz em silêncio', () => {
    for (const id of CURATED_EXCLUDED.keys()) {
      const filhas = reais.filter(c => c.parent === id).map(c => c.id)
      expect(filhas, `a categoria ${id} tem filhas na origem`).toEqual([])
      expect(reais.find(c => c.id === id)!.subcategories).toEqual([])
    }
  })

  it('quando a excluída TEM filha, a filha vira raiz — o comportamento declarado, provado', () => {
    const rows = mapCategories([
      cat({ id: 32509753, parent: 0, subcategories: [77] }),
      cat({ id: 77, parent: 32509753 }),
    ])
    expect(rows.map(r => r.nuvemshop_id)).toEqual([77])
    expect(rows[0].parent_nuvemshop_id).toBeNull()
  })
})

describe('mapCategories — o que NÃO é escrito', () => {
  it('não emite campo de vitrine: show_in_menu e menu_promo são curadoria do admin (AD-014)', () => {
    const rows = mapCategories(reais)
    for (const chave of ['show_in_menu', 'menu_promo', 'banner_url', 'color_accent', 'icon']) {
      expect(Object.prototype.hasOwnProperty.call(rows[0], chave), `emitiu ${chave}`).toBe(false)
    }
  })
})
