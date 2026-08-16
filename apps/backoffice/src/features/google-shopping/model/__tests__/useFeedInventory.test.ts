import { describe, expect, it } from 'vitest'
import { feedExclusion } from '@estrelinha/core/shopping'
import { buildInventory } from '../useFeedInventory'

/**
 * `GSH-22` — a contagem que a dona confere contra o painel do Google.
 *
 * A régua central deste arquivo não é a aritmética: é que a contagem **sai de `feedExclusion`**, o
 * mesmo dono que a edge function usa. Uma segunda regra aqui faria a tela prometer um número que o
 * feed não produz — e a divergência só apareceria comparando com o Merchant Center, dias depois.
 */

const linha = (over: Record<string, unknown> = {}) =>
  ({
    id: 'v1',
    is_active: true,
    price: 19.9,
    products: { id: 'p1', name: 'Pulseira', slug: 'pulseira', is_active: true },
    ...over,
  }) as never

describe('buildInventory — a contagem', () => {
  it('conta as publicáveis', () => {
    expect(buildInventory([linha(), linha({ id: 'v2' })]).publicadas).toBe(2)
  })

  it('separa por motivo, e traz TODAS as chaves — zero é informação', () => {
    const inv = buildInventory([
      linha(),
      linha({ id: 'v2', is_active: false }),
      linha({ id: 'v3', price: null }),
    ])
    expect(inv.publicadas).toBe(1)
    expect(inv.porMotivo).toEqual({ produto_inativo: 0, variacao_inativa: 1, sem_preco: 1 })
  })

  it('produto inativo entra no motivo do produto', () => {
    const inv = buildInventory([
      linha({ products: { id: 'p1', name: 'X', slug: 'x', is_active: false } }),
    ])
    expect(inv.porMotivo.produto_inativo).toBe(1)
    expect(inv.publicadas).toBe(0)
  })

  it('publicadas + excluídas fecham com o total', () => {
    const inv = buildInventory([
      linha(),
      linha({ id: 'v2', is_active: false }),
      linha({ id: 'v3', price: null }),
      linha({ id: 'v4' }),
    ])
    expect(inv.publicadas + inv.excluidas.length).toBe(inv.total)
  })

  it('variação sem produto legível não é contada como publicável', () => {
    expect(buildInventory([linha({ products: null })]).publicadas).toBe(0)
  })
})

describe('buildInventory — a lista é acionável', () => {
  it('cada excluída traz o produto para a dona chegar nele', () => {
    const inv = buildInventory([linha({ id: 'v9', price: null })])
    expect(inv.excluidas[0]).toEqual({
      variantId: 'v9',
      productId: 'p1',
      productName: 'Pulseira',
      productSlug: 'pulseira',
      motivo: 'sem_preco',
    })
  })

  it('nada entra na lista quando tudo é publicável', () => {
    expect(buildInventory([linha(), linha({ id: 'v2' })]).excluidas).toEqual([])
  })
})

/**
 * **Sensor: a contagem é derivada, não reescrita.**
 *
 * Se a tela tivesse a própria condição, inverter a decisão central de `feedExclusion` mudaria o feed
 * e **não** mudaria a tela. Aqui o teste amarra os dois: para cada linha, o motivo que o inventário
 * registra é exatamente o que `feedExclusion` devolve — inclusive na ordem de precedência, que é
 * decisão de `core` e não deste arquivo.
 */
describe('sensor: a contagem é a mesma regra do feed', () => {
  it('o motivo de cada excluída é o que feedExclusion devolve', () => {
    const linhas = [
      linha({ id: 'a', is_active: false }),
      linha({ id: 'b', price: null }),
      linha({ id: 'c', products: { id: 'p', name: 'N', slug: 's', is_active: false } }),
    ]
    const inv = buildInventory(linhas)
    for (const excluida of inv.excluidas) {
      const original = linhas.find(l => (l as never as { id: string }).id === excluida.variantId)!
      const bruta = original as never as {
        is_active: boolean
        price: number | null
        products: { is_active: boolean }
      }
      expect(excluida.motivo).toBe(feedExclusion(bruta.products, bruta))
    }
  })

  it('a precedência vem de core: produto inativo vence variação inativa', () => {
    const inv = buildInventory([
      linha({
        id: 'z',
        is_active: false,
        price: null,
        products: { id: 'p', name: 'N', slug: 's', is_active: false },
      }),
    ])
    expect(inv.excluidas[0].motivo).toBe('produto_inativo')
    expect(inv.porMotivo.variacao_inativa).toBe(0)
    expect(inv.porMotivo.sem_preco).toBe(0)
  })
})
