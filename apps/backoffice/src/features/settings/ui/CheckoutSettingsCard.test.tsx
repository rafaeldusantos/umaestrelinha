import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { formatPrice } from '@estrelinha/core/formatters'
import { DEFAULT_CHECKOUT, type CheckoutSettings } from '@estrelinha/supabase/types/settings'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import CheckoutSettingsCard, { DISCOUNT_RANGE_MESSAGE } from './CheckoutSettingsCard'

/* eslint-disable @typescript-eslint/no-explicit-any */

// BMP-06: o admin ativa/desativa o bump, escolhe o produto e define o percentual de desconto.
// BMP-01: o valor é gravado na chave **`checkout`** de `store_settings` — a mesma que a loja lê
//         e que a edge function usa para aplicar o desconto no servidor (BMP-04).

const mutateAsync = vi.fn()
const settingsData: { checkout: CheckoutSettings } = { checkout: { ...DEFAULT_CHECKOUT } }
let settingsLoading = false

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ data: settingsLoading ? undefined : settingsData, isLoading: settingsLoading }),
  useUpdateSettings: () => ({ mutateAsync, isPending: false }),
}))

const products = [
  { id: 'prod-1', name: 'Porta-pins de feltro', slug: 'porta-pins', is_active: true, base_price: 24.9 },
  { id: 'prod-2', name: 'Pin Gojo Satoru', slug: 'pin-gojo', is_active: true, base_price: 12.9 },
]
let productList: typeof products = products

// **Nenhum `vi.mock` do barril de produto, e isso é o estado final da feature 51.**
//
// Ele existiu durante a transição, dublando `useAdminProducts` para o card não baixar o catálogo
// inteiro em cada caso. Com o card lendo `useProductPool`, o dublê passou a ser um mock TOTAL
// disfarçado de parcial — e um mock total entregaria o `ProductSearchField` como `undefined`, com o
// erro saindo no RENDER e a mensagem apontando para o componente em vez de para o mock (`L-030`).
// Quem alimenta o card agora é o cache semeado em `renderCard`, logo abaixo.

const toastMock = vi.fn()
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))

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

/**
 * O card, com o POOL semeado.
 *
 * `staleTime: Infinity` mantém o render síncrono e impede qualquer ida à rede — o dublê de supabase
 * deste arquivo não conhece a leitura do pool, que tem dono e suíte próprios.
 */
const renderCard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, productList)
  return render(
    <QueryClientProvider client={client}>
      <CheckoutSettingsCard />
    </QueryClientProvider>,
  )
}

/** Digita na busca da oferta — o nome acessível continua sendo "Produto da oferta" (R7). */
const procurar = (termo: string) =>
  fireEvent.change(screen.getByLabelText('Produto da oferta'), { target: { value: termo } })

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(undefined)
  toastMock.mockReset()
  settingsData.checkout = { ...DEFAULT_CHECKOUT }
  settingsLoading = false
  productList = products
})

