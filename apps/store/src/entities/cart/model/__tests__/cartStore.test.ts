import { describe, expect, it, beforeEach } from 'vitest'
import { useCartStore, type CartVariantInput } from '../cartStore'
import type { Product } from '@estrelinha/supabase/types'

// Testes derivados de PST-04, PST-02 (AC 1-3) e do "Done when" da T11.
//
// O que este arquivo protege é a identidade da linha e a origem do preço. Errar a identidade
// funde duas variações numa; errar a origem do preço mostra na tela um total diferente do que o
// servidor vai cobrar.

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1', name: 'Botton Naruto', slug: 'naruto', price: 5.9, compare_price: null,
    category_id: 'c1', category_slug: 'anime', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5,
    is_new: false, is_featured: false, tags: [],
    ...over,
  }) as Product

const variant = (over: Partial<CartVariantInput> = {}): CartVariantInput => ({
  variantId: 'v1',
  variantLabel: '4,5 cm · Fosco',
  optionValues: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
  unitPrice: 7.9,
  ...over,
})

const items = () => useCartStore.getState().items

beforeEach(() => {
  useCartStore.setState({ items: [] })
  localStorage.clear()
})

describe('identidade da linha — com variação', () => {
  it('mesmo produto com variações diferentes = 2 linhas', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v1', unitPrice: 5.9 }))
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v2', unitPrice: 9.4 }))
    expect(items()).toHaveLength(2)
    expect(items().map(i => i.variantId)).toEqual(['v1', 'v2'])
  })

  it('mesma variação adicionada 2× = 1 linha com quantity 2', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant())
    useCartStore.getState().addItem(p, '', '', variant())
    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(2)
  })

  it('guarda variantId, rótulo e optionValues do que foi escolhido', () => {
    useCartStore.getState().addItem(product(), '', '', variant())
    expect(items()[0]).toMatchObject({
      variantId: 'v1',
      variantLabel: '4,5 cm · Fosco',
      optionValues: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
      unitPrice: 7.9,
    })
  })

  it('a MESMA variação em produtos diferentes não colide', () => {
    useCartStore.getState().addItem(product({ id: 'p1' }), '', '', variant({ variantId: 'v1' }))
    useCartStore.getState().addItem(product({ id: 'p2' }), '', '', variant({ variantId: 'v2' }))
    expect(items()).toHaveLength(2)
  })
})

describe('identidade da linha — sem variação (janela até a T18)', () => {
  it('mesmo produto em tamanhos diferentes ainda são 2 linhas', () => {
    // Chavear só pelo productId — como o esboço do design sugeria — fundiria estas duas, o que
    // seria REGRESSÃO do comportamento de hoje. Até a T18 fazer a loja passar variantId,
    // `ProductCard` adiciona exatamente assim.
    const p = product()
    useCartStore.getState().addItem(p, '3,5 cm', 'Fosco')
    useCartStore.getState().addItem(p, '4,5 cm', 'Fosco')
    expect(items()).toHaveLength(2)
  })

  it('mesmo produto, mesmos eixos = 1 linha com quantity 2', () => {
    const p = product()
    useCartStore.getState().addItem(p, '3,5 cm', 'Fosco')
    useCartStore.getState().addItem(p, '3,5 cm', 'Fosco')
    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(2)
  })

  it('variantId fica null e unitPrice cai em product.price', () => {
    useCartStore.getState().addItem(product({ price: 5.9 }), '3,5 cm', 'Fosco')
    expect(items()[0].variantId).toBeNull()
    expect(items()[0].unitPrice).toBe(5.9)
  })

  it('o rótulo cai nos eixos antigos, para o carrinho não ficar sem descrição', () => {
    useCartStore.getState().addItem(product(), '3,5 cm', 'Fosco')
    expect(items()[0].variantLabel).toBe('3,5 cm · Fosco')
  })

  it('produto sem eixo nenhum tem rótulo vazio, sem separador solto', () => {
    useCartStore.getState().addItem(product())
    expect(items()[0].variantLabel).toBe('')
  })
})

describe('subtotal usa unitPrice, não product.price', () => {
  it('com valores DIVERGENTES, quem manda é unitPrice', () => {
    // product.price = 5,90 (o "a partir de" da vitrine) e a variação escolhida custa 9,40.
    // Somar product.price mostraria 5,90 na tela e o servidor cobraria 9,40.
    useCartStore.getState().addItem(product({ price: 5.9 }), '', '', variant({ unitPrice: 9.4 }))
    expect(useCartStore.getState().subtotal()).toBe(9.4)
  })

  it('multiplica pela quantidade', () => {
    useCartStore.getState().addItem(product({ price: 5.9 }), '', '', variant({ unitPrice: 9.4 }))
    useCartStore.getState().addItem(product({ price: 5.9 }), '', '', variant({ unitPrice: 9.4 }))
    expect(useCartStore.getState().subtotal()).toBe(18.8)
  })

  it('soma linhas de preços distintos do mesmo produto', () => {
    const p = product({ price: 5.9 })
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v1', unitPrice: 5.9 }))
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v2', unitPrice: 9.4 }))
    expect(useCartStore.getState().subtotal()).toBe(15.3)
  })

  it('nunca produz NaN quando o carrinho está vazio', () => {
    expect(useCartStore.getState().subtotal()).toBe(0)
  })
})

describe('remover e atualizar respeitam a variação', () => {
  it('remover uma variação não leva a outra do mesmo produto junto', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v1' }))
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v2' }))
    useCartStore.getState().removeItem('p1', '', '', 'v1')
    expect(items()).toHaveLength(1)
    expect(items()[0].variantId).toBe('v2')
  })

  it('atualizar quantidade acerta só a variação alvo', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v1' }))
    useCartStore.getState().addItem(p, '', '', variant({ variantId: 'v2' }))
    useCartStore.getState().updateQuantity('p1', '', '', 5, 'v1')
    expect(items().find(i => i.variantId === 'v1')?.quantity).toBe(5)
    expect(items().find(i => i.variantId === 'v2')?.quantity).toBe(1)
  })

  it('quantidade 0 remove a linha', () => {
    useCartStore.getState().addItem(product(), '', '', variant())
    useCartStore.getState().updateQuantity('p1', '', '', 0, 'v1')
    expect(items()).toHaveLength(0)
  })

  it('remover sem variantId ainda funciona para item sem variação', () => {
    useCartStore.getState().addItem(product(), '3,5 cm', 'Fosco')
    useCartStore.getState().removeItem('p1', '3,5 cm', 'Fosco')
    expect(items()).toHaveLength(0)
  })
})

describe('migração do storage', () => {
  const migrate = (useCartStore.persist.getOptions().migrate)!

  it('storage v1 (sem version) é DESCARTADO — carrinho antigo sem variant_id vira pedido impagável', () => {
    const v1 = { items: [{ product: product(), size: '3,5 cm', finish: 'Fosco', quantity: 2 }] }
    expect(migrate(v1, 0)).toEqual({ items: [] })
    expect(migrate(v1, 1)).toEqual({ items: [] })
  })

  it('storage v2 é preservado intacto', () => {
    const v2 = {
      items: [{
        product: product(), size: '', finish: '', quantity: 2,
        variantId: 'v1', variantLabel: '4,5 cm · Fosco', optionValues: {}, unitPrice: 7.9,
      }],
    }
    expect(migrate(v2, 2)).toEqual(v2)
  })

  it('a versão declarada é 2', () => {
    expect(useCartStore.persist.getOptions().version).toBe(2)
  })
})
