import { describe, expect, it } from 'vitest'
import {
  mapDbToProduct,
  PRODUCT_CARD_SELECT,
  PRODUCT_CARD_SELECT_BY_CATEGORY,
} from '../mapProduct'

/**
 * O guarda de `PRF-08`: **a consulta traz o que o card desenha, e o card desenha o que a consulta
 * traz**.
 *
 * O modo de falha que ele existe para pegar não quebra nada. Um campo que a listagem lê e o
 * `select` enxuto não pede chega como `undefined`, `mapDbToProduct` o coalesce para o default, e a
 * tela renderiza — com frete calculado por fallback, sem selo, ou sem a variação. É o `AD-012` de
 * novo: tipo escrito à mão é afirmação, e aqui a afirmação é a string do `select`.
 *
 * Por isso a régua não lê o código do mapper: ela **recorta uma linha completa do banco pelo que o
 * `select` de fato pede** e passa o recorte por `mapDbToProduct`. O que sobrar vazio é exatamente o
 * que a cliente veria vazio.
 */

/** Separa por vírgula de topo — vírgula dentro de `(...)` é do embed, não da lista. */
const topLevelParts = (select: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let atual = ''
  for (const ch of select) {
    if (ch === '(') depth += 1
    if (ch === ')') depth -= 1
    if (ch === ',' && depth === 0) {
      parts.push(atual.trim())
      atual = ''
      continue
    }
    atual += ch
  }
  if (atual.trim() !== '') parts.push(atual.trim())
  return parts
}

interface Recorte {
  /** Colunas escalares pedidas. */
  colunas: string[]
  /** Embeds pedidos: nome da relação → colunas internas. Alias vira chave própria. */
  embeds: { alias: string; relacao: string; colunas: string[] }[]
}

/** Lê o `select` como o PostgREST leria: colunas de topo e embeds, com alias e FK nomeada. */
const parseSelect = (select: string): Recorte => {
  const colunas: string[] = []
  const embeds: Recorte['embeds'] = []

  for (const parte of topLevelParts(select)) {
    const abre = parte.indexOf('(')
    if (abre === -1) {
      colunas.push(parte)
      continue
    }
    const cabeca = parte.slice(0, abre)
    const dentro = parte.slice(abre + 1, parte.lastIndexOf(')'))
    // `filtro:product_categories!inner` → alias `filtro`, relação `product_categories`.
    const [aliasOuRelacao, relacaoDepoisDoAlias] = cabeca.includes(':')
      ? [cabeca.split(':')[0], cabeca.split(':')[1]]
      : [null, cabeca]
    // `categories!products_category_id_fkey` → relação `categories`.
    const relacao = relacaoDepoisDoAlias.split('!')[0]
    embeds.push({
      alias: aliasOuRelacao ?? relacao,
      relacao,
      colunas: dentro.split(',').map(c => c.trim()),
    })
  }

  return { colunas, embeds }
}

/**
 * Uma linha COMPLETA de `products`, como o banco tem — com as colunas que o enxuto deixa de fora.
 *
 * Os valores são distinguíveis de propósito: se o recorte deixar passar o que não foi pedido, ou o
 * mapper cair num default, a diferença aparece no `expect`.
 */
const LINHA_COMPLETA: Record<string, unknown> = {
  id: 'prod-1',
  name: 'Colar de leite materno',
  slug: 'colar-de-leite-materno',
  base_price: 289.9,
  original_price: 349.9,
  category_id: 'cat-1',
  categories: { slug: 'colares', name: 'Colares' },
  description: '<p>Uma peça feita com o leite que alimentou.</p>',
  seo_title: 'Colar de leite materno | Uma Estrelinha',
  seo_description: 'Joia afetiva em resina',
  brand: 'Uma Estrelinha',
  mpn: 'UE-001',
  age_group: 'adult',
  gender: 'female',
  google_product_category: '188',
  identifier_exists: false,
  cost_price: 90,
  video_url: 'https://exemplo.invalid/video',
  scheduled_at: null,
  related_product_ids: ['prod-9'],
  buy_together_ids: ['prod-8'],
  production_lead_days: 15,
  is_promo: false,
  sort_order: 3,
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-03T00:00:00Z',
  images: [{ url: 'colar.webp', alt: 'Colar', source: 'upload' }],
  options: [{ name: 'Banho', values: ['Ouro', 'Prata'], position: 0 }],
  stock_policy: 'backorder',
  stock: 7,
  stock_total: 7,
  low_stock_threshold: 3,
  is_new: true,
  is_featured: true,
  tags: ['leite-materno', 'colar'],
  weight_kg: 0.12,
  width_cm: 9,
  height_cm: 3,
  length_cm: 14,
  requires_material: true,
  material_kinds: ['leite_materno'],
  engraving_max_chars: 20,
  product_variants: [
    {
      id: 'v1',
      product_id: 'prod-1',
      name: 'Ouro',
      sku: 'UE-001-OURO',
      price: 299.9,
      compare_price: 359.9,
      stock: 4,
      image_url: 'colar-ouro.webp',
      is_active: true,
      position: 1,
      option_values: { Banho: 'Ouro' },
      weight_kg: 0.12,
      nuvemshop_id: 1259936246,
      created_at: '2026-01-02T00:00:00Z',
    },
  ],
  product_categories: [
    { category_id: 'cat-colares', position: 0 },
    { category_id: 'cat-joias', position: 1 },
  ],
}