describe('CheckoutSettingsCard — campos do order bump (BMP-06)', () => {
  it('exibe o toggle, o seletor de produto e o campo de percentual', () => {
    renderCard()

    expect(screen.getByRole('switch')).toBeInTheDocument()
    // **Retargetado na feature 51**: o controle deixou de ser um `<select>` de 702 itens e virou a
    // busca compartilhada. O nome acessível é o mesmo — é ele que a AC promete, não o widget (R7).
    expect(screen.getByLabelText('Produto da oferta')).toBeInTheDocument()
    expect(discountInput()).toBeInTheDocument()
  })

  it('reflete o valor salvo em store_settings.checkout', () => {
    settingsData.checkout = {
      order_bump_enabled: true,
      order_bump_product_id: 'prod-2',
      order_bump_discount_percent: 30,
    }
    renderCard()

    expect(screen.getByRole('switch')).toBeChecked()
    expect(discountInput()).toHaveValue(30)
    // A peça escolhida aparece NOMEADA, e não como um id (`BUS-09`).
    expect(screen.getByTestId('produto-escolhido')).toHaveTextContent('Pin Gojo Satoru')
  })

  it('a busca acha as peças cadastradas — em qualquer ordem (BUS-01)', () => {
    renderCard()

    procurar('feltro porta')
    expect(screen.getByTestId('peca-prod-1')).toHaveTextContent('Porta-pins de feltro')

    procurar('gojo')
    expect(screen.getByTestId('peca-prod-2')).toHaveTextContent('Pin Gojo Satoru')
  })

  it('o preco da peca aparece na linha, formatado por `formatPrice` (A-07)', () => {
    // O order bump e a UNICA das cinco telas com `mostrarPreco` ligado, e ela ja mostrava preco
    // antes desta feature. O par que prova que ele nao e padrao esta na suite do componente.
    renderCard()
    procurar('porta')

    // `textContent` cru, e não `toHaveTextContent`: o matcher NORMALIZA espaço, e `formatPrice`
    // devolve o `R$` separado por espaço rígido (U+00A0). As duas strings pareceriam iguais no
    // relatório e a comparação reprovaria sem dizer por quê.
    expect(screen.getByTestId('preco-prod-1').textContent).toBe(formatPrice(24.9))
  })

  it('nenhum `<option>` nem `<SelectItem>` de catalogo sobra na tela (BUS-07, BUS-23)', () => {
    renderCard()

    expect(screen.queryByRole('combobox', { name: 'Produto da oferta' })).toBeNull()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('sem produto cadastrado avisa o admin em vez de mostrar lista vazia', () => {
    productList = []
    renderCard()

    expect(screen.getByText(/Nenhum produto cadastrado ainda/)).toBeInTheDocument()
  })
})

describe('CheckoutSettingsCard — "Nenhum produto" continua alcancavel (BUS-09)', () => {
  it('sem peca escolhida, a tela DIZ isso — nao fica um campo mudo', () => {
    renderCard()
    expect(screen.getByTestId('sem-produto-da-oferta')).toHaveTextContent('Nenhum produto escolhido')
  })

  it('limpar a escolha grava `null` — o que a opcao "Nenhum produto" fazia', async () => {
    settingsData.checkout = {
      order_bump_enabled: true,
      order_bump_product_id: 'prod-2',
      order_bump_discount_percent: 30,
    }
    renderCard()

    fireEvent.click(screen.getByTestId('limpar-produto'))
    expect(screen.getByTestId('sem-produto-da-oferta')).toBeInTheDocument()

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_product_id).toBeNull()
  })
})

describe('CheckoutSettingsCard — salvar na chave checkout (BMP-01)', () => {
  it('salva o toggle ligado na chave `checkout`', async () => {
    renderCard()

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
    renderCard()

    procurar('porta-pins')
    fireEvent.click(screen.getByTestId('peca-prod-1'))
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_product_id).toBe('prod-1')
  })

  it('salva o percentual de desconto digitado', async () => {
    renderCard()

    fireEvent.change(discountInput(), { target: { value: '35' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_discount_percent).toBe(35)
  })

  it('confirma o salvamento para o admin', async () => {
    renderCard()

    fireEvent.click(saveButton())

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Configurações salvas' }),
    ))
  })

  it('erro ao salvar é reportado em vez de passar por sucesso', async () => {
    mutateAsync.mockRejectedValue(new Error('permission denied'))
    renderCard()

    fireEvent.click(saveButton())

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'permission denied', variant: 'destructive' }),
    ))
  })
})

describe('CheckoutSettingsCard — percentual fora de 1–99 é rejeitado', () => {
  it('0% exibe erro e não salva', async () => {
    renderCard()

    fireEvent.change(discountInput(), { target: { value: '0' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('100% exibe erro e não salva', async () => {
    renderCard()

    fireEvent.change(discountInput(), { target: { value: '100' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('campo vazio não salva desconto zerado por acidente', async () => {
    renderCard()

    fireEvent.change(discountInput(), { target: { value: '' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DISCOUNT_RANGE_MESSAGE)

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).not.toHaveBeenCalled())
  })

  it('1% e 99% são aceitos (as bordas do intervalo)', async () => {
    renderCard()

    fireEvent.change(discountInput(), { target: { value: '1' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.change(discountInput(), { target: { value: '99' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.click(saveButton())
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0].value.order_bump_discount_percent).toBe(99)
  })
})
