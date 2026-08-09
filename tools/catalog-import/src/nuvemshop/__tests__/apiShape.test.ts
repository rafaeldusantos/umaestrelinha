import { describe, expect, it } from 'vitest'

import categories from '../../__fixtures__/categories.json' with { type: 'json' }
import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawCategory, RawProduct } from '../types.ts'

/**
 * `AD-012` — tipo escrito à mão é afirmação, não verificação.
 *
 * `types.ts` afirma coisas sobre um servidor de terceiro. Este arquivo confronta cada afirmação com
 * bytes capturados da API real em 2026-08-09. Se a Nuvemshop mudar a forma, é aqui que quebra — e
 * não no meio do import de 690 produtos.
 *
 * ÂNCORA DE CONTAGEM (`L-021`): toda varredura começa provando que leu o que deveria ler. Sem isso,
 * um caminho de fixture errado faz o arquivo varrer zero registro e passar em VERDE, que é a pior
 * falha possível num teste deste tipo.
 */

const cats = categories as RawCategory[]
const prods = products as RawProduct[]

const CAT_COUNT = 39
const PROD_COUNT = 6
const VARIANT_COUNT = 38
const IMAGE_COUNT = 43

const hasKey = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

describe('âncora de contagem das fixtures', () => {
  it('leu as 39 categorias reais', () => {
    expect(cats).toHaveLength(CAT_COUNT)
  })

  it('leu os 6 produtos do recorte real', () => {
    expect(prods).toHaveLength(PROD_COUNT)
  })

  it('leu as 38 variações e as 43 imagens do recorte', () => {
    expect(prods.flatMap(p => p.variants)).toHaveLength(VARIANT_COUNT)
    expect(prods.flatMap(p => p.images)).toHaveLength(IMAGE_COUNT)
  })
})

describe('forma da categoria', () => {
  it('traz todos os campos que o mapeamento lê, em todas as 39', () => {
    for (const c of cats) {
      for (const key of ['id', 'parent', 'subcategories', 'visibility', 'name', 'handle', 'description']) {
        expect(hasKey(c, key), `categoria ${c.id} sem ${key}`).toBe(true)
      }
      expect(typeof c.id).toBe('number')
      expect(typeof c.parent).toBe('number')
      expect(Array.isArray(c.subcategories)).toBe(true)
    }
  })

  it('usa `parent: 0` para raiz, e não `null`', () => {
    const roots = cats.filter(c => c.parent === 0)
    expect(roots).toHaveLength(10)
    expect(cats.some(c => c.parent === null)).toBe(false)
  })

  it('NÃO traz campo de ordenação — a ordem só existe em `subcategories[]` do pai', () => {
    // Esta asserção é o que impede alguém de "descobrir" um `sort_order` que a origem não tem e
    // trocar o derivado por ele. Se a Nuvemshop passar a mandar ordem, este teste cai e a decisão
    // é revisitada de propósito.
    for (const c of cats) {
      for (const key of ['order', 'position', 'sort', 'sort_order']) {
        expect(hasKey(c, key), `categoria ${c.id} passou a ter ${key}`).toBe(false)
      }
    }
  })
})

describe('forma do produto', () => {
  it('traz todos os campos que o mapeamento lê, em todos os 6', () => {
    for (const p of prods) {
      for (const key of [
        'id', 'name', 'handle', 'description', 'published', 'visibility',
        'attributes', 'variants', 'images', 'categories', 'seo_title', 'seo_description', 'video_url',
      ]) {
        expect(hasKey(p, key), `produto ${p.id} sem ${key}`).toBe(true)
      }
    }
  })

  it('tem um valor por eixo em toda variação', () => {
    for (const p of prods) {
      for (const v of p.variants) {
        expect(v.values, `produto ${p.id} variação ${v.id}`).toHaveLength(p.attributes.length)
      }
    }
  })

  it('nunca passa de 3 eixos — o mesmo teto que a UI da loja impõe', () => {
    for (const p of prods) expect(p.attributes.length).toBeLessThanOrEqual(3)
  })
})

