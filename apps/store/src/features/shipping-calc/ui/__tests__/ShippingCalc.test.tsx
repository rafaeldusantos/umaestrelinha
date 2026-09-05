import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import ShippingCalc from '../ShippingCalc'
import { supabase } from '@estrelinha/supabase/client'

// SHP-02: a cotação da página de produto usa o MESMO mapper do checkout (`toQuotePayload`),
// então as dimensões reais do produto vão no payload em vez dos fallbacks 11/2/16/0.1.
//
// SHP-09: e usa a MESMA conversão de prazo em data (`quoteToEstimate` + `formatEstimate`), com o
// mesmo `handling_days`. Antes de 2026-09-05 esta tela exibia o prazo cru da transportadora e o
// checkout somava os dias de produção — a página do produto prometia dois dias a menos que o caixa.

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

// Mesmo molde de `DeliveryBlock.test.tsx`: o hook é mockado em vez de montar QueryClientProvider,
// para que `handling_days` seja um valor escolhido pelo teste e não uma ida ao banco.
const shippingSettings = { handling_days: 2 }
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shippingSettings,
}))

const invokeMock = vi.mocked(supabase.functions.invoke)

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Botton Sakura',
  slug: 'botton-sakura',
  price: 12.9,
  compare_price: null,
  category_id: 'cat-1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockResolvedValue({ data: [], error: null } as never)
})

describe('ShippingCalc — payload de cotação (SHP-02)', () => {
  it('envia as dimensões reais do produto, pelo mapper compartilhado toQuotePayload', async () => {
    render(<ShippingCalc product={product({ width_cm: 25, height_cm: 7, length_cm: 30, weight_kg: 0.85 })} />)

    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
    expect(invokeMock.mock.calls[0][1]?.body).toEqual({
      postal_code_to: '01310100',
      products: [
        {
          id: 'prod-1',
          width: 25,
          height: 7,
          length: 30,
          weight: 0.85,
          insurance_value: 12.9,
          quantity: 1,
        },
      ],
    })
  })

  it('produto sem dimensões cadastradas continua caindo nos fallbacks 11/2/16/0.1', async () => {
    render(<ShippingCalc product={product()} />)

    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
    const body = invokeMock.mock.calls[0][1]?.body as { products: Record<string, number>[] }
    expect(body.products[0]).toMatchObject({ width: 11, height: 2, length: 16, weight: 0.1 })
  })
})

// SHP-09 na página do produto. A régua: o que aparece aqui tem de ser a MESMA data que o checkout
// mostraria para a mesma cotação — não o prazo cru da transportadora.
//
// Datas calculadas à mão, não derivadas do código sob teste: 2026-09-07 é uma segunda-feira;
// somando `handling_days` (2) + `delivery_range` (5–6) em dias úteis chega-se a quarta 16 e
// quinta 17 de setembro.
describe('ShippingCalc — prazo vira data, com os dias de produção (SHP-09)', () => {
  const cotacao = [
    {
      id: 1,
      name: 'PAC',
      company: 'Correios',
      price: '23.22',
      delivery_time: 6,
      delivery_range: { min: 5, max: 6 },
    },
  ]

  beforeEach(() => {
    // `shouldAdvanceTime` é obrigatório aqui: `waitFor`/`findByText` do RTL pollam por timer, e com o
    // relógio congelado eles nunca reavaliam — os três testes estouravam os 5s sem nada de errado no
    // componente. O que precisa ser fixo é a DATA (`setSystemTime`), não a passagem do tempo.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 8, 7))
    shippingSettings.handling_days = 2
    invokeMock.mockResolvedValue({ data: cotacao, error: null } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    shippingSettings.handling_days = 2
  })

  const cotar = async () => {
    render(<ShippingCalc product={product()} />)
    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
  }

  it('exibe a data de chegada, somando os dias de produção ao prazo do transportador', async () => {
    await cotar()

    expect(await screen.findByText('Chega entre 16 e 17 de setembro')).toBeInTheDocument()
  })

  it('NÃO exibe mais o prazo cru em dias úteis', async () => {
    await cotar()

    // A cicatriz: `5-6 dias úteis` era o texto antigo, e ele omitia os 2 dias de produção.
    await screen.findByText(/Chega/)
    expect(screen.queryByText(/dias úteis/)).not.toBeInTheDocument()
    expect(screen.queryByText(/5-6/)).not.toBeInTheDocument()
  })

  it('handling_days move a data — é ele que a página estava ignorando', async () => {
    shippingSettings.handling_days = 0
    await cotar()

    // Sem dias de produção, as mesmas 5–6 chegam em 14 e 15 (segunda e terça).
    expect(await screen.findByText('Chega entre 14 e 15 de setembro')).toBeInTheDocument()
  })
})
