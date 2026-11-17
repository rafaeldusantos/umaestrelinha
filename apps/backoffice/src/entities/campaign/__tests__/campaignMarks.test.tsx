// As marcações de uma campanha (as peças que ela desconta) e o estado das peças escolhidas num
// bloco "Joias em oferta" — sobre o dublê que ENXERGA a consulta: a contagem antes, as páginas na
// ordem estável, o recorte pela campanha, e o erro que nunca vira lista vazia.

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const h = vi.hoisted(() => ({
  responder: (() => ({ data: [] })) as (r: unknown) => unknown,
  calls: [] as unknown[],
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble(r => h.responder(r) as Resposta)
  h.calls = duble.calls
  return { supabase: { from: duble.from } }
})

import {
  CampaignMarksQueryError,
  CampaignPiecesQueryError,
  campaignPieceStates,
  fetchCampaignMarks,
  fetchCampaignPieces,
  piecesNotLoweredText,
  piecesOffAirText,
  useCampaignMarks,
  type CampaignPieceRow,
} from '..'

const regs = () => h.calls as Registro[]
const ehContagem = (r: Registro) => (r.select?.[1] as { head?: boolean } | undefined)?.head === true

beforeEach(() => {
  h.calls.length = 0
  h.responder = () => ({ data: [] })
})

const Palco = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )

describe('fetchCampaignMarks — as peças marcadas numa campanha', () => {
  it('conta primeiro, depois lê as páginas recortadas pela campanha, em ordem estável', async () => {
    h.responder = r => {
      const reg = r as Registro
      if (ehContagem(reg)) return { count: 2 }
      return {
        data: [
          { product_id: 'p1', percent: 10 },
          { product_id: 'p2', percent: 20 },
        ],
      }
    }

    const marcas = await fetchCampaignMarks('natal')

    expect(marcas).toEqual([
      { product_id: 'p1', percent: 10 },
      { product_id: 'p2', percent: 20 },
    ])
    expect(regs().map(r => r.table)).toEqual(['product_campaigns', 'product_campaigns'])
    expect(regs()[0].filters).toEqual([{ method: 'eq', args: ['campaign_id', 'natal'] }])
    expect(regs()[1].select).toEqual(['product_id, percent'])
    expect(regs()[1].filters).toEqual([
      { method: 'eq', args: ['campaign_id', 'natal'] },
      { method: 'order', args: ['product_id'] },
      { method: 'range', args: [0, 999] },
    ])
  })

  it('campanha sem peça marcada devolve lista vazia sem pedir página', async () => {
    h.responder = () => ({ count: 0 })
    expect(await fetchCampaignMarks('natal')).toEqual([])
    expect(regs()).toHaveLength(1)
  })

  it('a contagem que falha é erro tipado, nunca lista vazia', async () => {
    h.responder = () => ({ count: null, error: { message: 'permission denied' } })
    await expect(fetchCampaignMarks('natal')).rejects.toBeInstanceOf(CampaignMarksQueryError)
  })

  it('a leitura truncada é erro tipado — uma peça marcada nunca some em silêncio', async () => {
    h.responder = r => (ehContagem(r as Registro) ? { count: 3 } : { data: [{ product_id: 'p1', percent: 10 }] })
    await expect(fetchCampaignMarks('natal')).rejects.toBeInstanceOf(CampaignMarksQueryError)
  })
})

describe('useCampaignMarks — o erro não vira "nenhuma peça marcada"', () => {
  it('lido, devolve os ids', async () => {
    h.responder = r => (ehContagem(r as Registro) ? { count: 1 } : { data: [{ product_id: 'p7', percent: 15 }] })
    const { result } = renderHook(() => useCampaignMarks('natal'), { wrapper: Palco })
    await waitFor(() => expect(result.current.ids).toEqual(['p7']))
    expect(result.current.error).toBeNull()
  })

  it('falhou: `ids` fica `null` e o erro diz o que houve', async () => {
    h.responder = () => ({ count: null, error: { message: 'permission denied' } })
    const { result } = renderHook(() => useCampaignMarks('natal'), { wrapper: Palco })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.ids).toBeNull()
    expect(result.current.error).toContain('permission denied')
  })

  it('sem campanha, nada é lido', () => {
    const { result } = renderHook(() => useCampaignMarks(null), { wrapper: Palco })
    expect(result.current.ids).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(regs()).toHaveLength(0)
  })
})

