import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent, within } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '../../model/checkoutStore'
import { useCepLookup } from '../../api/useCepLookup'
import { useShippingQuote } from '../../api/useShippingQuote'
import { useDefaultAddress } from '@/entities/address'
import { isDeliveryComplete } from '@estrelinha/core/checkout'
import DeliveryBlock, { QUOTE_UNAVAILABLE_MESSAGE } from '../DeliveryBlock'

/* eslint-disable @typescript-eslint/no-explicit-any */

// SHP-01: transportadora, serviço, preço e data por opção.
// SHP-03/ADR-01: CEP resolvido trava os 4 campos; `manual` destrava.
// SHP-04: `shipping_cost` = `price` da opção; zero prazo literal no checkout.
// SHP-05: cotação indisponível → "Frete padrão" + aviso, compra segue.
// SHP-06: threshold zera a **mais barata**; as demais mantêm preço.
// ADR-02: endereço `is_default` abre o bloco preenchido.
// FLW-02/FLW-03: `Continuar` só habilita com o bloco válido, e é ele quem fecha o bloco.
// FLW-04/ADR-02: semear o `is_default` e pré-selecionar o frete NÃO sujam o bloco.

vi.mock('../../api/useCepLookup', () => ({ useCepLookup: vi.fn() }))
vi.mock('../../api/useShippingQuote', () => ({ useShippingQuote: vi.fn() }))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({ useDefaultAddress: vi.fn() }))

const shippingSettings = {
  free_shipping_enabled: true,
  free_shipping_threshold: 150,
  default_shipping_cost: 9.9,
  origin_zip: '',
  handling_days: 2,
}
// Feature 63: a retirada lê `shipping` + `material` por `useStoreSettings`. Só é chamada para CEP
// do RS — os casos anteriores à feature, todos com CEP de São Paulo, nunca a alcançam.
const storeSettings: {
  data: { shipping: Record<string, unknown>; material: Record<string, unknown> } | undefined
  isFetched: boolean
} = { data: undefined, isFetched: true }
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shippingSettings,
  useStoreSettings: () => storeSettings,
}))

const authState: { customer: { id: string } | null } = { customer: { id: 'c1' } }
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const cepLookupMock = vi.mocked(useCepLookup)
const shippingQuoteMock = vi.mocked(useShippingQuote)
const defaultAddressMock = vi.mocked(useDefaultAddress)

const RESOLVED = {
  street: 'Av. Brigadeiro Faria Lima',
  neighborhood: 'Itaim Bibi',
  city: 'São Paulo',
  state: 'SP',
  manual: false,
}

const cepLookup = (data: unknown) => cepLookupMock.mockReturnValue({ data } as any)

const quoteState = (state: {
  data?: ShippingQuote[]
  isError?: boolean
  isLoading?: boolean
  isSuccess?: boolean
}) =>
  shippingQuoteMock.mockReturnValue({
    data: state.data,
    isError: state.isError ?? false,
    isLoading: state.isLoading ?? false,
    isSuccess: state.isSuccess ?? state.data !== undefined,
  } as any)

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

const product = (price: number): Product =>
  ({
    id: 'p1',
    name: 'Botton',
    slug: 'botton',
    price,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
  }) as Product

// `unitPrice` é obrigatório desde 07/T11: `subtotal` soma ELE, não `product.price`.
const setCartSubtotal = (value: number) =>
  useCartStore.setState({
    items: [{
      product: product(value), size: '', finish: '', quantity: 1,
      variantId: null, variantLabel: '', optionValues: {}, unitPrice: value,
    }],
  })

const onEdit = vi.fn()
const onContinue = vi.fn()
const renderOpen = (canContinue = false) =>
  render(
    <DeliveryBlock
      open
      complete={false}
      onEdit={onEdit}
      onContinue={onContinue}
      canContinue={canContinue}
    />,
  )

const continuar = () => screen.getByRole('button', { name: 'Continuar' })

/** CEP completo já no rascunho: é o pré-requisito para a cotação aparecer. */
const withCep = (cep = '04538-133') => useCheckoutStore.getState().setAddress({ cep })

beforeEach(() => {
  vi.useFakeTimers()
  // Segunda-feira: 2 dias de produção + range 4–6 dão "entre 4 e 6 de agosto" (board 04).
  vi.setSystemTime(new Date(2026, 6, 27))

  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  useCartStore.setState({ items: [] })
  sessionStorage.clear()
  onEdit.mockClear()
  onContinue.mockClear()
  shippingSettings.free_shipping_enabled = true
  shippingSettings.free_shipping_threshold = 150
  shippingSettings.default_shipping_cost = 9.9
  shippingSettings.handling_days = 2
  authState.customer = { id: 'c1' }

  cepLookup(undefined)
  quoteState({})
  defaultAddressMock.mockReturnValue({ data: null } as any)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DeliveryBlock — endereço (ADR-01, SHP-03)', () => {
  it('CEP resolvido preenche rua, bairro, cidade e UF', () => {
    withCep()
    cepLookup(RESOLVED)
    renderOpen()

    expect(screen.getByLabelText('Rua')).toHaveValue('Av. Brigadeiro Faria Lima')
    expect(screen.getByLabelText('Bairro')).toHaveValue('Itaim Bibi')
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo')
    expect(screen.getByLabelText('UF')).toHaveValue('SP')
  })

  it('CEP resolvido deixa rua, bairro, cidade e UF travados', () => {
    withCep()
    cepLookup(RESOLVED)
    renderOpen()

    expect(screen.getByLabelText('Rua')).toBeDisabled()
    expect(screen.getByLabelText('Bairro')).toBeDisabled()
    expect(screen.getByLabelText('Cidade')).toBeDisabled()
    expect(screen.getByLabelText('UF')).toBeDisabled()
  })

  it('CEP resolvido mantém número e complemento editáveis', () => {
    withCep()
    cepLookup(RESOLVED)
    renderOpen()

    expect(screen.getByLabelText('Número')).toBeEnabled()
    expect(screen.getByLabelText('Complemento')).toBeEnabled()

    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '3477' } })
    expect(useCheckoutStore.getState().address.number).toBe('3477')
  })

  it('manual: true destrava os quatro campos do endereço', () => {
    withCep()
    cepLookup({ street: '', neighborhood: '', city: '', state: '', manual: true })
    renderOpen()

    expect(screen.getByLabelText('Rua')).toBeEnabled()
    expect(screen.getByLabelText('Bairro')).toBeEnabled()
    expect(screen.getByLabelText('Cidade')).toBeEnabled()
    expect(screen.getByLabelText('UF')).toBeEnabled()
  })

  it('manual: true exibe o aviso de digitação à mão', () => {
    withCep()
    cepLookup({ street: '', neighborhood: '', city: '', state: '', manual: true })
    renderOpen()

    expect(screen.getByRole('status')).toHaveTextContent(/preencha o endereço à mão/i)
  })
})

const DEFAULT_ADDRESS = {
  cep: '04538-133',
  street: 'Av. Brigadeiro Faria Lima',
  number: '3477',
  complement: 'Apto 42',
  neighborhood: 'Itaim Bibi',
  city: 'São Paulo',
  state: 'SP',
}

