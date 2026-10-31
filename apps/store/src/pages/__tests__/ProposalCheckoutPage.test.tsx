import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicProposal } from '@estrelinha/core/proposals'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { accessFor } from '@/entities/order/model/orderAccess'
import {
  CHECKOUT_STORAGE_KEY,
  PROPOSAL_CHECKOUT_STORAGE_KEY,
  useCheckoutStore,
  useProposalCheckoutStore,
} from '@/features/checkout/model/checkoutStore'
import { PROPOSAL_TOKEN_KEY } from '@/features/proposal-checkout/model/proposalToken'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Feature 89 · T25 e T26 — `/pedido-montado#<token>`, pela PÁGINA REAL sobre os blocos reais.
//
// T25 (CON-01..04, CON-07..11, SEG-03): os literais da spec, as peças só leitura, "Desconto
// combinado" sem o motivo, o e-mail só leitura, e os estados — carregando, indisponível, concluída
// (leva ao pedido), peça indisponível, versão nova.
// T26 (CON-05, CON-06, CON-12, PRC-06): "Pagar" cria o pedido pela function `checkout` com o token e
// segue o caminho da loja — PIX navega à rota do pagamento, cartão chama `create-payment` — sem
// tocar na sacola (`estrelinha-cart`), no cupom nem no rascunho de `/checkout`.
//
// As expectativas são LITERAIS, escritas à mão a partir da letra da spec.

const { invokeMock, createPaymentMock, getCardFormDataMock, toastError } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  createPaymentMock: vi.fn(),
  getCardFormDataMock: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
    from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }),
  },
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null, customer: null, loading: false }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '(51) 99999-0000' }),
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 3,
    min_installment_value: 10,
  }),
  useShippingSettings: () => ({
    free_shipping_enabled: true,
    free_shipping_threshold: 1000,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
  useStoreSettings: () => ({ data: undefined, isFetched: true }),
}))
vi.mock('@/features/checkout/api/useCepLookup', () => ({ useCepLookup: () => ({ data: undefined }) }))
vi.mock('@/features/checkout/api/useShippingQuote', () => ({
  useShippingQuote: () => ({
    data: [{ id: 1, name: 'PAC', company: 'Correios', price: '20.00', delivery_time: 6 }],
    isError: false,
    isLoading: false,
    isSuccess: true,
  }),
}))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({ useDefaultAddress: () => ({ data: undefined }) }))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({
  useCardInstallments: () => ({
    data: [{ installments: 1, installment_rate: 0, installment_amount: 270, total_amount: 270 }],
    isError: false,
  }),
}))
vi.mock('@/features/checkout/api/useCreatePayment', () => ({
  useCreatePayment: () => ({ mutateAsync: createPaymentMock, isPending: false }),
  PAYMENT_UNAVAILABLE_MESSAGE: 'Não foi possível iniciar o pagamento. Tente novamente.',
}))
vi.mock('@/features/checkout/lib/cardBrick', async () => ({
  ...(await vi.importActual<typeof import('@/features/checkout/lib/cardBrick')>('@/features/checkout/lib/cardBrick')),
  getCardFormData: () => getCardFormDataMock(),
}))
// O Brick real arrasta o SDK do Mercado Pago. O dublê "digita" o cartão no rascunho que o BLOCO lê
// (o do provider) — se a página montasse o Brick sobre o rascunho de `/checkout`, o CTA não habilitaria.
vi.mock('@/features/checkout/ui/CardPaymentBrick', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  const { useCheckoutStoreApi } = await vi.importActual<
    typeof import('@/features/checkout/model/checkoutStore')
  >('@/features/checkout/model/checkoutStore')
  const BrickDuble = ({ amount, payerEmail }: any) => {
    const store = useCheckoutStoreApi()
    useEffect(() => {
      store.getState().setCardBin('42356477')
    }, [store])
    return <div data-testid="card-brick" data-amount={amount} data-email={payerEmail} />
  }
  return { default: BrickDuble }
})
vi.mock('@/features/order-payment', async () => ({
  ...(await vi.importActual<typeof import('@/features/order-payment')>('@/features/order-payment')),
  BATIDA_MS: 0,
}))
vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({ setGuestEmail: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn(), message: vi.fn() } }))

