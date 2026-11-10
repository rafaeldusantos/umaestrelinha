import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import OrderPaymentPage from '../OrderPaymentPage'

// O SERVIDOR, importado de verdade — o `create-payment` e o dublê de banco dele, por caminho relativo
// (o precedente é `itemCategoryParity.test.ts`).
import { createPayment } from '../../../../../supabase/functions/mercado-pago/handlers.ts'
import {
  createDeps,
  createFakeFetch,
  createFakeSupabase,
} from '../../../../../supabase/functions/mercado-pago/__tests__/fakes.ts'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Pagar de novo pela rota do PIX um pedido que já teve a primeira cobrança: o valor é o travado
 * nela, e a tela não diz "o valor deste pedido mudou".
 *
 * A árvore é a real de ponta a ponta — a página, `useOrder`, `usePixPayment` e `useCreatePayment` —,
 * e quem responde o `functions.invoke` é o `create-payment` de verdade, sobre o dublê de banco da
 * function. O pedido é de outra hora (o link, Minha conta), com a promoção da época encerrada e o
 * cupom esgotado: recalculado, ele daria o 422 "um desconto mudou".
 */

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const USER_ID = 'auth-user-1'
const PINGENTE = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
const COUPON_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-3c4d5e6f7081'

/** O valor travado: 2 × 90 (a promoção de então) − 18 de cupom + 20 de frete − 8,10 de PIX. */
const TRAVADO = {
  order_id: ORDER_ID,
  first_method: 'pix',
  coupon_id: COUPON_ID,
  promotion_id: null,
  promotion_discount: 20,
  buy_together_discount: 0,
  order_bump_discount: 0,
  pix: { subtotal: 180, discount: 18, pix_discount: 8.1, shipping: 20, total: 173.9 },
  card: { subtotal: 180, discount: 18, pix_discount: 0, shipping: 20, total: 182 },
  lines: [{ product_id: PINGENTE, variant_id: null, quantity: 2, unit_price: 90, full_unit_price: 100 }],
}

const banco = () =>
  createFakeSupabase({
    user: { id: USER_ID },
    rows: {
      orders: {
        id: ORDER_ID,
        order_number: '0244',
        customer_id: 'cust-1',
        customer_email: 'helena@email.com',
        customer_name: 'Helena',
        status: 'pending',
        payment_status: 'pending',
        shipping_cost: 20,
        coupon_id: COUPON_ID,
        mp_order_id: 'ORDANTIGO',
        total: 173.9,
        promotion_discount: 20,
        buy_together_discount: 0,
        order_bump_discount: 0,
      },
      customers: { user_id: USER_ID, cpf: '39053344705', name: 'Helena Souza' },
      store_settings: (eq: [string, unknown] | null) =>
        eq?.[1] === 'payment' ? { value: { pix_discount_percent: 10 } } : null,
      // Hoje o cupom esgotou.
      coupons: { type: 'percent', value: 10, active: true, valid_from: null, valid_until: null, max_uses: 5, used_count: 5 },
      order_charge_locks: TRAVADO,
    },
    lists: {
      order_items: [
        {
          id: 'oi-1',
          product_id: PINGENTE,
          product_name: 'Pingente',
          quantity: 2,
          unit_price: 90,
          full_unit_price: 100,
          variant_id: null,
          price_source: 'base',
        },
      ],
      // Hoje o pingente custa 150 e a promoção acabou.
      products: [{ id: PINGENTE, base_price: 150 }],
      promotions: [],
      product_buy_together: [],
    },
  })

const mpPix = {
  id: 'ORDTST01',
  status: 'action_required',
  status_detail: 'waiting_transfer',
  external_reference: ORDER_ID,
  transactions: { payments: [{ id: 'PAY01', payment_method: { qr_code: 'PIX-TRAVADO', qr_code_base64: null } }] },
}

/** O `functions.invoke` do supabase-js, respondido pelo handler real. */
const invocarServidor = async (_name: string, opts: { body: Record<string, unknown> }) => {
  const deps = createDeps(
    banco(),
    createFakeFetch([
      { match: '/cancel', body: {} },
      { match: '/v1/orders', body: mpPix },
    ]),
  )
  const req = new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-de-teste', 'Content-Type': 'application/json' },
  })
  const res = await createPayment(deps, req, opts.body)
  if (res.ok) return { data: await res.json(), error: null }
  return { data: null, error: { context: res } }
}

vi.mock('@estrelinha/supabase/client', () => {
  const linhaDoPedido = () => ({
    id: '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70',
    order_number: '0244',
    customer_email: 'helena@email.com',
    total: 173.9,
    status: 'pending',
    payment_method: 'pix',
    payment_status: 'pending',
    paid_at: null,
    order_items: [],
  })
  const canal: any = {}
  canal.on = vi.fn(() => canal)
  canal.subscribe = vi.fn(() => canal)
  return {
    supabase: {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: linhaDoPedido(), error: null }),
          }),
        }),
      })),
      rpc: vi.fn(async () => ({ data: [], error: null })),
      functions: { invoke: vi.fn((name: string, opts: any) => invocarServidor(name, opts)) },
      channel: vi.fn(() => canal),
      removeChannel: vi.fn(),
    },
  }
})

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 10,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
  useGeneralSettings: () => ({
    whatsapp: '(51) 99999-8888',
    email: 'ola@umaestrelinha.com.br',
    store_name: 'Uma Estrelinha',
  }),
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

vi.mock('@/features/auth', async () => {
  const real = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )
  return {
    useAuthUiStore: real.useAuthUiStore,
    AuthOverlay: () => <div data-testid="auth-overlay" />,
  }
})
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: { id: 'auth-user-1' } }) }))

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/pedido/5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70/pagamento']}>
        <Routes>
          <Route path="/pedido/:id/pagamento" element={<OrderPaymentPage />} />
          <Route path="/pedido/:id" element={<div>pagina:pedido</div>} />
          <Route path="/checkout" element={<div>pagina:checkout</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

describe('pagar de novo pela rota do PIX com o valor travado', () => {
  it('mostra o código novo pelo valor travado, sem "o valor deste pedido mudou"', async () => {
    montar()

    const qr = await screen.findByTestId('qr')
    expect(qr).toHaveAttribute('data-value', 'PIX-TRAVADO')
    expect(screen.getByText('R$ 173,90')).toBeInTheDocument()
    expect(screen.queryByText('O valor deste pedido mudou')).not.toBeInTheDocument()
  })
})