describe('DeliveryBlock — endereço salvo (ADR-02)', () => {
  it('endereço is_default presente preenche o bloco sem a cliente digitar', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    renderOpen()

    expect(screen.getByLabelText('CEP')).toHaveValue('04538-133')
    expect(screen.getByLabelText('Rua')).toHaveValue('Av. Brigadeiro Faria Lima')
    expect(screen.getByLabelText('Número')).toHaveValue('3477')
    expect(useCheckoutStore.getState().address.city).toBe('São Paulo')
  })

  it('endereço is_default + 2 opções cotadas pré-seleciona a mais barata', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    cepLookup(RESOLVED)
    // SEDEX primeiro de propósito: a escolha é por preço, não pela ordem da cotação.
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toEqual({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 14.9,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
  })

  it('endereço digitado na hora com 2 opções NÃO pré-seleciona nenhuma', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toBeNull()
  })

  it('trocar o CEP do endereço salvo descarta a seleção e não pré-seleciona de novo', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01310100' } })

    expect(useCheckoutStore.getState().shipping).toBeNull()
  })

  it('colapsado exibe o endereço e a ação Alterar em vez dos campos', () => {
    useCheckoutStore.getState().setAddress({
      cep: '04538-133',
      street: 'Av. Brigadeiro Faria Lima',
      number: '3477',
      neighborhood: 'Itaim Bibi',
      city: 'São Paulo',
      state: 'SP',
    })
    renderCollapsed()

    expect(screen.getByText('Av. Brigadeiro Faria Lima, 3477')).toBeInTheDocument()
    expect(screen.queryByLabelText('CEP')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})

const renderCollapsed = (complete = true) =>
  render(
    <DeliveryBlock
      open={false}
      complete={complete}
      onEdit={onEdit}
      onContinue={onContinue}
      canContinue
    />,
  )

const ENDERECO = {
  cep: '04538133',
  street: 'Av. Brigadeiro Faria Lima',
  number: '3477',
  complement: 'Apto 42',
  neighborhood: 'Itaim Bibi',
  city: 'São Paulo',
  state: 'SP',
}

/**
 * O bloco fechado mostra o que foi preenchido (2026-10-04, página "60" do Paper): o endereço em
 * três linhas e o frete escolhido numa faixa própria, com data e preço. Antes era uma linha com
 * `truncate` e um rodapé sem data.
 */
describe('DeliveryBlock — prévia do bloco fechado', () => {
  it('o endereço sai em três linhas: rua com complemento, bairro e cidade, CEP', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    renderCollapsed()

    expect(screen.getByText('Av. Brigadeiro Faria Lima, 3477, Apto 42')).toBeInTheDocument()
    expect(screen.getByText('Itaim Bibi · São Paulo/SP')).toBeInTheDocument()
    // O CEP é mascarado na exibição mesmo quando o rascunho guarda só dígitos (endereço salvo).
    expect(screen.getByText('CEP 04538-133')).toBeInTheDocument()
  })

  it('sem complemento nem bairro, nenhuma vírgula ou ponto solto', () => {
    useCheckoutStore.getState().setAddress({ ...ENDERECO, complement: '', neighborhood: '' })
    renderCollapsed()

    expect(screen.getByText('Av. Brigadeiro Faria Lima, 3477')).toBeInTheDocument()
    expect(screen.getByText('São Paulo/SP')).toBeInTheDocument()
  })

  it('a prévia QUEBRA a linha em vez de cortar — nada de `truncate` no bloco fechado', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    const { container } = renderCollapsed()

    expect(container.querySelector('.truncate')).toBeNull()
    expect(screen.getByText('Itaim Bibi · São Paulo/SP').parentElement!.className).toMatch(
      /\bbreak-words\b/,
    )
  })

  it('com UMA opção cotada, o resumo mostra transportadora, serviço, a DATA cotada e o preço', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX] })
    useCheckoutStore.getState().setShipping({
      serviceId: '2',
      serviceName: 'SEDEX',
      carrier: 'Correios',
      cost: 24.8,
      estimateMin: '2026-07-30',
      estimateMax: '2026-07-30',
    })
    renderCollapsed()

    const faixa = within(screen.getByRole('group', { name: 'Frete escolhido' }))
    expect(faixa.getByText('Correios SEDEX')).toBeInTheDocument()
    expect(faixa.getByText('Chega em 30 de julho')).toBeInTheDocument()
    expect(faixa.getByText('R$ 24,80')).toBeInTheDocument()
  })

  it('a data sai do rascunho mesmo sem a cotação de volta — no fuso local, sem perder um dia', () => {
    // `new Date('2026-08-04')` seria meia-noite UTC — 3 de agosto em Porto Alegre.
    useCheckoutStore.getState().setAddress(ENDERECO)
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 14.9,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    renderCollapsed()

    expect(screen.getByText('Chega entre 4 e 6 de agosto')).toBeInTheDocument()
  })

  it('frete grátis: "Grátis" com o preço cotado riscado ao lado', () => {
    setCartSubtotal(200)
    useCheckoutStore.getState().setAddress(ENDERECO)
    cepLookup(RESOLVED)
    quoteState({ data: [PAC] })
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 0,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    renderCollapsed()

    const faixa = within(screen.getByRole('group', { name: 'Frete escolhido' }))
    expect(faixa.getByText('Grátis')).toBeInTheDocument()
    expect(faixa.getByText('R$ 14,90')).toHaveClass('line-through')
  })

  it('frete padrão, sem cotação: não inventa data', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    useCheckoutStore.getState().setShipping({
      serviceId: 'default',
      serviceName: 'Frete padrão',
      carrier: 'Correios',
      cost: 9.9,
      estimateMin: '',
      estimateMax: '',
    })
    renderCollapsed()

    expect(screen.getByText('Prazo confirmado após a postagem')).toBeInTheDocument()
    expect(screen.queryByText(/^Chega/)).not.toBeInTheDocument()
  })

  // 2026-10-22: com duas ou mais opções, o bloco fechado mostra as formas de envio e deixa trocar
  // ali mesmo, sem "Alterar". Mudar o envio não é mudar o endereço.
  it('com duas opções cotadas, o bloco fechado lista as formas de envio, com a escolhida marcada', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 14.9,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    renderCollapsed()

    const lista = within(screen.getByRole('group', { name: 'Forma de envio' }))
    expect(lista.getByRole('radio', { name: /PAC · Correios/ })).toHaveAttribute('aria-checked', 'true')
    expect(lista.getByRole('radio', { name: /SEDEX · Correios/ })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.queryByRole('group', { name: 'Frete escolhido' })).not.toBeInTheDocument()
    // O endereço continua no resumo, e "Alterar" continua sendo a porta para ele.
    expect(screen.getByText('CEP 04538-133')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar' })).toBeInTheDocument()
  })

  it('tocar noutra opção com o bloco fechado troca o frete SEM sujar nem abrir o bloco', () => {
    useCheckoutStore.getState().setAddress(ENDERECO)
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 14.9,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    renderCollapsed()

    fireEvent.click(screen.getByRole('radio', { name: /SEDEX · Correios/ }))

    const state = useCheckoutStore.getState()
    expect(state.shipping).toMatchObject({ serviceId: '2', serviceName: 'SEDEX', cost: 24.8 })
    // Sujar reabriria a Entrega (FLW-01) — que é exatamente o "Alterar" que a troca evita.
    expect(state.dirty).not.toContain('delivery')
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: /SEDEX · Correios/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('incompleta: nem endereço, nem faixa de frete — só o convite e "Preencher"', () => {
    renderCollapsed(false)

    expect(screen.getByText('Informe seu CEP e escolha o envio')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Frete escolhido' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^CEP/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preencher' })).toBeInTheDocument()
  })
})

