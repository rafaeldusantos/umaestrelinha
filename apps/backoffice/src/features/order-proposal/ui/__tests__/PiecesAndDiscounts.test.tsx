// Peças, cupom, desconto, resumo e frete da montagem (feature 89, T16: `MON-05`..`MON-10`; desenho
// do protótipo `Pedido - Montar.html`, ajuste de 2026-11-01).
//
// Dublados só o que é fronteira: o client do Supabase (com um dublê que enxerga tabela e filtro),
// `validateCoupon` (a regra da loja, testada em `core`; aqui a régua é "a tela mostra a recusa COMO
// VEIO") e as configurações da loja. Os componentes, os hooks de `entities/product` (inclusive a
// leitura das capas por id, `useProductCovers`) e as contas de `core` são os reais.

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

import ItemsSection, { type PrecoDaLinha } from '../ItemsSection'
import { MATERIAL_TAG, linhaNova } from '../../model/lines'
import CouponField from '../CouponField'
import ManualDiscountField from '../ManualDiscountField'
import DiscountsSection from '../DiscountsSection'
import ProposalSummary from '../ProposalSummary'
import ShippingPreview, { CLIENT_CHOOSES, QUOTE_FAILED, QUOTE_NEEDS_ZIP, QUOTE_WAITING } from '../ShippingPreview'
import { emptyDraft, priceDraft, type DraftLine, type DraftManual } from '../../model/draft'

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'
const P4 = '44444444-4444-4444-8444-444444444444'

const STORAGE = 'http://127.0.0.1:54441/storage/v1/object/public/product-images/'
const CAPA_COLAR = `${STORAGE}colar.webp`
const CAPA_PINGENTE = `${STORAGE}pingente.webp`
const FOTO_OURO = `${STORAGE}pingente-ouro.webp`

const COLAR = {
  id: P1, name: 'Colar de Cinzas', base_price: 150, image_url: null, capa: CAPA_COLAR, is_active: true, stock_policy: 'track',
  stock_total: 3, requires_material: true, engraving_max_chars: 8,
  options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }], weight_kg: 0.03, width_cm: null, height_cm: null, length_cm: null,
}
const COLAR_VAR = [
  { id: 'vs', product_id: P1, price: 180, option_values: { 'Com gravação': 'Sim' }, image_url: null, is_active: true, stock: 2, position: 0, weight_kg: null },
  { id: 'vn', product_id: P1, price: 150, option_values: { 'Com gravação': 'Não' }, image_url: null, is_active: true, stock: 0, position: 1, weight_kg: null },
]
// Estoque livre: o contador vai até o teto da proposta (99).
const ANEL = { ...COLAR, id: P2, name: 'Anel Simples', base_price: 90, capa: null, requires_material: false, options: [], engraving_max_chars: null, stock_policy: 'none' }
const PINGENTE = {
  ...COLAR, id: P4, name: 'Pingente Gota', base_price: 189, capa: CAPA_PINGENTE, requires_material: false, engraving_max_chars: null,
  options: [{ name: 'Acabamento', values: ['Prata', 'Ouro'], position: 0 }],
}
const PINGENTE_VAR = [
  { id: 'pp', product_id: P4, price: 189, option_values: { Acabamento: 'Prata' }, image_url: null, is_active: true, stock: 6, position: 0, weight_kg: null },
  { id: 'po', product_id: P4, price: 220, option_values: { Acabamento: 'Ouro' }, image_url: FOTO_OURO, is_active: true, stock: 2, position: 1, weight_kg: null },
]

const POOL = [
  { id: P1, name: 'Colar de Cinzas', slug: 'colar', is_active: true, base_price: 150 },
  { id: P2, name: 'Anel Simples', slug: 'anel', is_active: true, base_price: 90 },
  { id: P3, name: 'Brinco Antigo', slug: 'brinco', is_active: false, base_price: 70 },
  { id: P4, name: 'Pingente Gota', slug: 'pingente', is_active: true, base_price: 189 },
]
const CAPAS: Record<string, string | null> = { [P1]: CAPA_COLAR, [P2]: null, [P3]: null, [P4]: CAPA_PINGENTE }

