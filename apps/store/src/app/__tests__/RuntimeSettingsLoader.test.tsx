import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { runtimeFreeShippingConfig } from '@estrelinha/core/constants'

/**
 * A ponte para o caminho não-React leva as regiões do frete grátis junto do interruptor e da faixa.
 * Sem elas, o `cartStore` concederia frete grátis numa campanha limitada a Sul e Sudeste.
 */
const { settings } = vi.hoisted(() => ({ settings: { current: null as unknown } }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ data: settings.current }),
}))

import RuntimeSettingsLoader from '../RuntimeSettingsLoader'

describe('RuntimeSettingsLoader — hidrata as regiões do frete grátis', () => {
  it('as regiões do banco chegam a `runtimeFreeShippingConfig`, com o interruptor e a faixa', () => {
    settings.current = {
      shipping: {
        free_shipping_enabled: true,
        free_shipping_threshold: 450,
        free_shipping_regions: ['sudeste', 'sul'],
        default_shipping_cost: 9.9,
      },
    }
    render(<RuntimeSettingsLoader />)
    const config = runtimeFreeShippingConfig()
    expect(config.free_shipping_enabled).toBe(true)
    expect(config.free_shipping_threshold).toBe(450)
    expect(config.free_shipping_regions).toEqual(['sul', 'sudeste'])
  })
})
