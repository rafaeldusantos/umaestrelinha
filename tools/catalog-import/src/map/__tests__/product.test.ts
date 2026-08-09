import { describe, expect, it } from 'vitest'

import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawProduct } from '../../nuvemshop/types.ts'
import { mapProduct } from '../product.ts'

const reais = products as RawProduct[]
const bySlug = (slug: string) => reais.find(p => (p.handle as { pt: string }).pt === slug)!

const mapped = (p: RawProduct) => {
  const out = mapProduct(p)
  if (out.kind !== 'product') throw new Error(`esperava produto, veio skip: ${out.reason}`)
  return out.row
}

describe('mapProduct — âncora da fixture', () => {
  it('lê os 6 produtos do recorte real', () => {
    expect(reais).toHaveLength(6)
  })
})

describe('mapProduct — identidade (CAT-02)', () => {
  it('preserva o slug exatamente como a Nuvemshop publica', () => {
    for (const p of reais) {
      const out = mapProduct(p)
      const slug = out.kind === 'product' ? out.row.slug : out.slug
      expect(slug).toBe((p.handle as { pt: string }).pt)
    }
  })

  it('carrega o SEO da origem quando ele existe — os 6 produtos reais têm os dois campos', () => {
    const row = mapped(bySlug('pingente-pata-colecao-fragmentos'))
    expect(row.seo_title).toBe('Pingente Pata Coleção Fragmentos | Uma Estrelinha')
    expect(row.seo_description).not.toBeNull()
    expect(row.description).not.toBeNull()
  })

  it('devolve `null` — e não string vazia — em campo textual ausente', () => {
    // `video_url` é o caso real: nulo nos 690 produtos do catálogo. Os demais campos usam a mesma
    // regra, exercitada aqui com o valor vazio que a origem usaria.
    const row = mapped(bySlug('pingente-pata-colecao-fragmentos'))
    expect(row.video_url).toBeNull()

    const vazios = mapped({
      ...bySlug('pingente-pata-colecao-fragmentos'),
      description: { pt: '' },
      seo_title: { pt: '   ' },
      seo_description: { pt: '' },
    } as RawProduct)
    expect(vazios.description).toBeNull()
    expect(vazios.seo_title).toBeNull()
    expect(vazios.seo_description).toBeNull()
  })
})

describe('mapProduct — publicação (CAT-08)', () => {
  it('importa produto despublicado como is_active false, preservando o slug', () => {
    const despublicado = reais.find(p => p.published === false)!
    const out = mapProduct(despublicado)
    const slug = out.kind === 'product' ? out.row.slug : out.slug
    expect(slug).toBe((despublicado.handle as { pt: string }).pt)
    if (out.kind === 'product') expect(out.row.is_active).toBe(false)
  })

  it('importa produto publicado como is_active true', () => {
    expect(mapped(bySlug('corrente-singapura-em-prata-925')).is_active).toBe(true)
  })
})

describe('mapProduct — o que é pulado (CAT-08)', () => {
  it('pula o produto sem preço em nenhuma variação, nomeando o motivo', () => {
    const out = mapProduct(bySlug('pingente-figa-colecao-fragmentos'))
    expect(out.kind).toBe('skip')
    if (out.kind === 'skip') {
      expect(out.reason).toBe('sem_preco')
      expect(out.slug).toBe('pingente-figa-colecao-fragmentos')
      expect(out.nuvemshop_id).toBe(282225744)
    }
  })

  it('pula produto sem nome, e o motivo distingue do produto sem preço', () => {
    const semNome = { ...bySlug('pingente-pata-colecao-fragmentos'), name: { pt: '   ' } } as RawProduct
    const out = mapProduct(semNome)
    expect(out.kind).toBe('skip')
    if (out.kind === 'skip') expect(out.reason).toBe('sem_nome')
  })

  it('no recorte real, o único pulado é o produto sem preço', () => {
    const skips = reais.map(mapProduct).filter(o => o.kind === 'skip')
    expect(skips).toHaveLength(1)
    expect(skips[0].kind === 'skip' && skips[0].slug).toBe('pingente-figa-colecao-fragmentos')
  })
})