describe('DeliveryBlock — opções cotadas (SHP-01, SHP-04)', () => {
  it('exibe transportadora e nome do serviço de cada opção', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getByText('PAC · Correios')).toBeInTheDocument()
    expect(screen.getByText('SEDEX · Correios')).toBeInTheDocument()
  })

  it('exibe o preço cotado de cada opção', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getByText('R$ 14,90')).toBeInTheDocument()
    expect(screen.getByText('R$ 24,80')).toBeInTheDocument()
  })

  it('exibe a data de entrega vinda de formatEstimate, não um prazo em dias', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    const { container } = renderOpen()

    // hoje (seg 27/07) + handling 2 + range 4–6 em dias de semana
    expect(screen.getByText('Chega entre 4 e 6 de agosto')).toBeInTheDocument()
    // SEDEX sem delivery_range: delivery_time vale como min e max
    expect(screen.getByText('Chega em 30 de julho')).toBeInTheDocument()
    // SHP-04: a frase é montada em runtime só para o grep da spec seguir voltando zero.
    expect(container.textContent).not.toContain(['dias', 'úteis'].join(' '))
  })

  it('selecionar uma opção grava o snapshot com cost igual ao price cotado', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    fireEvent.click(screen.getByText('SEDEX · Correios'))

    expect(useCheckoutStore.getState().shipping).toEqual({
      serviceId: '2',
      serviceName: 'SEDEX',
      carrier: 'Correios',
      cost: 24.8,
      estimateMin: '2026-07-30',
      estimateMax: '2026-07-30',
    })
  })

  it('cotação com uma única opção já vem pré-selecionada', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
    expect(useCheckoutStore.getState().shipping?.cost).toBe(14.9)
  })
})

describe('DeliveryBlock — cotação indisponível (SHP-05)', () => {
  it('erro na cotação vira opção única "Frete padrão" com o custo das settings', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ isError: true })
    renderOpen()

    expect(screen.getByText('Frete padrão · Correios')).toBeInTheDocument()
    expect(screen.getByText('R$ 9,90')).toBeInTheDocument()
    expect(useCheckoutStore.getState().shipping?.cost).toBe(9.9)
  })

  it('erro na cotação exibe o aviso de que os prazos não puderam ser consultados', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ isError: true })
    renderOpen()

    expect(screen.getByRole('alert')).toHaveTextContent(QUOTE_UNAVAILABLE_MESSAGE)
  })

  it('lista vazia também cai no "Frete padrão" com aviso', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [], isSuccess: true })
    renderOpen()

    expect(screen.getByText('Frete padrão · Correios')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(QUOTE_UNAVAILABLE_MESSAGE)
  })
})

describe('DeliveryBlock — frete grátis (SHP-06 e cupom)', () => {
  it('subtotal no threshold zera a opção mais barata e mostra o preço riscado', () => {
    setCartSubtotal(200)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.getByText('Grátis')).toBeInTheDocument()
    expect(screen.getByText('R$ 14,90')).toHaveClass('line-through')

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })

  it('subtotal no threshold mantém o preço das demais opções', () => {
    setCartSubtotal(200)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.getAllByText('Grátis')).toHaveLength(1)

    fireEvent.click(screen.getByText('SEDEX · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(24.8)
  })

  // Fronteira exata de SHP-06 ("com o subtotal **no** threshold"). Os dois casos acima usam
  // subtotal 200 contra threshold 150 — estritamente maior, logo não discriminam a igualdade:
  // trocar `subtotal >= free_shipping_threshold` por `>` em `DeliveryBlock.tsx:131` deixava a
  // suíte inteira verde. A cliente que para exatamente no threshold é o caso de fronteira do AC.
  it('subtotal exatamente igual ao threshold já zera a opção mais barata', () => {
    shippingSettings.free_shipping_threshold = 150
    setCartSubtotal(150)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.getByText('Grátis')).toBeInTheDocument()
    expect(screen.getByText('R$ 14,90')).toHaveClass('line-through')

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })

  it('um centavo abaixo do threshold não dá frete grátis a nenhuma opção', () => {
    shippingSettings.free_shipping_threshold = 150
    setCartSubtotal(149.99)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(14.9)
  })

  it('cupom de frete grátis zera TODAS as opções', () => {
    useCouponStore.getState().setCoupon({
      id: 'cp1',
      code: 'FRETEGRATIS',
      discount: 0,
      freeShipping: true,
    } as any)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getAllByText('Grátis')).toHaveLength(2)

    fireEvent.click(screen.getByText('SEDEX · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })
})

describe('DeliveryBlock — troca de CEP', () => {
  it('trocar o CEP descarta a opção já selecionada (custo volta a zero)', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    fireEvent.click(screen.getByText('SEDEX · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(24.8)

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01310100' } })

    expect(useCheckoutStore.getState().shipping).toBeNull()
  })
})

describe('DeliveryBlock — Continuar (FLW-02, FLW-03)', () => {
  it('bloco inválido deixa o Continuar desabilitado', () => {
    renderOpen(false)

    expect(continuar()).toBeDisabled()
  })

  it('bloco válido habilita o Continuar', () => {
    renderOpen(true)

    expect(continuar()).toBeEnabled()
  })

  it('clicar em Continuar chama onContinue — é a pessoa que fecha o bloco', () => {
    renderOpen(true)

    fireEvent.click(continuar())

    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('Continuar desabilitado não chama onContinue', () => {
    renderOpen(false)

    fireEvent.click(continuar())

    expect(onContinue).not.toHaveBeenCalled()
  })

  // Premissa mobile do projeto: alvo de toque de 44px.
  it('o Continuar tem alvo de toque de 44px', () => {
    renderOpen(true)

    expect(continuar()).toHaveClass('min-h-11')
  })
})

describe('DeliveryBlock — o que suja o bloco (FLW-01, FLW-04)', () => {
  it('digitar o CEP marca o bloco como sujo', () => {
    renderOpen()

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '04538133' } })

    expect(useCheckoutStore.getState().dirty).toEqual(['delivery'])
  })

  it('digitar o número marca o bloco como sujo', () => {
    withCep()
    cepLookup(RESOLVED)
    renderOpen()

    fireEvent.change(screen.getByLabelText('Número'), { target: { value: '3477' } })

    expect(useCheckoutStore.getState().dirty).toEqual(['delivery'])
  })

  it('escolher uma opção de frete marca o bloco como sujo', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    fireEvent.click(screen.getByText('SEDEX · Correios'))

    expect(useCheckoutStore.getState().dirty).toEqual(['delivery'])
  })

  // ADR-02: é ESTA distinção que faz o cliente recorrente ver a Entrega já colapsada. Semear o
  // endereço e pré-selecionar o frete são movimentos do sistema, não da pessoa.
  it('semear o endereço `is_default` e pré-selecionar o frete NÃO sujam o bloco', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    // A semeadura e a pré-seleção aconteceram de fato…
    expect(screen.getByLabelText('CEP')).toHaveValue('04538-133')
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
    // …e mesmo assim o bloco continua limpo.
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })

  it('o ViaCEP preencher rua/bairro/cidade/UF sozinho NÃO suja o bloco', () => {
    withCep()
    cepLookup(RESOLVED)
    renderOpen()

    expect(screen.getByLabelText('Rua')).toHaveValue('Av. Brigadeiro Faria Lima')
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })

  it('a pré-seleção da opção única de cotação NÃO suja o bloco', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })
})

