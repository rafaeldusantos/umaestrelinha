import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'
import type { QuoteProductPayload } from '@estrelinha/core/shipping'
import { setGuestEmail } from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '../../model/checkoutStore'
import { useCepLookup } from '../../api/useCepLookup'
import { useShippingQuote } from '../../api/useShippingQuote'
import ContactBlock, { EMAIL_READONLY_HINT } from '../ContactBlock'
import DeliveryBlock from '../DeliveryBlock'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Feature 89 · T22 — os blocos do checkout servindo o pedido montado pelo painel.
//
// CON-04 / A-07: o e-mail do link é SÓ LEITURA — sem a consulta de conta (IDN-01), sem o desafio de
// código (A-08: o link é a prova de posse) e sem alimentar o carrinho abandonado (o pedido não é a
// sacola). Nome e telefone seguem editáveis como em `/checkout`.
// CON-04 / A-11 / PRC-05: a Entrega cota as PEÇAS DO PEDIDO (não a sacola), e o frete grátis olha o
// subtotal e o cupom do pedido.

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({ setGuestEmail: vi.fn() }))
const { checkMock } = vi.hoisted(() => ({ checkMock: vi.fn() }))
vi.mock('../../api/useAccountLookup', () => ({ useAccountLookup: () => ({ check: checkMock }) }))
vi.mock('../CheckoutSignInChallenge', () => ({
  default: () => <div data-testid="desafio-de-codigo" />,
}))
vi.mock('../../api/useCepLookup', () => ({ useCepLookup: vi.fn() }))
vi.mock('../../api/useShippingQuote', async (orig) => ({
  ...(await orig<typeof import('../../api/useShippingQuote')>()),
  useShippingQuote: vi.fn(),
}))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({
  useDefaultAddress: () => ({ data: undefined }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => ({
    free_shipping_enabled: true,
    free_shipping_threshold: 150,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
  useStoreSettings: () => ({ data: undefined, isFetched: true }),
}))
const authState: { customer: any } = { customer: null }
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const quoteMock = vi.mocked(useShippingQuote)

const PAC: ShippingQuote = {
  id: 1,
  name: 'PAC',
  company: 'Correios',
  price: '14.90',
  delivery_time: 6,
  delivery_range: { min: 4, max: 6 },
}
const SEDEX: ShippingQuote = { id: 2, name: 'SEDEX', company: 'Correios', price: '24.80', delivery_time: 1 }

const PECAS: QuoteProductPayload[] = [
  { id: 'peca-1', width: 11, height: 2, length: 16, weight: 0.1, insurance_value: 180, quantity: 1 },
]

beforeEach(() => {
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  useCartStore.setState({ items: [] })
  useCouponStore.setState({ applied: null } as any)
  vi.mocked(setGuestEmail).mockClear()
  checkMock.mockReset().mockResolvedValue(true)
  authState.customer = null
  vi.mocked(useCepLookup).mockReturnValue({ data: undefined } as any)
  quoteMock.mockReset().mockReturnValue({
    data: [PAC, SEDEX],
    isError: false,
    isLoading: false,
    isSuccess: true,
  } as any)
})

const contato = (props: { challenging?: boolean } = {}) =>
  render(
    <ContactBlock
      open
      complete={false}
      onEdit={() => {}}
      onContinue={() => {}}
      canContinue={false}
      challenging={props.challenging ?? false}
      onChallenge={vi.fn()}
      emailReadOnly
    />,
  )

describe('ContactBlock com emailReadOnly (CON-04, A-07, A-08)', () => {
  it('o e-mail é só leitura, com a frase de troca', () => {
    useCheckoutStore.getState().setContact({ email: 'maria@exemplo.invalid' })
    contato()
    const email = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(email.value).toBe('maria@exemplo.invalid')
    expect(email.readOnly).toBe(true)
    expect(screen.getByText(EMAIL_READONLY_HINT)).toBeInTheDocument()
    expect(EMAIL_READONLY_HINT).toBe('Para trocar o e-mail, fale comigo pelo WhatsApp.')

    fireEvent.change(email, { target: { value: 'outra@exemplo.invalid' } })
    expect(useCheckoutStore.getState().contact.email).toBe('maria@exemplo.invalid')
  })

  it('sair do campo não consulta conta — nem o desafio aparece', async () => {
    useCheckoutStore.getState().setContact({ email: 'maria@exemplo.invalid' })
    contato({ challenging: true })
    fireEvent.blur(screen.getByLabelText('E-mail'))
    await Promise.resolve()
    expect(checkMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('desafio-de-codigo')).not.toBeInTheDocument()
  })

  it('não alimenta o carrinho abandonado', () => {
    useCheckoutStore.getState().setContact({ email: 'maria@exemplo.invalid' })
    contato()
    expect(setGuestEmail).not.toHaveBeenCalled()
  })

  it('a sessão não troca o e-mail do pedido; nome e telefone seguem editáveis', () => {
    authState.customer = { id: 'c1', name: 'Outra Pessoa', email: 'outra@exemplo.invalid', phone: '51999998888' }
    contato()
    expect(useCheckoutStore.getState().contact.email).toBe('')
    expect(useCheckoutStore.getState().contact.name).toBe('Outra Pessoa')

    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '51988887777' } })
    expect(useCheckoutStore.getState().contact.whatsapp).toBe('(51) 98888-7777')
  })

  it('sem a prop, o e-mail continua editável e consultado (o /checkout de sempre)', async () => {
    render(
      <ContactBlock
        open
        complete={false}
        onEdit={() => {}}
        onContinue={() => {}}
        canContinue={false}
        challenging={false}
        onChallenge={vi.fn()}
      />,
    )
    const email = screen.getByLabelText('E-mail') as HTMLInputElement
    expect(email.readOnly).toBe(false)
    fireEvent.blur(email, { target: { value: 'a@b.com' } })
    await waitFor(() => expect(checkMock).toHaveBeenCalled())
    expect(screen.queryByText(EMAIL_READONLY_HINT)).not.toBeInTheDocument()
  })
})

