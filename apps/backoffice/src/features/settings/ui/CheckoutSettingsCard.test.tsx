import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DEFAULT_CHECKOUT, type CheckoutSettings } from '@nanapin/supabase/types/settings'
import CheckoutSettingsCard, { DISCOUNT_RANGE_MESSAGE } from './CheckoutSettingsCard'

/* eslint-disable @typescript-eslint/no-explicit-any */

// BMP-06: o admin ativa/desativa o bump, escolhe o produto e define o percentual de desconto.
// BMP-01: o valor é gravado na chave **`checkout`** de `store_settings` — a mesma que a loja lê
//         e que a edge function usa para aplicar o desconto no servidor (BMP-04).

const mutateAsync = vi.fn()
const settingsData: { checkout: CheckoutSettings } = { checkout: { ...DEFAULT_CHECKOUT } }
let settingsLoading = false

vi.mock('@nanapin/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ data: settingsLoading ? undefined : settingsData, isLoading: settingsLoading }),
  useUpdateSettings: () => ({ mutateAsync, isPending: false }),
}))

const products = [
  { id: 'prod-1', name: 'Porta-pins de feltro', price: 24.9 },
  { id: 'prod-2', name: 'Pin Gojo Satoru', price: 12.9 },
]
let productList: typeof products = products

vi.mock('@/entities/product', () => ({
  useAdminProducts: () => ({ products: productList, loading: false }),
}))

const toastMock = vi.fn()
vi.mock('@nanapin/ui/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))

// O Select do shadcn é Radix + floating-ui. No jsdom ele precisa de três coisas que o ambiente
// não tem: pointer capture, ResizeObserver e `PointerEvent` (o gatilho só abre com
// `pointerType === 'mouse'`, propriedade que o `Event` genérico do jsdom não carrega).
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false) as any
  Element.prototype.setPointerCapture = vi.fn() as any
  Element.prototype.releasePointerCapture = vi.fn() as any
  Element.prototype.scrollIntoView = vi.fn() as any
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any
  class JsdomPointerEvent extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: any = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
  ;(globalThis as any).PointerEvent ??= JsdomPointerEvent
  ;(window as any).PointerEvent ??= JsdomPointerEvent
})

const discountInput = () => screen.getByLabelText('Desconto da oferta (%)')
const saveButton = () => screen.getByRole('button', { name: /salvar altera/i })

const openProductSelect = () => {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Produto da oferta' }), {
    button: 0,
    ctrlKey: false,
    pointerId: 1,
    pointerType: 'mouse',
  })
}

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  toastMock.mockReset()
  settingsData.checkout = { ...DEFAULT_CHECKOUT }
  settingsLoading = false
  productList = products
})

describe('CheckoutSettingsCard — campos do order bump (BMP-06)', () => {
  it('exibe o toggle, o seletor de produto e o campo de percentual', () => {
    render(<CheckoutSettingsCard />)

    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Produto da oferta' })).toBeInTheDocument()
    expect(discountInput()).toBeInTheDocument()
  })

  it('reflete o valor salvo em store_settings.checkout', () => {
    settingsData.checkout = {
      order_bump_enabled: true,
      order_bump_product_id: 'prod-2',
      order_bump_discount_percent: 30,
    }
    render(<CheckoutSettingsCard />)

    expect(screen.getByRole('switch')).toBeChecked()
    expect(discountInput()).toHaveValue(30)
    expect(screen.getByRole('combobox', { name: 'Produto da oferta' })).toHaveTextContent(
      'Pin Gojo Satoru',
    )
  })

  it('lista os produtos cadastrados como opções da oferta', async () => {
    render(<CheckoutSettingsCard />)

    openProductSelect()

    expect(await screen.findByRole('option', { name: /Porta-pins de feltro/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Pin Gojo Satoru/ })).toBeInTheDocument()
  })

  it('sem produto cadastrado avisa o admin em vez de mostrar lista vazia', () => {
    productList = []
    render(<CheckoutSettingsCard />)

    expect(screen.getByText(/Nenhum produto cadastrado ainda/)).toBeInTheDocument()
  })
})

describe('CheckoutSettingsCard — salvar na chave checkout (BMP-01)', () => {
  it('salva o toggle ligado na chave `checkout`', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'checkout',
      value: {
        order_bump_enabled: true,
        order_bump_product_id: null,
        order_bump_discount_percent: 50,
      },
    })
  })

  it('salva o produto escolhido pelo seletor', async () => {
    render(<CheckoutSettingsCard />)

    openProductSelect()
    fireEvent.click(await screen.findByRole('option', { name: /Porta-pins de feltro/ }))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_product_id).toBe('prod-1')
  })

  it('salva o percentual de desconto digitado', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.change(discountInput(), { target: { value: '35' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_discount_percent).toBe(35)
  })

  it('confirma o salvamento para o admin', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.click(saveButton())

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Configurações salvas' }),
    ))
  })

  it('erro ao salvar é reportado em vez de passar por sucesso', async () => {
    mutateAsync.mockRejectedValue(new Error('permission denied'))
    render(<CheckoutSettingsCard />)

    fireEvent.click(saveButton())

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'permission denied', variant: 'destructive' }),
    ))
  })
})

describe('CheckoutSettingsCard — percentual fora de 1–99 é rejeitado', () => {
  it('0% exibe erro e não salva', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.change(discountInput(), { target: { value: '0' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('100% exibe erro e não salva', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.change(discountInput(), { target: { value: '100' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('campo vazio não salva desconto zerado por acidente', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.change(discountInput(), { target: { value: '' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('1% e 99% são aceitos (as bordas do intervalo)', async () => {
    render(<CheckoutSettingsCard />)

    fireEvent.change(discountInput(), { target: { value: '1' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.change(discountInput(), { target: { value: '99' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_discount_percent).toBe(99)
  })
})
