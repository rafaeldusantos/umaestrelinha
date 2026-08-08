import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { Product } from '@estrelinha/supabase/types'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useProductById } from '@/entities/product'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { useCepLookup } from '@/features/checkout/api/useCepLookup'
import { useShippingQuote } from '@/features/checkout/api/useShippingQuote'
import { useAuthUiStore } from '@/features/auth'
import { markCartRecovered, clearGuestEmail } from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { DOC_FIELD_LABEL } from '@/features/checkout/ui/PaymentBlock'
import CheckoutPage, {
  MISSING_DOCUMENT_MESSAGE,
  NO_CUSTOMER_MESSAGE,
  ORDER_FAILED_MESSAGE,
} from '../CheckoutPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

// CHK-01: uma página, três blocos, nenhum passo "Revisão".
// CHK-02: sem sessão o overlay abre com returnTo=/checkout e os blocos não renderizam.
// CHK-04: bloco aberto = `resolveFlow().open`, no máximo um.
// FLW-01 … FLW-07: quem avança é a pessoa — digitar não colapsa bloco, `Continuar` colapsa,
//                  Pagamento nunca colapsa e o CTA olha `complete`, não `open`.
// CHK-06: rótulo do CTA com o valor do método escolhido; desabilitado se algum bloco falta.
// CHK-07/CHK-08: pedido criado 1×; edição entre acionamentos cria um segundo.
// CHK-09: falha na criação preserva rascunho e carrinho.
// CHK-10/CHK-12: header próprio sem navegação + faixa de confiança coerente com PoliciesPage.
// PGD-03: CPF que não salva bloqueia; endereço que não salva não bloqueia (ADR-03).
// CNF-03: a aprovação navega para `/pedido/:id` — nenhuma confirmação inline sobra.
// CNF-05: carrinho e cupom limpos exatamente 1× e **só** na aprovação.

const createOrderMutateAsync = vi.fn()
const createPaymentMutateAsync = vi.fn()
const getCardFormDataMock = vi.fn()
const saveCpfMutateAsync = vi.fn()
const saveAddressMutateAsync = vi.fn()
const defaultAddressMock = vi.fn()

vi.mock('@/entities/order/api/useOrders', () => ({
  useCreateOrder: () => ({ mutateAsync: createOrderMutateAsync, isPending: false }),
}))
// PGM-06: quem cobra o cartão passou a ser o CTA da página — antes era o botão próprio do Brick.
vi.mock('@/features/checkout/api/useCreatePayment', () => ({
  useCreatePayment: () => ({ mutateAsync: createPaymentMutateAsync, isPending: false }),
  PAYMENT_UNAVAILABLE_MESSAGE: 'Não foi possível iniciar o pagamento. Tente novamente.',
}))
vi.mock('@/features/checkout/lib/cardBrick', () => ({
  getCardFormData: () => getCardFormDataMock(),
}))
vi.mock('@/entities/customer', () => ({
  useSaveCustomerCpf: () => ({ mutateAsync: saveCpfMutateAsync, isPending: false }),
}))
vi.mock('@/entities/address', () => ({
  useSaveAddress: () => ({ mutateAsync: saveAddressMutateAsync, isPending: false }),
  useDefaultAddress: (...args: unknown[]) => defaultAddressMock(...args),
}))

// `useAllProducts`: a `CartDrawer` é montada aqui (a rota fica fora do `StoreLayout`) e alimenta as
// sugestões de "complete o frete grátis" com ela.
vi.mock('@/entities/product/api/useProducts', () => ({
  useProductById: vi.fn(),
  useAllProducts: () => ({ data: [] }),
}))
vi.mock('@/features/checkout/api/useCepLookup', () => ({ useCepLookup: vi.fn() }))
vi.mock('@/features/checkout/api/useShippingQuote', () => ({ useShippingQuote: vi.fn() }))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))
// O `onApproved` é o gatilho que a `PixPayment` real dispara no Realtime (PAY-13). Aqui ele é
// exposto como botão para os testes de CNF-03/CNF-05 poderem simular a aprovação.
vi.mock('@/features/checkout/ui/PixPayment', () => ({
  default: ({ orderId, onApproved }: any) => (
    <div data-testid="pix-payment" data-order={orderId}>
      <button type="button" onClick={onApproved}>
        simular-aprovacao
      </button>
    </div>
  ),
}))
vi.mock('@/features/checkout/ui/CardPaymentBrick', () => ({
  default: ({ amount, payerEmail, errorMessage }: any) => (
    <div
      data-testid="card-brick"
      data-amount={amount}
      data-email={payerEmail}
      data-error={errorMessage ?? ''}
    />
  ),
}))

// O overlay real arrasta o SDK de OTP; o que a página precisa provar é o estado do store.
vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )
  return {
    useAuthUiStore: actual.useAuthUiStore,
    AuthOverlay: () => <div data-testid="auth-overlay" />,
  }
})

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }))

// 07/T16 + T18: a guarda de PST-03 AC 5 lê o PRODUTO (`options` + `product_variants`) para saber
// quais exigem variação — as duas metades, por PST-10. Por padrão nenhum exige: os cenários
// existentes não têm grade.
interface GridRow {
  id: string
  options: { name: string; values: string[]; position: number }[]
  product_variants: { is_active: boolean; price: number | null }[]
}
const gridRowsMock = vi.fn(() => ({ data: [] as GridRow[] }))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ in: () => gridRowsMock() }),
    }),
  },
}))