describe('DeliveryBlock — paleta (CHK-04 / DESIGN.md §8)', () => {
  it('nenhum elemento com bg-estrelinha-primary', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    const { container } = renderOpen()

    expect(container.querySelectorAll('[class*="bg-estrelinha-primary"]')).toHaveLength(0)
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ isError: true })
    const { container } = renderOpen()

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

/**
 * `FRG-07` — o interruptor do frete gratis governa SHP-06.
 *
 * Este e o caminho que custava DINHEIRO. Ate a feature 37, `thresholdReached` era
 * `subtotal >= free_shipping_threshold`; com a faixa em zero isso e sempre verdadeiro, e a opcao
 * mais barata saia zerada em toda cotacao — numa loja que ja nao anunciava frete gratis em tela
 * nenhuma. Esconder o texto e continuar zerando o frete e o defeito de hoje, invertido.
 */
describe('DeliveryBlock — o interruptor do frete gratis (FRG-07)', () => {
  it('DESLIGADO: subtotal MUITO acima da faixa guardada nao zera opcao nenhuma', () => {
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 150
    setCartSubtotal(10_000)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(14.9)
  })

  it('DESLIGADO: subtotal exatamente na faixa guardada tambem nao zera', () => {
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 150
    setCartSubtotal(150)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()
  })

  it('DESLIGADO com faixa em ZERO: nao vira frete gratis para todo mundo', () => {
    // A leitura antiga (`subtotal >= 0`) zerava a mais barata em 100% das cotacoes.
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 0
    setCartSubtotal(1)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()
  })

  it('LIGADO com faixa em ZERO (config invalida) tambem nao zera', () => {
    shippingSettings.free_shipping_enabled = true
    shippingSettings.free_shipping_threshold = 0
    setCartSubtotal(1)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()
  })

  it('DESLIGADO: o cupom de frete gratis CONTINUA zerando todas (AC 14)', () => {
    // Decisao do usuario (Q2): o interruptor governa so a faixa automatica por valor de compra.
    // Cupom e ato explicito da dona, criado um a um em /admin/cupons.
    shippingSettings.free_shipping_enabled = false
    useCouponStore.getState().setCoupon({
      id: 'cp1',
      code: 'FRETEGRATIS',
      discount: 0,
      freeShipping: true,
    } as any)
    setCartSubtotal(50)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getAllByText('Grátis')).toHaveLength(2)

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })

  it('DESLIGADO: o fallback "Frete padrao" cobra o custo padrao mesmo com subtotal alto', () => {
    // SHP-05 nunca dependeu do threshold — o fallback ja cobrava `default_shipping_cost` sempre.
    // O caso existe para provar que o interruptor nao introduziu um caminho novo de zerar frete.
    shippingSettings.free_shipping_enabled = false
    setCartSubtotal(10_000)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ isError: true })
    renderOpen()

    expect(screen.getByText('Frete padrão · Correios')).toBeInTheDocument()
    expect(screen.queryByText('Grátis')).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().shipping?.cost).toBe(9.9)
  })
})

/**
 * Feature 63 — a retirada no escritório no checkout (RET-06..11).
 *
 * O endereço do Material tem número e complemento DISTINTOS (`455`, `Sala 3`), para a ausência
 * deles ser mensurável; e os preços são distintos (PAC 14,90, SEDEX 24,80, retirada 0), para a
 * retirada nunca coincidir com a "mais barata" por acaso. Datas: seg 27/07 + 2 dias úteis = 29/07.
 */
