import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Product } from '@estrelinha/supabase/types'
import { supabase } from '@estrelinha/supabase/client'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'
import {
  PROPOSAL_CHECKOUT_STORAGE_KEY,
  useProposalCheckoutStore,
} from '@/features/checkout/model/checkoutStore'
import { deliveryOptions, useCheckoutStore, useShippingQuote } from '@/features/checkout'
import { track } from '@/shared/lib/analytics'

// A gaveta calcula o frete com o CEP da cliente, mostra as opções reais, marca uma e soma ao Total.
// A cotação é dublada no client (`functions.invoke`), a busca do CEP no `fetch`, e a configuração
// da loja em `useStoreSettings` — o resto (a lista de opções, o frete grátis, o total) é o código de
// verdade, o mesmo que o bloco Entrega do checkout usa.

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))
vi.mock('@/entities/cart/api/useCartBuyTogether', () => ({
  useCartBuyTogether: () => ({ config: null, mainNames: new Map() }),
}))
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: [], isLoading: false }),
}))
const catalogo = vi.hoisted(() => ({ enabled: [] as (boolean | undefined)[] }))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: (options?: { enabled?: boolean }) => {
    catalogo.enabled.push(options?.enabled)
    return { data: [] }
  },
}))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({
  default: (props: { shippingCost: number }) => (
    <div data-testid="coupon-input" data-shipping-cost={props.shippingCost} />
  ),
}))
vi.mock('@/shared/lib/analytics', async (original) => ({
  ...(await original<typeof import('@/shared/lib/analytics')>()),
  track: vi.fn(),
}))
const balao = vi.hoisted(() => ({ boundaries: [] as unknown[] }))
vi.mock('@/shared/ui/InfoTip', () => ({
  default: ({ children, collisionBoundary }: { children: ReactNode; collisionBoundary?: unknown }) => {
    balao.boundaries.push(collisionBoundary)
    return <span data-testid="info-tip">{children}</span>
  },
}))

const settings = vi.hoisted(() => ({
  shipping: {} as Record<string, unknown>,
  material: {} as Record<string, unknown>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => settings.shipping,
  useStoreSettings: () => ({
    data: { shipping: settings.shipping, material: settings.material },
    isFetched: true,
  }),
}))

import CartDrawer from '../CartDrawer'

const invoke = vi.mocked(supabase.functions.invoke)

const SP = '01310-100'
const RS = '90010-000'
const BA = '40020-000'

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pingente Estrela',
    slug: 'pingente-estrela',
    price: 100,
    compare_price: null,
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    stock_total: 20,
    low_stock_threshold: 3,
    tags: [],
    ...overrides,
  }) as unknown as Product

const setCart = (quantity: number, price = 100) =>
  useCartStore.setState({
    items: [
      {
        product: product({ price }),
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: price,
        quantity,
      },
    ],
  })

const PAC = { id: 1, name: 'PAC', company: 'Correios', price: '21.50', delivery_range: { min: 4, max: 6 } }
const SEDEX = { id: 2, name: 'SEDEX', company: 'Correios', price: '35.00', delivery_range: { min: 1, max: 2 } }

const respond = (quotes: unknown[]) => invoke.mockResolvedValue({ data: quotes, error: null } as never)

let client: QueryClient
const renderDrawer = () => {
  // O `staleTime` de 5 minutos é o do cliente da loja (`app/queryClient.ts`): com o padrão do React
  // Query (zero), toda leitura nova refaria a cotação.
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<CartDrawer />} />
          <Route path="/checkout" element={<div>rota-checkout</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
const open = () => act(() => useCartUiStore.getState().openCart())

const cepField = () => screen.getByRole('textbox', { name: 'CEP para calcular o frete e o prazo' })
const calcular = (cep: string) => {
  fireEvent.change(cepField(), { target: { value: cep } })
  fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))
}
const radios = () => screen.findAllByRole('radio')
/** O valor ao lado de um rótulo do resumo (`dt` → `dd`), com o NBSP do `Intl` normalizado. */
const summary = (label: string | RegExp) =>
  screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent?.replace(/\u00a0/g, ' ')

