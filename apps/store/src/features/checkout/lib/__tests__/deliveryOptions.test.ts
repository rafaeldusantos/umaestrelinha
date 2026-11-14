import { describe, expect, it } from 'vitest'
import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'
import { DEFAULT_SHIPPING_SERVICE_ID, deliveryOptions, toShippingDraft } from '../deliveryOptions'

const PAC: ShippingQuote = {
  id: 1,
  name: 'PAC',
  company: 'Correios',
  price: '14.90',
  delivery_time: 6,
  delivery_range: { min: 4, max: 6 },
}
const SEDEX: ShippingQuote = {
  id: 2,
  name: 'SEDEX',
  company: 'Correios',
  price: '24.80',
  delivery_time: 1,
}

// Segunda-feira, 27 de julho de 2026: 2 dias de produção + 4–6 dias dão "entre 4 e 6 de agosto".
const today = new Date(2026, 6, 27)
const base = { handlingDays: 2, today }

describe('deliveryOptions — a lista de opções de envio', () => {
  it('com o frete grátis concedido, só a mais barata sai grátis e com o preço cheio guardado', () => {
    const { options, cheapestId } = deliveryOptions({ ...base, quotes: [SEDEX, PAC], granted: true })

    expect(cheapestId).toBe('1')
    const pac = options.find((o) => o.serviceId === '1')
    const sedex = options.find((o) => o.serviceId === '2')
    expect(pac).toMatchObject({ free: true, cost: 0, price: 14.9, carrier: 'Correios', serviceName: 'PAC' })
    expect(sedex).toMatchObject({ free: false, cost: 24.8, price: 24.8 })
  })

  it('sem o frete grátis concedido, nenhuma sai grátis', () => {
    const { options } = deliveryOptions({ ...base, quotes: [PAC, SEDEX], granted: false })

    expect(options.map((o) => o.free)).toEqual([false, false])
    expect(options.map((o) => o.cost)).toEqual([14.9, 24.8])
  })

  it('mantém a ordem da cotação e o prazo com os dias de produção somados', () => {
    const { options } = deliveryOptions({ ...base, quotes: [SEDEX, PAC], granted: false })

    expect(options.map((o) => o.serviceName)).toEqual(['SEDEX', 'PAC'])
    expect(options[1].estimateLabel).toBe('entre 4 e 6 de agosto')
    expect(options[1]).toMatchObject({ estimateMin: '2026-08-04', estimateMax: '2026-08-06' })
  })

  it('o cupom de frete grátis zera todas as opções', () => {
    const { options } = deliveryOptions({
      ...base,
      quotes: [PAC, SEDEX],
      granted: false,
      couponFreeShipping: true,
    })

    expect(options.map((o) => o.cost)).toEqual([0, 0])
    expect(options.map((o) => o.free)).toEqual([true, true])
  })

  it('sem cotação, o "Frete padrão" só aparece quando o fallback é permitido', () => {
    const semFallback = deliveryOptions({ ...base, quotes: [], granted: false })
    expect(semFallback.options).toEqual([])

    const comFallback = deliveryOptions({ ...base, quotes: [], granted: true, fallbackCost: 9.9 })
    expect(comFallback.options).toHaveLength(1)
    expect(comFallback.options[0]).toMatchObject({
      serviceId: DEFAULT_SHIPPING_SERVICE_ID,
      serviceName: 'Frete padrão',
      carrier: 'Correios',
      cost: 9.9,
      price: 9.9,
      free: false,
      estimateLabel: null,
      estimateMin: '',
      estimateMax: '',
    })
  })

  it('o "Frete padrão" com cupom de frete grátis sai zerado', () => {
    const { options } = deliveryOptions({
      ...base,
      quotes: [],
      granted: false,
      fallbackCost: 9.9,
      couponFreeShipping: true,
    })
    expect(options[0]).toMatchObject({ cost: 0, price: 9.9, free: true })
  })

  it('a escolhida acompanha a cotação nova: o custo é o preço novo', () => {
    const antes = deliveryOptions({ ...base, quotes: [PAC, SEDEX], granted: false, selectedId: '2' })
    expect(antes.selected?.cost).toBe(24.8)

    const recotado = deliveryOptions({
      ...base,
      quotes: [PAC, { ...SEDEX, price: '31.50' }],
      granted: false,
      selectedId: '2',
    })
    expect(recotado.selected?.cost).toBe(31.5)
  })

  it('a escolhida acompanha o frete grátis: concedido zera, retirado volta ao preço', () => {
    const concedido = deliveryOptions({ ...base, quotes: [PAC, SEDEX], granted: true, selectedId: '1' })
    expect(concedido.selected).toMatchObject({ cost: 0, free: true })

    const retirado = deliveryOptions({ ...base, quotes: [PAC, SEDEX], granted: false, selectedId: '1' })
    expect(retirado.selected).toMatchObject({ cost: 14.9, free: false })
  })

  it('sem escolha, ou com uma escolha que a cotação não traz, não há escolhida', () => {
    expect(deliveryOptions({ ...base, quotes: [PAC], granted: false }).selected).toBeNull()
    expect(
      deliveryOptions({ ...base, quotes: [PAC], granted: false, selectedId: '99' }).selected,
    ).toBeNull()
  })

  it('o rascunho da opção descarta o que é só apresentação', () => {
    const { options } = deliveryOptions({ ...base, quotes: [PAC], granted: true })
    expect(toShippingDraft(options[0])).toEqual({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 0,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
  })
})