describe('DeliveryBlock — retirada no escritório (feature 63)', () => {
  const MATERIAL = {
    recipient: 'Adri Muniz',
    street: 'Rua Dona Laura',
    number: '455',
    complement: 'Sala 3',
    neighborhood: 'Rio Branco',
    city: 'Porto Alegre',
    state: 'RS',
    zip: '90430091',
    notes: '',
  }
  const LINHA = 'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre/RS'
  const CEP_RS = '91240-010'
  const RESOLVED_RS = {
    street: 'Rua Coronel Bordini',
    neighborhood: 'Auxiliadora',
    city: 'Porto Alegre',
    state: 'RS',
    manual: false,
  }
  const RASCUNHO_RETIRADA = {
    serviceId: 'retirada',
    serviceName: 'Retirada no escritório',
    carrier: 'Uma Estrelinha',
    cost: 0,
    estimateMin: '',
    estimateMax: '',
  }

  beforeEach(() => {
    storeSettings.isFetched = true
    storeSettings.data = {
      shipping: { handling_days: 2, pickup_enabled: true },
      material: { ...MATERIAL },
    }
  })

  afterEach(() => {
    storeSettings.data = undefined
  })

  const grupoRetirada = () => within(screen.getByRole('group', { name: 'Retirar em' }))

  it('CEP do RS: dois grupos, "Envio a domicílio" e "Retirar em" com a linha, a data e "Grátis" (RET-06)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getByText('Envio a domicílio')).toBeInTheDocument()
    expect(screen.getByText('PAC · Correios')).toBeInTheDocument()
    expect(grupoRetirada().getByText('Retirar em')).toBeInTheDocument()
    expect(grupoRetirada().getByText(LINHA)).toBeInTheDocument()
    expect(grupoRetirada().getByText('Pronta para retirada a partir de 29 de julho')).toBeInTheDocument()
    expect(grupoRetirada().getByText('Grátis')).toBeInTheDocument()
    expect(screen.queryByText(/455/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sala 3/)).not.toBeInTheDocument()
  })

  it('CEP de São Paulo: nenhum dos dois títulos de grupo (RET-02)', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.queryByText('Envio a domicílio')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Retirar em' })).not.toBeInTheDocument()
  })

  it('escolher a retirada grava o rascunho com frete zero e sem datas (RET-06, RET-07)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    const botao = grupoRetirada().getByRole('radio')
    expect(botao).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(botao)

    expect(useCheckoutStore.getState().shipping).toEqual(RASCUNHO_RETIRADA)
    expect(grupoRetirada().getByRole('radio')).toHaveAttribute('aria-checked', 'true')
    expect(useCheckoutStore.getState().dirty).toEqual(['delivery'])
  })

  it('endereço is_default do RS: a pré-seleção continua sendo o PAC mais barato, não a retirada (RET-08)', () => {
    defaultAddressMock.mockReturnValue({
      data: { ...DEFAULT_ADDRESS, cep: CEP_RS, city: 'Porto Alegre', state: 'RS' },
    } as any)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.getByRole('group', { name: 'Retirar em' })).toBeInTheDocument()
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
    expect(useCheckoutStore.getState().shipping?.cost).toBe(14.9)
  })

  it('endereço is_default do RS com a cotação CHEGANDO DEPOIS da configuração: a pré-seleção é o PAC, não a retirada (RET-08)', () => {
    // A ordem do navegador: `store_settings` já está no cache (a retirada aparece no primeiro
    // render) e a cotação ainda está no ar. O caso acima resolve a cotação no primeiro render, e
    // nele a pré-seleção roda ANTES de a retirada existir — um defeito que escolhesse a retirada
    // para o endereço salvo nunca a enxergaria ali (mutante S03 da verificação).
    defaultAddressMock.mockReturnValue({
      data: { ...DEFAULT_ADDRESS, cep: CEP_RS, city: 'Porto Alegre', state: 'RS' },
    } as any)
    cepLookup(RESOLVED_RS)
    quoteState({ isLoading: true })
    const { rerender } = renderOpen()

    expect(screen.getByText('Consultando as transportadoras…')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Retirar em' })).toBeInTheDocument()
    expect(useCheckoutStore.getState().shipping).toBeNull()

    quoteState({ data: [SEDEX, PAC] })
    rerender(
      <DeliveryBlock open complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )

    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
    expect(useCheckoutStore.getState().shipping?.cost).toBe(14.9)
    expect(grupoRetirada().getByRole('radio')).toHaveAttribute('aria-checked', 'false')
  })

  it('CEP do RS: "Envio a domicílio" e "Retirar em" são DOIS grupos nomeados, cada um com a sua opção (RET-06)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    const domicilio = within(screen.getByRole('group', { name: 'Envio a domicílio' }))
    expect(domicilio.getByText('PAC · Correios')).toBeInTheDocument()
    expect(domicilio.getByText('SEDEX · Correios')).toBeInTheDocument()
    expect(domicilio.queryByText(LINHA)).not.toBeInTheDocument()
    expect(grupoRetirada().getByText(LINHA)).toBeInTheDocument()
    expect(grupoRetirada().queryByText('PAC · Correios')).not.toBeInTheDocument()
  })

  it('CEP de São Paulo: as opções dos Correios não viram grupo nomeado (a tela de antes)', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.queryByRole('group', { name: 'Envio a domicílio' })).not.toBeInTheDocument()
    // E nenhum grupo SEM nome em volta das opções dos Correios: um `role="group"` incondicional
    // (o mutante N15 da rodada 2) escaparia da consulta por nome acima. Asserção no PRÓPRIO botão,
    // subindo até o bloco: fora do RS não há grupo nenhum no caminho.
    for (const nome of [/PAC · Correios/, /SEDEX · Correios/]) {
      const opcao = screen.getByRole('radio', { name: nome })
      expect(opcao.closest('[role="group"]'), String(nome)).toBeNull()
    }
  })

  it('cupom de frete grátis num CEP do RS: PAC e SEDEX ficam Grátis, e a retirada continua Grátis com custo 0 (edge case)', () => {
    useCouponStore.getState().setCoupon({
      id: 'cp1',
      code: 'FRETEGRATIS',
      discount: 0,
      freeShipping: true,
    } as any)
    setCartSubtotal(50)
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    // Três "Grátis": PAC e SEDEX (com o preço riscado, como hoje) e a retirada.
    expect(screen.getAllByText('Grátis')).toHaveLength(3)
    expect(screen.getByText('R$ 14,90')).toHaveClass('line-through')
    expect(screen.getByText('R$ 24,80')).toHaveClass('line-through')
    expect(grupoRetirada().getByText('Grátis')).toBeInTheDocument()

    fireEvent.click(grupoRetirada().getByRole('radio'))
    expect(useCheckoutStore.getState().shipping).toEqual(RASCUNHO_RETIRADA)

    fireEvent.click(screen.getByText('SEDEX · Correios'))
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('2')
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })

  it('cotação com uma opção só num CEP do RS: pré-seleciona o PAC, nunca a retirada (RET-08)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
  })

  it('frete grátis atingido: o PAC mais barato fica Grátis e a retirada não "rouba" o posto (RET-08)', () => {
    setCartSubtotal(200)
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    // Dois "Grátis": o do PAC (com o preço riscado) e o da retirada.
    expect(screen.getAllByText('Grátis')).toHaveLength(2)
    expect(screen.getByText('R$ 14,90')).toHaveClass('line-through')
    expect(screen.getByText('R$ 24,80')).not.toHaveClass('line-through')

    fireEvent.click(screen.getByText('PAC · Correios'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
  })

  it('cotação indisponível num CEP do RS: "Frete padrão" E a retirada (SHP-05 + RET-06)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ isError: true })
    renderOpen()

    expect(screen.getByRole('alert')).toHaveTextContent(QUOTE_UNAVAILABLE_MESSAGE)
    expect(screen.getByText('Frete padrão · Correios')).toBeInTheDocument()
    expect(grupoRetirada().getByText(LINHA)).toBeInTheDocument()
    // SHP-05 pré-seleciona a opção única de fallback — e ela continua sendo o frete padrão.
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('default')
  })

  it('retirada desligada no painel: o grupo não aparece num CEP do RS (RET-05)', () => {
    storeSettings.data!.shipping.pickup_enabled = false
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.queryByRole('group', { name: 'Retirar em' })).not.toBeInTheDocument()
    expect(screen.queryByText('Envio a domicílio')).not.toBeInTheDocument()
  })

  it('trocar para um CEP de São Paulo desfaz a retirada e esconde a opção (RET-10)', () => {
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    fireEvent.click(grupoRetirada().getByRole('radio'))
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('retirada')

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01310100' } })

    expect(useCheckoutStore.getState().shipping).toBeNull()
    expect(screen.queryByRole('group', { name: 'Retirar em' })).not.toBeInTheDocument()
  })

  it('rascunho restaurado com retirada, e a retirada foi desligada: a escolha é desfeita (edge case)', () => {
    storeSettings.data!.shipping.pickup_enabled = false
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    useCheckoutStore.getState().setShipping(RASCUNHO_RETIRADA)
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toBeNull()
  })

  it('rascunho restaurado com retirada enquanto a configuração CARREGA: a escolha fica', () => {
    // Sem a configuração, os defaults dão Material vazio e a opção sai `null` — "ainda não sei"
    // não pode desfazer a escolha de quem recarregou o checkout.
    storeSettings.data = undefined
    storeSettings.isFetched = false
    withCep(CEP_RS)
    cepLookup(RESOLVED_RS)
    quoteState({ data: [PAC, SEDEX] })
    useCheckoutStore.getState().setShipping(RASCUNHO_RETIRADA)
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toEqual(RASCUNHO_RETIRADA)
  })

  it('rascunho restaurado com retirada e um CEP de fora do RS: a escolha é desfeita (RET-10)', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    useCheckoutStore.getState().setShipping(RASCUNHO_RETIRADA)
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toBeNull()
  })

  it('recolhido com a retirada: "Retirada no escritório", a linha e "Grátis" — sem prazo de transportadora (RET-11)', () => {
    useCheckoutStore.getState().setAddress({
      ...ENDERECO,
      cep: '91240010',
      city: 'Porto Alegre',
      state: 'RS',
    })
    useCheckoutStore.getState().setShipping(RASCUNHO_RETIRADA)
    renderCollapsed()

    const faixa = within(screen.getByRole('group', { name: 'Frete escolhido' }))
    expect(faixa.getByText('Retirada no escritório')).toBeInTheDocument()
    expect(faixa.getByText(LINHA)).toBeInTheDocument()
    expect(faixa.getByText('Grátis')).toBeInTheDocument()
    expect(screen.queryByText(/^Chega/)).not.toBeInTheDocument()
    expect(screen.queryByText('Prazo confirmado após a postagem')).not.toBeInTheDocument()
    expect(faixa.queryByText(/Uma Estrelinha Retirada/)).not.toBeInTheDocument()
  })

  it('com a retirada escolhida, o endereço da cliente continua obrigatório: sem número, incompleto (RET-09)', () => {
    const address = {
      cep: '91240010',
      street: 'Rua Coronel Bordini',
      number: '',
      complement: '',
      neighborhood: 'Auxiliadora',
      city: 'Porto Alegre',
      state: 'RS',
      manual: false,
    }
    expect(isDeliveryComplete({ address, shipping: RASCUNHO_RETIRADA })).toBe(false)
    expect(isDeliveryComplete({ address: { ...address, number: '120' }, shipping: RASCUNHO_RETIRADA })).toBe(true)
  })
})