const paymentSettings = {
  pix_enabled: true,
  pix_discount_percent: 5,
  card_enabled: true,
  max_installments: 6,
  min_installment_value: 10,
}
const checkoutSettings = {
  order_bump_enabled: false,
  order_bump_product_id: null as string | null,
  order_bump_discount_percent: 50,
}
const shippingSettings = {
  free_shipping_threshold: 150,
  default_shipping_cost: 9.9,
  origin_zip: '',
  handling_days: 2,
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => paymentSettings,
  useCheckoutSettings: () => checkoutSettings,
  useShippingSettings: () => shippingSettings,
}))

// A feature 17 pôs uma query de promoções no caminho do carrinho e do resumo. O dublê nasce **vazio**
// (sem ele o `useQuery` reclamaria de não haver `QueryClientProvider` — esta página é montada sem
// provider de propósito) e os casos de PRM-12 abaixo o preenchem: é a única forma de provar que o
// pedido registra o desconto que a tela exibiu, porque `useCheckoutTotals` roda de verdade aqui.
// A aritmética das faixas em si é provada em `useCartPromotion`, `CartDrawer` e `useCheckoutTotals`.
const activePromotions: { data: (ProgressivePromotion & { name: string })[] } = { data: [] }
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: activePromotions.data, isLoading: false }),
}))

const authState: {
  user: unknown
  customer: { id: string; name: string; email: string; cpf?: string } | null
  loading: boolean
} = {
  user: { id: 'u1', email: 'marina@email.com' },
  customer: { id: 'c1', name: 'Marina Yamashita', email: 'marina@email.com' },
  loading: false,
}
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const productByIdMock = vi.mocked(useProductById)
const cepLookupMock = vi.mocked(useCepLookup)
const shippingQuoteMock = vi.mocked(useShippingQuote)

const CPF_VALIDO = '390.533.447-05'

/** O que `getFormData()` devolve com o formulário do Brick válido (token + documento do titular). */
const CARD_FORM_DATA = {
  token: 'tok_123',
  installments: 3,
  payment_method_id: 'visa',
  issuer_id: '1',
  transaction_amount: 114.9,
  payer: { email: 'marina@email.com', identification: { type: 'CPF', number: '39053344705' } },
}

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pin Gojo Satoru',
    slug: 'pin-gojo',
    price: 50,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    // VAR-11: `images` é `ProductImage[]` desde a T17. `product_image` do pedido continua sendo a
    // URL — o snapshot do item não guarda o objeto.
    images: [{ url: 'gojo.png', alt: null, source: 'upload' }],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
    ...overrides,
  }) as Product

const PAC: ShippingQuote = {
  id: 1,
  name: 'PAC',
  company: 'Correios',
  price: '14.90',
  delivery_time: 6,
  delivery_range: { min: 4, max: 6 },
}
const SEDEX: ShippingQuote = { id: 2, name: 'SEDEX', company: 'Correios', price: '24.80', delivery_time: 1 }

/** Prova por valor para qual `/pedido/:id` a aprovação navegou (CNF-03). */
const ConfirmationRoute = () => {
  const { id } = useParams<{ id: string }>()
  return <div>rota-confirmacao:{id}</div>
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/checkout']}>
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/carrinho" element={<div>rota-carrinho</div>} />
        <Route path="/pedido/:id" element={<ConfirmationRoute />} />
      </Routes>
    </MemoryRouter>,
  )

const fillContact = () =>
  useCheckoutStore.getState().setContact({
    name: 'Marina Yamashita',
    email: 'marina@email.com',
    whatsapp: '11987654321',
    consent: true,
  })

const fillAddress = () =>
  useCheckoutStore.getState().setAddress({
    cep: '04538-133',
    street: 'Av. Brigadeiro Faria Lima',
    number: '3477',
    complement: 'Apto 42',
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  })

const fillShipping = () =>
  useCheckoutStore.getState().setShipping({
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 14.9,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  })

const fillPayment = (method: 'pix' | 'card' = 'pix') =>
  useCheckoutStore.getState().setPayment({ method, cpf: CPF_VALIDO })

const fillAll = (method: 'pix' | 'card' = 'pix') => {
  fillContact()
  fillAddress()
  fillShipping()
  fillPayment(method)
}

const cta = () => screen.getByRole('button', { name: /pagar/i })
const region = (name: string) => within(screen.getByRole('region', { name }))

/** Ações reais dos stores, capturadas antes de qualquer espião — evita espião sobre espião. */
const realClearCart = useCartStore.getState().clearCart
const realClearCoupon = useCouponStore.getState().clearCoupon
let clearCartSpy: ReturnType<typeof vi.fn>
let clearCouponSpy: ReturnType<typeof vi.fn>

/** Cria o pedido e chega na superfície de pagamento, pronta para simular a aprovação. */
const reachPaymentSurface = async () => {
  fillAll()
  renderPage()
  fireEvent.click(cta())
  await waitFor(() => expect(screen.getByTestId('pix-payment')).toBeInTheDocument())
}

const approve = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'simular-aprovacao' }))
  await waitFor(() => expect(screen.getByText('rota-confirmacao:order-1')).toBeInTheDocument())
}