beforeEach(() => {
  invoke.mockReset()
  respond([PAC, SEDEX])
  vi.mocked(track).mockClear()
  catalogo.enabled = []
  balao.boundaries = []
  useCheckoutStore.getState().reset()
  useProposalCheckoutStore.getState().reset()
  sessionStorage.clear()
  useCouponStore.getState().clearCoupon()
  useCartUiStore.setState({ open: false })
  setCart(1)
  settings.shipping = {
    free_shipping_enabled: true,
    free_shipping_threshold: 150,
    free_shipping_regions: ['sul', 'sudeste'],
    default_shipping_cost: 9.9,
    handling_days: 2,
    pickup_enabled: true,
  }
  settings.material = {
    recipient: 'Adri',
    street: 'Rua dos Andradas',
    number: '100',
    complement: '',
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    state: 'RS',
    zip: '90020-000',
    notes: '',
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ logradouro: 'Av. Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a gaveta — o campo do CEP', () => {
  it('com peças, o rodapé mostra o campo e "Calcular"; vazia, não', () => {
    renderDrawer()
    open()
    const campo = cepField()
    expect(campo).toHaveAttribute('placeholder', 'CEP para calcular o frete')
    expect(campo).toHaveAttribute('inputmode', 'numeric')
    expect(campo).toHaveAttribute('autocomplete', 'postal-code')
    expect(campo).toHaveAttribute('maxlength', '9')
    expect(campo.className).toMatch(/(?:^|\s)border-estrelinha-field(?![-\w])/)
    expect(screen.getByRole('button', { name: 'Calcular' })).toBeInTheDocument()

    act(() => useCartStore.setState({ items: [] }))
    expect(screen.queryByRole('textbox', { name: /CEP para calcular/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Calcular' })).toBeNull()
  })

  it('CEP incompleto diz "CEP inválido" junto do campo e não chama a cotação', () => {
    renderDrawer()
    open()
    calcular('0131')

    expect(screen.getByRole('alert')).toHaveTextContent('CEP inválido')
    expect(cepField()).toHaveAttribute('aria-invalid', 'true')
    expect(invoke).not.toHaveBeenCalled()

    // O erro some ao digitar.
    fireEvent.change(cepField(), { target: { value: '01310' } })
    expect(screen.queryByText('CEP inválido')).toBeNull()
  })

  it('a máscara escreve 00000-000 enquanto ela digita', () => {
    renderDrawer()
    open()
    fireEvent.change(cepField(), { target: { value: '01310100' } })
    expect(cepField()).toHaveValue(SP)
  })

  it('calculando: o botão mostra o indicador e fica desligado, com duas vagas de esqueleto', async () => {
    invoke.mockReturnValue(new Promise(() => {}) as never)
    renderDrawer()
    open()
    calcular(SP)

    const botao = await screen.findByRole('button', { name: 'Calculando' })
    expect(botao).toBeDisabled()
    expect(screen.getAllByTestId('drawer-shipping-skeleton')).toHaveLength(2)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })
})

describe('a gaveta — as opções e o total', () => {
  it('CEP válido mostra as opções do bloco Entrega, a mais barata marcada, e o Total soma o frete', async () => {
    renderDrawer()
    open()
    calcular(SP)

    const [pac, sedex] = await radios()
    // A mesma lista que o bloco Entrega desenha para a mesma cotação: nome, prazo e preço.
    const esperado = deliveryOptions({
      quotes: [PAC, SEDEX] as never,
      granted: false,
      handlingDays: 2,
      today: new Date(),
    }).options
    expect(pac).toHaveTextContent('PAC · Correios')
    expect(pac).toHaveTextContent(`Chega ${esperado[0].estimateLabel}`)
    expect(pac.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 21,50')
    expect(sedex).toHaveTextContent('SEDEX · Correios')
    expect(sedex).toHaveTextContent(`Chega ${esperado[1].estimateLabel}`)
    expect(sedex.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 35,00')

    expect(pac).toHaveAttribute('aria-checked', 'true')
    expect(sedex).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radiogroup', { name: 'Forma de envio' })).toBeInTheDocument()

    expect(summary('Frete · PAC')).toBe('R$ 21,50')
    // 100,00 + 21,50
    expect(summary('Total')).toBe('R$ 121,50')
    // O cupom recebe o frete cotado.
    expect(screen.queryByTestId('coupon-input')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tem um cupom?' }))
    expect(screen.getByTestId('coupon-input')).toHaveAttribute('data-shipping-cost', '21.5')
  })

  it('o cabeçalho diz o CEP e a cidade da busca, com "Trocar CEP" que volta ao campo', async () => {
    renderDrawer()
    open()
    calcular(SP)
    await radios()

    expect(await screen.findByText(/· São Paulo\/SP/)).toBeInTheDocument()
    expect(screen.getByText(SP, { selector: 'span' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Trocar CEP' }))
    expect(cepField()).toBeInTheDocument()
    expect(screen.queryByText(/Frete ·/)).toBeNull()
    // A escolha é desfeita; o CEP continua no rascunho.
    expect(useCheckoutStore.getState().shipping).toBeNull()
    expect(useCheckoutStore.getState().address.cep).toBe(SP)
    expect(summary('Total')).toBe('R$ 100,00')
  })

  it('a segunda leitura da mesma cotação, no checkout, não chama o Melhor Envio de novo', async () => {
    renderDrawer()
    open()
    calcular(SP)
    await radios()
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('melhor-envio?action=quote', expect.anything())

    let data: unknown
    const Leitor = () => {
      data = useShippingQuote(useCheckoutStore((s) => s.address.cep)).data
      return null
    }
    render(
      <QueryClientProvider client={client}>
        <Leitor />
      </QueryClientProvider>,
    )
    expect(data).toHaveLength(2)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('tocar numa opção recolhe a lista numa linha com serviço, prazo, CEP e valor; tocar reabre', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)

    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    const linha = screen.getByRole('button', {
      name: `Frete: SEDEX, R$\u00a035,00, para o CEP ${SP}. Ver as opções`,
    })
    expect(linha).toHaveAttribute('aria-expanded', 'false')
    expect(linha).toHaveTextContent('SEDEX · Correios')
    expect(linha).toHaveTextContent(/Chega entre .* · CEP 01310-100/)
    expect(linha.textContent?.replace(/\u00a0/g, ' ')).toContain('R$ 35,00')
    expect(linha.className).toMatch(/(?:^|\s)min-h-\[52px\](?![-\w])/)
    expect(summary('Frete · SEDEX')).toBe('R$ 35,00')
    expect(summary('Total')).toBe('R$ 135,00')

    fireEvent.click(linha)
    const reabertas = screen.getAllByRole('radio')
    expect(reabertas).toHaveLength(2)
    expect(reabertas[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('a escolha não emite `add_shipping_info`', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)
    const eventos = vi.mocked(track).mock.calls.map(([e]) => (e as { name?: string } | null)?.name)
    expect(eventos).not.toContain('add_shipping_info')
  })
})

describe('a gaveta — o frete grátis', () => {
  it('faixa alcançada com CEP de SP: só a mais barata sai "Grátis" riscada, e o Total não soma frete', async () => {
    setCart(2)
    renderDrawer()
    open()
    calcular(SP)
    const [pac, sedex] = await radios()

    expect(screen.getByText('Frete grátis liberado')).toBeInTheDocument()
    expect(pac).toHaveTextContent('Grátis')
    expect(within(pac).getByText(/21,50/)).toHaveClass('line-through')
    expect(sedex).not.toHaveTextContent('Grátis')
    expect(summary('Frete · PAC')).toBe('Grátis')
    expect(summary('Total')).toBe('R$ 200,00')
  })

  it('com o interruptor desligado, nenhuma opção sai "Grátis"', async () => {
    setCart(2)
    settings.shipping = { ...settings.shipping, free_shipping_enabled: false }
    renderDrawer()
    open()
    calcular(SP)
    const lista = await radios()

    for (const r of lista) expect(r).not.toHaveTextContent('Grátis')
    expect(summary('Total')).toBe('R$ 221,50')
  })

  it('com cupom de frete grátis, todas saem "Grátis" e a faixa some — inclusive com CEP da BA', async () => {
    setCart(2)
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'FRETE',
      type: 'free_shipping',
      value: 0,
      discount: 0,
      freeShipping: true,
    })
    renderDrawer()
    open()
    calcular(BA)
    const lista = await radios()

    for (const r of lista) expect(r).toHaveTextContent('Grátis')
    expect(screen.queryByTestId('free-shipping-band')).toBeNull()
    expect(summary('Frete · PAC')).toBe('Grátis')
    expect(summary('Total')).toBe('R$ 200,00')
  })

  it('CEP da BA acima da faixa: "só para Sul e Sudeste", sem barra, e o frete da cotação no Total', async () => {
    setCart(2)
    renderDrawer()
    open()
    calcular(BA)
    const lista = await radios()

    expect(screen.getByText('Frete grátis só para Sul e Sudeste')).toBeInTheDocument()
    expect(screen.queryByText('Frete grátis liberado')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    for (const r of lista) expect(r).not.toHaveTextContent('Grátis')
    expect(summary('Frete · PAC')).toBe('R$ 21,50')
    // 2 × 100,00 + 21,50 — acima da faixa de 150, e o frete continua cobrado fora da região.
    expect(summary('Total')).toBe('R$ 221,50')
  })

  it('CEP da BA faltando frete: "Complete o frete grátis" some, e o catálogo não é buscado', async () => {
    setCart(2, 60)
    renderDrawer()
    open()
    calcular(BA)
    await radios()

    expect(screen.getByText('Frete grátis só para Sul e Sudeste')).toBeInTheDocument()
    // 2 × 60,00 + 21,50
    expect(summary('Total')).toBe('R$ 141,50')
    expect(screen.queryByText(/Complete o frete grátis/)).toBeNull()
    expect(catalogo.enabled.at(-1)).toBe(false)
  })

  it('sem CEP e faltando frete, a busca das sugestões segue como antes', () => {
    setCart(1, 60)
    renderDrawer()
    open()
    expect(catalogo.enabled.at(-1)).toBe(true)
  })

  it('o balão do ⓘ da faixa não passa do painel da gaveta', () => {
    renderDrawer()
    open()
    const painel = screen.getByRole('dialog')
    expect(balao.boundaries.length).toBeGreaterThan(0)
    expect(balao.boundaries.at(-1)).toBe(painel)
  })
})

describe('a gaveta — a retirada no escritório', () => {
  it('CEP do RS mostra os dois grupos, a retirada nunca marcada; escolhida, o resumo diz "Grátis"', async () => {
    renderDrawer()
    open()
    calcular(RS)
    await radios()

    expect(screen.getByText('Envio a domicílio')).toBeInTheDocument()
    const retirar = await screen.findByRole('group', { name: 'Retirar em' })
    const retirada = within(retirar).getByRole('radio')
    expect(retirada).toHaveAttribute('aria-checked', 'false')
    expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(retirada)
    expect(summary('Retirada no escritório')).toBe('Grátis')
    expect(summary('Total')).toBe('R$ 100,00')
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('retirada')
  })
})

describe('a gaveta — o rodapé', () => {
  it('nenhuma nota abaixo do Total, com e sem frete escolhido', async () => {
    renderDrawer()
    open()
    expect(screen.queryByText(/Frete calculado/)).toBeNull()
    calcular(SP)
    await radios()
    expect(screen.queryByText(/Frete calculado/)).toBeNull()
    const total = screen.getByText('Total', { selector: 'dt' }).closest('dl')!
    expect(total.nextElementSibling?.textContent).toBe('Finalizar Pedido')
  })

  it('o cupom recolhido tem 44px, "Finalizar Pedido" 48px, e o rodapé rola por dentro', () => {
    renderDrawer()
    open()
    const cupom = screen.getByRole('button', { name: 'Tem um cupom?' })
    expect(cupom.className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    const cta = screen.getByRole('button', { name: 'Finalizar Pedido' })
    expect(cta.className).toMatch(/(?:^|\s)h-12(?![-\w])/)
    expect(cta.className).not.toMatch(/h-\[52px\]/)
    const rodape = screen.getByTestId('drawer-footer')
    expect(rodape.className).toMatch(/(?:^|\s)max-h-\[72%\](?![-\w])/)
    expect(rodape.className).toMatch(/(?:^|\s)overflow-y-auto(?![-\w])/)
  })

  it('os alvos de toque: "Trocar CEP", as opções e "Tentar de novo" com 44px; transições com par', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [pac] = await radios()
    expect(pac.className).toMatch(/(?:^|\s)min-h-\[52px\](?![-\w])/)
    const trocar = screen.getByRole('button', { name: 'Trocar CEP' })
    expect(trocar.className).toMatch(/(?:^|\s)before:h-11(?![-\w])/)

    const rodape = screen.getByTestId('drawer-footer')
    const comTransicao = [...rodape.querySelectorAll('[class*="transition"]')]
    expect(comTransicao.length).toBeGreaterThan(0)
    for (const el of comTransicao) {
      const c = el.getAttribute('class') ?? ''
      if (/(?:^|\s)transition(?:-[a-z]+)?(?![-\w[])/.test(c)) {
        expect(c, c).toMatch(/motion-reduce:transition-none/)
      }
    }
  })
})

describe('a gaveta — as medidas do rodapé (régua do protótipo v2)', () => {
  /** Token exato: `gap-3` não pode casar dentro de `gap-[10px]`, nem `pt-2` dentro de `pt-2.5`. */
  const token = (t: string) =>
    new RegExp(`(?:^|\\s)${t.replace(/[[\]().%&]/g, (c) => `\\${c}`)}(?![-\\w.[])`)

  it('o ícone da sacola no "Finalizar Pedido" tem 20px, e o botão não o reduz a 16px', () => {
    renderDrawer()
    open()
    const cta = screen.getByRole('button', { name: 'Finalizar Pedido' })
    // O `Button` do design system força `[&_svg]:size-4` em todo ícone de dentro, e esse seletor
    // vence o `h-5 w-5` do próprio ícone: o botão precisa trocar a regra, não só o ícone.
    expect(cta.className).toMatch(token('[&_svg]:size-5'))
    expect(cta.className).not.toMatch(token('[&_svg]:size-4'))
    expect(cta.className).toMatch(token('gap-2.5'))
  })

  it('a linha recolhida do frete tem 10px entre ícone, texto e valor', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [pac] = await radios()
    fireEvent.click(pac)
    const linha = screen.getByRole('button', { name: /^Frete: PAC/ })
    expect(linha.className).toMatch(token('gap-[10px]'))
    expect(linha.className).not.toMatch(token('gap-3'))
    expect(linha.className).toMatch(token('py-[7px]'))
    expect(linha.className).toMatch(token('min-h-[52px]'))
  })

  it('com o frete escolhido, as classes do rodapé somam no máximo 270px a 390 (sem nota abaixo do Total)', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [pac] = await radios()
    fireEvent.click(pac)

    // A soma, com o prazo da linha recolhida em DUAS linhas (o caso medido a 390):
    //   borda do rodapé 1
    //   + linha do frete 7 + 18 + 16 + 16 + 7 + borda 1 = 65
    //   + "Tem um cupom?" 44 + borda 1 = 45
    //   + resumo: pt 8 + Subtotal 18 + 3 + Frete 18 + mt 5 + borda 1 + pt 7 + Total 24 = 84
    //   + "Finalizar Pedido": pt 8 + 48 + pb 12 = 68
    //   = 263px (o navegador mediu 3px a mais que a soma antes do conserto: 276 contra 273).
    const total = screen.getByText('Total', { selector: 'dt' })
    const resumo = total.closest('dl')!
    expect(resumo.className).toMatch(token('pt-2'))
    expect(resumo.className).toMatch(token('gap-[3px]'))
    const linhaDoTotal = total.parentElement!
    expect(linhaDoTotal.className).toMatch(token('mt-[5px]'))
    expect(linhaDoTotal.className).toMatch(token('pt-[7px]'))
    expect(total.className).toMatch(token('leading-6'))
    expect(total.nextElementSibling!.className).toMatch(token('leading-6'))

    const cta = screen.getByRole('button', { name: 'Finalizar Pedido' })
    const caixaDoCta = cta.parentElement!
    expect(caixaDoCta.className).toMatch(token('pt-2'))
    expect(caixaDoCta.className).toMatch(token('pb-3'))
    expect(cta.className).toMatch(token('h-12'))
    expect(screen.getByRole('button', { name: 'Tem um cupom?' }).className).toMatch(token('min-h-11'))
    expect(resumo.nextElementSibling).toBe(caixaDoCta)
  })
})

describe('a gaveta — a sacola mudou depois do cálculo', () => {
  it('mudar a quantidade recota com o mesmo CEP e mantém a opção, com o preço novo', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)
    expect(summary('Total')).toBe('R$ 135,00')

    respond([PAC, { ...SEDEX, price: '41.00' }])
    act(() => useCartStore.getState().updateQuantity('p1', '', '', 2))

    await waitFor(() => expect(summary('Frete · SEDEX')).toBe('R$ 41,00'))
    expect(summary('Total')).toBe('R$ 241,00')
    expect(invoke).toHaveBeenCalledTimes(2)
    const [, segunda] = invoke.mock.calls[1] as [string, { body: { postal_code_to: string } }]
    expect(segunda.body.postal_code_to).toBe('01310100')
  })

  it('a opção que sumiu da cotação nova volta à mais barata', async () => {
    // Abaixo da faixa nos dois momentos: o PAC volta com o preço, não com "Grátis".
    setCart(1, 60)
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)

    respond([PAC])
    act(() => useCartStore.getState().updateQuantity('p1', '', '', 2))
    await waitFor(() => expect(summary('Frete · PAC')).toBe('R$ 21,50'))
  })

  it('esvaziar a sacola mostra a gaveta vazia, e o CEP continua guardado', async () => {
    renderDrawer()
    open()
    calcular(SP)
    await radios()
    act(() => useCartStore.setState({ items: [] }))
    expect(screen.getByText('Sua sacola está vazia')).toBeInTheDocument()
    expect(useCheckoutStore.getState().address.cep).toBe(SP)
  })
})

describe('a gaveta — quando a cotação não responde', () => {
  it('falha: a mensagem com "Tentar de novo", Total sem frete, "Finalizar Pedido" funcionando, sem "Frete padrão"', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('fora do ar') } as never)
    renderDrawer()
    open()
    calcular(SP)

    expect(
      await screen.findByText(
        'Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout, onde ele é calculado outra vez.',
      ),
    ).toBeInTheDocument()
    const tentar = screen.getByRole('button', { name: 'Tentar de novo' })
    expect(tentar.className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    expect(screen.queryByText(/Frete padrão/)).toBeNull()
    expect(screen.queryByText(/Frete ·/)).toBeNull()
    expect(summary('Total')).toBe('R$ 100,00')

    respond([PAC])
    fireEvent.click(tentar)
    await radios()
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('com a cotação em falha, "Finalizar Pedido" segue funcionando', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('fora do ar') } as never)
    renderDrawer()
    open()
    calcular(SP)
    await screen.findByRole('button', { name: 'Tentar de novo' })

    const cta = screen.getByRole('button', { name: /Finalizar Pedido/ })
    expect(cta).toBeEnabled()
    fireEvent.click(cta)
    expect(screen.getByText('rota-checkout')).toBeInTheDocument()
  })

  it('CEP sem opção: a mensagem de nenhuma opção', async () => {
    respond([])
    renderDrawer()
    open()
    calcular(SP)
    expect(
      await screen.findByText(
        'Nenhuma opção de frete disponível para este CEP. No checkout, você pode tentar outro endereço.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Frete padrão/)).toBeNull()
    expect(summary('Total')).toBe('R$ 100,00')
  })
})

describe('a gaveta — o rascunho do checkout', () => {
  it('grava o CEP, a escolha e a origem no rascunho padrão, e nunca no do pedido montado', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)

    const rascunho = useCheckoutStore.getState()
    expect(rascunho.address.cep).toBe(SP)
    expect(rascunho.cepOrigin).toBe('sacola')
    expect(rascunho.shipping).toMatchObject({ serviceId: '2', serviceName: 'SEDEX', cost: 35 })

    const proposta = useProposalCheckoutStore.getState()
    expect(proposta.address.cep).toBe('')
    expect(proposta.shipping).toBeNull()
    expect(proposta.cepOrigin).toBeNull()
    expect(sessionStorage.getItem(PROPOSAL_CHECKOUT_STORAGE_KEY)).toBeNull()
  })

  it('o CEP de um pedido montado não aparece na gaveta', () => {
    act(() => useProposalCheckoutStore.getState().setAddress({ cep: RS }))
    renderDrawer()
    open()
    expect(cepField()).toHaveValue('')
    expect(useProposalCheckoutStore.getState().address.cep).toBe(RS)
  })

  it('com o CEP da gaveta já no rascunho, a gaveta abre no resultado dele, com a mais barata', async () => {
    act(() => {
      useCheckoutStore.getState().setAddress({ cep: SP })
      useCheckoutStore.getState().setCepOrigin('sacola')
    })
    renderDrawer()
    open()
    const [pac] = await radios()
    expect(pac).toHaveAttribute('aria-checked', 'true')
  })

  it('com o CEP digitado no checkout e 2+ opções, abrir a sacola não escolhe por ela', async () => {
    act(() => useCheckoutStore.getState().setAddress({ cep: SP }))
    renderDrawer()
    open()
    const lista = await radios()
    expect(lista).toHaveLength(2)
    for (const r of lista) expect(r).toHaveAttribute('aria-checked', 'false')
    expect(useCheckoutStore.getState().shipping).toBeNull()
    expect(screen.queryByText(/^Frete ·/)).toBeNull()

    // Calcular na gaveta é escolher pela gaveta: aí sim a mais barata vem marcada.
    fireEvent.click(screen.getByRole('button', { name: 'Trocar CEP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    const [pac] = await radios()
    expect(pac).toHaveAttribute('aria-checked', 'true')
  })

  it.each([
    ['digitado no checkout', null],
    ['calculado antes na gaveta', 'sacola'],
  ] as const)('o "Frete padrão" que o checkout gravou na falha da cotação sobrevive a abrir a sacola (CEP %s)', async (_, origem) => {
    invoke.mockResolvedValue({ data: null, error: new Error('fora do ar') } as never)
    const padrao = {
      serviceId: 'default',
      serviceName: 'Frete padrão',
      carrier: 'Correios',
      cost: 9.9,
      estimateMin: '',
      estimateMax: '',
    }
    act(() => {
      useCheckoutStore.getState().setAddress({ cep: SP })
      useCheckoutStore.getState().setCepOrigin(origem)
      useCheckoutStore.getState().setShipping(padrao)
    })
    renderDrawer()
    open()
    // A gaveta não oferece nem mostra o frete padrão: a falha e o Total sem frete.
    expect(
      await screen.findByText(/Não consegui consultar o frete agora/),
    ).toBeInTheDocument()
    // Lido DEPOIS de a falha chegar: é aí que a gaveta decidiria apagar a escolha.
    expect(useCheckoutStore.getState().shipping).toEqual(padrao)
    expect(screen.queryByText(/Frete padrão/)).toBeNull()
    expect(summary('Total')).toBe('R$ 100,00')
  })

  it('a escolha feita no checkout, com a cotação em falha, não vira linha recolhida nem entra no Total', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('fora do ar') } as never)
    act(() => {
      useCheckoutStore.getState().setAddress({ cep: SP })
      useCheckoutStore.getState().setShipping({
        serviceId: '1',
        serviceName: 'PAC',
        carrier: 'Correios',
        cost: 21.5,
        estimateMin: '',
        estimateMax: '',
      })
    })
    renderDrawer()
    open()
    expect(await screen.findByText(/Não consegui consultar o frete agora/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ver as opções/ })).toBeNull()
    expect(screen.queryByText(/^Frete ·/)).toBeNull()
    expect(summary('Total')).toBe('R$ 100,00')
    // A escolha é do checkout: a gaveta não a apaga.
    expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1')
  })

  it('a escolha da gaveta que a cotação não confirma mais é desfeita', async () => {
    renderDrawer()
    open()
    calcular(SP)
    const [, sedex] = await radios()
    fireEvent.click(sedex)

    invoke.mockResolvedValue({ data: null, error: new Error('fora do ar') } as never)
    act(() => useCartStore.getState().updateQuantity('p1', '', '', 2))
    await waitFor(() => expect(useCheckoutStore.getState().shipping).toBeNull())
  })
})