beforeEach(() => {
  estado.invoke.mockReset()
  estado.validar.mockReset()
  estado.shipping = { pickup_enabled: true }
  estado.payment = { pix_enabled: true, pix_discount_percent: 5 }
  estado.responder = (r) => {
    const reg = r as Registro
    if (reg.table === 'products') {
      if ((reg.select?.[1] as { head?: boolean } | undefined)?.head) return { count: POOL.length }
      // As capas das linhas na tela: por id, nunca por nome.
      const porIds = reg.filters.find((f) => f.method === 'in')
      if (porIds) return { data: (porIds.args[1] as string[]).map((id) => ({ id, image_url: null, capa: CAPAS[id] ?? null })) }
      const id = reg.filters.find((f) => f.method === 'eq')?.args[1]
      if (id === P1) return { data: COLAR }
      if (id === P2) return { data: ANEL }
      if (id === P4) return { data: PINGENTE }
      return { data: POOL }
    }
    if (reg.table === 'product_variants') {
      const id = reg.filters.find((f) => f.method === 'eq')?.args[1]
      return { data: id === P1 ? COLAR_VAR : id === P4 ? PINGENTE_VAR : [] }
    }
    return { data: [] }
  }
})

const comQuery = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>)

let linhas: DraftLine[] = []
let acrescentadas: DraftLine[] = []
const PalcoDePecas = ({ inicial = [] as DraftLine[], precos }: { inicial?: DraftLine[]; precos?: Record<string, PrecoDaLinha> }) => {
  const [ls, setLs] = useState<DraftLine[]>(inicial)
  linhas = ls
  return (
    <ItemsSection
      lines={ls}
      precos={precos}
      onAdd={(l) => {
        acrescentadas.push(l)
        setLs((x) => [...x, l])
      }}
      onUpdate={(k, p) => setLs((x) => x.map((l) => (l.key === k ? { ...l, ...p } : l)))}
      onRemove={(k) => setLs((x) => x.filter((l) => l.key !== k))}
    />
  )
}

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
const caixa = () => screen.getByTestId('acrescentar-peca')

/** Busca e escolhe a peça na caixa "Acrescentar peça". */
const escolherNaBusca = async (termo: string, nome: string) => {
  fireEvent.change(await screen.findByLabelText('Buscar peça'), { target: { value: termo } })
  fireEvent.click(await within(caixa()).findByText(nome))
}

beforeEach(() => {
  acrescentadas = []
})