beforeEach(() => {
  useCheckoutStore.getState().reset()
  realClearCoupon()
  clearCartSpy = vi.fn(realClearCart)
  clearCouponSpy = vi.fn(realClearCoupon)
  useCartStore.setState({
    items: [{
      product: product(), size: '', finish: '', quantity: 2,
      variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50,
    }],
    clearCart: clearCartSpy,
  })
  useCouponStore.setState({ clearCoupon: clearCouponSpy })
  sessionStorage.clear()

  gridRowsMock.mockReset().mockReturnValue({ data: [] })
  createOrderMutateAsync.mockReset().mockResolvedValue({ id: 'order-1' })
  createPaymentMutateAsync.mockReset().mockResolvedValue({
    status: 'approved',
    status_detail: 'accredited',
  })
  getCardFormDataMock.mockReset().mockResolvedValue(CARD_FORM_DATA)
  saveCpfMutateAsync.mockReset().mockResolvedValue('39053344705')
  saveAddressMutateAsync.mockReset().mockResolvedValue({ saved: true })
  defaultAddressMock.mockReset().mockReturnValue({ data: null })
  productByIdMock.mockReset().mockReturnValue({ data: null, isError: false } as any)
  cepLookupMock.mockReset().mockReturnValue({ data: undefined } as any)
  shippingQuoteMock.mockReset().mockReturnValue({
    data: [PAC, SEDEX],
    isError: false,
    isLoading: false,
    isSuccess: true,
  } as any)

  vi.mocked(toast.error).mockClear()
  vi.mocked(markCartRecovered).mockClear()
  vi.mocked(clearGuestEmail).mockClear()

  paymentSettings.pix_enabled = true
  paymentSettings.card_enabled = true
  paymentSettings.pix_discount_percent = 5
  checkoutSettings.order_bump_enabled = false
  checkoutSettings.order_bump_product_id = null
  shippingSettings.free_shipping_threshold = 150
  activePromotions.data = []

  authState.user = { id: 'u1', email: 'marina@email.com' }
  authState.customer = { id: 'c1', name: 'Marina Yamashita', email: 'marina@email.com' }
  authState.loading = false
  useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })
})

describe('CheckoutPage — uma página, três blocos (CHK-01)', () => {
  it('renderiza os três blocos numerados na ordem Contato, Entrega, Pagamento', () => {
    renderPage()

    expect(screen.getByRole('region', { name: 'Contato' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Entrega' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pagamento' })).toBeInTheDocument()
  })

  it('não existe passo "Revisão" nem indicador de passos na árvore renderizada', () => {
    fillAll()
    const { container } = renderPage()

    expect(container.textContent).not.toMatch(/revis[ãa]o/i)
    expect(container.textContent).not.toMatch(/Identificação/i)
  })
})

