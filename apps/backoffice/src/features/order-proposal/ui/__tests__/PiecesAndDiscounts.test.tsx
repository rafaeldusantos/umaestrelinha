// Peças, cupom, desconto, resumo e frete da montagem (feature 89, T16: `MON-05`..`MON-10`).
//
// Dublados só o que é fronteira: o client do Supabase (com um dublê que enxerga tabela e filtro),
// `validateCoupon` (a regra da loja, testada em `core`; aqui a régua é "a tela mostra a recusa COMO
// VEIO") e as configurações da loja. Os componentes, os hooks de `entities/product` e as contas de
// `core` são os reais.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lockProposal, priceProposalDraft, proposalPricing } from '@estrelinha/core/proposals'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const { estado } = vi.hoisted(() => ({
  estado: {
    responder: (_r: unknown): unknown => ({ data: [] }),
    invoke: null as unknown as ReturnType<typeof import('vitest').vi.fn>,
    validar: null as unknown as ReturnType<typeof import('vitest').vi.fn>,
    shipping: { pickup_enabled: true } as Record<string, unknown>,
    material: { street: 'Rua do Ateliê', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS' } as Record<string, unknown>,
    payment: { pix_enabled: true, pix_discount_percent: 5 } as Record<string, unknown>,
  },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { vi: v } = await import('vitest')
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r) => estado.responder(r) as Resposta)
  estado.invoke = v.fn()
  return { supabase: { from: duble.from, functions: { invoke: (...a: unknown[]) => estado.invoke(...a) } } }
})

vi.mock('@estrelinha/core/hooks/useCoupons', async () => {
  const { vi: v } = await import('vitest')
  estado.validar = v.fn()
  return { validateCoupon: (...a: unknown[]) => estado.validar(...a) }
})

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => estado.shipping,
  useMaterialSettings: () => estado.material,
  usePaymentSettings: () => estado.payment,
}))

import ItemsSection from '../ItemsSection'
import { MATERIAL_TAG, acertoDaLinha, linhaNova } from '../../model/lines'
import CouponField from '../CouponField'
import ManualDiscountField from '../ManualDiscountField'
import ProposalSummary from '../ProposalSummary'
import ShippingPreview, { CLIENT_CHOOSES, QUOTE_FAILED } from '../ShippingPreview'
import { emptyDraft, priceDraft, type DraftLine, type DraftManual } from '../../model/draft'
import type { PecaParaProposta } from '@/entities/product'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'

const COLAR = {
  id: P1, name: 'Colar de Cinzas', base_price: 150, image_url: null, is_active: true, stock_policy: 'track',
  stock_total: 3, requires_material: true, engraving_max_chars: 8,
  options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }], weight_kg: 0.03, width_cm: null, height_cm: null, length_cm: null,
}
const COLAR_VAR = [
  { id: 'vs', product_id: P1, price: 180, option_values: { 'Com gravação': 'Sim' }, image_url: null, is_active: true, stock: 2, position: 0, weight_kg: null },
  { id: 'vn', product_id: P1, price: 150, option_values: { 'Com gravação': 'Não' }, image_url: null, is_active: true, stock: 0, position: 1, weight_kg: null },
]
const ANEL = { ...COLAR, id: P2, name: 'Anel Simples', base_price: 90, requires_material: false, options: [], engraving_max_chars: null }

const POOL = [
  { id: P1, name: 'Colar de Cinzas', slug: 'colar', is_active: true, base_price: 150 },
  { id: P2, name: 'Anel Simples', slug: 'anel', is_active: true, base_price: 90 },
  { id: P3, name: 'Brinco Antigo', slug: 'brinco', is_active: false, base_price: 70 },
]

beforeEach(() => {
  estado.invoke.mockReset()
  estado.validar.mockReset()
  estado.shipping = { pickup_enabled: true }
  estado.payment = { pix_enabled: true, pix_discount_percent: 5 }
  estado.responder = (r) => {
    const reg = r as Registro
    if (reg.table === 'products') {
      if ((reg.select?.[1] as { head?: boolean } | undefined)?.head) return { count: POOL.length }
      const id = reg.filters.find((f) => f.method === 'eq')?.args[1]
      if (id === P1) return { data: COLAR }
      if (id === P2) return { data: ANEL }
      return { data: POOL }
    }
    if (reg.table === 'product_variants') {
      const id = reg.filters.find((f) => f.method === 'eq')?.args[1]
      return { data: id === P1 ? COLAR_VAR : [] }
    }
    return { data: [] }
  }
})

