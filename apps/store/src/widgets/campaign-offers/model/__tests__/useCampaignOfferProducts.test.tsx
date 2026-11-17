import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * As peças da fileira do bloco "Joias em oferta". O dublê ENXERGA a tabela, o `select`, o filtro e o
 * teto: um que devolvesse dado para qualquer chamada aprovaria um hook que pede as peças de outra
 * campanha, ou o catálogo inteiro.
 */
const { chamadas, resposta } = vi.hoisted(() => ({
  chamadas: [] as [string, ...unknown[]][],
  resposta: { atual: { data: [] as unknown[], error: null as unknown } },
}))

vi.mock('@estrelinha/supabase/client', () => {
  const builder: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'order', 'limit']) {
    builder[metodo] = (...args: unknown[]) => {
      chamadas.push([metodo, ...args])
      return builder
    }
  }
  builder.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
    Promise.resolve(resposta.atual).then(ok, falha)
  return {
    supabase: {
      from: (tabela: string) => {
        chamadas.push(['from', tabela])
        return builder
      },
    },
  }
})

import { CAMPAIGN_OFFERS_SELECT, useCampaignOfferProducts } from '../useCampaignOfferProducts'

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

const linha = (id: string, percent: number | null) => ({
  id,
  name: `Peça ${id}`,
  slug: id,
  price: 200,
  compare_price: null,
  product_variants: [],
  product_campaigns:
    percent === null
      ? []
      : [
          {
            percent,
            campaigns: {
              id: 'camp-bf',
              name: 'Black Friday',
              badge_text: 'BLACK FRIDAY',
              band_color: '#23303A',
              accent_color: '#F7F3EC',
              ends_at: '2026-12-01T03:00:00Z',
            },
          },
        ],
})

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  chamadas.length = 0
  resposta.atual = { data: [], error: null }
})

describe('useCampaignOfferProducts', () => {
  it('pede `products` recortado pela campanha do bloco, com o teto da fileira', async () => {
    resposta.atual = { data: [linha('p1', 20)], error: null }
    const { result } = renderHook(() => useCampaignOfferProducts('camp-bf'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(chamadas).toContainEqual(['from', 'products'])
    expect(chamadas).toContainEqual(['select', CAMPAIGN_OFFERS_SELECT])
    expect(CAMPAIGN_OFFERS_SELECT).toContain('oferta:live_product_campaigns!inner(campaign_id)')
    expect(chamadas).toContainEqual(['eq', 'oferta.campaign_id', 'camp-bf'])
    expect(chamadas).toContainEqual(['limit', 4])
  })

  it('devolve só as peças cujo preço a campanha baixa, já com o preço efetivo', async () => {
    resposta.atual = { data: [linha('p1', 20), linha('p2', null)], error: null }
    const { result } = renderHook(() => useCampaignOfferProducts('camp-bf'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map(p => p.id)).toEqual(['p1'])
    expect(result.current.data![0].campaign?.percent).toBe(20)
    expect(result.current.data![0].price).toBeLessThan(200)
  })

  it('sem campanha, a consulta não sai', () => {
    renderHook(() => useCampaignOfferProducts(null), { wrapper })
    expect(chamadas).toEqual([])
  })

  it('a leitura que falha é falha, nunca "sem peças"', async () => {
    resposta.atual = { data: null as unknown as unknown[], error: { message: 'boom' } }
    const { result } = renderHook(() => useCampaignOfferProducts('camp-bf'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
