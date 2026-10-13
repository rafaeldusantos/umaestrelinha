import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
// Feature 63: a retirada lê a configuração inteira (`shipping` + `material`) por `useStoreSettings`.
// Só é chamada para CEP do RS — os casos acima, com CEP de São Paulo, nunca a alcançam.
const storeSettings: { data: { shipping: Record<string, unknown>; material: Record<string, unknown> }; isFetched: boolean } = {
  data: { shipping: {}, material: {} },
  isFetched: true,
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shippingSettings,
  useStoreSettings: () => storeSettings,
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

// Feature 63 — a retirada no escritório na página do produto (RET-01..05).
//
// O endereço do Material tem número e complemento DISTINTOS (`455`, `Sala 3`): é o que permite
// asserir que eles NÃO aparecem (RET-03). Datas à mão: seg 12/10/2026 + 2 dias úteis = 14 de outubro.
describe('ShippingCalc — retirada no escritório (feature 63)', () => {
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
  const cotacao = [
    { id: 1, name: 'PAC', company: 'Correios', price: '23.22', delivery_time: 6, delivery_range: { min: 5, max: 6 } },
    { id: 2, name: 'SEDEX', company: 'Correios', price: '41.10', delivery_time: 2 },
  ]

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 12))
    shippingSettings.handling_days = 2
    storeSettings.isFetched = true
    storeSettings.data = { shipping: { handling_days: 2, pickup_enabled: true }, material: { ...MATERIAL } }
    invokeMock.mockResolvedValue({ data: cotacao, error: null } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const calcular = async (cep: string) => {
    render(<ShippingCalc product={product()} />)
    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: cep } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
  }

  it('CEP do RS: grupo "Retirar em" com a linha inteira, a data e "Grátis" (RET-01)', async () => {
    await calcular('91240010')

    expect(await screen.findByText('Retirar em')).toBeInTheDocument()
    const grupo = within(screen.getByRole('list', { name: 'Retirar em' }))
    expect(grupo.getByText(LINHA)).toBeInTheDocument()
    expect(grupo.getByText('Pronta para retirada a partir de 14 de outubro')).toBeInTheDocument()
    expect(grupo.getByText('Grátis')).toBeInTheDocument()
  })

  it('CEP do RS: a retirada vem ABAIXO das opções dos Correios, que ganham o título "Envio a domicílio"', async () => {
    await calcular('91240010')

    const domicilio = await screen.findByText('Envio a domicílio')
    const retirar = screen.getByText('Retirar em')
    const pac = screen.getByText('PAC — Correios')
    // DOCUMENT_POSITION_FOLLOWING (4): o segundo nó vem depois do primeiro no documento.
    expect(domicilio.compareDocumentPosition(pac) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pac.compareDocumentPosition(retirar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // As opções dos Correios continuam com o preço delas — a retirada não "rouba" nada.
    expect(screen.getByText('R$ 23,22')).toBeInTheDocument()
    expect(screen.getByText('R$ 41,10')).toBeInTheDocument()
  })

  it('CEP do RS: as duas origens são listas NOMEADAS, cada uma só com o que é dela (RET-06)', async () => {
    await calcular('91240010')

    await screen.findByText(LINHA)
    const domicilio = within(screen.getByRole('list', { name: 'Envio a domicílio' }))
    const retirar = within(screen.getByRole('list', { name: 'Retirar em' }))
    expect(domicilio.getByText('PAC — Correios')).toBeInTheDocument()
    expect(domicilio.queryByText(LINHA)).not.toBeInTheDocument()
    expect(retirar.getByText(LINHA)).toBeInTheDocument()
    expect(retirar.queryByText('PAC — Correios')).not.toBeInTheDocument()
  })

  it('CEP de São Paulo: a lista dos Correios não ganha nome de grupo (a tela de antes)', async () => {
    await calcular('01310100')

    await screen.findByText('PAC — Correios')
    expect(screen.queryByRole('list', { name: 'Envio a domicílio' })).not.toBeInTheDocument()
  })

  it('a linha NÃO contém o número nem o complemento do endereço (RET-03)', async () => {
    await calcular('91240010')

    await screen.findByText(LINHA)
    expect(screen.queryByText(/455/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Sala 3/)).not.toBeInTheDocument()
  })

  it('CEP de São Paulo: nem "Retirar em", nem "Envio a domicílio" — a tela de sempre (RET-02)', async () => {
    await calcular('01310100')

    await screen.findByText('PAC — Correios')
    expect(screen.queryByText('Retirar em')).not.toBeInTheDocument()
    expect(screen.queryByText('Envio a domicílio')).not.toBeInTheDocument()
    expect(screen.queryByText(/Escritório/)).not.toBeInTheDocument()
  })

  it('cotação com ERRO num CEP do RS: a mensagem de falha E a retirada (RET-04)', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('boom') } as never)
    await calcular('91240010')

    expect(await screen.findByText('Erro ao calcular frete. Tente novamente.')).toBeInTheDocument()
    expect(screen.getByText(LINHA)).toBeInTheDocument()
    expect(screen.getByText('Grátis')).toBeInTheDocument()
  })

  it('cotação VAZIA num CEP do RS: a mensagem de vazio E a retirada (RET-04)', async () => {
    invokeMock.mockResolvedValue({ data: [], error: null } as never)
    await calcular('91240010')

    expect(
      await screen.findByText('Nenhuma opção de frete disponível para este CEP'),
    ).toBeInTheDocument()
    expect(screen.getByText(LINHA)).toBeInTheDocument()
  })

  it('retirada DESLIGADA no painel: nada de retirada, mesmo com CEP do RS (RET-05)', async () => {
    storeSettings.data.shipping.pickup_enabled = false
    await calcular('91240010')

    await screen.findByText('PAC — Correios')
    expect(screen.queryByText('Retirar em')).not.toBeInTheDocument()
    expect(screen.queryByText('Envio a domicílio')).not.toBeInTheDocument()
  })

  it('endereço do Material sem rua: nada de retirada (RET-05)', async () => {
    storeSettings.data.material = { ...MATERIAL, street: '' }
    await calcular('91240010')

    await screen.findByText('PAC — Correios')
    expect(screen.queryByText('Retirar em')).not.toBeInTheDocument()
  })

  it('a retirada responde ao CEP CONSULTADO: digitar outro CEP sem recalcular não a apaga', async () => {
    await calcular('91240010')
    await screen.findByText(LINHA)

    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310' } })

    expect(screen.getByText(LINHA)).toBeInTheDocument()
  })
})