describe('fetchCampaignPieces — o que a pergunta "a campanha baixa esta peça?" precisa', () => {
  it('lê as peças por id, com o preço, o "de" e as variações', async () => {
    h.responder = () => ({ data: [] })
    await fetchCampaignPieces(['p2', 'p1'])
    expect(regs()[0].table).toBe('products')
    expect(regs()[0].select).toEqual([
      'id, name, is_active, base_price, original_price, product_variants(price, compare_price)',
    ])
    expect(regs()[0].filters).toEqual([{ method: 'in', args: ['id', ['p1', 'p2']] }])
  })

  it('a falha é erro tipado', async () => {
    h.responder = () => ({ data: null, error: { message: 'timeout' } })
    await expect(fetchCampaignPieces(['p1'])).rejects.toBeInstanceOf(CampaignPiecesQueryError)
  })
})

const linha = (id: string, name: string, over: Partial<CampaignPieceRow> = {}): CampaignPieceRow => ({
  id,
  name,
  is_active: true,
  base_price: 100,
  original_price: null,
  product_variants: [],
  ...over,
})

describe('campaignPieceStates — por peça escolhida, por que ela aparece ou não no bloco', () => {
  const marcas = [
    { product_id: 'baixa', percent: 10 },
    { product_id: 'desligada', percent: 10 },
    { product_id: 'ja-vence', percent: 10 },
  ]
  const pecas = [
    linha('baixa', 'Colar de Cinzas'),
    linha('desligada', 'Pingente Gota', { is_active: false }),
    // O "de/por" já está em 50%: os 10% da campanha não baixam o preço.
    linha('ja-vence', 'Anel Coração', { base_price: 50, original_price: 100 }),
    linha('sem-marca', 'Broche Pena'),
  ]

  it('cada motivo, na ordem da lista escolhida', () => {
    const estados = campaignPieceStates(['baixa', 'desligada', 'ja-vence', 'sem-marca', 'sumiu'], marcas, pecas)
    expect(estados.map(e => [e.product_id, e.status])).toEqual([
      ['baixa', 'no-ar'],
      ['desligada', 'fora-do-ar'],
      ['ja-vence', 'nao-barateada'],
      ['sem-marca', 'fora-da-campanha'],
      ['sumiu', 'apagada'],
    ])
    expect(estados[2].name).toBe('Anel Coração')
    expect(estados[4].name).toBeNull()
  })

  it('a variação com preço próprio que baixa faz a peça baixar', () => {
    const comVariacao = [
      linha('ja-vence', 'Anel Coração', {
        base_price: 50,
        original_price: 100,
        product_variants: [
          { price: 50, compare_price: 100 },
          { price: 80, compare_price: null },
        ],
      }),
    ]
    expect(campaignPieceStates(['ja-vence'], marcas, comVariacao)[0].status).toBe('no-ar')
  })
})

describe('as frases dos avisos das peças escolhidas', () => {
  it('"N das M saíram do ar", nomeando a peça', () => {
    expect(
      piecesOffAirText([
        { product_id: 'a', name: 'Colar de Cinzas', status: 'no-ar' },
        { product_id: 'b', name: 'Pingente Gota', status: 'fora-do-ar' },
        { product_id: 'c', name: 'Anel Coração', status: 'no-ar' },
      ]),
    ).toBe('1 das 3 saiu do ar: “Pingente Gota”. A loja a pula enquanto ela não voltar.')
    expect(
      piecesOffAirText([
        { product_id: 'a', name: 'Colar de Cinzas', status: 'fora-do-ar' },
        { product_id: 'b', name: 'Pingente Gota', status: 'fora-do-ar' },
      ]),
    ).toBe('2 das 2 saíram do ar: “Colar de Cinzas” e “Pingente Gota”. A loja as pula enquanto elas não voltarem.')
    expect(piecesOffAirText([{ product_id: 'a', name: 'Colar', status: 'no-ar' }])).toBeNull()
  })

  it('as peças que a campanha não barateia, nomeadas', () => {
    expect(
      piecesNotLoweredText([
        { product_id: 'a', name: 'Anel Coração', status: 'nao-barateada' },
        { product_id: 'b', name: 'Colar', status: 'no-ar' },
      ]),
    ).toBe(
      'O desconto da campanha não baixa o preço de “Anel Coração”, e ela não aparece no bloco nem na vitrine da campanha.',
    )
    expect(piecesNotLoweredText([{ product_id: 'b', name: 'Colar', status: 'no-ar' }])).toBeNull()
  })
})