describe('CheckoutPage — login obrigatório (CHK-02)', () => {
  it('deslogada abre o overlay com returnTo=/checkout e não renderiza os blocos', () => {
    authState.user = null
    renderPage()

    const state = useAuthUiStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.returnTo).toBe('/checkout')
    expect(screen.queryByRole('region', { name: 'Contato' })).not.toBeInTheDocument()
  })

  it('deslogada não limpa o carrinho', () => {
    authState.user = null
    renderPage()

    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('a página monta o próprio AuthOverlay — a rota vive fora do StoreLayout (CHK-10)', () => {
    renderPage()

    expect(screen.getByTestId('auth-overlay')).toBeInTheDocument()
  })
})

describe('CheckoutPage — acordeão (CHK-04)', () => {
  it('rascunho vazio abre o bloco Contato e mantém os outros colapsados', () => {
    renderPage()

    expect(region('Contato').getByLabelText('Nome completo')).toBeInTheDocument()
    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(region('Pagamento').queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
  })

  it('contato completo abre o bloco Entrega', () => {
    fillContact()
    renderPage()

    expect(region('Contato').queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()
    expect(region('Pagamento').queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
  })

  it('contato e entrega completos abrem o bloco Pagamento', () => {
    fillContact()
    fillAddress()
    fillShipping()
    renderPage()

    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
  })

  // FLW-05: `payment` é o último bloco — não há próximo para onde avançar, então ele fica aberto
  // sempre que Contato e Entrega estão resolvidos. É onde PGM-04 precisa do cartão montado.
  it('três blocos completos colapsam Contato e Entrega e deixam Pagamento aberto (FLW-05)', () => {
    fillAll()
    renderPage()

    expect(region('Contato').queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Alterar' })).toHaveLength(2)
  })

  it('"Alterar" reabre apenas o bloco escolhido — nunca dois abertos', () => {
    fillAll()
    renderPage()

    fireEvent.click(region('Contato').getByRole('button', { name: 'Alterar' }))

    expect(region('Contato').getByLabelText('Nome completo')).toBeInTheDocument()
    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(region('Pagamento').queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
  })
})

// A frente que originou a feature: `openBlock = resolveBlocks(...).open` fazia **completude**
// significar **navegação**, e o bloco colapsava embaixo do dedo de quem digitava. Aqui a prova é
// de ponta a ponta na página, pelos campos reais — o domínio puro sozinho não pega a regressão,
// porque o que sujava o bloco era o handler de input.
describe('CheckoutPage — quem avança é a pessoa (FLW-01, FLW-02, FLW-03)', () => {
  /** `customers` semeia nome e e-mail; o WhatsApp é o último campo que falta ao Contato. */
  const typeWhatsapp = () =>
    fireEvent.change(region('Contato').getByLabelText('WhatsApp'), {
      target: { value: '11987654321' },
    })

  const continuar = (block: string) => region(block).getByRole('button', { name: 'Continuar' })

  it('digitar o último dígito do WhatsApp NÃO colapsa o Contato (FLW-01)', () => {
    renderPage()

    typeWhatsapp()

    expect(region('Contato').getByLabelText('WhatsApp')).toHaveValue('11987654321')
    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
  })

  it('Continuar fica desabilitado com o bloco inválido e habilita ao completar (FLW-02)', () => {
    renderPage()

    expect(continuar('Contato')).toBeDisabled()

    typeWhatsapp()

    expect(continuar('Contato')).toBeEnabled()
  })

  it('Continuar no Contato colapsa o bloco e abre a Entrega (FLW-03)', () => {
    renderPage()
    typeWhatsapp()

    fireEvent.click(continuar('Contato'))

    expect(region('Contato').queryByLabelText('WhatsApp')).not.toBeInTheDocument()
    expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()
  })

  it('escolher a opção de frete NÃO colapsa a Entrega (FLW-01)', () => {
    fillContact()
    fillAddress()
    renderPage()

    fireEvent.click(region('Entrega').getByText('Correios SEDEX'))

    expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()
    expect(region('Pagamento').queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
  })

  it('Continuar na Entrega colapsa o bloco e abre o Pagamento (FLW-03)', () => {
    fillContact()
    fillAddress()
    renderPage()
    fireEvent.click(region('Entrega').getByText('Correios SEDEX'))

    fireEvent.click(continuar('Entrega'))

    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
  })

  // FLW-06: sem zerar `editing` no `Continuar`, o foco ficaria preso no bloco reaberto.
  it('Continuar depois de um Alterar devolve o foco ao primeiro bloco não resolvido (FLW-06)', () => {
    fillAll()
    renderPage()

    fireEvent.click(region('Contato').getByRole('button', { name: 'Alterar' }))
    expect(region('Contato').getByLabelText('Nome completo')).toBeInTheDocument()

    fireEvent.click(continuar('Contato'))

    expect(region('Contato').queryByLabelText('Nome completo')).not.toBeInTheDocument()
    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
  })

  // Edge case da spec: voltar por `Alterar` e invalidar derruba `Continuar` e o CTA juntos.
  it('bloco reaberto e invalidado desabilita Continuar E o CTA', () => {
    fillAll()
    renderPage()

    fireEvent.click(region('Contato').getByRole('button', { name: 'Alterar' }))
    fireEvent.change(region('Contato').getByLabelText('E-mail'), { target: { value: 'marina@' } })

    expect(continuar('Contato')).toBeDisabled()
    expect(cta()).toBeDisabled()
  })

  // FLW-07: com o Pagamento sempre aberto, `open` nunca é `null` — o gate do CTA teve de sair
  // de `open` e ir para `complete`, senão o botão nunca mais habilitaria.
  it('CTA habilita com os três blocos válidos mesmo com o Pagamento aberto (FLW-07)', () => {
    fillAll()
    renderPage()

    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
    expect(cta()).toBeEnabled()
  })
})

// ADR-02: "com endereço `is_default` salvo, o bloco Entrega abre já preenchido **e colapsado**".
// O caso geral é a cotação devolver 2+ opções: sem pré-selecionar uma, `isDeliveryComplete` é
// falso (exige `shipping !== null`) e o bloco abre expandido — ADR-02 não acontecia. Aqui a prova
// é de ponta a ponta na página, com `useDefaultAddress` devolvendo um endereço de verdade: era
// exatamente o caminho sem teste, porque o mock ficava fixo em `{ data: null }` em todo cenário.
describe('CheckoutPage — endereço salvo colapsa a Entrega (ADR-02)', () => {
  const SAVED_ADDRESS = {
    cep: '04538-133',
    street: 'Av. Brigadeiro Faria Lima',
    number: '3477',
    complement: 'Apto 42',
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    state: 'SP',
  }

  /** Contato completo: é a Entrega que o acordeão abriria se ela estivesse incompleta. */
  const withSavedAddress = () => {
    fillContact()
    defaultAddressMock.mockReturnValue({ data: SAVED_ADDRESS })
    renderPage()
  }

  it('com 2 opções cotadas a Entrega nasce colapsada, exibindo o endereço e "Alterar"', () => {
    withSavedAddress()

    expect(region('Entrega').queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(
      region('Entrega').getByText('Av. Brigadeiro Faria Lima, 3477 — São Paulo/SP'),
    ).toBeInTheDocument()
    expect(region('Entrega').getByRole('button', { name: 'Alterar' })).toBeInTheDocument()
  })

  it('a opção pré-selecionada é a mais barata das cotadas, com o cost cotado', () => {
    withSavedAddress()

    // PAC 14,90 vs SEDEX 24,80 — a mais barata é também a que ganha o frete grátis (SHP-06).
    // As datas do snapshot dependem de "hoje" e estão cravadas no DeliveryBlock.test.tsx.
    const shipping = useCheckoutStore.getState().shipping
    expect(shipping?.serviceId).toBe('1')
    expect(shipping?.serviceName).toBe('PAC')
    expect(shipping?.carrier).toBe('Correios')
    expect(shipping?.cost).toBe(14.9)
    expect(region('Entrega').getByText(/Correios PAC/)).toBeInTheDocument()
  })

  it('a Entrega completa por endereço salvo faz o acordeão avançar para Pagamento', () => {
    withSavedAddress()

    expect(region('Pagamento').getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
  })

  it('sem endereço salvo a Entrega segue abrindo expandida e nada é pré-selecionado', () => {
    fillContact()
    defaultAddressMock.mockReturnValue({ data: null })
    renderPage()

    expect(region('Entrega').getByLabelText('CEP')).toBeInTheDocument()
    expect(useCheckoutStore.getState().shipping).toBeNull()
  })
})

describe('CheckoutPage — CTA (CHK-06)', () => {
  it('CTA desabilitado enquanto algum bloco está incompleto', () => {
    fillContact()
    fillAddress()
    renderPage()

    expect(cta()).toBeDisabled()
  })

  it('CTA habilitado com os três blocos completos', () => {
    fillAll()
    renderPage()

    expect(cta()).toBeEnabled()
  })

  it('rótulo do CTA leva o valor do método PIX e nomeia o método', () => {
    fillAll('pix')
    renderPage()

    // 100 (2 × 50) − 5 (5% PIX) + 14,90 (frete) = 109,90
    expect(cta()).toHaveTextContent(/Pagar\s*R\$\s*109,90\s*com PIX/)
  })

  it('rótulo do CTA muda de valor e de método no cartão (pix_discount_percent = 5)', () => {
    fillAll('card')
    renderPage()

    // sem desconto PIX: 100 + 14,90 = 114,90 — necessariamente diferente do PIX
    expect(cta()).toHaveTextContent(/Pagar\s*R\$\s*114,90\s*no cartão/)
  })
})

describe('CheckoutPage — criação do pedido (CHK-07, CHK-08)', () => {
  it('dois acionamentos sem edição criam o pedido uma única vez', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    fireEvent.click(cta())
    await waitFor(() => expect(screen.getByTestId('pix-payment')).toBeInTheDocument())
    expect(createOrderMutateAsync).toHaveBeenCalledTimes(1)
    expect(useCheckoutStore.getState().orderId).toBe('order-1')
  })

  it('editar um bloco entre acionamentos cria um segundo pedido', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    fireEvent.click(region('Contato').getByRole('button', { name: 'Alterar' }))
    fireEvent.change(region('Contato').getByLabelText('Nome completo'), {
      target: { value: 'Marina Y.' },
    })
    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(2))
  })

  it('grava o CEP com 8 dígitos sem máscara e o snapshot do envio escolhido', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))
    expect(createOrderMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        address_zip: '04538133',
        address_complement: 'Apto 42',
        shipping_service_id: '1',
        shipping_carrier: 'Correios',
        shipping_method: 'PAC',
        delivery_estimate_min: '2026-08-04',
        delivery_estimate_max: '2026-08-06',
        shipping_cost: 14.9,
        customer_id: 'c1',
      }),
    )
  })

  it('item do bump entra no pedido com quantity 1 e unit_price descontado (BMP-03)', async () => {
    checkoutSettings.order_bump_enabled = true
    checkoutSettings.order_bump_product_id = 'bump-1'
    productByIdMock.mockReturnValue({
      data: product({
        id: 'bump-1',
        name: 'Porta-pins',
        price: 24.9,
        images: [{ url: 'pp.png', alt: null, source: 'upload' }],
      }),
      isError: false,
    } as any)
    fillAll()
    useCheckoutStore.getState().toggleBump(true)
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))
    const payload = createOrderMutateAsync.mock.calls[0][0]
    expect(payload.items).toHaveLength(2)
    expect(payload.items[1]).toEqual({
      product_id: 'bump-1',
      product_name: 'Porta-pins',
      product_image: 'pp.png',
      size: null,
      finish: null,
      quantity: 1,
      unit_price: 12.45,
      // 07/T16: o bump e sempre o produto inteiro, nunca uma linha da grade — a oferta do lojista
      // aponta para um `product_id`. Por isso price_source 'base' e o resto nulo.
      variant_id: null,
      price_source: 'base',
      variant_label: null,
      variant_options: null,
    })
    // itens do carrinho seguem com o preço cheio
    expect(payload.items[0].unit_price).toBe(50)
  })

  // ---------------------------------------------------------------------------------------------
  // PRM-12 — o pedido registra a promoção que a tela exibiu
  //
  // Sem estas asserções a guarda de teto do `create-payment` é código morto: a coluna fica no
  // `default 0` e `pricing.promotionDiscount < order.promotion_discount` nunca é verdade.
  // ---------------------------------------------------------------------------------------------

  it('promoção aplicada grava promotion_discount > 0 e o promotion_id da campanha', async () => {
    // 2 unidades a R$ 50,00 numa faixa de R$ 40,00 ⇒ desconto de R$ 20,00.
    activePromotions.data = [
      {
        id: 'promo-kit',
        name: 'Kit de bottons',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 2, value: 40 }],
        scope: 'all',
        eligibleProductIds: [],
        stacks_with_coupon: false,
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ]
    fillAll()
    renderPage()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    const payload = createOrderMutateAsync.mock.calls.at(-1)![0]
    expect(payload.promotion_discount).toBe(20)
    expect(payload.promotion_id).toBe('promo-kit')
  })

  it('pedido sem promoção vigente grava promotion_discount 0 e promotion_id null', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    const payload = createOrderMutateAsync.mock.calls.at(-1)![0]
    expect(payload.promotion_discount).toBe(0)
    expect(payload.promotion_id).toBeNull()
  })

  it('duas promoções aplicando gravam promotion_id null — a mesma regra do servidor', async () => {
    useCartStore.setState({
      items: [
        {
          product: product({ id: 'p1' }), size: '', finish: '', quantity: 2,
          variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50,
        },
        {
          product: product({ id: 'p2', name: 'Pin Nezuko', slug: 'pin-nezuko' }),
          size: '', finish: '', quantity: 2,
          variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50,
        },
      ],
    })
    activePromotions.data = [
      {
        id: 'promo-a',
        name: 'Kit Jujutsu',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 2, value: 40 }],
        scope: 'categories',
        eligibleProductIds: ['p1'],
        stacks_with_coupon: false,
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'promo-b',
        name: 'Kit Demon Slayer',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 2, value: 30 }],
        scope: 'categories',
        eligibleProductIds: ['p2'],
        stacks_with_coupon: false,
        created_at: '2026-08-02T00:00:00.000Z',
      },
    ]
    fillAll()
    renderPage()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    const payload = createOrderMutateAsync.mock.calls.at(-1)![0]
    // A coluna é FK única e não sabe dizer "duas"; a verdade de quanto fica em `promotion_discount`.
    expect(payload.promotion_id).toBeNull()
    expect(payload.promotion_discount).toBe(60)
  })

  // ---------------------------------------------------------------------------------------------
  // 07/T16 — a variação escolhida vai para o pedido (PST-03)
  // ---------------------------------------------------------------------------------------------

  it('item COM variação grava variant_id, price_source variant e o snapshot', async () => {
    useCartStore.setState({
      items: [{
        product: product(), size: '', finish: '', quantity: 1,
        variantId: 'var-45-fos',
        variantLabel: '4,5 cm · Fosco',
        optionValues: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
        unitPrice: 18.4,
      }],
    })
    fillAll()
    renderPage()
    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    const payload = createOrderMutateAsync.mock.calls.at(-1)![0]
    expect(payload.items[0]).toMatchObject({
      variant_id: 'var-45-fos',
      price_source: 'variant',
      variant_label: '4,5 cm · Fosco',
      variant_options: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
    })
    // …e o preço da linha é o da VARIAÇÃO (R$ 18,40), não o `base_price` do produto (R$ 50,00).
    // `order_items.unit_price` é o que o e-mail e o histórico do pedido mostram, e é sobre este
    // preço que `resolveOrderPricing` calcula a faixa nos dois lados.
    expect(payload.items[0].unit_price).toBe(18.4)
    expect(payload.subtotal).toBe(18.4)
  })

  it('item SEM variação grava price_source base e variant_id null', async () => {
    fillAll()
    renderPage()
    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))

    const payload = createOrderMutateAsync.mock.calls.at(-1)![0]
    expect(payload.items[0]).toMatchObject({
      variant_id: null,
      price_source: 'base',
      variant_options: null,
    })
  })

  it('produto que EXIGE variação e está sem ela: pedido NÃO é criado e o erro nomeia o produto', async () => {
    // A rejeição do create-payment é a última linha de defesa, não a primeira: um pedido gravado
    // que nunca poderá ser pago deixa a cliente com o carrinho consumido e um 422 sem explicação.
    gridRowsMock.mockReturnValue({
      data: [{
        id: 'p1',
        options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
        product_variants: [{ is_active: true, price: 18.4 }],
      }],
    })
    useCartStore.setState({
      items: [{
        product: product(), size: '', finish: '', quantity: 1,
        variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50,
      }],
    })
    fillAll()
    renderPage()
    fireEvent.click(cta())
    await waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalled())

    expect(createOrderMutateAsync).not.toHaveBeenCalled()
    expect(vi.mocked(toast.error).mock.calls.at(-1)![0]).toContain(product().name)
  })

  it('PST-10: variação ativa com options VAZIO não exige escolha — o pedido é criado', async () => {
    // É o estado de uma grade meio-cadastrada. A loja não mostra seletor nenhum para esse produto,
    // então exigir a escolha prenderia a cliente num erro que ela não tem como obedecer.
    gridRowsMock.mockReturnValue({
      data: [{ id: 'p1', options: [], product_variants: [{ is_active: true, price: 18.4 }] }],
    })
    useCartStore.setState({
      items: [{
        product: product(), size: '', finish: '', quantity: 1,
        variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50,
      }],
    })
    fillAll()
    renderPage()
    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalled())
    expect(createOrderMutateAsync.mock.calls.at(-1)![0].items[0]).toMatchObject({
      variant_id: null,
      price_source: 'base',
    })
  })

  it('a leitura da grade falhar NÃO bloqueia a venda — o servidor ainda barra com 422', async () => {
    gridRowsMock.mockImplementation(() => { throw new Error('rede caiu') })
    fillAll()
    renderPage()
    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalled())
  })

  it('depois de criado, o pedido monta a superfície de pagamento do PIX', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() =>
      expect(screen.getByTestId('pix-payment').getAttribute('data-order')).toBe('order-1'),
    )
  })
})

