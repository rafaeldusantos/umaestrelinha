import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CARD_LINK_TOKEN_KEY } from '@/features/card-link'

// A página do link de pagamento por cartão (`/pagar-com-cartao#<token>`), pela PÁGINA REAL: com o
// pedido pendente ela mostra o pedido e o Brick do cartão e cobra pelo `create-payment` com o token
// do link; pago ou cancelado, ela mostra a situação e nada para pagar.

/* eslint-disable @typescript-eslint/no-explicit-any */

const { invokeMock, getCardFormDataMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  getCardFormDataMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invokeMock(...a) } },
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '(51) 99999-0000' }),
  usePaymentSettings: () => ({ card_enabled: true, max_installments: 3, min_installment_value: 10 }),
  useStoreSettings: () => ({ data: undefined, isFetched: true }),
}))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({
  useCardInstallments: () => ({
    data: [{ installments: 1, installment_rate: 0, installment_amount: 182, total_amount: 182 }],
    isError: false,
  }),
}))
vi.mock('@/features/checkout/lib/cardBrick', async () => ({
  ...(await vi.importActual<typeof import('@/features/checkout/lib/cardBrick')>('@/features/checkout/lib/cardBrick')),
  getCardFormData: () => getCardFormDataMock(),
}))
vi.mock('@/features/checkout/ui/CardPaymentBrick', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  const { useCheckoutStoreApi } = await vi.importActual<
    typeof import('@/features/checkout/model/checkoutStore')
  >('@/features/checkout/model/checkoutStore')
  const BrickDuble = ({ amount, notice }: any) => {
    const store = useCheckoutStoreApi()
    useEffect(() => {
      store.getState().setCardBin('42356477')
    }, [store])
    return (
      <div data-testid="card-brick" data-amount={amount}>
        {notice && <p role="alert">{notice.title}</p>}
      </div>
    )
  }
  return { default: BrickDuble }
})
vi.mock('@/features/order-payment', async () => ({
  ...(await vi.importActual<typeof import('@/features/order-payment')>('@/features/order-payment')),
  BATIDA_MS: 0,
}))

import CardLinkPaymentPage from '../CardLinkPaymentPage'

const TOKEN = 'TokenDoLinkDeCartao_0123456789abcdefABCDEF'
const ORDER_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

const PENDENTE = {
  order: {
    id: ORDER_ID,
    order_number: '0301',
    amount: 182,
    items: [
      { name: 'Pingente Estrela', variant: 'Prata', quantity: 2 },
      { name: 'Corrente', variant: null, quantity: 1 },
    ],
  },
}

let leitura: unknown = PENDENTE
let pagamento: unknown = { status: 'approved', status_detail: 'accredited' }

beforeEach(() => {
  leitura = PENDENTE
  pagamento = { status: 'approved', status_detail: 'accredited' }
  sessionStorage.clear()
  invokeMock.mockReset()
  invokeMock.mockImplementation(async (nome: string) => {
    if (nome === 'checkout?action=get-card-link') return { data: leitura, error: null }
    if (nome === 'mercado-pago?action=create-payment') return { data: pagamento, error: null }
    return { data: null, error: new Error(`não esperado: ${nome}`) }
  })
  getCardFormDataMock.mockReset()
  getCardFormDataMock.mockResolvedValue({
    token: 'tok-do-cartao',
    payment_method_id: 'visa',
    installments: 1,
    payer: { email: 'quem@paga.test', identification: { type: 'CPF', number: '39053344705' } },
  })
})
afterEach(() => {
  window.history.replaceState(null, '', '/')
})

const abrir = (hash = `#${TOKEN}`) => {
  window.history.replaceState(null, '', `/pagar-com-cartao${hash}`)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/pagar-com-cartao" element={<CardLinkPaymentPage />} />
          <Route path="/pedido/:id" element={<p>página do pedido</p>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>,
  )
}

const chamadas = (nome: string) => invokeMock.mock.calls.filter(([n]) => n === nome)