import ProposalCheckoutPage from '../ProposalCheckoutPage'

const TOKEN = 'TokenDoLinkDaAdri_0123456789abcdefABCDEF'

const proposta = (over: Partial<PublicProposal> = {}): PublicProposal => ({
  id: 'prop-1',
  number: 'P-0001',
  version: 3,
  expires_at: '2026-11-07T15:00:00Z',
  customer_name: 'Maria Souza',
  customer_email: 'maria@exemplo.invalid',
  customer_phone: '51988887777',
  customer_document: '39053344705',
  address: {
    address_zip: '01310100',
    address_street: 'Av. Paulista',
    address_number: '1000',
    address_complement: '',
    address_neighborhood: 'Bela Vista',
    address_city: 'São Paulo',
    address_state: 'SP',
  },
  lines: [
    {
      position: 1,
      product_id: 'prod-1',
      variant_id: 'var-1',
      product_name: 'Pingente Coração com Cinzas',
      product_image: 'https://exemplo.invalid/f.webp',
      variant_label: 'Prata 925',
      quantity: 2,
      list_price: 150,
      unit_price: 140,
      engraving_text: 'Vó Lurdes',
      requires_material: true,
      available: true,
    },
  ],
  subtotal: 280,
  promotion_discount: 20,
  coupon_code: null,
  coupon_discount: 0,
  coupon_free_shipping: false,
  manual_discount: 30,
  items_total: 250,
  ...over,
})

/** A function `checkout` dublada por ação; cada caso diz o que cada ação responde. */
const respostas: Record<string, (body: any) => unknown> = {}
const falha = (status: number, corpo: unknown) => ({
  data: null,
  error: { message: 'non-2xx', context: { status, json: async () => corpo } },
})

const Destino = () => {
  const { pathname } = useLocation()
  return <div data-testid="destino">{pathname}</div>
}

const montar = (hash = `#${TOKEN}`) => {
  window.history.replaceState(null, '', `/pedido-montado${hash}`)
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BrowserRouter>
        <Routes>
          <Route path="/pedido-montado" element={<ProposalCheckoutPage />} />
          <Route path="/pedido/:id/pagamento" element={<Destino />} />
          <Route path="/pedido/:id" element={<Destino />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>,
  )
}

const SACOLA = {
  items: [
    { product: { id: 'outra', price: 50 } as any, size: '', finish: '', quantity: 1, variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50 },
  ],
} as any

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  invokeMock.mockReset().mockImplementation(async (nome: string, { body }: { body: any }) => {
    const acao = nome.replace('checkout?action=', '')
    const r = respostas[acao]
    if (!r) throw new Error(`ação inesperada: ${nome}`)
    return r(body)
  })
  for (const k of Object.keys(respostas)) delete respostas[k]
  respostas['get-proposal'] = () => ({ data: { proposal: proposta() }, error: null })
  createPaymentMock.mockReset()
  getCardFormDataMock.mockReset()
  toastError.mockReset()
  useProposalCheckoutStore.getState().reset()
  useCheckoutStore.getState().reset()
  // A sacola da cliente tem OUTRA peça e um cupom: o link não pode tocar em nenhum dos dois.
  useCartStore.setState(SACOLA)
  useCouponStore.setState({ applied: { code: 'SACOLA10', type: 'percent', value: 10 } } as any)
  useCheckoutStore.getState().setContact({ name: 'Rascunho da sacola' })
})
afterEach(() => window.history.replaceState(null, '', '/'))

const ctaPagar = () => screen.getByRole('button', { name: /^Pagar / })