describe('CheckoutPage — falhas (CHK-09, PGD-03, ADR-03)', () => {
  it('falha de createOrder mostra erro, preserva rascunho e carrinho e deixa o CTA acionável', async () => {
    createOrderMutateAsync.mockRejectedValue(new Error('boom'))
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ORDER_FAILED_MESSAGE))
    expect(useCheckoutStore.getState().orderId).toBeNull()
    expect(useCheckoutStore.getState().contact.email).toBe('marina@email.com')
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(cta()).toBeEnabled()

    fireEvent.click(cta())
    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(2))
  })

  it('falha ao salvar o CPF bloqueia: nada de pedido nem de superfície de pagamento', async () => {
    saveCpfMutateAsync.mockRejectedValue(new Error('Não conseguimos salvar seus dados.'))
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Não conseguimos salvar seus dados.'),
    )
    expect(createOrderMutateAsync).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pix-payment')).not.toBeInTheDocument()
  })

  it('salva o CPF do bloco Pagamento antes de criar o pedido', async () => {
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalled())
    expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: CPF_VALIDO })
    expect(saveCpfMutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      createOrderMutateAsync.mock.invocationCallOrder[0],
    )
  })

  it('endereço que não fica salvo NÃO bloqueia a compra', async () => {
    saveAddressMutateAsync.mockResolvedValue({ saved: false })
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('sem customer.id bloqueia com mensagem clara', async () => {
    authState.customer = null
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(NO_CUSTOMER_MESSAGE))
    expect(createOrderMutateAsync).not.toHaveBeenCalled()
  })
})