describe('DeliveryBlock — frete grátis por região', () => {
  const comRegioes = (regioes: string[] | undefined) => {
    ;(shippingSettings as any).free_shipping_regions = regioes
  }
  const opcao = (nome: RegExp) => screen.getByRole('radio', { name: nome })
  const digitarCep = (cep: string) =>
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: cep } })

  beforeEach(() => {
    comRegioes(['sul', 'sudeste'])
    shippingSettings.free_shipping_threshold = 150
    setCartSubtotal(200)
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
  })
  afterEach(() => comRegioes(undefined))

  it('CEP de SP com a faixa alcançada: a mais barata sai Grátis com o valor riscado', () => {
    withCep('01310-100')
    renderOpen()

    const pac = within(opcao(/PAC · Correios/))
    expect(pac.getByText('Grátis')).toBeInTheDocument()
    expect(pac.getByText('R$ 14,90')).toHaveClass('line-through')
    expect(within(opcao(/SEDEX · Correios/)).getByText('R$ 24,80')).toBeInTheDocument()
    expect(within(opcao(/SEDEX · Correios/)).queryByText('Grátis')).toBeNull()
  })

  it('CEP do RS (Sul) com a faixa alcançada também libera a mais barata', () => {
    withCep('90010-000')
    renderOpen()

    expect(within(opcao(/PAC · Correios/)).getByText('Grátis')).toBeInTheDocument()
  })

  it('CEP da BA com a faixa alcançada: nenhuma opção sai grátis', () => {
    withCep('40020-000')
    renderOpen()

    expect(screen.queryByText('Grátis')).toBeNull()
    expect(within(opcao(/PAC · Correios/)).getByText('R$ 14,90')).not.toHaveClass('line-through')
  })

  it('trocar o CEP de SP para a BA desfaz a escolha, e a mais barata escolhida soma o frete', () => {
    withCep('01310-100')
    renderOpen()
    fireEvent.click(opcao(/PAC · Correios/))
    expect(useCheckoutStore.getState().shipping).toMatchObject({ serviceId: '1', cost: 0 })

    digitarCep('40020-000')

    expect(useCheckoutStore.getState().shipping).toBeNull()
    expect(opcao(/PAC · Correios/)).toHaveAttribute('aria-checked', 'false')
    expect(within(opcao(/PAC · Correios/)).queryByText('Grátis')).toBeNull()

    fireEvent.click(opcao(/PAC · Correios/))
    expect(useCheckoutStore.getState().shipping).toMatchObject({ serviceId: '1', cost: 14.9 })
  })

  it('o custo gravado acompanha a escolhida quando o subtotal cai abaixo da faixa', () => {
    withCep('01310-100')
    renderOpen()
    fireEvent.click(opcao(/PAC · Correios/))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)

    act(() => setCartSubtotal(100))

    expect(useCheckoutStore.getState().shipping).toMatchObject({ serviceId: '1', cost: 14.9 })
    // Não foi a pessoa que mudou nada: o bloco não fica sujo por isso.
  })

  it('o custo gravado acompanha a cotação nova da opção escolhida', () => {
    withCep('40020-000')
    const { rerender } = renderOpen()
    fireEvent.click(opcao(/SEDEX · Correios/))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(24.8)

    quoteState({ data: [PAC, { ...SEDEX, price: '31.50' }] })
    rerender(
      <DeliveryBlock open complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )

    expect(useCheckoutStore.getState().shipping).toMatchObject({ serviceId: '2', cost: 31.5 })
  })

  it('a resincronização do custo não suja o bloco', () => {
    withCep('01310-100')
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 14.9,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    renderOpen()

    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
    expect(useCheckoutStore.getState().dirty).not.toContain('delivery')
  })

  it('com o cupom de frete grátis, a BA também fica sem frete (o cupom vale em qualquer região)', () => {
    useCouponStore.getState().setCoupon({
      id: 'cp1',
      code: 'FRETEGRATIS',
      type: 'free_shipping',
      value: 0,
      discount: 0,
      freeShipping: true,
    })
    withCep('40020-000')
    renderOpen()

    expect(within(opcao(/PAC · Correios/)).getByText('Grátis')).toBeInTheDocument()
    expect(within(opcao(/SEDEX · Correios/)).getByText('Grátis')).toBeInTheDocument()
  })
})

/**
 * Da gaveta para o checkout: a gaveta grava o CEP, a forma de envio e `cepOrigin: 'sacola'` no
 * rascunho; o bloco Entrega abre com eles, diz de onde o CEP veio e espera o Número.
 */
