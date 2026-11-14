import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FREE_SHIPPING_REGIONS } from '../shipping/region.ts'

/**
 * O caminho não-React do frete grátis: o `cartStore` (zustand, sem hook) lê a configuração por
 * `runtimeFreeShippingConfig()`, hidratada por `setRuntimeShippingSettings`. As regiões têm de
 * chegar por ali junto do interruptor e da faixa — sem elas, o carrinho concederia frete grátis
 * numa campanha limitada a Sul e Sudeste.
 *
 * O módulo guarda estado; cada caso o recarrega do zero.
 */
type Constantes = typeof import('../constants')
let c: Constantes

beforeEach(async () => {
  vi.resetModules()
  c = await import('../constants')
})

describe('runtimeFreeShippingConfig — as regiões', () => {
  it('sem hidratação nenhuma, as cinco', () => {
    expect(c.runtimeFreeShippingConfig().free_shipping_regions).toEqual([...FREE_SHIPPING_REGIONS])
  })

  it('depois de `setRuntimeShippingSettings` com regiões, traz as regiões', () => {
    c.setRuntimeShippingSettings({
      free_shipping_enabled: true,
      free_shipping_threshold: 450,
      free_shipping_regions: ['sudeste', 'sul'],
    })
    const config = c.runtimeFreeShippingConfig()
    expect(config.free_shipping_regions).toEqual(['sul', 'sudeste'])
    expect(config.free_shipping_enabled).toBe(true)
    expect(config.free_shipping_threshold).toBe(450)
  })

  it('hidratação sem o campo vale as cinco', () => {
    c.setRuntimeShippingSettings({ free_shipping_enabled: true, free_shipping_threshold: 450 })
    expect(c.runtimeFreeShippingConfig().free_shipping_regions).toEqual([...FREE_SHIPPING_REGIONS])
  })

  it('lista vazia é guardada vazia (o frete grátis fica inativo), e não vira as cinco', () => {
    c.setRuntimeShippingSettings({ free_shipping_regions: [] })
    expect(c.runtimeFreeShippingConfig().free_shipping_regions).toEqual([])
  })

  it('mudar a lista de quem hidratou não muda o que foi guardado', () => {
    const lista = ['sul']
    c.setRuntimeShippingSettings({ free_shipping_regions: lista })
    lista.push('norte')
    expect(c.runtimeFreeShippingConfig().free_shipping_regions).toEqual(['sul'])
  })
})
