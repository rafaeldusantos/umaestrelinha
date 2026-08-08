import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Product } from '@nanapin/supabase/types'
import type { ShippingQuote } from '@nanapin/supabase/types/shipping'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '../../model/checkoutStore'
import { useCepLookup } from '../../api/useCepLookup'
import { useShippingQuote } from '../../api/useShippingQuote'
import { useDefaultAddress } from '@/entities/address'
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
  free_shipping_threshold: 150,
  default_shipping_cost: 9.9,
  origin_zip: '',
  handling_days: 2,
}
vi.mock('@nanapin/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shippingSettings,
}))

const authState: { customer: { id: string } | null } = { customer: { id: 'c1' } }
vi.mock('@nanapin/auth', () => ({ useAuthContext: () => authState }))

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
    render(
      <DeliveryBlock
        open={false}
        complete
        onEdit={onEdit}
        onContinue={onContinue}
        canContinue
      />,
    )

    expect(
      screen.getByText('Av. Brigadeiro Faria Lima, 3477 — São Paulo/SP'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('CEP')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})

describe('DeliveryBlock — opções cotadas (SHP-01, SHP-04)', () => {
  it('exibe transportadora e nome do serviço de cada opção', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    expect(screen.getByText('Correios PAC')).toBeInTheDocument()
    expect(screen.getByText('Correios SEDEX')).toBeInTheDocument()
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

    fireEvent.click(screen.getByText('Correios SEDEX'))

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

    expect(screen.getByText('Correios Frete padrão')).toBeInTheDocument()
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

    expect(screen.getByText('Correios Frete padrão')).toBeInTheDocument()
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

    fireEvent.click(screen.getByText('Correios PAC'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })

  it('subtotal no threshold mantém o preço das demais opções', () => {
    setCartSubtotal(200)
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [SEDEX, PAC] })
    renderOpen()

    expect(screen.getAllByText('Grátis')).toHaveLength(1)

    fireEvent.click(screen.getByText('Correios SEDEX'))
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

    fireEvent.click(screen.getByText('Correios PAC'))
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

    fireEvent.click(screen.getByText('Correios PAC'))
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

    fireEvent.click(screen.getByText('Correios SEDEX'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
  })
})

describe('DeliveryBlock — troca de CEP', () => {
  it('trocar o CEP descarta a opção já selecionada (custo volta a zero)', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    renderOpen()

    fireEvent.click(screen.getByText('Correios SEDEX'))
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

    fireEvent.click(screen.getByText('Correios SEDEX'))

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
  it('nenhum elemento com bg-nanita-jam', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ data: [PAC, SEDEX] })
    const { container } = renderOpen()

    expect(container.querySelectorAll('[class*="bg-nanita-jam"]')).toHaveLength(0)
  })

  it('nenhuma classe de cor fora da paleta Nanita', () => {
    withCep()
    cepLookup(RESOLVED)
    quoteState({ isError: true })
    const { container } = renderOpen()

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})