describe('a página do link de pagamento por cartão', () => {
  it('pedido pendente: o número, as peças, o valor e o Brick — sem pedir login', async () => {
    abrir()

    expect(await screen.findByTestId('card-brick')).toHaveAttribute('data-amount', '182')
    expect(screen.getByText(/#0301/)).toBeInTheDocument()
    expect(screen.getByText('Pingente Estrela')).toBeInTheDocument()
    expect(screen.getByText(/Prata/)).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s?182,00/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/entrar/i)).not.toBeInTheDocument()
    expect(chamadas('checkout?action=get-card-link')[0][1]).toEqual({ body: { token: TOKEN } })
  })

  it('o token sai da barra de endereço e fica na sessão da aba', async () => {
    abrir()
    await screen.findByTestId('card-brick')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname).toBe('/pagar-com-cartao')
    expect(sessionStorage.getItem(CARD_LINK_TOKEN_KEY)).toBe(TOKEN)
  })

  it('pagar cobra o cartão pelo create-payment com o token do link, e aprovado leva ao pedido', async () => {
    abrir()
    await screen.findByTestId('card-brick')
    fireEvent.click(screen.getByRole('button', { name: /Pagar R\$\s?182,00/ }))

    await waitFor(() => expect(chamadas('mercado-pago?action=create-payment')).toHaveLength(1))
    const corpo = chamadas('mercado-pago?action=create-payment')[0][1].body
    expect(corpo).toMatchObject({
      order_id: ORDER_ID,
      method: 'card',
      card_link_token: TOKEN,
      card: { token: 'tok-do-cartao', installments: 1 },
    })
    expect(await screen.findByText('página do pedido')).toBeInTheDocument()
  })

  it('cartão recusado: o aviso volta ao formulário, sem sair da página', async () => {
    pagamento = { status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' }
    abrir()
    await screen.findByTestId('card-brick')
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('card-brick')).toBeInTheDocument()
    expect(screen.queryByText('página do pedido')).not.toBeInTheDocument()
  })

  it.each([
    ['pago', { situation: 'paid', order_number: '0301' }, /já foi pago/],
    ['cancelado', { situation: 'cancelled', order_number: '0301' }, /foi cancelado/],
  ])('pedido %s: a situação, sem Brick e sem botão de pagar', async (_n, resposta, frase) => {
    leitura = resposta
    abrir()

    expect(await screen.findByText(frase)).toBeInTheDocument()
    expect(screen.getByText(/#0301/)).toBeInTheDocument()
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pagar/ })).not.toBeInTheDocument()
  })

  it('link que não vale mais: o aviso, sem dado de pedido nem pagamento', async () => {
    leitura = null
    invokeMock.mockImplementation(async () => ({
      data: null,
      error: { context: new Response(JSON.stringify({ code: 'unavailable', error: 'x' }), { status: 404 }) },
    }))
    abrir()

    expect(await screen.findByText(/não está mais disponível/)).toBeInTheDocument()
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
  })

  // Tom memorial: nenhuma frase da página levanta a voz nem apressa a cliente. Lido no texto da
  // página inteira, em cada situação que ela pode mostrar.
  const SEM_URGENCIA = /!|urgente|últim|corra|agora mesmo|\p{Extended_Pictographic}/iu

  it.each([
    ['pedido pendente', () => { leitura = PENDENTE }, () => screen.findByTestId('card-brick')],
    ['pedido pago', () => { leitura = { situation: 'paid', order_number: '0301' } }, () => screen.findByText(/já foi pago/)],
    ['pedido cancelado', () => { leitura = { situation: 'cancelled', order_number: '0301' } }, () => screen.findByText(/foi cancelado/)],
    ['link que não vale mais', () => {
      invokeMock.mockImplementation(async () => ({
        data: null,
        error: { context: new Response(JSON.stringify({ code: 'unavailable', error: 'x' }), { status: 404 }) },
      }))
    }, () => screen.findByText(/não está mais disponível/)],
    ['leitura que falhou', () => {
      invokeMock.mockImplementation(async () => ({ data: null, error: new Error('rede') }))
      // a leitura tenta de novo uma vez (`retry: 1`) antes de desistir
    }, () => screen.findByRole('button', { name: 'Tentar de novo' }, { timeout: 5000 })],
  ])('tom: a página (%s) não tem exclamação, urgência nem "últim"', async (_n, preparar, esperar) => {
    preparar()
    abrir()
    await esperar()
    const texto = document.body.textContent ?? ''
    expect(texto.trim().length).toBeGreaterThan(0)
    expect(texto).not.toMatch(SEM_URGENCIA)
  })

  it('sem token: o aviso, e nenhuma leitura', async () => {
    abrir('')
    expect(await screen.findByText(/não está mais disponível/)).toBeInTheDocument()
    expect(invokeMock).not.toHaveBeenCalled()
  })
})

// O título "Pagamento com cartão" em 320 px com a fonte do sistema a 200 %: em `text-3xl` a palavra
// "Pagamento" sozinha passa da largura útil e empurra o corpo de lado. No celular o título usa a
// escala menor e pode quebrar a palavra (com hífen, pelo `lang` pt-BR do documento); a escala grande
// volta a partir de `sm`. jsdom não mede layout: a régua é o token exato das classes, e a medida em
// navegador é do reteste.
const temToken = (classes: string, token: string) =>
  classes.split(/\s+/).includes(token)

const tituloCabeNoCelular = (classes: string) =>
  temToken(classes, 'text-2xl') &&
  temToken(classes, 'sm:text-3xl') &&
  !temToken(classes, 'text-3xl') &&
  temToken(classes, 'break-words') &&
  temToken(classes, 'hyphens-auto')

describe('o título da página cabe no celular com fonte grande', () => {
  it('a régua recusa o título de antes e aceita o que reduz e quebra', () => {
    const antes = 'font-heading text-3xl font-semibold tracking-[-0.03em] text-estrelinha-ink'
    expect(tituloCabeNoCelular(antes)).toBe(false)
    expect(tituloCabeNoCelular(`${antes} break-words hyphens-auto`)).toBe(false)
    expect(tituloCabeNoCelular('text-2xl sm:text-3xl')).toBe(false)
    expect(tituloCabeNoCelular('text-2xl sm:text-3xl break-words hyphens-auto')).toBe(true)
    // token exato: `sm:text-3xl` não conta como `text-3xl`, nem `md:break-words` como `break-words`
    expect(tituloCabeNoCelular('text-2xl sm:text-3xl md:break-words hyphens-auto')).toBe(false)
  })

  it('pedido pendente: o h1 reduz no celular e quebra a palavra longa', async () => {
    abrir()
    await screen.findByTestId('card-brick')
    const h1 = screen.getByRole('heading', { level: 1, name: 'Pagamento com cartão' })
    expect(tituloCabeNoCelular(h1.className)).toBe(true)
  })

  it('aviso (link que não vale mais): o h1 reduz no celular e quebra a palavra longa', async () => {
    abrir('')
    await screen.findByText(/não está mais disponível/)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Pagamento com cartão' })
    expect(tituloCabeNoCelular(h1.className)).toBe(true)
  })
})
