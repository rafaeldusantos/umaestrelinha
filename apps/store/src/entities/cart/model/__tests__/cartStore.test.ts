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

  it('storage v2 é preservado — só ganha `engravingText: null` (feature 22)', () => {
    // Este teste dizia "intacto" enquanto a v2 era a corrente. A v3 acrescentou a gravação à
    // identidade da linha, e a migração PRESERVA a sacola em vez de descartá-la: o que falta é um
    // campo opcional de default conhecido, não a variação (que é o que tornava a v1 impagável).
    const v2 = {
      items: [{
        product: product(), size: '', finish: '', quantity: 2,
        variantId: 'v1', variantLabel: '4,5 cm · Fosco', optionValues: {}, unitPrice: 7.9,
      }],
    }
    expect(migrate(v2, 2)).toEqual({
      items: [{ ...v2.items[0], engravingText: null }],
    })
  })

  it('storage v3 é preservado intacto', () => {
    const v3 = {
      items: [{
        product: product(), size: '', finish: '', quantity: 2,
        variantId: 'v1', variantLabel: '4,5 cm · Fosco', optionValues: {}, unitPrice: 7.9,
        engravingText: 'Ana',
      }],
    }
    expect(migrate(v3, 3)).toEqual(v3)
  })

  it('a versão declarada é 3', () => {
    expect(useCartStore.persist.getOptions().version).toBe(3)
  })
})

// =================================================================================================
// MAT-04 — a gravação faz parte da identidade da linha (feature 22)
// =================================================================================================
//
// Duas unidades do mesmo produto e da MESMA variação, com gravações diferentes, são dois pedidos
// diferentes para a bancada. Colapsá-las em quantidade 2 faria a Adri gravar um nome só em duas
// peças — e é a mesma armadilha que a chave de `variantId` já custou à loja anterior, em duas telas.

describe('identidade da linha — gravação (MAT-04)', () => {
  it('mesma variação com gravações DIFERENTES = 2 linhas', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')
    useCartStore.getState().addItem(p, '', '', variant(), 'Léo')

    expect(items()).toHaveLength(2)
    expect(items().map(i => i.engravingText)).toEqual(['Ana', 'Léo'])
  })

  it('mesma variação com a MESMA gravação = 1 linha, quantity 2', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')

    expect(items()).toHaveLength(1)
    expect(items()[0].quantity).toBe(2)
  })

  it('com gravação e sem gravação são linhas distintas', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')
    useCartStore.getState().addItem(p, '', '', variant())

    expect(items()).toHaveLength(2)
    expect(items().map(i => i.engravingText)).toEqual(['Ana', null])
  })

  it('a chave vale também para produto SEM grade', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', undefined, 'Ana')
    useCartStore.getState().addItem(p, '', '', undefined, 'Léo')

    expect(items()).toHaveLength(2)
  })

  it('`removeItem` tira a linha certa quando há duas gravações', () => {
    // É aqui que a chave errada custa caro: remover "Ana" apagando "Léo" (ou nada) é o defeito que
    // a loja anterior teve em duas telas.
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')
    useCartStore.getState().addItem(p, '', '', variant(), 'Léo')

    useCartStore.getState().removeItem(p.id, '', '', 'v1', 'Ana')

    expect(items()).toHaveLength(1)
    expect(items()[0].engravingText).toBe('Léo')
  })

  it('`updateQuantity` acerta a linha certa quando há duas gravações', () => {
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant(), 'Ana')
    useCartStore.getState().addItem(p, '', '', variant(), 'Léo')

    useCartStore.getState().updateQuantity(p.id, '', '', 5, 'v1', 'Léo')

    expect(items().find(i => i.engravingText === 'Léo')?.quantity).toBe(5)
    expect(items().find(i => i.engravingText === 'Ana')?.quantity).toBe(1)
  })

  it('gravação não altera o subtotal — quem precifica é a variação', () => {
    // MAT-06: material e texto não mexem em dinheiro. O acréscimo de gravação vem de
    // `product_variants`, pelo caminho que o servidor recalcula.
    const p = product()
    useCartStore.getState().addItem(p, '', '', variant({ unitPrice: 7.9 }), 'Ana')

    expect(useCartStore.getState().subtotal()).toBe(7.9)
  })
})

describe('persistência — v2 → v3 PRESERVA a sacola', () => {
  it('item sem `engravingText` vira item com `null`, e continua no carrinho', () => {
    // Diferente do salto v1 → v2, que descartava: lá faltava a variação, e um pedido sem
    // `variant_id` o servidor recusa a pagar. Aqui falta um campo opcional cujo default é conhecido.
    const persistido = {
      items: [
        {
          product: product(), size: '', finish: '', variantId: 'v1',
          variantLabel: '4,5 cm', optionValues: {}, unitPrice: 7.9, quantity: 2,
        },
      ],
    }

    const migrado = (useCartStore.persist.getOptions().migrate as
      (p: unknown, v: number) => { items: { engravingText: string | null; quantity: number }[] })(
      persistido, 2,
    )

    expect(migrado.items).toHaveLength(1)
    expect(migrado.items[0].engravingText).toBeNull()
    expect(migrado.items[0].quantity).toBe(2)
  })

  it('sacola v1 continua sendo DESCARTADA — ali faltava a variação', () => {
    const migrado = (useCartStore.persist.getOptions().migrate as
      (p: unknown, v: number) => { items: unknown[] })({ items: [{ product: product() }] }, 1)

    expect(migrado.items).toEqual([])
  })
})
