import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import OrderPaymentPage from '../OrderPaymentPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * O valor da tela de pagamento é o do pedido DEPOIS de o pagamento recalculá-lo.
 *
 * `create-payment` recalcula o pedido e o regrava quando ele sai igual ou mais barato (o desconto
 * do Compre Junto subiu entre o pedido e o pagamento) — e isso acontece DEPOIS de a página ter lido
 * o pedido para mostrar o valor. Sem reler, a tela fica um recálculo atrás do pedido gravado: mostra
 * o total de antes, enquanto `/pedido/:id` e o painel mostram o novo.
 *
 * Por isso a árvore é a real de ponta a ponta — a página, `useOrder`, `usePixPayment` e
 * `useCreatePayment` — e só o client do Supabase é dublê: o banco guarda o total e a function o
 * regrava, como o servidor faz. Dublar `useOrder` ou a máquina do PIX tornaria a releitura
 * invisível, porque o valor viria de onde o teste quisesse.
 */

const banco = { total: 310.37 }
let invocar: () => Promise<{ data: unknown; error: unknown }>

vi.mock('@estrelinha/supabase/client', () => {
  const linhaDoPedido = () => ({
    id: 'ord-1',
    order_number: '0365',
    customer_email: 'helena@email.com',
    total: banco.total,
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
      functions: { invoke: vi.fn(() => invocar()) },
      channel: vi.fn(() => canal),
      removeChannel: vi.fn(),
    },
  }
})

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
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
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null }) }))

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))

/** A function regrava o pedido mais barato e, depois, o Mercado Pago responde como `resposta`. */
const regravaE = (resposta: { data: unknown; error: unknown }) => async () => {
  banco.total = 307.11
  return resposta
}

const respostaDeErro = (status: number, corpo: unknown) => ({
  data: null,
  error: { context: new Response(JSON.stringify(corpo), { status }) },
})

/**
 * `staleTime: Infinity` de propósito: nada relê o pedido por ter envelhecido, então o valor novo só
 * chega à tela se alguém disser que o pedido mudou.
 */
const novoClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })

const montar = () =>
  render(
    <QueryClientProvider client={novoClient()}>
      <MemoryRouter initialEntries={['/pedido/ord-1/pagamento']}>
        <Routes>
          <Route path="/pedido/:id/pagamento" element={<OrderPaymentPage />} />
          <Route path="/pedido/:id" element={<div>pagina:pedido</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  banco.total = 310.37
  sessionStorage.clear()
  localStorage.clear()
})

describe('a tela de pagamento mostra o valor do pedido regravado pelo pagamento', () => {
  it('com o código gerado, o valor é o recalculado — o mesmo de /pedido/:id', async () => {
    invocar = regravaE({
      data: {
        qr_code: 'PIX-COPIA-E-COLA',
        qr_code_base64: null,
        expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      },
      error: null,
    })
    montar()

    await screen.findByTestId('qr')
    await waitFor(() => expect(screen.getByText('R$ 307,11')).toBeInTheDocument())
    expect(screen.queryByText('R$ 310,37')).not.toBeInTheDocument()
  })

  it('com o Mercado Pago recusando depois da regravação, o valor "ainda não cobrado" é o novo', async () => {
    // É o caso medido na QA: a function regrava o pedido e o Mercado Pago responde 400. A tela de
    // falha diz "valor do pedido, ainda não cobrado" e que o pedido fica "com o mesmo valor" — e o
    // valor tem de ser o do pedido gravado.
    invocar = regravaE(respostaDeErro(400, { error: 'Não foi possível iniciar o pagamento.' }))
    montar()

    await screen.findByText('valor do pedido, ainda não cobrado')
    await waitFor(() => expect(screen.getByText('R$ 307,11')).toBeInTheDocument())
    expect(screen.queryByText('R$ 310,37')).not.toBeInTheDocument()
  })
})