const comQuery = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

let linhas: DraftLine[] = []
const PalcoDePecas = ({ inicial = [] as DraftLine[] }) => {
  const [ls, setLs] = useState<DraftLine[]>(inicial)
  linhas = ls
  return (
    <ItemsSection
      lines={ls}
      onAdd={(l) => setLs((x) => [...x, l])}
      onUpdate={(k, p) => setLs((x) => x.map((l) => (l.key === k ? { ...l, ...p } : l)))}
      onRemove={(k) => setLs((x) => x.filter((l) => l.key !== k))}
    />
  )
}

describe('ItemsSection (MON-05, MON-06)', () => {
  it('a busca é a do dono único e não oferece peça desativada', async () => {
    comQuery(<PalcoDePecas />)
    fireEvent.change(await screen.findByLabelText('Acrescentar peça'), { target: { value: 'a' } })
    await screen.findByText('Colar de Cinzas')
    expect(screen.queryByText('Brinco Antigo')).toBeNull()
  })

  it('peça com grade pede a variação (só as ativas, com estoque) e diz que pede material', async () => {
    comQuery(<PalcoDePecas />)
    fireEvent.change(await screen.findByLabelText('Acrescentar peça'), { target: { value: 'colar' } })
    fireEvent.click(await screen.findByText('Colar de Cinzas'))
    const grupo = await screen.findByRole('radiogroup', { name: 'Variação de Colar de Cinzas' })
    const [sim, nao] = within(grupo).getAllByRole('radio')
    expect(sim).toHaveTextContent('2 em estoque')
    expect(nao).toHaveTextContent('Sem estoque')
    expect(nao).toBeDisabled()
    expect(screen.getByTestId('pede-material')).toHaveTextContent(MATERIAL_TAG)
    expect(MATERIAL_TAG).toBe('Pede material da cliente')
  })

  it('escolher a variação que grava dá preço e o campo de gravação com o teto da peça', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P1, name: 'Colar de Cinzas' }), key: 'k' }]} />)
    const grupo = await screen.findByRole('radiogroup', { name: 'Variação de Colar de Cinzas' })
    // A única oferecível (a outra está sem estoque) entra sozinha.
    await waitFor(() => expect(linhas[0]).toMatchObject({ variant_id: 'vs', list_price: 180, engraves: true, engraving_max: 8 }))
    expect(within(grupo).getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true')
    const gravacao = screen.getByLabelText('Gravação')
    expect(gravacao).toHaveAttribute('maxLength', '8')
    fireEvent.change(gravacao, { target: { value: 'Ana' } })
    expect(linhas[0].engraving_text).toBe('Ana')
    expect(screen.getByText('3/8')).toBeInTheDocument()
  })

  it('peça sem grade usa o preço base e não pede variação', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    await waitFor(() => expect(linhas[0]).toMatchObject({ needsVariant: false, list_price: 90, requires_material: false }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByTestId('pede-material')).toBeNull()
    expect(screen.getByTestId('preco-da-linha')).toHaveTextContent('R$ 90,00 cada')
  })

  it('quantidade de 1 a 99 e tirar a peça', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mais uma unidade de Anel Simples' }))
    expect(linhas[0].quantity).toBe(2)
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '500' } })
    expect(linhas[0].quantity).toBe(99)
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Anel Simples' }))
    expect(linhas).toHaveLength(0)
  })

  it('acertoDaLinha: a variação pausada desde a montagem volta a ser pedida; o preço de hoje entra', () => {
    const peca: PecaParaProposta = {
      id: P1, nome: 'Colar', ativa: true, precoBase: 150, imagem: null, politica: 'track', estoqueTotal: 0,
      pedeMaterial: true, limiteDeGravacao: null, medidas: { weight_kg: null, width_cm: null, height_cm: null, length_cm: null },
      variacoes: [
        { id: 'a', rotulo: 'A', preco: 200, estoque: 1, disponivel: true, grava: false, imagem: null, valores: {}, peso: null },
        { id: 'b', rotulo: 'B', preco: 210, estoque: 1, disponivel: true, grava: true, imagem: null, valores: {}, peso: 0.1 },
      ],
    }
    const pausada = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'sumiu', list_price: 150 }
    expect(acertoDaLinha(pausada, peca)).toMatchObject({ variant_id: null, list_price: null, needsVariant: true })
    const repreco = { ...linhaNova({ id: P1, name: 'Colar' }), variant_id: 'b', list_price: 150 }
    expect(acertoDaLinha(repreco, peca)).toMatchObject({ variant_id: 'b', list_price: 210, engraves: true, dimensions: { weight_kg: 0.1 } })
  })

  it('alvos de 44px nas ações da linha (token exato)', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    for (const nome of ['Tirar Anel Simples', 'Mais uma unidade de Anel Simples', 'Menos uma unidade de Anel Simples']) {
      expect(screen.getByRole('button', { name: nome }).className.split(/\s+/)).toContain('min-h-11')
    }
    expect(screen.getByLabelText('Quantidade').className.split(/\s+/)).toContain('h-11')
  })
})