// A frente 3 da feature: o cartão tinha um segundo checkout dentro do primeiro (botão "Pagar"
// próprio do Brick + campo de e-mail repetido). Agora o CTA de baixo é o único, e no cartão ele
// valida ANTES de criar qualquer coisa — cartão inválido não pode deixar `pending` para trás.
describe('CheckoutPage — um CTA, dois caminhos (PGM-06 … PGM-08, DOC-05)', () => {
  const brickError = () => screen.getByTestId('card-brick').getAttribute('data-error')

  const payWithCard = () => {
    fillAll('card')
    renderPage()
    fireEvent.click(cta())
  }

  it('cartão inválido: nenhum pedido, nenhuma cobrança, nenhum documento gravado (PGM-06)', async () => {
    getCardFormDataMock.mockResolvedValue(null)
    payWithCard()

    await waitFor(() => expect(getCardFormDataMock).toHaveBeenCalledTimes(1))
    expect(createOrderMutateAsync).not.toHaveBeenCalled()
    expect(createPaymentMutateAsync).not.toHaveBeenCalled()
    expect(saveCpfMutateAsync).not.toHaveBeenCalled()
    expect(useCheckoutStore.getState().orderId).toBeNull()
  })

  it('a validação do cartão acontece ANTES da criação do pedido (PGM-06)', async () => {
    payWithCard()

    await waitFor(() => expect(createOrderMutateAsync).toHaveBeenCalledTimes(1))
    expect(getCardFormDataMock.mock.invocationCallOrder[0]).toBeLessThan(
      createOrderMutateAsync.mock.invocationCallOrder[0],
    )
  })

  it('cartão aprovado cobra o pedido criado e navega para a confirmação', async () => {
    payWithCard()

    await waitFor(() => expect(screen.getByText('rota-confirmacao:order-1')).toBeInTheDocument())
    expect(createPaymentMutateAsync).toHaveBeenCalledWith({
      order_id: 'order-1',
      method: 'card',
      card: CARD_FORM_DATA,
    })
  })

  it('recusa exibe a mensagem amigável no bloco e não navega (PAY-02)', async () => {
    createPaymentMutateAsync.mockResolvedValue({
      status: 'rejected',
      status_detail: 'cc_rejected_insufficient_amount',
    })
    payWithCard()

    await waitFor(() => expect(brickError()).toBe('Saldo insuficiente no cartão.'))
    expect(screen.queryByText('rota-confirmacao:order-1')).not.toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('retentativa depois da recusa reusa o MESMO pedido, sem criar outro (PGM-08)', async () => {
    createPaymentMutateAsync.mockResolvedValue({
      status: 'rejected',
      status_detail: 'cc_rejected_insufficient_amount',
    })
    payWithCard()
    await waitFor(() => expect(createPaymentMutateAsync).toHaveBeenCalledTimes(1))

    fireEvent.click(cta())

    await waitFor(() => expect(createPaymentMutateAsync).toHaveBeenCalledTimes(2))
    expect(createOrderMutateAsync).toHaveBeenCalledTimes(1)
    expect(createPaymentMutateAsync.mock.calls[1][0].order_id).toBe('order-1')
  })

  it('falha do create-payment vira mensagem no bloco, sem quebrar a página (PAY-09)', async () => {
    createPaymentMutateAsync.mockRejectedValue(new Error('O Mercado Pago não respondeu.'))
    payWithCard()

    await waitFor(() => expect(brickError()).toBe('O Mercado Pago não respondeu.'))
  })

  it('DOC-05: o documento coletado pelo Brick é o que vai para customers.cpf', async () => {
    payWithCard()

    await waitFor(() => expect(saveCpfMutateAsync).toHaveBeenCalled())
    expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: '39053344705' })
  })

  it('DOC-05: sem documento no Brick, cai para o já salvo em customers (aqui, um CNPJ)', async () => {
    authState.customer = {
      id: 'c1',
      name: 'Marina Yamashita',
      email: 'marina@email.com',
      cpf: '11222333000181',
    }
    getCardFormDataMock.mockResolvedValue({
      ...CARD_FORM_DATA,
      payer: { email: 'marina@email.com' },
    })
    payWithCard()

    await waitFor(() => expect(saveCpfMutateAsync).toHaveBeenCalled())
    expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: '11222333000181' })
  })

  it('DOC-05: faltando os dois documentos, erro no bloco e NENHUM pedido criado', async () => {
    getCardFormDataMock.mockResolvedValue({
      ...CARD_FORM_DATA,
      payer: { email: 'marina@email.com' },
    })
    payWithCard()

    await waitFor(() => expect(brickError()).toBe(MISSING_DOCUMENT_MESSAGE))
    expect(createOrderMutateAsync).not.toHaveBeenCalled()
    expect(createPaymentMutateAsync).not.toHaveBeenCalled()
  })

  // O `payment.cpf` do rascunho é do caminho PIX. No cartão o documento é o do titular, que só o
  // Brick conhece — usar o do rascunho pagaria com o documento de outra pessoa.
  it('o cartão ignora o documento do rascunho e usa o do Brick', async () => {
    useCheckoutStore.getState().setPayment({ cpf: '111.444.777-35' })
    payWithCard()

    await waitFor(() => expect(saveCpfMutateAsync).toHaveBeenCalled())
    expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: '39053344705' })
  })

  it('PIX não tokeniza cartão nem chama create-payment — só cria o pedido e mostra o QR (PGM-07)', async () => {
    fillAll('pix')
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(screen.getByTestId('pix-payment')).toBeInTheDocument())
    expect(getCardFormDataMock).not.toHaveBeenCalled()
    expect(createPaymentMutateAsync).not.toHaveBeenCalled()
    expect(saveCpfMutateAsync).toHaveBeenCalledWith({ customerId: 'c1', cpf: CPF_VALIDO })
  })
})