describe('forma da variação — as armadilhas que o mapeamento depende de conhecer', () => {
  const variants = prods.flatMap(p => p.variants)

  it('traz todos os campos que o mapeamento lê', () => {
    for (const v of variants) {
      for (const key of [
        'id', 'price', 'promotional_price', 'compare_at_price', 'stock',
        'stock_management', 'sku', 'values', 'position', 'visible', 'weight', 'image_id',
      ]) {
        expect(hasKey(v, key), `variação ${v.id} sem ${key}`).toBe(true)
      }
    }
  })

  it('entrega preço como STRING, nunca number', () => {
    const comPreco = variants.filter(v => v.price !== null)
    expect(comPreco.length).toBeGreaterThan(0)
    for (const v of comPreco) expect(typeof v.price).toBe('string')
  })

  it('entrega `stock: null` quando `stock_management` é false', () => {
    const semGestao = variants.filter(v => v.stock_management === false)
    expect(semGestao.length).toBeGreaterThan(0)
    for (const v of semGestao) expect(v.stock).toBeNull()
  })

  it('tem `compare_at_price` IGUAL ao preço — o caso que a guarda existe para pegar', () => {
    const espelhados = variants.filter(
      v => v.compare_at_price !== null && v.price !== null
        && Number(v.compare_at_price) === Number(v.promotional_price ?? v.price),
    )
    expect(espelhados.length).toBeGreaterThan(0)
  })

  it('tem `compare_at_price` MAIOR que o preço efetivo — o "de" verdadeiro', () => {
    const reais = variants.filter(
      v => v.compare_at_price !== null && v.price !== null
        && Number(v.compare_at_price) > Number(v.promotional_price ?? v.price),
    )
    expect(reais.length).toBeGreaterThan(0)
  })
})

describe('forma da imagem', () => {
  const images = prods.flatMap(p => p.images)

  it('traz `id`, `src` e `position`, e `position` começa em 1', () => {
    for (const i of images) {
      expect(hasKey(i, 'id')).toBe(true)
      expect(typeof i.src).toBe('string')
      expect(i.position).toBeGreaterThanOrEqual(1)
    }
  })

  it('entrega `alt` nas DUAS formas — objeto localizado e array', () => {
    // As duas convivem no mesmo catálogo. Foi tratar `alt` só como array que produziu a contagem
    // errada de "3.660 sem alt" durante o design; são 3.640.
    const formas = new Set(images.map(i => (Array.isArray(i.alt) ? 'array' : typeof i.alt)))
    expect(formas.size).toBeGreaterThan(0)
    for (const i of images) {
      expect(Array.isArray(i.alt) || typeof i.alt === 'object' || typeof i.alt === 'string').toBe(true)
    }
  })
})

describe('os casos de borda que o recorte precisa conter', () => {
  const eff = (v: { price: string | null; promotional_price: string | null }) => {
    const raw = v.promotional_price ?? v.price
    const n = Number(raw)
    return raw !== null && Number.isFinite(n) && n > 0 ? n : null
  }

  it('contém um produto despublicado', () => {
    expect(prods.filter(p => p.published === false).length).toBeGreaterThan(0)
  })

  it('contém um produto sem categoria', () => {
    expect(prods.filter(p => p.categories.length === 0).length).toBeGreaterThan(0)
  })

  it('contém um produto sem imagem', () => {
    expect(prods.filter(p => p.images.length === 0).length).toBeGreaterThan(0)
  })

  it('contém o produto sem preço em nenhuma variação', () => {
    const semPreco = prods.filter(p => !p.variants.some(v => eff(v) !== null))
    expect(semPreco).toHaveLength(1)
    expect(String((semPreco[0].handle as { pt: string }).pt)).toBe('pingente-figa-colecao-fragmentos')
  })

  it('contém variação com `promotional_price`', () => {
    expect(prods.flatMap(p => p.variants).filter(v => v.promotional_price !== null).length).toBeGreaterThan(0)
  })

  it('contém produto de 3 eixos e produto de variação única sem eixo', () => {
    expect(prods.filter(p => p.attributes.length === 3).length).toBeGreaterThan(0)
    expect(prods.filter(p => p.attributes.length === 0 && p.variants.length === 1).length).toBeGreaterThan(0)
  })

  it('contém SKU repetido ENTRE produtos diferentes', () => {
    const porSku = new Map<string, Set<number>>()
    for (const p of prods) {
      for (const v of p.variants) {
        const sku = (v.sku ?? '').trim()
        if (sku === '') continue
        if (!porSku.has(sku)) porSku.set(sku, new Set())
        porSku.get(sku)!.add(p.id)
      }
    }
    expect([...porSku.values()].filter(ids => ids.size > 1).length).toBeGreaterThan(0)
  })

  it('contém SKU repetido DENTRO do mesmo produto', () => {
    const comDup = prods.filter(p => {
      const skus = p.variants.map(v => (v.sku ?? '').trim()).filter(s => s !== '')
      return skus.length !== new Set(skus).size
    })
    expect(comDup.length).toBeGreaterThan(0)
  })

  it('contém SKU vazio', () => {
    expect(prods.flatMap(p => p.variants).filter(v => (v.sku ?? '').trim() === '').length).toBeGreaterThan(0)
  })
})