describe('ItemsSection — a caixa "Acrescentar peça" (MON-05, MON-06)', () => {
  it('sem peça, a caixa já vem aberta; a busca é a do dono único, com foto, e não oferece peça desativada', async () => {
    comQuery(<PalcoDePecas />)
    expect(caixa()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acrescentar peça' })).toBeNull()
    fireEvent.change(await screen.findByLabelText('Buscar peça'), { target: { value: 'a' } })
    const colar = (await within(caixa()).findByText('Colar de Cinzas')).closest('button')!
    expect(screen.queryByText('Brinco Antigo')).toBeNull()
    // A foto da capa, pela rendição (2× dos 40px), lida por id só para as linhas na tela.
    await waitFor(() => expect(within(colar).getByTestId('peca-foto')).toHaveAttribute('src', expect.stringContaining('render/image')))
    expect(within(colar).getByTestId('peca-foto').getAttribute('src')).toContain('colar.webp')
    expect(within(colar).getByTestId('peca-foto').getAttribute('src')).toContain('width=80')
    // Sem capa: o quadrado neutro no mesmo lugar.
    const anel = within(caixa()).getByText('Anel Simples').closest('button')!
    expect(within(anel).getByTestId('peca-foto-vazia')).toBeInTheDocument()
  })

  it('peça com grade: foto, material, chips com foto só das ativas — a sem estoque desabilitada —, gravação com teto, e só entra PRONTA', async () => {
    comQuery(<PalcoDePecas />)
    await escolherNaBusca('colar', 'Colar de Cinzas')
    const grupo = await screen.findByRole('radiogroup', { name: 'Variação de Colar de Cinzas' })
    const [sim, nao] = within(grupo).getAllByRole('radio')
    expect(sim).toHaveTextContent('2 em estoque')
    expect(nao).toHaveTextContent('Sem estoque')
    expect(nao).toBeDisabled()
    // Cada chip tem foto: a variação sem foto própria mostra a capa da peça.
    expect(within(sim).getByTestId('peca-foto').getAttribute('src')).toContain('colar.webp')
    // A peça escolhida aparece com a foto e diz que pede material.
    expect(within(caixa()).getByText(MATERIAL_TAG)).toBeInTheDocument()
    expect(MATERIAL_TAG).toBe('Pede material da cliente')
    // A única oferecível entra sozinha.
    await waitFor(() => expect(sim).toHaveAttribute('aria-checked', 'true'))
    const gravacao = within(caixa()).getByLabelText('Gravação')
    expect(gravacao).toHaveAttribute('maxLength', '8')
    fireEvent.change(gravacao, { target: { value: 'Ana' } })
    expect(within(caixa()).getByText('3/8')).toBeInTheDocument()
    // O estoque é o teto do contador (2), e o botão diz o total.
    const mais = within(caixa()).getByRole('button', { name: 'Mais uma unidade de Colar de Cinzas' })
    fireEvent.click(mais)
    expect(mais).toBeDisabled()
    fireEvent.click(within(caixa()).getByRole('button', { name: /^Acrescentar · R\$\s360,00$/ }))

    expect(acrescentadas).toHaveLength(1)
    expect(acrescentadas[0]).toMatchObject({
      product_id: P1,
      variant_id: 'vs',
      list_price: 180,
      quantity: 2,
      engraves: true,
      engraving_text: 'Ana',
      engraving_max: 8,
      requires_material: true,
      image_url: CAPA_COLAR,
      stock_cap: 2,
    })
    // A caixa fecha, a linha aparece com foto, variação · gravação e o selo.
    expect(screen.queryByTestId('acrescentar-peca')).toBeNull()
    const linha = screen.getByTestId('linha-da-peca')
    expect(linha).toHaveTextContent('Gravação: “Ana”')
    expect(within(linha).getByTestId('pede-material')).toHaveTextContent(MATERIAL_TAG)
    expect(within(linha).getByTestId('peca-foto').getAttribute('src')).toContain('colar.webp')
  })

  it('com duas variações oferecíveis: "Escolha a variação" até a escolha; a foto da variação vale; Cancelar fecha e o cabeçalho reabre', async () => {
    comQuery(<PalcoDePecas />)
    await escolherNaBusca('pingente', 'Pingente Gota')
    const grupo = await screen.findByRole('radiogroup', { name: 'Variação de Pingente Gota' })
    const botao = within(caixa()).getByRole('button', { name: 'Escolha a variação' })
    expect(botao).toBeDisabled()
    const [prata, ouro] = within(grupo).getAllByRole('radio')
    expect(prata).toHaveAttribute('aria-checked', 'false')
    expect(within(ouro).getByTestId('peca-foto').getAttribute('src')).toContain('pingente-ouro.webp')
    fireEvent.click(ouro)
    expect(within(caixa()).getByRole('button', { name: /^Acrescentar · R\$\s220,00$/ })).toBeEnabled()
    // Sem gravação na variação, sem campo.
    expect(within(caixa()).queryByLabelText('Gravação')).toBeNull()
    fireEvent.click(within(caixa()).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByTestId('acrescentar-peca')).toBeNull()
    expect(acrescentadas).toHaveLength(0)
    expect(screen.getByText('Nenhuma peça ainda.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Acrescentar peça' }))
    expect(caixa()).toBeInTheDocument()
  })

  it('"Trocar" volta à busca', async () => {
    comQuery(<PalcoDePecas />)
    await escolherNaBusca('pingente', 'Pingente Gota')
    await screen.findByRole('radiogroup', { name: 'Variação de Pingente Gota' })
    fireEvent.click(within(caixa()).getByRole('button', { name: 'Trocar a peça Pingente Gota' }))
    expect(within(caixa()).getByLabelText('Buscar peça')).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('peça sem grade usa o preço base e entra sem pedir variação', async () => {
    comQuery(<PalcoDePecas />)
    await escolherNaBusca('anel', 'Anel Simples')
    const botao = await within(caixa()).findByRole('button', { name: /^Acrescentar · R\$\s90,00$/ })
    expect(screen.queryByRole('radiogroup')).toBeNull()
    fireEvent.click(botao)
    expect(acrescentadas[0]).toMatchObject({ needsVariant: false, variant_id: null, list_price: 90, requires_material: false })
  })
})

describe('ItemsSection — a linha da peça', () => {
  it('peça sem grade relida: preço base, sem variação e sem selo de material', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    await waitFor(() => expect(linhas[0]).toMatchObject({ needsVariant: false, list_price: 90, requires_material: false }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByTestId('pede-material')).toBeNull()
    expect(screen.getByTestId('preco-da-linha')).toHaveTextContent('R$ 90,00')
    // Com peça, a caixa nasce fechada e o cabeçalho oferece acrescentar.
    expect(screen.queryByTestId('acrescentar-peca')).toBeNull()
    expect(screen.getByRole('button', { name: 'Acrescentar peça' })).toBeInTheDocument()
  })

  it('quantidade de 1 a 99 (estoque livre) e tirar a peça', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    await waitFor(() => expect(linhas[0].list_price).toBe(90))
    fireEvent.click(screen.getByRole('button', { name: 'Mais uma unidade de Anel Simples' }))
    expect(linhas[0].quantity).toBe(2)
    fireEvent.change(screen.getByLabelText('Quantidade de Anel Simples'), { target: { value: '500' } })
    expect(linhas[0].quantity).toBe(99)
    fireEvent.change(screen.getByLabelText('Quantidade de Anel Simples'), { target: { value: '0' } })
    expect(linhas[0].quantity).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Anel Simples' }))
    expect(linhas).toHaveLength(0)
  })

  it('o contador da linha não passa do estoque da variação (stock_cap)', async () => {
    const inicial = { ...linhaNova({ id: P1, name: 'Colar de Cinzas' }), key: 'k', variant_id: 'vs' }
    comQuery(<PalcoDePecas inicial={[inicial]} />)
    await waitFor(() => expect(linhas[0].stock_cap).toBe(2))
    fireEvent.change(screen.getByLabelText('Quantidade de Colar de Cinzas'), { target: { value: '500' } })
    expect(linhas[0].quantity).toBe(2)
  })

  it('o total é o preço travado do resumo × quantidade, e a promoção aparece como selo', async () => {
    const inicial = { ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k', quantity: 2 }
    comQuery(<PalcoDePecas inicial={[inicial]} precos={{ k: { unitario: 76.5, cheio: 90 } }} />)
    await waitFor(() => expect(linhas[0].list_price).toBe(90))
    expect(screen.getByTestId('preco-da-linha')).toHaveTextContent('R$ 153,00')
    expect(screen.getByText('Promoção · −15%')).toBeInTheDocument()
  })

  it('sem promoção, nenhum selo de promoção', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} precos={{ k: { unitario: 90, cheio: 90 } }} />)
    await waitFor(() => expect(linhas[0].list_price).toBe(90))
    expect(screen.queryByText(/Promoção ·/)).toBeNull()
  })

  it('a variação pausada desde a montagem volta a ser pedida NA LINHA, com os chips', async () => {
    const inicial = { ...linhaNova({ id: P4, name: 'Pingente Gota' }), key: 'k', variant_id: 'sumiu', list_price: 150 }
    comQuery(<PalcoDePecas inicial={[inicial]} />)
    const grupo = await screen.findByRole('radiogroup', { name: 'Variação de Pingente Gota' })
    await waitFor(() => expect(linhas[0]).toMatchObject({ variant_id: null, list_price: null }))
    expect(screen.getByRole('status')).toHaveTextContent(/Escolha/)
    fireEvent.click(within(grupo).getAllByRole('radio')[1])
    await waitFor(() => expect(linhas[0]).toMatchObject({ variant_id: 'po', list_price: 220, image_url: FOTO_OURO }))
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })

  it('alvos de 44px na caixa e no "Tirar" (token exato)', async () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    expect(tokens(screen.getByRole('button', { name: 'Tirar Anel Simples' }))).toContain('h-11')
    fireEvent.click(screen.getByRole('button', { name: 'Acrescentar peça' }))
    await escolherNaBusca('anel', 'Anel Simples')
    for (const nome of ['Mais uma unidade de Anel Simples', 'Menos uma unidade de Anel Simples']) {
      const botoes = within(caixa()).getAllByRole('button', { name: nome })
      expect(tokens(botoes[0])).toContain('h-11')
    }
  })
})