describe('T25 — a página (CON-01..04, CON-07..11, SEG-02, SEG-03)', () => {
  it('pede a proposta pelo token do fragmento e o apaga da barra (SEG-02)', async () => {
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    expect(invokeMock).toHaveBeenCalledWith('checkout?action=get-proposal', { body: { token: TOKEN } })
    expect(window.location.hash).toBe('')
    expect(sessionStorage.getItem(PROPOSAL_TOKEN_KEY)).toBe(TOKEN)
  })

  it('o título, a frase e o prazo da spec (CON-02); o <title> é "Pedido montado" com noindex (SEG-03)', async () => {
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    expect(
      screen.getByText('Montado pela Adri para você. Confira seus dados, escolha a entrega e o pagamento.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Este link vale até 07/11/2026.')).toBeInTheDocument()
    expect(document.title).toContain('Pedido montado')
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
  })

  it('as peças só leitura, com foto, variação, gravação, quantidade e o preço travado (CON-01, CON-03)', async () => {
    montar()
    const pecas = await screen.findByRole('region', { name: 'Peças do pedido' })
    expect(pecas).toHaveTextContent('Pingente Coração com Cinzas')
    expect(pecas).toHaveTextContent('Prata 925')
    expect(pecas).toHaveTextContent('Gravação: Vó Lurdes')
    expect(pecas).toHaveTextContent('Quantidade: 2')
    expect(pecas).toHaveTextContent('R$ 280,00')
    expect(pecas.querySelector('input, select, textarea')).toBeNull()
    const mudar = screen.getByRole('link', { name: 'Quer mudar alguma peça? Fale comigo pelo WhatsApp.' })
    expect(mudar.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/51999990000\?text=/)
  })

  it('"Desconto combinado" no resumo, sem motivo nenhum (CON-03)', async () => {
    montar()
    await screen.findAllByText('Desconto combinado')
    const resumo = screen.getAllByRole('region', { name: 'Resumo do pedido' })[0]
    expect(resumo).toHaveTextContent('Desconto combinado')
    expect(resumo).toHaveTextContent('−R$ 30,00')
    expect(resumo).toHaveTextContent('Desconto progressivo')
    expect(resumo).not.toHaveTextContent(/motivo/i)
  })

  it('o contato vem preenchido e o e-mail é só leitura (CON-04, A-07)', async () => {
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    const s = useProposalCheckoutStore.getState()
    expect(s.contact).toMatchObject({ name: 'Maria Souza', email: 'maria@exemplo.invalid', whatsapp: '(51) 98888-7777' })
    expect(s.address).toMatchObject({ cep: '01310-100', number: '1000', city: 'São Paulo' })
    // O rascunho de `/checkout` segue o da sacola.
    expect(useCheckoutStore.getState().contact.name).toBe('Rascunho da sacola')
    fireEvent.click(screen.getAllByRole('button', { name: 'Alterar' })[0])
    const email = (await screen.findByLabelText('E-mail')) as HTMLInputElement
    expect(email.readOnly).toBe(true)
  })

  it('o total do resumo é o de proposalPricing para a entrega e o meio escolhidos (PRC-06)', async () => {
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    // 280 − 30 (combinado) + 20 (PAC) = 270; PIX 5% sobre os itens (250) = 12,50 ⇒ 257,50.
    expect(screen.getAllByTestId('proposta-total')[0]).toHaveTextContent('R$ 257,50')
    expect(ctaPagar()).toHaveTextContent('Pagar R$ 257,50 com PIX')
  })

  // Fecho da rodada 2 do Verifier (R44): o frete zerado pelo cupom (PRC-05) aparece como "Grátis",
  // a mesma palavra do resumo de `/checkout` (`OrderSummary`), e nunca como "R$ 0,00".
  it('cupom de frete grátis: a linha do frete diz "Grátis" e o total não soma o frete (PRC-05)', async () => {
    respostas['get-proposal'] = () => ({
      data: { proposal: proposta({ coupon_code: 'FRETE', coupon_free_shipping: true }) },
      error: null,
    })
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    const resumo = screen.getAllByRole('region', { name: 'Resumo do pedido' })[0]
    expect(resumo).toHaveTextContent('Grátis')
    expect(resumo).not.toHaveTextContent('R$ 0,00')
    // 250 dos itens, sem os 20 do PAC; PIX 5% sobre os itens = 12,50 ⇒ 237,50.
    expect(screen.getAllByTestId('proposta-total')[0]).toHaveTextContent('R$ 237,50')
  })

  it('sem fragmento e sem token guardado ⇒ o link não vale (CON-08), sem chamar a function', async () => {
    montar('')
    expect(
      await screen.findByText('Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'),
    ).toBeInTheDocument()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('404 unavailable ⇒ CON-08 com o WhatsApp da loja, sem dado nenhum da proposta', async () => {
    respostas['get-proposal'] = () => falha(404, { error: 'x', code: 'unavailable' })
    montar()
    expect(
      await screen.findByText('Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Falar no WhatsApp/ }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/51999990000/)
    expect(screen.queryByText('Pingente Coração com Cinzas')).toBeNull()
  })

  it('falha de leitura NÃO vira "indisponível": oferece tentar de novo', async () => {
    respostas['get-proposal'] = () => falha(502, { error: 'x' })
    montar()
    // `useProposal` tenta uma vez mais antes de desistir (retry: 1, ~1 s).
    expect(
      await screen.findByText('Não consegui abrir o seu pedido agora. Tente de novo.', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/não está mais disponível/)).toBeNull()
    respostas['get-proposal'] = () => ({ data: { proposal: proposta() }, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
  })

  it('concluída ⇒ vai ao pedido, com o acesso de convidada guardado (CON-07)', async () => {
    respostas['get-proposal'] = () => ({ data: { completed: true, order_id: 'ord-9', access_token: 'acc-9' }, error: null })
    montar()
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-9')
    expect(accessFor('ord-9')).toBe('acc-9')
  })

  it('peça indisponível ⇒ marcada, conclusão bloqueada, WhatsApp oferecido (CON-09)', async () => {
    const p = proposta()
    respostas['get-proposal'] = () => ({
      data: { proposal: { ...p, lines: [{ ...p.lines[0], available: false }] } },
      error: null,
    })
    montar()
    expect(await screen.findByText('Indisponível no momento')).toBeInTheDocument()
    expect(
      screen.getByText('Uma peça do seu pedido está indisponível no momento. Fale comigo pelo WhatsApp.'),
    ).toBeInTheDocument()
    expect(ctaPagar()).toBeDisabled()
  })

  it('versão nova ⇒ relê e pede conferência; NÃO cria o pedido com a velha (CON-10)', async () => {
    let leituras = 0
    respostas['get-proposal'] = () => {
      leituras += 1
      return { data: { proposal: proposta({ version: leituras === 1 ? 3 : 4 }) }, error: null }
    }
    respostas['create-order'] = () => falha(409, { error: 'x', code: 'proposal_changed' })
    montar()
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    expect(await screen.findByText('A Adri atualizou seu pedido. Confira de novo antes de concluir.')).toBeInTheDocument()
    expect(leituras).toBe(2)
    expect(screen.queryByTestId('destino')).toBeNull()
    expect(useProposalCheckoutStore.getState().orderId).toBeNull()

    // Conferido, a conclusão vai com a versão RELIDA.
    respostas['create-order'] = () => ({ data: { order_id: 'ord-v4', order_number: '0250', access_token: 'a' }, error: null })
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-v4/pagamento')
    const versoes = invokeMock.mock.calls
      .filter(([n]) => n === 'checkout?action=create-order')
      .map(([, { body }]) => body.proposal_version)
    expect(versoes).toEqual([3, 4])
  })
})

describe('T26 — a conclusão (CON-05, CON-06, CON-12, PRC-06) — a sacola intocada', () => {
  const sacolaAntes = () => localStorage.getItem('estrelinha-cart')

  it('PIX: create-order com o token e o corpo da spec, e navega à rota do pagamento', async () => {
    respostas['create-order'] = () => ({ data: { order_id: 'ord-1', order_number: '0244', access_token: 'acc-1' }, error: null })
    montar()
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    const sacola = sacolaAntes()
    expect(sacola).toContain('outra')

    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-1/pagamento')

    const chamada = invokeMock.mock.calls.find(([n]) => n === 'checkout?action=create-order')!
    const corpo = chamada[1].body
    expect(corpo).toMatchObject({
      proposal_token: TOKEN,
      proposal_version: 3,
      payment_method: 'pix',
      customer_name: 'Maria Souza',
      customer_phone: '51988887777',
      customer_document: '39053344705',
      address_zip: '01310100',
      address_number: '1000',
      shipping_service_id: '1',
      shipping_carrier: 'Correios',
      shipping_method: 'PAC',
      shipping_cost: 20,
    })
    expect(typeof corpo.client_request_id).toBe('string')
    // A-07, PRC-03: e-mail, itens e preços nunca saem daqui.
    for (const proibido of ['customer_email', 'items', 'total', 'subtotal', 'discount']) {
      expect(corpo).not.toHaveProperty(proibido)
    }
    expect(accessFor('ord-1')).toBe('acc-1')

    // A sacola, o cupom e o rascunho de `/checkout` ficam exatamente como estavam.
    expect(sacolaAntes()).toBe(sacola)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCouponStore.getState().applied?.code).toBe('SACOLA10')
    expect(useCheckoutStore.getState().orderId).toBeNull()
    expect(useCheckoutStore.getState().contact.name).toBe('Rascunho da sacola')
    // O pedido em curso é da instância da proposta.
    expect(useProposalCheckoutStore.getState().orderId).toBe('ord-1')
    expect(sessionStorage.getItem(PROPOSAL_CHECKOUT_STORAGE_KEY)).toContain('ord-1')
    expect(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) ?? '').not.toContain('ord-1')
  })

  it('cartão: create-order e depois create-payment no pedido criado; aprovado ⇒ o pedido, sacola intocada', async () => {
    respostas['create-order'] = () => ({ data: { order_id: 'ord-2', order_number: '0245', access_token: 'acc-2' }, error: null })
    getCardFormDataMock.mockResolvedValue({
      token: 'tok_cartao',
      installments: 1,
      payment_method_id: 'visa',
      issuer_id: '1',
      transaction_amount: 270,
      payer: { email: 'maria@exemplo.invalid', identification: { type: 'CPF', number: '39053344705' } },
    })
    createPaymentMock.mockResolvedValue({ status: 'approved' })
    montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    act(() => useProposalCheckoutStore.getState().setPayment({ method: 'card' }))
    const brick = await screen.findByTestId('card-brick')
    // O Brick cobra o total no CARTÃO (sem PIX) e esconde o e-mail com o do pedido.
    expect(brick.dataset.amount).toBe('270')
    expect(brick.dataset.email).toBe('maria@exemplo.invalid')
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    const sacola = sacolaAntes()

    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-2')

    const corpo = invokeMock.mock.calls.find(([n]) => n === 'checkout?action=create-order')![1].body
    expect(corpo.payment_method).toBe('card')
    expect(createPaymentMock).toHaveBeenCalledWith({
      order_id: 'ord-2',
      method: 'card',
      card: expect.objectContaining({ token: 'tok_cartao', installments: 1 }),
    })
    expect(sacolaAntes()).toBe(sacola)
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCouponStore.getState().applied?.code).toBe('SACOLA10')
    expect(useCheckoutStore.getState().contact.name).toBe('Rascunho da sacola')
  })

  it('a retentativa usa a MESMA chave de idempotência (CON-06)', async () => {
    let tentativas = 0
    respostas['create-order'] = () => {
      tentativas += 1
      return tentativas === 1
        ? falha(500, { error: 'Não conseguimos criar seu pedido.' })
        : { data: { order_id: 'ord-3', order_number: '0246', access_token: 'acc-3', reused: true }, error: null }
    }
    montar()
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Não foi possível criar seu pedido. Tente novamente.'))
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-3/pagamento')
    const chaves = invokeMock.mock.calls
      .filter(([n]) => n === 'checkout?action=create-order')
      .map(([, { body }]) => body.client_request_id)
    expect(chaves).toHaveLength(2)
    expect(chaves[0]).toBe(chaves[1])
  })

  it('peça que saiu do ar na conclusão (422) ⇒ relê e bloqueia, sem pedido (CON-09)', async () => {
    let leituras = 0
    respostas['get-proposal'] = () => {
      leituras += 1
      const p = proposta()
      return {
        data: { proposal: leituras === 1 ? p : { ...p, lines: [{ ...p.lines[0], available: false }] } },
        error: null,
      }
    }
    respostas['create-order'] = () => falha(422, { error: 'x', code: 'item_unavailable', positions: [1] })
    montar()
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    expect(await screen.findByText('Indisponível no momento')).toBeInTheDocument()
    expect(ctaPagar()).toBeDisabled()
    expect(screen.queryByTestId('destino')).toBeNull()
  })
})

// Conserto do QA da 89 (2026-10-31) — os dois bugs da mesma aba.
describe('QA 89 — o link na mesma aba', () => {
  const TOKEN_2 = 'OutroLinkDaAdri_9876543210zyxwvuZYXWVU'
  const segunda = () =>
    proposta({
      id: 'prop-2',
      number: 'P-0008',
      version: 1,
      lines: [{ ...proposta().lines[0], product_id: 'prod-2', variant_id: null, unit_price: 90, quantity: 1, list_price: 90 }],
      subtotal: 90,
      promotion_discount: 0,
      manual_discount: 0,
      items_total: 90,
    })

  // BUG-20261031-segundo-link-da-mesma-cliente-paga-o-pedido-anterior: o rascunho da conclusão
  // anterior (orderId, chave de idempotência) não pode sobreviver a uma proposta nova do MESMO e-mail.
  it('o segundo link para o mesmo e-mail cria o pedido NOVO, com chave nova, e não paga o anterior', async () => {
    respostas['create-order'] = (body) =>
      body.proposal_token === TOKEN
        ? { data: { order_id: 'ord-anterior', order_number: '0264', access_token: 'a1' }, error: null }
        : { data: { order_id: 'ord-novo', order_number: '0267', access_token: 'a2' }, error: null }
    const primeiro = montar()
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-anterior/pagamento')
    primeiro.unmount()

    respostas['get-proposal'] = (body) =>
      body.token === TOKEN_2 ? { data: { proposal: segunda() }, error: null } : falha(404, { code: 'unavailable' })
    montar(`#${TOKEN_2}`)
    await waitFor(() => expect(ctaPagar()).toBeEnabled())
    expect(useProposalCheckoutStore.getState().orderId).toBeNull()
    fireEvent.click(ctaPagar())
    expect(await screen.findByTestId('destino')).toHaveTextContent('/pedido/ord-novo/pagamento')

    const chamadas = invokeMock.mock.calls.filter(([n]) => n === 'checkout?action=create-order')
    expect(chamadas.map(([, { body }]) => body.proposal_token)).toEqual([TOKEN, TOKEN_2])
    expect(chamadas[0][1].body.client_request_id).not.toBe(chamadas[1][1].body.client_request_id)
  })

  it('recarregar a MESMA proposta mantém o rascunho que a cliente editou', async () => {
    const primeiro = montar()
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    act(() => useProposalCheckoutStore.getState().setAddress({ number: '2000' }))
    primeiro.unmount()
    // Recarregar de verdade: a memória some, e o que volta é só o que estava no `sessionStorage`.
    const guardado = sessionStorage.getItem(PROPOSAL_CHECKOUT_STORAGE_KEY)!
    useProposalCheckoutStore.getState().reset()
    sessionStorage.setItem(PROPOSAL_CHECKOUT_STORAGE_KEY, guardado)
    await act(async () => {
      await useProposalCheckoutStore.persist.rehydrate()
    })
    montar('')
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    expect(useProposalCheckoutStore.getState().address.number).toBe('2000')
  })

  // BUG-20261031-link-novo-na-mesma-aba-mostra-o-antigo: um fragmento novo na mesma aba (sem recarga)
  // é um link novo — a página o lê, guarda e apaga da barra.
  it('um link novo aberto na mesma aba é lido sem recarregar', async () => {
    respostas['get-proposal'] = (body) =>
      body.token === TOKEN_2 ? { data: { proposal: segunda() }, error: null } : falha(404, { code: 'unavailable' })
    montar()
    expect(await screen.findByText(/não está mais disponível/)).toBeInTheDocument()

    act(() => {
      window.location.hash = TOKEN_2
    })
    await screen.findByRole('heading', { level: 1, name: 'Seu pedido' })
    expect(await screen.findByRole('region', { name: 'Peças do pedido' })).toHaveTextContent('R$ 90,00')
    expect(window.location.hash).toBe('')
    expect(sessionStorage.getItem(PROPOSAL_TOKEN_KEY)).toBe(TOKEN_2)
    expect(invokeMock).toHaveBeenCalledWith('checkout?action=get-proposal', { body: { token: TOKEN_2 } })
  })
})