/** A linha que o PostgREST devolveria para este `select` — nada além do que foi pedido. */
const recortar = (select: string, linha = LINHA_COMPLETA): Record<string, unknown> => {
  const { colunas, embeds } = parseSelect(select)
  const out: Record<string, unknown> = {}

  for (const coluna of colunas) {
    if (coluna in linha) out[coluna] = linha[coluna]
  }

  for (const embed of embeds) {
    const valor = linha[embed.relacao]
    const recorteDeUm = (row: Record<string, unknown>) => {
      const filtrado: Record<string, unknown> = {}
      for (const c of embed.colunas) if (c in row) filtrado[c] = row[c]
      return filtrado
    }
    if (Array.isArray(valor)) {
      out[embed.alias] = valor.map(row => recorteDeUm(row as Record<string, unknown>))
    } else if (valor && typeof valor === 'object') {
      out[embed.alias] = recorteDeUm(valor as Record<string, unknown>)
    }
  }

  return out
}

const mapeado = (select = PRODUCT_CARD_SELECT) => mapDbToProduct(recortar(select))

/** A régua de `SHP-02`: as quatro dimensões chegaram, ou a cotação sai por fallback. */
const dimensoesChegaram = (select: string): boolean => {
  const p = mapeado(select)
  return (
    typeof p.weight_kg === 'number' &&
    typeof p.width_cm === 'number' &&
    typeof p.height_cm === 'number' &&
    typeof p.length_cm === 'number'
  )
}