describe('mapProduct — eixos (CAT-04)', () => {
  it('monta os 3 eixos com os valores distintos que as variações usam, na ordem de aparição', () => {
    const row = mapped(bySlug('joia-afetiva-gota-com-leite-materno-cabelo-e-desenho-em-prata-925'))
    expect(row.options).toHaveLength(3)
    expect(row.options.map(o => o.name)).toEqual(['Com Base', 'Cor', 'Com gravação'])
    expect(row.options.map(o => o.position)).toEqual([0, 1, 2])
    for (const option of row.options) {
      expect(option.values.length).toBeGreaterThan(0)
      expect(new Set(option.values).size, `valores repetidos em ${option.name}`).toBe(option.values.length)
    }
  })

  it('devolve lista vazia de eixos para produto de variação única sem eixo', () => {
    const semEixo = reais.find(p => p.attributes.length === 0 && p.variants.length === 1)!
    const out = mapProduct(semEixo)
    if (out.kind === 'product') expect(out.row.options).toEqual([])
  })

  it('nunca passa de 3 eixos, que é o teto da UI da loja', () => {
    for (const p of reais) {
      const out = mapProduct(p)
      if (out.kind === 'product') expect(out.row.options.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('mapProduct — política de estoque (CAT-04)', () => {
  it('usa `none` quando toda variação tem estoque ilimitado na origem', () => {
    const p = reais.find(x => x.variants.every(v => v.stock_management === false))!
    const out = mapProduct(p)
    if (out.kind === 'product') expect(out.row.stock_policy).toBe('none')
  })

  it('usa `track` quando alguma variação gerencia estoque', () => {
    const p = reais.find(x => x.variants.some(v => v.stock_management === true))!
    const out = mapProduct(p)
    if (out.kind === 'product') expect(out.row.stock_policy).toBe('track')
  })

  it('nunca infere `backorder` — a origem não expressa essa intenção', () => {
    for (const p of reais) {
      const out = mapProduct(p)
      if (out.kind === 'product') expect(out.row.stock_policy).not.toBe('backorder')
    }
  })
})

describe('mapProduct — base_price semeado (CAT-04)', () => {
  it('semeia com o MENOR preço efetivo entre as variações', () => {
    const p = bySlug('joia-afetiva-gota-com-leite-materno-cabelo-e-desenho-em-prata-925')
    const esperado = Math.min(
      ...p.variants
        .map(v => Number(v.promotional_price ?? v.price))
        .filter(n => Number.isFinite(n) && n > 0),
    )
    expect(mapped(p).base_price).toBe(esperado)
  })

  it('usa o preço promocional, não o de tabela, quando ele existe', () => {
    // Medido: price "84.00", promotional_price "64.90" — cobrar 84 seria cobrar mais que a tela.
    const row = mapped(bySlug('corrente-singapura-em-prata-925'))
    expect(row.base_price).toBe(64.9)
  })
})

describe('mapProduct — stock_total, de que a disponibilidade depende (CAT-04)', () => {
  it('soma o saldo das variações vendáveis', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const esperado = p.variants
      .filter(v => v.visible === true && Number(v.promotional_price ?? v.price) > 0)
      .reduce((s, v) => s + (v.stock ?? 0), 0)
    expect(mapped(p).stock_total).toBe(esperado)
  })

  it('produto SEM eixo recebe o saldo da sua única variação — é dele que a loja lê', () => {
    // `hasSellableGrid` exige `options.length > 0`; sem eixo, a loja decide "esgotado" por
    // `stock_total`. Deixar 0 fez 60 produtos com estoque real aparecerem como "Indisponível".
    const semEixo = reais.find(p => p.attributes.length === 0 && p.variants.length === 1
      && p.variants[0].stock !== null && p.variants[0].stock > 0)
    if (semEixo) {
      const out = mapProduct(semEixo)
      if (out.kind === 'product') {
        expect(out.row.options).toEqual([])
        expect(out.row.stock_total).toBe(semEixo.variants[0].stock)
        expect(out.row.stock_total).toBeGreaterThan(0)
      }
    }
    // E a regra, exercitada sem depender do recorte:
    const base = bySlug('corrente-singapura-em-prata-925')
    const forjado = {
      ...base,
      attributes: [],
      variants: [{ ...base.variants[0], stock: 7, stock_management: true, visible: true }],
    } as RawProduct
    expect(mapped(forjado).stock_total).toBe(7)
  })

  it('não conta linha pausada nem linha sem preço', () => {
    const base = bySlug('corrente-singapura-em-prata-925')
    const forjado = {
      ...base,
      attributes: [],
      variants: [
        { ...base.variants[0], stock: 7, visible: true },
        { ...base.variants[0], id: 999001, stock: 100, visible: false },
        { ...base.variants[0], id: 999002, stock: 50, price: null, promotional_price: null, visible: true },
      ],
    } as RawProduct
    expect(mapped(forjado).stock_total).toBe(7)
  })

  it('estoque ilimitado na origem vira 0, e quem responde por isso é stock_policy none', () => {
    const semGestao = reais.find(p => p.variants.every(v => v.stock_management === false))!
    const out = mapProduct(semGestao)
    if (out.kind === 'product') {
      expect(out.row.stock_total).toBe(0)
      expect(out.row.stock_policy).toBe('none')
    }
  })
})

describe('mapProduct — vínculo de categoria (CAT-05)', () => {
  it('leva os ids de categoria da origem, na ordem em que vieram', () => {
    const p = bySlug('joia-afetiva-gota-com-leite-materno-cabelo-e-desenho-em-prata-925')
    expect(mapped(p).category_nuvemshop_ids).toEqual(p.categories.map(c => c.id))
  })

  it('aceita produto sem nenhuma categoria', () => {
    const semCategoria = reais.find(p => p.categories.length === 0)!
    const out = mapProduct(semCategoria)
    if (out.kind === 'product') expect(out.row.category_nuvemshop_ids).toEqual([])
  })
})

describe('mapProduct — o que NÃO é escrito (CAT-12)', () => {
  it('não emite campo de vitrine: is_featured, is_new, is_promo e sort_order são da loja', () => {
    const row = mapped(bySlug('pingente-pata-colecao-fragmentos'))
    for (const chave of ['is_featured', 'is_new', 'is_promo', 'sort_order']) {
      expect(Object.prototype.hasOwnProperty.call(row, chave), `emitiu ${chave}`).toBe(false)
    }
  })
})