describe('CouponField (MON-07)', () => {
  it('valida pela regra da loja, com o e-mail da cliente e o subtotal cheio', async () => {
    estado.validar.mockResolvedValueOnce({ ok: true, coupon: { id: 'c', code: 'DEZ', type: 'percent', value: 10, discount: 31, freeShipping: false } })
    const onApply = vi.fn()
    render(<CouponField coupon={null} subtotal={310} email=" Ana@X.invalid" onApply={onApply} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'dez' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ code: 'DEZ', rule: { type: 'percent', value: 10 } }))
    expect(estado.validar).toHaveBeenCalledWith({ code: 'dez', subtotal: 310, shippingCost: 0, customerEmail: 'ana@x.invalid' })
  })

  it('a recusa aparece com o texto da loja, sem tradução', async () => {
    estado.validar.mockResolvedValueOnce({ ok: false, error: 'Cupom válido apenas no primeiro pedido.' })
    render(<CouponField coupon={null} subtotal={100} email="ana@x.invalid" onApply={() => {}} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'PRIMEIRA' } })
    fireEvent.keyDown(screen.getByLabelText('Código do cupom'), { key: 'Enter' })
    expect(await screen.findByTestId('cupom-recusa')).toHaveTextContent('Cupom válido apenas no primeiro pedido.')
  })

  it('sem e-mail válido, a regra de primeira compra não é perguntada', async () => {
    estado.validar.mockResolvedValueOnce({ ok: false, error: 'Cupom inválido.' })
    render(<CouponField coupon={null} subtotal={100} email="" onApply={() => {}} onRemove={() => {}} />)
    fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    await waitFor(() => expect(estado.validar).toHaveBeenCalledWith(expect.objectContaining({ customerEmail: undefined })))
  })

  it('aplicado: mostra o código, tira, e avisa quando a promoção vence', () => {
    const onRemove = vi.fn()
    render(<CouponField coupon={{ code: 'DEZ', rule: { type: 'percent', value: 10 } }} descartado subtotal={100} email="" onApply={() => {}} onRemove={onRemove} />)
    expect(screen.getByTestId('cupom-aplicado')).toHaveTextContent('DEZ')
    expect(screen.getByRole('status')).toHaveTextContent('A promoção vigente vale mais')
    fireEvent.click(screen.getByRole('button', { name: 'Tirar o cupom DEZ' }))
    expect(onRemove).toHaveBeenCalled()
  })
})