describe('a linha da peça — alvos de 44px (token exato)', () => {
  it('o − e o + da LINHA têm 44px, como os da caixa', () => {
    comQuery(<PalcoDePecas inicial={[{ ...linhaNova({ id: P2, name: 'Anel Simples' }), key: 'k' }]} />)
    const linha = screen.getByTestId('linha-da-peca')
    for (const nome of ['Mais uma unidade de Anel Simples', 'Menos uma unidade de Anel Simples']) {
      const t = tokens(within(linha).getByRole('button', { name: nome }))
      expect(t).toContain('h-11')
      expect(t).toContain('w-11')
    }
  })
})

describe('CouponField (MON-07)', () => {
  it('valida pela regra da loja, com o e-mail da cliente e o subtotal cheio', async () => {
    estado.validar.mockResolvedValueOnce({ ok: true, coupon: { id: 'c', code: 'DEZ', type: 'percent', value: 10, discount: 31, freeShipping: false } })
    const onApply = vi.fn()
    render(<CouponField coupon={null} subtotal={310} email=" Ana@X.invalid" onApply={onApply} onRemove={() => {}} />)
    expect(screen.getByText('A mesma regra do caixa da loja.')).toBeInTheDocument()
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

  it('aplicado: mostra o código e o que ele faz, "Tirar" tira, e avisa quando a promoção vence', () => {
    const onRemove = vi.fn()
    render(<CouponField coupon={{ code: 'DEZ', rule: { type: 'percent', value: 10 } }} descartado subtotal={100} email="" onApply={() => {}} onRemove={onRemove} />)
    expect(screen.getByTestId('cupom-aplicado')).toHaveTextContent('DEZ')
    expect(screen.getByTestId('cupom-aplicado')).toHaveTextContent('10% de desconto')
    expect(screen.getByRole('status')).toHaveTextContent('A promoção vigente vale mais')
    const tirar = screen.getByRole('button', { name: 'Tirar o cupom DEZ' })
    expect(tirar).toHaveTextContent('Tirar')
    fireEvent.click(tirar)
    expect(onRemove).toHaveBeenCalled()
  })

  it.each([
    [{ type: 'free_shipping' as const, value: 0 }, 'Frete grátis'],
    [{ type: 'fixed' as const, value: 20 }, 'R$ 20,00 de desconto'],
  ])('o rótulo do cupom aplicado: %o ⇒ %s', (rule, texto) => {
    render(<CouponField coupon={{ code: 'C', rule }} subtotal={100} email="" onApply={() => {}} onRemove={() => {}} />)
    expect(screen.getByTestId('cupom-aplicado')).toHaveTextContent(texto)
  })
})

describe('ManualDiscountField (MON-08)', () => {
  let manual: DraftManual | null = null
  const Palco = () => {
    const [m, setM] = useState<DraftManual | null>(null)
    manual = m
    return <ManualDiscountField manual={m} onChange={setM} />
  }

  it('a caixa liga; tipo R$/% por rádio, valor e motivo obrigatório até 120, interno; desmarcar tira', () => {
    render(<Palco />)
    const caixaDeMarcar = screen.getByRole('checkbox', { name: 'Desconto combinado' })
    expect(caixaDeMarcar).not.toBeChecked()
    expect(screen.queryByLabelText('Motivo')).toBeNull()
    fireEvent.click(caixaDeMarcar)
    expect(manual).toEqual({ kind: 'amount', value: null, reason: '' })
    expect(screen.getByRole('radio', { name: 'Em reais' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Em reais' })).toHaveTextContent('R$')
    expect(screen.getByTestId('desconto-recusa')).toHaveTextContent('Informe o valor do desconto combinado.')
    fireEvent.click(screen.getByRole('radio', { name: 'Em percentual' }))
    expect(screen.getByRole('radio', { name: 'Em percentual' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Em percentual' })).toHaveTextContent('%')
    fireEvent.change(screen.getByLabelText('Percentual do desconto'), { target: { value: '10' } })
    expect(screen.getByTestId('desconto-recusa')).toHaveTextContent('Escreva o motivo do desconto combinado.')
    const motivo = screen.getByLabelText('Motivo')
    expect(motivo).toHaveAttribute('maxLength', '120')
    fireEvent.change(motivo, { target: { value: 'combinado no WhatsApp' } })
    expect(manual).toEqual({ kind: 'percent', value: 10, reason: 'combinado no WhatsApp' })
    expect(screen.queryByTestId('desconto-recusa')).toBeNull()
    expect(screen.getByText('21/120')).toBeInTheDocument()
    expect(screen.getByText(/só você vê/)).toBeInTheDocument()
    expect(screen.getByText('A cliente vê “Desconto combinado”, sem o motivo.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Desconto combinado' }))
    expect(manual).toBeNull()
    expect(screen.queryByLabelText('Motivo')).toBeNull()
  })

  it('o par R$/% embrulha e os rótulos podem quebrar com a fonte grande (token exato)', () => {
    render(<ManualDiscountField manual={{ kind: 'amount', value: null, reason: '' }} onChange={() => {}} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Tipo do desconto' })
    expect(tokens(grupo)).toContain('flex-wrap')
    for (const b of within(grupo).getAllByRole('radio')) expect(tokens(b)).toContain('[overflow-wrap:anywhere]')
  })
})

describe('DiscountsSection', () => {
  it('um cartão "Descontos" com o cupom em cima e o combinado embaixo', () => {
    render(<DiscountsSection cupom={<p>o cupom</p>} combinado={<p>o combinado</p>} />)
    expect(screen.getByText('Descontos')).toBeInTheDocument()
    const cupom = screen.getByText('o cupom')
    const combinado = screen.getByText('o combinado')
    expect(cupom.compareDocumentPosition(combinado) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('ProposalSummary (MON-09)', () => {
  const draft = {
    ...emptyDraft(),
    lines: [{ ...linhaNova({ id: P1, name: 'Colar' }), needsVariant: false, list_price: 150, quantity: 2 }],
    coupon: { code: 'DEZ', rule: { type: 'percent' as const, value: 10 } },
    manual: { kind: 'amount' as const, value: 20, reason: 'amiga' },
  }

  it('os números são os de core, e "No PIX" é proposalPricing sobre o travado', () => {
    const pricing = priceDraft(draft, [])
    render(<ProposalSummary pricing={pricing} couponCode="DEZ" manualReason="amiga" />)
    const esperado = priceProposalDraft({
      lines: [{ product_id: P1, variant_id: null, list_price: 150, quantity: 2 }],
      coupon: { type: 'percent', value: 10 }, promotions: [],
      manualDiscount: { kind: 'amount', value: 20, reason: 'amiga' },
    })
    expect(screen.getByRole('heading', { name: 'Resumo' })).toBeInTheDocument()
    expect(screen.getByTestId('resumo-subtotal')).toHaveTextContent('2 peças')
    expect(screen.getByTestId('resumo-subtotal')).toHaveTextContent('R$ 300,00')
    expect(screen.getByTestId('resumo-cupom')).toHaveTextContent('Cupom DEZ')
    expect(screen.getByTestId('resumo-cupom')).toHaveTextContent('− R$ 30,00')
    expect(screen.getByTestId('resumo-combinado')).toHaveTextContent('Desconto combinado')
    expect(screen.getByTestId('resumo-combinado')).toHaveTextContent('amiga')
    expect(screen.getByTestId('resumo-combinado')).toHaveTextContent('− R$ 20,00')
    expect(screen.getByTestId('resumo-total')).toHaveTextContent('R$ 250,00')
    expect(esperado.itemsTotal).toBe(250)
    const pix = proposalPricing(lockProposal(esperado), { shipping: 0, method: 'pix', pixDiscountPercent: 5, freeShipping: null }).total
    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pix)
    expect(screen.getByTestId('resumo-pix')).toHaveTextContent('No PIX (5% off)')
    expect(screen.getByTestId('resumo-pix').textContent?.replace(/\s/g, ' ')).toContain(brl.replace(/\s/g, ' '))
    expect(pix).toBeLessThan(250)
  })

  it('"N peças" mostra o preço CHEIO: com promoção, a linha é subtotal + promoção e a promoção sai embaixo', () => {
    const pricing = priceDraft(draft, [])
    const comPromo = { ...pricing, price: { ...pricing.price, subtotal: 270, promotionDiscount: 30 } }
    render(<ProposalSummary pricing={comPromo} pieces={2} />)
    expect(screen.getByTestId('resumo-subtotal')).toHaveTextContent('R$ 300,00')
    expect(screen.getByTestId('resumo-promocao')).toHaveTextContent('− R$ 30,00')
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

  it('o que vem depois da conta entra no mesmo cartão', () => {
    render(
      <ProposalSummary pricing={priceDraft(draft, [])}>
        <button type="button">Criar link do pedido</button>
      </ProposalSummary>,
    )
    const cartao = screen.getByRole('heading', { name: 'Resumo' }).closest('section')!
    expect(within(cartao).getByRole('button', { name: 'Criar link do pedido' })).toBeInTheDocument()
  })
})

describe('ShippingPreview (MON-10)', () => {
  const linhaPronta = { ...linhaNova({ id: P1, name: 'Colar' }), needsVariant: false, list_price: 150, quantity: 2, dimensions: { weight_kg: 0.03 } }

  it('sem peça, ou sem CEP, não cota e diz o que falta — e a cliente escolhe no link', () => {
    const { unmount } = comQuery(<ShippingPreview zip="" lines={[]} />)
    expect(screen.getByText(QUOTE_WAITING)).toBeInTheDocument()
    unmount()
    comQuery(<ShippingPreview zip="" lines={[linhaPronta]} />)
    expect(estado.invoke).not.toHaveBeenCalled()
    expect(screen.getByText(QUOTE_NEEDS_ZIP)).toBeInTheDocument()
    expect(screen.getByText('Entrega — prévia')).toBeInTheDocument()
    expect(screen.getByText(CLIENT_CHOOSES)).toBeInTheDocument()
    expect(CLIENT_CHOOSES).toBe('A cliente escolhe a entrega e o pagamento no link.')
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
    expect(lista).toHaveTextContent('PAC · Correios')
    expect(lista).toHaveTextContent('5 a 7 dias úteis')
    expect(lista).toHaveTextContent('R$ 23,50')
    expect(lista).toHaveTextContent('Retirada no escritório')
    expect(lista).toHaveTextContent('Escritório - Uma Estrelinha - Rua do Ateliê, Centro, Porto Alegre/RS')
  })

  it('com cupom de frete grátis, o preço aparece riscado e "Grátis" ao lado', async () => {
    estado.invoke.mockResolvedValueOnce({ data: [{ id: 1, name: 'PAC', company: 'Correios', price: '23.50', delivery_time: 6 }], error: null })
    estado.shipping = { pickup_enabled: false }
    comQuery(<ShippingPreview zip="01310-100" lines={[linhaPronta]} freeShipping />)
    const lista = await screen.findByRole('list', { name: 'Opções de entrega' })
    const riscado = lista.querySelector('s')
    expect(riscado).toHaveTextContent('R$ 23,50')
    expect(lista).toHaveTextContent('Grátis')
  })

  it('sem frete grátis, nada riscado', async () => {
    estado.invoke.mockResolvedValueOnce({ data: [{ id: 1, name: 'PAC', company: 'Correios', price: '23.50', delivery_time: 6 }], error: null })
    estado.shipping = { pickup_enabled: false }
    comQuery(<ShippingPreview zip="01310-100" lines={[linhaPronta]} />)
    const lista = await screen.findByRole('list', { name: 'Opções de entrega' })
    expect(lista.querySelector('s')).toBeNull()
    expect(lista).not.toHaveTextContent('Grátis')
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
    expect(await screen.findByTestId('cotacao-falhou')).toHaveTextContent(QUOTE_FAILED)
    expect(QUOTE_FAILED).toBe('Não consegui cotar agora. Pode criar o link assim mesmo — a cliente cota na loja.')
  })

  it('sem opção nenhuma (e sem retirada) diz isso', async () => {
    estado.invoke.mockResolvedValueOnce({ data: [], error: null })
    estado.shipping = { pickup_enabled: false }
    comQuery(<ShippingPreview zip="01310-100" lines={[linhaPronta]} />)
    expect(await screen.findByText('Nenhuma entrega disponível para este CEP.')).toBeInTheDocument()
  })
})