describe('DeliveryBlock — o CEP trazido da sacola', () => {
  const BELA_VISTA = {
    street: 'Avenida Paulista',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  }
  const PAC_DA_GAVETA = {
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 14.9,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  }
  const opcao = (nome: RegExp) => screen.getByRole('radio', { name: nome })
  const linhaDaSacola = () =>
    screen.queryByText(/Trazido da sua sacola/, {
      normalizer: (texto) => texto,
    })

  /** O que a gaveta deixa no rascunho ao calcular o frete e escolher uma opção. */
  const daGaveta = (cep = '01310-100', shipping: typeof PAC_DA_GAVETA | null = PAC_DA_GAVETA) => {
    const store = useCheckoutStore.getState()
    store.setAddress({ cep })
    store.setCepOrigin('sacola')
    if (shipping) store.setShipping(shipping)
  }

  beforeEach(() => {
    setCartSubtotal(50)
    cepLookup(BELA_VISTA)
    quoteState({ data: [PAC, SEDEX] })
  })

  it('abre com o CEP, o endereço da busca, a opção da gaveta marcada, a linha de origem e o foco no Número', () => {
    daGaveta()
    defaultAddressMock.mockReturnValue({ data: null } as any)
    renderOpen()

    expect(screen.getByLabelText('CEP')).toHaveValue('01310-100')
    expect(screen.getByLabelText('Rua')).toHaveValue('Avenida Paulista')
    expect(screen.getByLabelText('Bairro')).toHaveValue('Bela Vista')
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo')
    expect(screen.getByLabelText('UF')).toHaveValue('SP')
    expect(opcao(/PAC · Correios/)).toHaveAttribute('aria-checked', 'true')
    expect(opcao(/SEDEX · Correios/)).toHaveAttribute('aria-checked', 'false')

    const linha = screen.getByRole('status')
    expect(linha.textContent).toBe('Trazido da sua sacola · Bela Vista — São Paulo/SP')
    expect(linha.className).toMatch(/(^|\s)text-\[13px\](\s|$)/)
    expect(linha.className).toMatch(/(^|\s)text-estrelinha-ink-soft(\s|$)/)
    expect(document.activeElement).toBe(screen.getByLabelText('Número'))
  })

  it('sem a busca pelo CEP, a linha diz só "Trazido da sua sacola"', () => {
    daGaveta()
    cepLookup(undefined)
    renderOpen()

    expect(screen.getByRole('status').textContent).toBe('Trazido da sua sacola')
  })

  it('o foco no Número acontece uma vez: fechar e reabrir o bloco não o puxa de novo', () => {
    daGaveta()
    const { rerender } = renderOpen()
    expect(document.activeElement).toBe(screen.getByLabelText('Número'))

    rerender(
      <DeliveryBlock open={false} complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )
    rerender(
      <DeliveryBlock open complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )
    expect(document.activeElement).not.toBe(screen.getByLabelText('Número'))
  })

  it('o bloco que abre DEPOIS (o Contato vem antes) recebe o foco no Número ao abrir', () => {
    daGaveta()
    const { rerender } = render(
      <DeliveryBlock open={false} complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )
    rerender(
      <DeliveryBlock open complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )
    expect(document.activeElement).toBe(screen.getByLabelText('Número'))
  })

  it('com o número já preenchido, o foco não vai para o Número', () => {
    daGaveta()
    useCheckoutStore.getState().setAddress({ number: '900' })
    renderOpen()

    expect(document.activeElement).not.toBe(screen.getByLabelText('Número'))
  })

  it('a opção da gaveta que sumiu da cotação é desfeita', () => {
    daGaveta('01310-100', {
      ...PAC_DA_GAVETA,
      serviceId: '9',
      serviceName: '.Package',
      carrier: 'Jadlog',
      cost: 19.5,
    })
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toBeNull()
    expect(opcao(/PAC · Correios/)).toHaveAttribute('aria-checked', 'false')
    expect(opcao(/SEDEX · Correios/)).toHaveAttribute('aria-checked', 'false')
  })

  it('o preço novo da opção da gaveta vale no checkout', () => {
    daGaveta('01310-100', { ...PAC_DA_GAVETA, cost: 12 })
    quoteState({ data: [{ ...PAC, price: '16.40' }, SEDEX] })
    renderOpen()

    expect(useCheckoutStore.getState().shipping).toMatchObject({ serviceId: '1', cost: 16.4 })
  })

  it('a retirada escolhida na gaveta não é desfeita por não estar na cotação', () => {
    const retirada = {
      serviceId: 'retirada',
      serviceName: 'Retirada no escritório',
      carrier: 'Uma Estrelinha',
      cost: 0,
      estimateMin: '',
      estimateMax: '',
    }
    storeSettings.data = undefined
    storeSettings.isFetched = false
    try {
      daGaveta('90010-000', retirada)
      renderOpen()
      expect(useCheckoutStore.getState().shipping?.serviceId).toBe('retirada')
    } finally {
      storeSettings.isFetched = true
    }
  })

  it('digitar outro CEP no checkout tira a linha', () => {
    daGaveta()
    renderOpen()
    expect(linhaDaSacola()).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '04538133' } })

    expect(linhaDaSacola()).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().cepOrigin).toBeNull()
  })

  it('quem tem conta com endereço salvo do MESMO CEP recebe o endereço inteiro, e o bloco fica completo e limpo', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    cepLookup(RESOLVED)
    daGaveta('04538133')
    renderOpen()

    const { address, shipping, dirty } = useCheckoutStore.getState()
    expect(address).toMatchObject({
      cep: '04538-133',
      street: 'Av. Brigadeiro Faria Lima',
      number: '3477',
      complement: 'Apto 42',
    })
    expect(shipping?.serviceId).toBe('1')
    expect(isDeliveryComplete({ address, shipping })).toBe(true)
    expect(dirty).not.toContain('delivery')
    expect(document.activeElement).not.toBe(screen.getByLabelText('Número'))
  })

  it('quem tem conta com endereço salvo de OUTRO CEP: o endereço salvo não entra', () => {
    defaultAddressMock.mockReturnValue({ data: DEFAULT_ADDRESS } as any)
    daGaveta('01310-100')
    renderOpen()

    const { address, shipping } = useCheckoutStore.getState()
    expect(address.cep).toBe('01310-100')
    expect(address.number).toBe('')
    expect(address.complement).toBe('')
    expect(address.street).toBe('Avenida Paulista')
    expect(shipping?.serviceId).toBe('1')
    expect(document.activeElement).toBe(screen.getByLabelText('Número'))
  })

  it('sem `cepOrigin`, o bloco é o de hoje: nem linha de origem, nem foco no Número', () => {
    withCep('01310-100')
    useCheckoutStore.getState().setShipping(PAC_DA_GAVETA)
    renderOpen()

    expect(linhaDaSacola()).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(document.activeElement).not.toBe(screen.getByLabelText('Número'))
  })
})

/**
 * Os campos de endereço acompanham o CEP e a origem certa.
 *
 * A busca pelo CEP devolve a rua GERAL do CEP (a ViaCEP diz "Rua Siqueira Campos" para 90010-000),
 * que não é a rua do endereço salvo. Quem tem conta e calcula na sacola com o CEP do próprio
 * endereço recebe o endereço salvo inteiro em toda ida ao checkout — a busca daquele CEP não o
 * reescreve. E um CEP novo que a busca não localiza deixa os quatro campos vazios, nunca os do CEP
 * anterior.
 */