describe('ManualDiscountField (MON-08)', () => {
  let manual: DraftManual | null = null
  const Palco = () => {
    const [m, setM] = useState<DraftManual | null>(null)
    manual = m
    return <ManualDiscountField manual={m} onChange={setM} />
  }

  it('tipo, valor e motivo obrigatório até 120, interno', () => {
    render(<Palco />)
    fireEvent.click(screen.getByRole('button', { name: 'Acrescentar desconto combinado' }))
    expect(manual).toEqual({ kind: 'amount', value: null, reason: '' })
    expect(screen.getByTestId('desconto-recusa')).toHaveTextContent('Informe o valor do desconto combinado.')
    fireEvent.click(screen.getByRole('button', { name: 'Em percentual' }))
    expect(screen.getByRole('button', { name: 'Em percentual' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Percentual do desconto'), { target: { value: '10' } })
    expect(screen.getByTestId('desconto-recusa')).toHaveTextContent('Escreva o motivo do desconto combinado.')
    const motivo = screen.getByLabelText('Motivo')
    expect(motivo).toHaveAttribute('maxLength', '120')
    fireEvent.change(motivo, { target: { value: 'combinado no WhatsApp' } })
    expect(manual).toEqual({ kind: 'percent', value: 10, reason: 'combinado no WhatsApp' })
    expect(screen.queryByTestId('desconto-recusa')).toBeNull()
    expect(screen.getByText('21/120')).toBeInTheDocument()
    expect(screen.getByText('Interno — a cliente vê só “Desconto combinado”.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tirar desconto' }))
    expect(manual).toBeNull()
  })
})

// Prova em navegador da T27: em 390 com a fonte do sistema a 200 %, o seletor de quantidade
// (−, campo, +: ~312px) e o par "Em reais"/"Em percentual" não cabiam no cartão (~198px) e a página
// rolava de lado (`scrollWidth` 442). Os dois embrulham. jsdom não mede: a régua é o token.
describe('cabe em 390 com a fonte grande (token exato)', () => {
  const t = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

  it('o seletor de quantidade embrulha', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P1, name: 'Colar de Cinzas' }), key: 'k' }]} />)
    const mais = await screen.findByRole('button', { name: 'Mais uma unidade de Colar de Cinzas' })
    expect(t(mais.parentElement!)).toContain('flex-wrap')
  })

  it('o par do tipo do desconto embrulha e os botões quebram o rótulo', () => {
    render(<ManualDiscountField manual={{ kind: 'amount', value: null, reason: '' }} onChange={() => {}} />)
    const grupo = screen.getByRole('group', { name: 'Tipo do desconto' })
    expect(t(grupo)).toContain('flex-wrap')
    for (const b of within(grupo).getAllByRole('button')) {
      expect(t(b)).toContain('min-w-0')
      expect(t(b)).toContain('[overflow-wrap:anywhere]')
    }
  })
})

describe('ProposalSummary (MON-09)', () => {
  const draft = {
    ...emptyDraft(),
    lines: [{ ...linhaNova({ id: P1, name: 'Colar' }), needsVariant: false, list_price: 150, quantity: 2 }],
    coupon: { code: 'DEZ', rule: { type: 'percent' as const, value: 10 } },
    manual: { kind: 'amount' as const, value: 20, reason: 'amiga' },
  }

  it('os números são os de core, e "no PIX" é proposalPricing sobre o travado', () => {
    const pricing = priceDraft(draft, [])
    render(<ProposalSummary pricing={pricing} />)
    const esperado = priceProposalDraft({
      lines: [{ product_id: P1, variant_id: null, list_price: 150, quantity: 2 }],
      coupon: { type: 'percent', value: 10 }, promotions: [],
      manualDiscount: { kind: 'amount', value: 20, reason: 'amiga' },
    })
    expect(screen.getByTestId('resumo-subtotal')).toHaveTextContent('R$ 300,00')
    expect(screen.getByTestId('resumo-cupom')).toHaveTextContent('− R$ 30,00')
    expect(screen.getByTestId('resumo-combinado')).toHaveTextContent('Desconto combinado')
    expect(screen.getByTestId('resumo-combinado')).toHaveTextContent('− R$ 20,00')
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 250,00')
    expect(esperado.itemsTotal).toBe(250)
    const pix = proposalPricing(lockProposal(esperado), { shipping: 0, method: 'pix', pixDiscountPercent: 5, freeShipping: null }).total
    expect(screen.getByTestId('resumo-pix').textContent).toBe(`no PIX: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pix)}`)
    expect(pix).toBeLessThan(250)
  })

  it('PIX desligado não mostra a linha; desconto que zera mostra a frase de A-12', () => {
    estado.payment = { pix_enabled: false, pix_discount_percent: 5 }
    const { unmount } = render(<ProposalSummary pricing={priceDraft(draft, [])} />)
    expect(screen.queryByTestId('resumo-pix')).toBeNull()
    unmount()
    const zera = { ...draft, manual: { kind: 'amount' as const, value: 299.5, reason: 'x' } }
    render(<ProposalSummary pricing={priceDraft(zera, [])} />)
    expect(screen.getByTestId('resumo-recusa')).toHaveTextContent('O desconto não pode zerar o pedido.')
  })
})

