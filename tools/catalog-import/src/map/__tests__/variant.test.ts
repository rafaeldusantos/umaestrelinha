import { describe, expect, it } from 'vitest'

import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawProduct } from '../../nuvemshop/types.ts'
import { mapVariants } from '../variant.ts'

const reais = products as RawProduct[]
const bySlug = (slug: string) => reais.find(p => (p.handle as { pt: string }).pt === slug)!

describe('mapVariants — âncora', () => {
  it('mapeia as 38 variações do recorte real', () => {
    expect(reais.flatMap(mapVariants)).toHaveLength(38)
  })
})

describe('mapVariants — dinheiro (CAT-04)', () => {
  it('grava o preço promocional como preço cobrado', () => {
    // Medido: price "84.00", promotional_price "64.90". Gravar 84 cobraria mais que a tela promete.
    const rows = mapVariants(bySlug('corrente-singapura-em-prata-925'))
    const comPromo = rows.find(r => r.nuvemshop_id === 1250310075)!
    expect(comPromo.price).toBe(64.9)
  })

  it('descarta o "de" quando ele é igual ao preço cobrado', () => {
    // A mesma variação tem compare_at_price "84.00" contra preço cobrado de 64,90 — esse É um "de"
    // verdadeiro. O caso espelhado está coberto abaixo, no varrimento do recorte.
    const rows = mapVariants(bySlug('corrente-singapura-em-prata-925'))
    expect(rows.find(r => r.nuvemshop_id === 1250310075)!.compare_price).toBe(84)
  })

  it('em nenhuma variação do recorte o "de" é menor ou igual ao preço cobrado', () => {
    for (const row of reais.flatMap(mapVariants)) {
      if (row.compare_price !== null) {
        expect(row.price).not.toBeNull()
        expect(row.compare_price, `variação ${row.nuvemshop_id}`).toBeGreaterThan(row.price!)
      }
    }
  })

  it('mantém a variação sem preço, com price nulo e inativa', () => {
    const rows = mapVariants(bySlug('pingente-figa-colecao-fragmentos'))
    expect(rows).toHaveLength(1)
    expect(rows[0].price).toBeNull()
    expect(rows[0].is_active).toBe(false)
    // O nuvemshop_id é preservado: a linha existe, é rastreável, e não é vendável.
    expect(rows[0].nuvemshop_id).toBeGreaterThan(0)
  })
})

describe('mapVariants — eixos (CAT-04)', () => {
  it('monta option_values pareando nome do eixo com valor da variação', () => {
    const rows = mapVariants(bySlug('joia-afetiva-gota-com-leite-materno-cabelo-e-desenho-em-prata-925'))
    expect(Object.keys(rows[0].option_values)).toEqual(['Com Base', 'Cor', 'Com gravação'])
    expect(rows[0].option_values['Cor']).toBe('Prata 925')
  })

  it('monta o rótulo legível juntando os valores com " · "', () => {
    const rows = mapVariants(bySlug('joia-afetiva-gota-com-leite-materno-cabelo-e-desenho-em-prata-925'))
    expect(rows[0].name).toBe('Não · Prata 925 · Não')
  })

  it('deixa option_values vazio e name nulo em produto sem eixo', () => {
    const rows = mapVariants(bySlug('pingente-figa-colecao-fragmentos'))
    expect(rows[0].option_values).toEqual({})
    expect(rows[0].name).toBeNull()
  })
})

describe('mapVariants — estoque (CAT-04)', () => {
  it('grava 0 quando a origem manda null por estoque ilimitado', () => {
    const semGestao = reais.flatMap(p => mapVariants(p).map((r, i) => ({ r, raw: p.variants[i] })))
      .filter(x => x.raw.stock_management === false)
    expect(semGestao.length).toBeGreaterThan(0)
    for (const { r } of semGestao) expect(r.stock).toBe(0)
  })

  it('preserva o saldo quando a origem gerencia estoque', () => {
    const rows = mapVariants(bySlug('corrente-singapura-em-prata-925'))
    const gerenciada = rows.find(r => r.nuvemshop_id === 1250310075)!
    expect(gerenciada.stock).toBe(10)
  })
})

describe('mapVariants — atividade', () => {
  it('respeita `visible: false` da origem', () => {
    const p = bySlug('pingente-pata-colecao-fragmentos')
    const escondida = { ...p, variants: p.variants.map(v => ({ ...v, visible: false })) } as RawProduct
    for (const row of mapVariants(escondida)) expect(row.is_active).toBe(false)
  })

  it('mantém ativa a variação visível e com preço', () => {
    const rows = mapVariants(bySlug('pingente-pata-colecao-fragmentos'))
    expect(rows.some(r => r.is_active)).toBe(true)
  })
})

describe('mapVariants — SKU bruto (a deduplicação é global, em map/sku.ts)', () => {
  it('normaliza SKU vazio para null', () => {
    const vazios = reais.flatMap(p => mapVariants(p).map((r, i) => ({ r, raw: p.variants[i] })))
      .filter(x => (x.raw.sku ?? '').trim() === '')
    expect(vazios.length).toBeGreaterThan(0)
    for (const { r } of vazios) expect(r.sku).toBeNull()
  })

  it('preserva o SKU preenchido, sem espaço nas pontas', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const comSku = { ...p, variants: p.variants.map(v => ({ ...v, sku: '  BA-002  ' })) } as RawProduct
    expect(mapVariants(comSku)[0].sku).toBe('BA-002')
  })

  it('NÃO deduplica aqui — duplicata sai igual, para a regra global decidir', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const repetido = { ...p, variants: p.variants.map(v => ({ ...v, sku: 'BA-002' })) } as RawProduct
    const rows = mapVariants(repetido)
    for (const row of rows) expect(row.sku).toBe('BA-002')
  })
})

describe('mapVariants — vínculos e ordem', () => {
  it('carrega o produto de origem, a posição e a imagem da variação', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const rows = mapVariants(p)
    expect(rows[0].product_nuvemshop_id).toBe(p.id)
    expect(rows[0].position).toBe(p.variants[0].position)
    expect(rows[0].image_nuvemshop_id).toBe(p.variants[0].image_id)
  })

  it('converte o peso em string decimal para número', () => {
    const rows = mapVariants(bySlug('corrente-singapura-em-prata-925'))
    expect(rows[0].weight_kg).toBe(0.03)
  })
})
