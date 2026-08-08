import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ADR-05: `orders.address_zip` e `address_complement` passam a ser gravados. Hoje ficam nulos
//         e `apps/backoffice/.../MelhorEnvioTab.tsx:71` (`order.address_zip.replace(...)`)
//         estoura TypeError em qualquer pedido criado pela loja.
// SHP-07: o snapshot do envio escolhido (serviço, transportadora, custo, id do serviço e a
//         janela de entrega) é gravado no pedido; recotação posterior não o altera.
// CHK-09: a criação do pedido falhando precisa rejeitar para a página exibir o erro.

const { fromMock, orderInsert, itemsInsert } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  orderInsert: vi.fn(),
  itemsInsert: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useCreateOrder, type CreateOrderInput } from '../useOrders'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const baseInput = (overrides: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  customer_name: 'Marina Yamashita',
  customer_email: 'marina@email.com',
  customer_id: 'cust-1',
  payment_method: 'pix',
  address_street: 'Av. Paulista',
  address_number: '1000',
  address_neighborhood: 'Bela Vista',
  address_city: 'São Paulo',
  address_state: 'SP',
  address_zip: '01310100',
  address_complement: 'Apto 42',
  shipping_service_id: '2',
  shipping_carrier: 'Correios',
  shipping_method: 'SEDEX',
  delivery_estimate_min: '2026-08-04',
  delivery_estimate_max: '2026-08-06',
  subtotal: 38.7,
  discount: 0,
  shipping_cost: 21.5,
  total: 60.2,
  items: [
    {
      product_id: 'prod-1',
      product_name: 'Botton Sakura',
      product_image: null,
      size: 'M',
      finish: 'fosco',
      quantity: 2,
      unit_price: 12.9,
    },
  ],
  ...overrides,
})

const insertedOrder = () => orderInsert.mock.calls[0][0] as Record<string, unknown>

const runCreateOrder = async (input: CreateOrderInput = baseInput()) => {
  const { result } = renderHook(() => useCreateOrder(), { wrapper })
  return result.current.mutateAsync(input)
}

beforeEach(() => {
  fromMock.mockReset()
  orderInsert.mockReset()
  itemsInsert.mockReset()

  fromMock.mockImplementation((table: string) =>
    table === 'orders' ? { insert: orderInsert } : { insert: itemsInsert },
  )
  orderInsert.mockReturnValue({
    select: () => ({ single: async () => ({ data: { id: 'order-1' }, error: null }) }),
  })
  itemsInsert.mockResolvedValue({ error: null })
})

describe('useCreateOrder — endereço gravado no pedido (ADR-05)', () => {
  it('grava address_zip com o CEP informado', async () => {
    await runCreateOrder()

    expect(insertedOrder().address_zip).toBe('01310100')
  })

  it('grava address_complement com o complemento informado', async () => {
    await runCreateOrder()

    expect(insertedOrder().address_complement).toBe('Apto 42')
  })

  it('mantém rua, número, bairro, cidade e UF no insert', async () => {
    await runCreateOrder()

    expect(insertedOrder()).toMatchObject({
      address_street: 'Av. Paulista',
      address_number: '1000',
      address_neighborhood: 'Bela Vista',
      address_city: 'São Paulo',
      address_state: 'SP',
    })
  })
})

describe('useCreateOrder — snapshot do envio escolhido (SHP-07, SHP-08)', () => {
  it('grava shipping_service_id da opção selecionada', async () => {
    await runCreateOrder()

    expect(insertedOrder().shipping_service_id).toBe('2')
  })

  it('grava shipping_carrier e shipping_method da opção selecionada', async () => {
    await runCreateOrder()

    expect(insertedOrder().shipping_carrier).toBe('Correios')
    expect(insertedOrder().shipping_method).toBe('SEDEX')
  })

  it('grava shipping_cost igual ao preço da opção selecionada', async () => {
    await runCreateOrder(baseInput({ shipping_cost: 34.9 }))

    expect(insertedOrder().shipping_cost).toBe(34.9)
  })

  it('grava a janela de entrega estimada nas colunas de data', async () => {
    await runCreateOrder()

    expect(insertedOrder().delivery_estimate_min).toBe('2026-08-04')
    expect(insertedOrder().delivery_estimate_max).toBe('2026-08-06')
  })

  it('sem snapshot de envio as colunas vão como null (a compra segue no "Frete padrão")', async () => {
    await runCreateOrder(
      baseInput({
        shipping_service_id: undefined,
        shipping_carrier: undefined,
        shipping_method: undefined,
        delivery_estimate_min: undefined,
        delivery_estimate_max: undefined,
      }),
    )

    expect(insertedOrder()).toMatchObject({
      shipping_service_id: null,
      shipping_carrier: null,
      shipping_method: null,
      delivery_estimate_min: null,
      delivery_estimate_max: null,
    })
  })
})

describe('useCreateOrder — desconto de promoção registrado no pedido (PRM-12)', () => {
  it('grava promotion_discount e promotion_id da campanha exibida', async () => {
    await runCreateOrder(baseInput({ promotion_id: 'promo-kit', promotion_discount: 11.7 }))

    // É este valor que torna a guarda de teto do `create-payment` alcançável: com `0` gravado,
    // `pricing.promotionDiscount < order.promotion_discount` nunca é verdade.
    expect(insertedOrder().promotion_discount).toBe(11.7)
    expect(insertedOrder().promotion_id).toBe('promo-kit')
  })

  it('pedido sem promoção grava promotion_discount 0 e promotion_id null', async () => {
    await runCreateOrder()

    expect(insertedOrder().promotion_discount).toBe(0)
    expect(insertedOrder().promotion_id).toBeNull()
  })

  it('duas promoções aplicadas (promotion_id null) ainda gravam o desconto somado', async () => {
    await runCreateOrder(baseInput({ promotion_id: null, promotion_discount: 18.4 }))

    expect(insertedOrder().promotion_id).toBeNull()
    expect(insertedOrder().promotion_discount).toBe(18.4)
  })
})

describe('useCreateOrder — contrato dos itens inalterado', () => {
  it('insere os itens com unit_price e o order_id do pedido criado', async () => {
    await runCreateOrder()

    expect(itemsInsert).toHaveBeenCalledWith([
      {
        order_id: 'order-1',
        product_id: 'prod-1',
        product_name: 'Botton Sakura',
        product_image: null,
        size: 'M',
        finish: 'fosco',
        quantity: 2,
        unit_price: 12.9,
      },
    ])
  })
})

describe('useCreateOrder — falha (CHK-09)', () => {
  it('erro no insert do pedido rejeita a mutation com a mensagem do banco', async () => {
    orderInsert.mockReturnValue({
      select: () => ({
        single: async () => ({ data: null, error: { message: 'new row violates row-level security' } }),
      }),
    })

    await expect(runCreateOrder()).rejects.toThrow('new row violates row-level security')
    expect(itemsInsert).not.toHaveBeenCalled()
  })
})