describe('ShippingPreview (MON-10)', () => {
  const linhaPronta = { ...linhaNova({ id: P1, name: 'Colar' }), needsVariant: false, list_price: 150, quantity: 2, dimensions: { weight_kg: 0.03 } }

  it('sem CEP ou sem peça, não cota e diz o que falta — e a cliente escolhe no link', () => {
    comQuery(<ShippingPreview zip="" lines={[linhaPronta]} />)
    expect(estado.invoke).not.toHaveBeenCalled()
    expect(screen.getByText('Preencha o CEP e acrescente uma peça para ver a prévia do frete.')).toBeInTheDocument()
    expect(screen.getByText(CLIENT_CHOOSES)).toBeInTheDocument()
    expect(CLIENT_CHOOSES).toBe('A cliente escolhe a entrega no link.')
  })

  it('cota pelo Melhor Envio com o corpo de toQuoteProducts e mostra as opções e a retirada do RS', async () => {
    estado.invoke.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'PAC', company: 'Correios', price: '23.50', delivery_time: 6, delivery_range: { min: 5, max: 7 } },
        { id: 2, name: 'Mini', company: 'Correios', price: null, delivery_time: 9 },
      ],
      error: null,
    })
    comQuery(<ShippingPreview zip="90619-900" lines={[linhaPronta]} />)
    const lista = await screen.findByRole('list', { name: 'Opções de entrega' })
    expect(estado.invoke).toHaveBeenCalledWith('melhor-envio?action=quote', {
      body: {
        postal_code_to: '90619900',
        products: [{ id: P1, width: 11, height: 2, length: 16, weight: 0.03, insurance_value: 150, quantity: 2 }],
      },
    })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)
    expect(lista).toHaveTextContent('Correios PAC')
    expect(lista).toHaveTextContent('5 a 7 dias úteis')
    expect(lista).toHaveTextContent('R$ 23,50')
    expect(lista).toHaveTextContent('Retirada no escritório')
    expect(lista).toHaveTextContent('Escritório - Uma Estrelinha - Rua do Ateliê, Centro, Porto Alegre/RS')
  })

  it('fora do RS não oferece a retirada', async () => {
    estado.invoke.mockResolvedValueOnce({ data: [{ id: 1, name: 'PAC', company: 'Correios', price: '40.00', delivery_time: 8 }], error: null })
    comQuery(<ShippingPreview zip="01310-100" lines={[linhaPronta]} />)
    const lista = await screen.findByRole('list', { name: 'Opções de entrega' })
    expect(lista).not.toHaveTextContent('Retirada')
  })

  it('a falha diz que não cotou e que o link pode ser criado mesmo assim', async () => {
    estado.invoke.mockResolvedValueOnce({ data: null, error: new Error('fora do ar') })
    estado.shipping = { pickup_enabled: false }
    comQuery(<ShippingPreview zip="90619-900" lines={[linhaPronta]} />)
    expect(await screen.findByTestId('cotacao-falhou')).toHaveTextContent(`${QUOTE_FAILED} O link pode ser criado mesmo assim.`)
  })

  it('sem opção nenhuma (e sem retirada) diz isso', async () => {
    estado.invoke.mockResolvedValueOnce({ data: [], error: null })
    estado.shipping = { pickup_enabled: false }
    comQuery(<ShippingPreview zip="01310-100" lines={[linhaPronta]} />)
    expect(await screen.findByText('Nenhuma entrega disponível para este CEP.')).toBeInTheDocument()
  })
})