describe('PRODUCT_CARD_SELECT — a forma do select', () => {
  it('lê como uma lista de colunas e embeds, e não como uma string opaca', () => {
    // Âncora de contagem: sem ela um parser errado devolveria lista vazia e TODAS as asserções de
    // ausência abaixo passariam em silêncio — a pior falha possível num guarda desses.
    const { colunas, embeds } = parseSelect(PRODUCT_CARD_SELECT)
    expect(colunas.length).toBeGreaterThanOrEqual(20)
    expect(embeds.map(e => e.relacao).sort()).toEqual([
      'categories',
      'product_categories',
      'product_variants',
    ])
  })

  it('não traz `description` — 293.448 dos 1.220.067 bytes da categoria medida', () => {
    expect(parseSelect(PRODUCT_CARD_SELECT).colunas).not.toContain('description')
  })

  it('não traz os campos de SEO, que só a edge function e o feed leem', () => {
    const { colunas } = parseSelect(PRODUCT_CARD_SELECT)
    expect(colunas).not.toContain('seo_title')
    expect(colunas).not.toContain('seo_description')
  })

  it('não traz os seis campos de Google Shopping, que rodam fora do navegador', () => {
    const { colunas } = parseSelect(PRODUCT_CARD_SELECT)
    for (const campo of [
      'brand',
      'mpn',
      'age_group',
      'gender',
      'google_product_category',
      'identifier_exists',
    ]) {
      expect(colunas).not.toContain(campo)
    }
  })

  it('a variação pede lista explícita de colunas, nunca `*`', () => {
    const variantes = parseSelect(PRODUCT_CARD_SELECT).embeds.find(
      e => e.relacao === 'product_variants',
    )!
    expect(variantes.colunas).not.toContain('*')
    expect(variantes.colunas).toEqual(
      expect.arrayContaining(['id', 'price', 'stock', 'is_active', 'position', 'option_values']),
    )
  })

  it('nomeia a FK ao embutir categories, senão o PostgREST devolve 300 PGRST201', () => {
    expect(PRODUCT_CARD_SELECT).toContain('categories!products_category_id_fkey(')
    const ambiguo = /(^|[^_])\bcategories\(/.test(PRODUCT_CARD_SELECT)
    expect(ambiguo).toBe(false)
  })

  it('PST-06: o filtro por categoria continua num embed ALIASED, e product_categories volta inteiro', () => {
    const { embeds } = parseSelect(PRODUCT_CARD_SELECT_BY_CATEGORY)
    const filtro = embeds.find(e => e.alias === 'filtro')!
    const selo = embeds.find(e => e.alias === 'product_categories')!

    expect(filtro.relacao).toBe('product_categories')
    expect(PRODUCT_CARD_SELECT_BY_CATEGORY).toContain('filtro:product_categories!inner(')
    // O embed do selo NÃO é `!inner`: recortado, `displayCategory` escolheria outra categoria.
    expect(selo.colunas).toEqual(['category_id', 'position'])
  })
})

describe('PRODUCT_CARD_SELECT — a linha recortada ainda preenche o card', () => {
  it('preço e preço comparado', () => {
    const p = mapeado()
    expect(p.price).toBe(289.9)
    expect(p.compare_price).toBe(349.9)
  })

  it('tags e is_new — os dois eixos que os filtros da categoria leem (LST-*)', () => {
    const p = mapeado()
    expect(p.tags).toEqual(['leite-materno', 'colar'])
    expect(p.is_new).toBe(true)
    expect(p.is_featured).toBe(true)
  })

  it('a imagem principal e a lista de imagens', () => {
    const p = mapeado()
    expect(p.image_url).toBe('colar.webp')
    expect(p.images).toEqual([{ url: 'colar.webp', alt: 'Colar', source: 'upload' }])
  })

  it('a categoria do selo: category_slug e os vínculos N:N completos (PST-06)', () => {
    const p = mapeado()
    expect(p.category_slug).toBe('colares')
    expect(p.category_links).toEqual([
      { category_id: 'cat-colares', position: 0 },
      { category_id: 'cat-joias', position: 1 },
    ])
  })

  it('a grade: options e a variação vendável, com preço, estoque e amostra de cor', () => {
    const p = mapeado()
    expect(p.options).toEqual([{ name: 'Banho', values: ['Ouro', 'Prata'], position: 0 }])
    expect(p.variants).toHaveLength(1)
    expect(p.variants[0]).toMatchObject({
      id: 'v1',
      // `product_id` não é pedido: `normalizeVariants` cai no id do produto, e tem de ser o mesmo.
      product_id: 'prod-1',
      name: 'Ouro',
      price: 299.9,
      compare_price: 359.9,
      stock: 4,
      image_url: 'colar-ouro.webp',
      is_active: true,
      position: 1,
      option_values: { Banho: 'Ouro' },
    })
  })

  it('a política de estoque e os números que decidem "últimas peças"', () => {
    const p = mapeado()
    expect(p.stock_policy).toBe('backorder')
    expect(p.stock_total).toBe(7)
    expect(p.low_stock_threshold).toBe(3)
  })

  it('SHP-02: as quatro dimensões da cotação de frete', () => {
    const p = mapeado()
    expect(p.weight_kg).toBe(0.12)
    expect(p.width_cm).toBe(9)
    expect(p.height_cm).toBe(3)
    expect(p.length_cm).toBe(14)
  })

  it('feature 22: requires_material, material_kinds e engraving_max_chars', () => {
    const p = mapeado()
    expect(p.requires_material).toBe(true)
    expect(p.material_kinds).toEqual(['leite_materno'])
    expect(p.engraving_max_chars).toBe(20)
  })

  it('a descrição chega VAZIA — é a economia, e ela é deliberada', () => {
    // O contraponto do teste acima: o que sai do select tem de sair de verdade. Se `description`
    // voltasse, a economia de 293 KB seria só uma frase no comentário.
    expect(mapeado().description).toBe('')
  })
})

describe('PRODUCT_CARD_SELECT — sensores da régua', () => {
  it('a régua APROVA o select real', () => {
    expect(dimensoesChegaram(PRODUCT_CARD_SELECT)).toBe(true)
  })

  it('sensor SHP-02: tirar `weight_kg` do select REPROVA — o frete cairia no fallback 11/2/16/0.1', () => {
    const semPeso = PRODUCT_CARD_SELECT.replace('weight_kg, ', '')
    expect(semPeso).not.toBe(PRODUCT_CARD_SELECT)
    expect(dimensoesChegaram(semPeso)).toBe(false)
  })

  it('sensor do recorte: coluna não pedida NÃO chega ao mapper', () => {
    // Prova que o recorte é o PostgREST, e não um `select` que devolve a linha inteira: se o
    // recorte deixasse passar tudo, todo teste acima passaria com qualquer select.
    const recorte = recortar(PRODUCT_CARD_SELECT)
    expect(recorte.description).toBeUndefined()
    expect(recorte.seo_title).toBeUndefined()
    expect(recorte.created_at).toBeUndefined()
    const [variante] = recorte.product_variants as Record<string, unknown>[]
    expect(variante.sku).toBeUndefined()
    expect(variante.nuvemshop_id).toBeUndefined()
  })

  it('sensor do recorte: o select COMPLETO deixaria a descrição passar', () => {
    // O outro lado do sensor — o recorte não apaga por conta própria o que foi pedido.
    const comDescricao = `${PRODUCT_CARD_SELECT}, description`
    expect(mapDbToProduct(recortar(comDescricao)).description).toBe(
      '<p>Uma peça feita com o leite que alimentou.</p>',
    )
  })
})