describe('CheckoutPage — aprovação navega para a confirmação (CNF-03)', () => {
  it('aprovação navega para `/pedido/<orderId>`', async () => {
    await reachPaymentSurface()

    fireEvent.click(screen.getByRole('button', { name: 'simular-aprovacao' }))

    await waitFor(() => expect(screen.getByText('rota-confirmacao:order-1')).toBeInTheDocument())
  })

  it('nenhuma confirmação inline sobra no checkout depois da aprovação', async () => {
    await reachPaymentSurface()
    await approve()

    expect(screen.queryByRole('region', { name: 'Pagamento' })).not.toBeInTheDocument()
    expect(screen.queryByText(/pagamento confirmado/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument()
  })

  it('a confirmação não é o redirecionamento de carrinho vazio', async () => {
    await reachPaymentSurface()
    await approve()

    expect(screen.queryByText('rota-carrinho')).not.toBeInTheDocument()
  })

  it('o rascunho e o `order_id` são descartados depois de navegar', async () => {
    await reachPaymentSurface()
    await approve()

    const state = useCheckoutStore.getState()
    expect(state.orderId).toBeNull()
    expect(state.orderSnapshot).toBeNull()
    expect(state.contact.email).toBe('')
    expect(state.shipping).toBeNull()
  })
})

describe('CheckoutPage — limpeza só na aprovação (CNF-05)', () => {
  it('carrinho e cupom são limpos exatamente uma vez na aprovação', async () => {
    await reachPaymentSurface()
    await approve()

    expect(clearCartSpy).toHaveBeenCalledTimes(1)
    expect(clearCouponSpy).toHaveBeenCalledTimes(1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('pedido criado e pagamento ainda não aprovado NÃO limpa carrinho nem cupom', async () => {
    await reachPaymentSurface()

    expect(clearCartSpy).not.toHaveBeenCalled()
    expect(clearCouponSpy).not.toHaveBeenCalled()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('falha ao criar o pedido não limpa carrinho nem cupom', async () => {
    createOrderMutateAsync.mockRejectedValue(new Error('boom'))
    fillAll()
    renderPage()

    fireEvent.click(cta())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ORDER_FAILED_MESSAGE))
    expect(clearCartSpy).not.toHaveBeenCalled()
    expect(clearCouponSpy).not.toHaveBeenCalled()
  })

  it('marca o carrinho como recuperado com o e-mail e o pedido, uma única vez', async () => {
    await reachPaymentSurface()
    await approve()

    expect(markCartRecovered).toHaveBeenCalledTimes(1)
    expect(markCartRecovered).toHaveBeenCalledWith('marina@email.com', 'order-1')
  })

  it('limpa o e-mail de convidada do rastreio de carrinho abandonado', async () => {
    await reachPaymentSurface()
    await approve()

    expect(clearGuestEmail).toHaveBeenCalledTimes(1)
  })
})

describe('CheckoutPage — header, confiança e paleta (CHK-10, CHK-12)', () => {
  it('header próprio sem navegação de categorias', () => {
    renderPage()

    expect(screen.getByText('Ambiente seguro')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /coleç/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('faixa de confiança afirma só o que PoliciesPage promete', () => {
    renderPage()

    expect(screen.getByText('Mercado Pago')).toBeInTheDocument()
    expect(screen.getByText('Troca de produto com defeito em 7 dias')).toBeInTheDocument()
    expect(screen.getByText('Embalagem protegida')).toBeInTheDocument()
    expect(screen.queryByText(/desist/i)).not.toBeInTheDocument()
  })

  it('uma única pílula geleia na tela — o CTA', () => {
    fillAll()
    const { container } = renderPage()

    const jam = container.querySelectorAll('[class*="bg-nanita-jam"]')
    expect(jam).toHaveLength(1)
    expect(jam[0].textContent).toMatch(/Pagar/)
  })

  /**
   * Regressão medida em 390×844: a coluna dos blocos é item de grid e nasce com
   * `min-width: auto`, então não encolhe abaixo do próprio min-content. Como os blocos
   * colapsados usam `truncate` (`white-space: nowrap`), o min-content é o texto inteiro —
   * um endereço longo levou o documento a 452px numa viewport de 390 e pôs scroll horizontal
   * no body, que a premissa mobile do projeto proíbe.
   *
   * A asserção é de classe, e não de layout, porque jsdom não calcula largura nenhuma. Ela não
   * prova a ausência do scroll; prova que a peça que o removeu continua no lugar. A medição de
   * verdade está em `15/validation.md`.
   */
  it('a coluna dos blocos pode encolher — sem `min-w-0` volta o scroll horizontal no mobile', () => {
    fillAll()
    const { container } = renderPage()

    const column = container.querySelector('.grid > div')
    expect(column?.className).toMatch(/\bmin-w-0\b/)
  })

  it('nenhuma classe de cor fora da paleta Nanita', () => {
    fillAll()
    const { container } = renderPage()

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

describe('CheckoutPage — carrinho vazio (edge case)', () => {
  it('redireciona para o carrinho em vez de renderizar blocos', () => {
    useCartStore.setState({ items: [] })
    renderPage()

    expect(screen.getByText('rota-carrinho')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Contato' })).not.toBeInTheDocument()
  })
})