const entrega = (props: Partial<Parameters<typeof DeliveryBlock>[0]> = {}) =>
  render(
    <DeliveryBlock
      open
      complete={false}
      onEdit={() => {}}
      onContinue={() => {}}
      canContinue={false}
      {...props}
    />,
  )

const gratis = () => screen.queryAllByText('Grátis').length

describe('DeliveryBlock com as peças do pedido (CON-04, A-11, PRC-05)', () => {
  it('cota as peças injetadas, e não a sacola', () => {
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega({ quoteItems: PECAS, subtotal: 180 })
    expect(quoteMock).toHaveBeenCalledWith('04538-133', PECAS)
  })

  it('o frete grátis por faixa olha o subtotal do pedido (sacola vazia não importa)', () => {
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega({ quoteItems: PECAS, subtotal: 180 })
    // Faixa de 150: a mais barata (PAC) zera; o SEDEX mantém o preço.
    expect(gratis()).toBe(1)
    fireEvent.click(screen.getByText('Correios PAC'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(0)
    fireEvent.click(screen.getByText('Correios SEDEX'))
    expect(useCheckoutStore.getState().shipping?.cost).toBe(24.8)
  })

  it('abaixo da faixa, nada zera — mesmo com a SACOLA acima dela', () => {
    useCartStore.setState({
      items: [{ product: { id: 'x', price: 500 } as any, size: '', finish: '', quantity: 1, variantId: null, variantLabel: '', optionValues: {}, unitPrice: 500 }],
    } as any)
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega({ quoteItems: PECAS, subtotal: 100 })
    expect(gratis()).toBe(0)
  })

  it('o cupom de frete grátis do pedido zera todas as opções', () => {
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega({ quoteItems: PECAS, subtotal: 100, couponFreeShipping: true })
    expect(gratis()).toBe(2)
  })

  it('o cupom da SACOLA não vale para o pedido montado sem cupom', () => {
    useCouponStore.setState({ applied: { freeShipping: true } } as any)
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega({ quoteItems: PECAS, subtotal: 100, couponFreeShipping: false })
    expect(gratis()).toBe(0)
  })

  it('sem as props, cota a sacola (o /checkout de sempre)', () => {
    useCheckoutStore.getState().setAddress({ cep: '04538-133' })
    entrega()
    expect(quoteMock).toHaveBeenCalledWith('04538-133', undefined)
  })
})