describe('DeliveryBlock — o endereço acompanha o CEP', () => {
  const SALVO_POA = {
    cep: '90010-000',
    street: 'Rua dos Andradas',
    number: '1234',
    complement: 'apto 501',
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    state: 'RS',
  }
  const BUSCA_POA = {
    street: 'Rua Siqueira Campos',
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    state: 'RS',
    manual: false,
  }
  const BUSCA_PAULISTA = {
    street: 'Avenida Paulista',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  }
  const BUSCA_PINHEIROS = {
    street: 'Rua dos Pinheiros',
    neighborhood: 'Pinheiros',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  }
  const NAO_LOCALIZADO = { street: '', neighborhood: '', city: '', state: '', manual: true }
  const RETIRADA = {
    serviceId: 'retirada',
    serviceName: 'Retirada no escritório',
    carrier: 'Uma Estrelinha',
    cost: 0,
    estimateMin: '',
    estimateMax: '',
  }
  const PAC_ESCOLHIDO = {
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 14.9,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  }

  /** A busca responde POR CEP, com a mesma referência a cada render (como o cache da consulta). */
  const buscaPorCep = (porCep: Record<string, unknown>) =>
    cepLookupMock.mockImplementation(
      (cep: string | null) => ({ data: porCep[String(cep ?? '').replace(/\D/g, '')] }) as any,
    )

  const gavetaCalcula = (cep: string, shipping: typeof PAC_ESCOLHIDO | typeof RETIRADA) => {
    const store = useCheckoutStore.getState()
    store.setAddress({ cep })
    store.setCepOrigin('sacola')
    store.setShipping(shipping)
  }

  const campos = () => ({
    rua: (screen.getByLabelText('Rua') as HTMLInputElement).value,
    bairro: (screen.getByLabelText('Bairro') as HTMLInputElement).value,
    cidade: (screen.getByLabelText('Cidade') as HTMLInputElement).value,
    uf: (screen.getByLabelText('UF') as HTMLInputElement).value,
  })

  beforeEach(() => {
    setCartSubtotal(209.9)
    quoteState({ data: [PAC, SEDEX] })
  })

  it('cliente com conta: a segunda ida da sacola (retirada → PAC) mostra o endereço salvo inteiro, também depois de recarregar', () => {
    defaultAddressMock.mockReturnValue({ data: SALVO_POA } as any)
    buscaPorCep({ '90010000': BUSCA_POA })

    // Primeira ida: a gaveta calculou 90010-000 e a cliente escolheu a retirada.
    gavetaCalcula('90010-000', RETIRADA)
    const primeira = renderCollapsed()
    expect(screen.getByText('Rua dos Andradas, 1234, apto 501')).toBeInTheDocument()
    primeira.unmount()

    // Volta à sacola, troca a retirada pelo PAC (mesmo CEP) e segue de novo ao checkout.
    useCheckoutStore.getState().setShipping(PAC_ESCOLHIDO)
    const segunda = renderCollapsed()
    expect(screen.getByText('Rua dos Andradas, 1234, apto 501')).toBeInTheDocument()
    expect(screen.queryByText(/Siqueira Campos/)).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().address).toMatchObject({
      cep: '90010-000',
      street: 'Rua dos Andradas',
      number: '1234',
      complement: 'apto 501',
      city: 'Porto Alegre',
      state: 'RS',
    })
    segunda.unmount()

    // Recarregar: o rascunho volta do `sessionStorage` e as consultas recomeçam do zero. O endereço
    // salvo chega PRIMEIRO e a busca do CEP depois — a ordem em que a busca reescrevia a rua.
    act(() => {
      void useCheckoutStore.persist.rehydrate()
    })
    buscaPorCep({})
    const recarregada = renderCollapsed()
    expect(screen.getByText('Rua dos Andradas, 1234, apto 501')).toBeInTheDocument()
    buscaPorCep({ '90010000': BUSCA_POA })
    recarregada.rerender(
      <DeliveryBlock open={false} complete onEdit={onEdit} onContinue={onContinue} canContinue />,
    )
    expect(screen.getByText('Rua dos Andradas, 1234, apto 501')).toBeInTheDocument()
    expect(screen.queryByText(/Siqueira Campos/)).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().address).toMatchObject({
      street: 'Rua dos Andradas',
      number: '1234',
      complement: 'apto 501',
    })
  })

  it('cliente com conta: a busca do CEP chegando DEPOIS do endereço salvo não troca a rua', () => {
    defaultAddressMock.mockReturnValue({ data: SALVO_POA } as any)
    buscaPorCep({})
    gavetaCalcula('90010-000', PAC_ESCOLHIDO)
    const { rerender } = renderOpen()
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua dos Andradas')

    buscaPorCep({ '90010000': BUSCA_POA })
    rerender(
      <DeliveryBlock open complete={false} onEdit={onEdit} onContinue={onContinue} canContinue={false} />,
    )
    expect(campos()).toEqual({
      rua: 'Rua dos Andradas',
      bairro: 'Centro Histórico',
      cidade: 'Porto Alegre',
      uf: 'RS',
    })
  })

  it('trocar para um CEP que a busca NÃO localiza deixa Rua, Bairro, Cidade e UF vazios, com a mensagem de hoje', () => {
    authState.customer = null
    buscaPorCep({ '01310100': BUSCA_PAULISTA, '40020000': NAO_LOCALIZADO })
    renderOpen()

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01310100' } })
    expect(campos()).toEqual({ rua: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' })

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '40020000' } })
    expect(campos()).toEqual({ rua: '', bairro: '', cidade: '', uf: '' })
    expect(screen.getByLabelText('Rua')).toBeEnabled()
    expect(screen.getByLabelText('UF')).toBeEnabled()
    expect(
      screen.getByText(
        'Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado.',
      ),
    ).toBeInTheDocument()
  })

  it('a gaveta trocou o CEP com o checkout fechado: o endereço do CEP anterior não volta', () => {
    authState.customer = null
    buscaPorCep({ '40020000': NAO_LOCALIZADO })
    useCheckoutStore.getState().setAddress({
      cep: '01310-100',
      street: 'Avenida Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    })
    gavetaCalcula('40020-000', PAC_ESCOLHIDO)
    renderOpen()

    expect(campos()).toEqual({ rua: '', bairro: '', cidade: '', uf: '' })
  })

  it('trocar para um CEP que a busca localiza continua preenchendo pela busca', () => {
    authState.customer = null
    buscaPorCep({ '01310100': BUSCA_PAULISTA, '05422000': BUSCA_PINHEIROS })
    renderOpen()

    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '01310100' } })
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '05422000' } })

    expect(campos()).toEqual({ rua: 'Rua dos Pinheiros', bairro: 'Pinheiros', cidade: 'São Paulo', uf: 'SP' })
    expect(screen.getByLabelText('Rua')).toBeDisabled()
  })

  it('o endereço digitado à mão para o CEP da sacola não localizado sobrevive à segunda ida', () => {
    authState.customer = null
    buscaPorCep({ '40020000': NAO_LOCALIZADO })
    gavetaCalcula('40020-000', PAC_ESCOLHIDO)
    const primeira = renderOpen()
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua Chile' } })
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Salvador' } })
    primeira.unmount()

    renderOpen()
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Chile')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Salvador')
  })
})
