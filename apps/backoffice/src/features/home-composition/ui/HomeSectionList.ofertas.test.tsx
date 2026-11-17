// A linha do bloco "Joias em oferta" na lista da Home: qual campanha ele mostra, em que estado, se
// ele não vai aparecer e por quê, e quais peças escolhidas não aparecem.
//
// A lista é montada pelo `resolveHomeSections` de verdade, e as peças são lidas pelo hook de
// verdade sobre o dublê do client, que responde às marcações da campanha e às peças por id.

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resolveHomeSections,
  type HomeSection,
  type HomeSectionItem,
  type ResolveContext,
  type ResolvedSection,
} from '@estrelinha/core/home'
import type { AdminCampaign } from '@/entities/campaign'
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

import HomeSectionList, { ACENDE_MS } from './HomeSectionList'

const DIA = 24 * 60 * 60 * 1000

const campanha = (over: Partial<AdminCampaign>): AdminCampaign => ({
  id: 'c-natal',
  name: 'Natal',
  badge_text: 'Natal',
  band_color: '#000000',
  accent_color: '#ffffff',
  starts_at: new Date(Date.now() - 5 * DIA).toISOString(),
  ends_at: new Date(Date.now() + 5 * DIA).toISOString(),
  active: true,
  created_at: 'x',
  updated_at: 'x',
  percents: [10],
  usage: { 10: 3 },
  productCount: 3,
  ...over,
})

const NATAL = campanha({})
const AGENDADA = campanha({
  id: 'c-maes',
  name: 'Dia das Mães',
  starts_at: new Date(Date.now() + 5 * DIA).toISOString(),
  ends_at: new Date(Date.now() + 10 * DIA).toISOString(),
})
const ENCERRADA = campanha({
  id: 'c-inverno',
  name: 'Inverno',
  starts_at: new Date(Date.now() - 20 * DIA).toISOString(),
  ends_at: new Date(Date.now() - 10 * DIA).toISOString(),
})
const DESLIGADA = campanha({ id: 'c-pausada', name: 'Pausada', active: false })

const peca = (id: string, position: number): HomeSectionItem =>
  ({
    id: `i-${id}`,
    section_id: 'ofertas',
    position,
    category_id: null,
    product_id: id,
    product_slug: id,
    href: null,
    image_url: null,
    image_mobile_url: null,
    alt: null,
    title: null,
    label_snapshot: id,
  }) as HomeSectionItem

const bloco = (over: Partial<HomeSection> = {}): HomeSection =>
  ({
    id: 'ofertas',
    type: 'campaign_offers',
    position: 1,
    active: true,
    config: {},
    items: [],
    campaign_id: 'c-natal',
    ...over,
  }) as HomeSection

/** O resolvedor do painel reduzido ao que importa aqui: toda peça escolhida resolve. */
const ctx: ResolveContext = {
  resolveItem: item => ({
    id: item.id,
    categoryId: null,
    productId: item.product_id ?? null,
    slug: item.product_slug ?? null,
    label: item.label_snapshot ?? '',
    description: null,
    href: '/x',
    imageUrl: null,
    imageMobileUrl: null,
    curated: true,
  }),
  derive: () => [],
}

const resolver = (sections: HomeSection[]): ResolvedSection[] => resolveHomeSections(sections, ctx)

interface Campanhas {
  campaigns?: AdminCampaign[]
  campaignsLoading?: boolean
  campaignsError?: string | null
}

const montar = (sections: HomeSection[], campanhas: Campanhas = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props = {
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onReorder: vi.fn(),
    campaigns: [NATAL, AGENDADA, ENCERRADA, DESLIGADA],
    campaignsLoading: false,
    campaignsError: null,
    ...campanhas,
  }
  const arvore = (resolved: ResolvedSection[]) => (
    <QueryClientProvider client={client}>
      <HomeSectionList resolved={resolved} {...props} />
    </QueryClientProvider>
  )
  const view = render(arvore(resolver(sections)))
  return { rerender: (proximas: HomeSection[]) => view.rerender(arvore(resolver(proximas))) }
}

const linha = (id = 'ofertas') => screen.getByTestId(`secao-${id}`)
const aviso = (id = 'ofertas') => screen.queryByTestId(`aviso-${id}`)

const SEM_CAMPANHA = 'O bloco está sem campanha e não aparece na loja. Escolha uma campanha.'

beforeEach(() => {
  ;(h.calls as unknown[]).length = 0
  h.responder = () => ({ data: [] })
})

describe('a linha do bloco "Joias em oferta" — a campanha e o estado', () => {
  it('diz a campanha escolhida e que ela está em vigência, sem aviso', () => {
    montar([bloco()])
    expect(linha()).toHaveTextContent('Campanha “Natal”')
    expect(linha()).toHaveTextContent(/em vigência até \d{2}\/\d{2}/)
    expect(aviso()).toBeNull()
  })

  it('campanha agendada: o bloco não vai aparecer, e a linha diz por quê', () => {
    montar([bloco({ campaign_id: 'c-maes' })])
    expect(linha()).toHaveTextContent('Campanha “Dia das Mães”')
    expect(linha()).toHaveTextContent(/agendada — começa em/)
    expect(aviso()!.textContent).toBe(
      'A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência.',
    )
  })

  it('campanha encerrada: o bloco não vai aparecer, e a linha pede outra', () => {
    montar([bloco({ campaign_id: 'c-inverno' })])
    expect(linha()).toHaveTextContent(/encerrada em/)
    expect(aviso()!.textContent).toBe(
      'A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha.',
    )
  })

  it('campanha desligada: o bloco não vai aparecer enquanto ela não for ligada', () => {
    montar([bloco({ campaign_id: 'c-pausada' })])
    expect(aviso()!.textContent).toBe(
      'A campanha escolhida está desligada, e o bloco não aparece na loja enquanto ela não for ligada.',
    )
  })

  it('sem campanha e LIGADO: a linha diz que ele não aparece e pede a escolha', () => {
    montar([bloco({ campaign_id: null })])
    expect(linha()).toHaveTextContent('sem campanha')
    expect(aviso()!.textContent).toBe(SEM_CAMPANHA)
  })

  it('a campanha apagada (o id não está entre as campanhas) recebe a MESMA frase do bloco sem campanha', () => {
    montar([bloco({ campaign_id: 'c-apagada' })])
    expect(linha()).not.toHaveTextContent('c-apagada')
    expect(aviso()!.textContent).toBe(SEM_CAMPANHA)
  })

  it('enquanto as campanhas carregam, a linha não diz "sem campanha" de um bloco que tem uma', () => {
    montar([bloco()], { campaigns: [], campaignsLoading: true })
    expect(linha()).not.toHaveTextContent('sem campanha')
    expect(aviso()).toBeNull()
  })

  it('a leitura das campanhas que falha não vira "sem campanha"', () => {
    montar([bloco()], { campaigns: [], campaignsError: 'permission denied' })
    expect(linha()).not.toHaveTextContent('sem campanha')
    expect(aviso()).toBeNull()
  })

  it('o bloco DESLIGADO com campanha escolhida não ganha aviso — "Desligada" já é a resposta', () => {
    montar([bloco({ active: false, campaign_id: 'c-inverno' })])
    expect(linha()).toHaveTextContent(/encerrada em/)
    expect(aviso()).toBeNull()
  })
})

describe('a linha do bloco "Joias em oferta" — o bloco novo da bandeja', () => {
  it('nasce desligado e sem campanha, e a linha pede a escolha mesmo desligado', () => {
    montar([bloco({ id: 'novo', active: false, campaign_id: null, items: [] })])
    expect(within(linha('novo')).getByRole('switch')).not.toBeChecked()
    expect(aviso('novo')!.textContent).toBe(SEM_CAMPANHA)
  })
})

const ehContagem = (r: Registro) => (r.select?.[1] as { head?: boolean } | undefined)?.head === true

describe('a linha do bloco "Joias em oferta" — as peças escolhidas que não aparecem', () => {
  beforeEach(() => {
    h.responder = r => {
      const reg = r as Registro
      if (reg.table === 'product_campaigns') {
        if (ehContagem(reg)) return { count: 3 }
        return {
          data: [
            { product_id: 'p1', percent: 10 },
            { product_id: 'p2', percent: 10 },
            { product_id: 'p3', percent: 10 },
          ],
        }
      }
      if (reg.table === 'products') {
        return {
          data: [
            { id: 'p1', name: 'Pingente Gota', is_active: true, base_price: 100, original_price: null, product_variants: [] },
            { id: 'p2', name: 'Anel Lua', is_active: false, base_price: 100, original_price: null, product_variants: [] },
            // O "de/por" já deixa a peça abaixo do que a campanha faria: o desconto não baixa o preço.
            { id: 'p3', name: 'Brinco Sol', is_active: true, base_price: 50, original_price: 100, product_variants: [] },
          ],
        }
      }
      return { data: [] }
    }
  })

  it('conta "1 das 3 saiu do ar" nomeando a peça, e diz qual a campanha não barateia', async () => {
    montar([bloco({ items: [peca('p1', 1), peca('p2', 2), peca('p3', 3)] })])

    const foraDoAr = await screen.findByTestId('pecas-fora-do-ar-ofertas')
    expect(foraDoAr.textContent).toBe('1 das 3 saiu do ar: “Anel Lua”. A loja a pula enquanto ela não voltar.')
    expect(screen.getByTestId('pecas-nao-barateadas-ofertas').textContent).toBe(
      'O desconto da campanha não baixa o preço de “Brinco Sol”, e ela não aparece no bloco nem na vitrine da campanha.',
    )
    expect(linha()).not.toHaveTextContent('Pingente Gota')
  })

  it('sem nenhuma peça fora, nenhum aviso de peça', async () => {
    montar([bloco({ items: [peca('p1', 1)] })])
    await waitFor(() => expect((h.calls as Registro[]).some(r => r.table === 'products')).toBe(true))
    expect(screen.queryByTestId('pecas-fora-do-ar-ofertas')).toBeNull()
    expect(screen.queryByTestId('pecas-nao-barateadas-ofertas')).toBeNull()
  })

  it('a leitura das peças que falha é dita — nunca vira "nenhuma peça fora"', async () => {
    h.responder = r => {
      const reg = r as Registro
      if (reg.table === 'products') return { data: null, error: { message: 'permission denied' } }
      if (ehContagem(reg)) return { count: 1 }
      return { data: [{ product_id: 'p1', percent: 10 }] }
    }
    montar([bloco({ items: [peca('p1', 1)] })])
    expect(await screen.findByTestId('pecas-falha-ofertas')).toHaveTextContent(
      'Não foi possível conferir as peças escolhidas',
    )
  })
})

describe('a linha do bloco "Joias em oferta" — acende ao trocar a campanha', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('trocar só a campanha acende a linha, e só ela', () => {
    const outra = bloco({ id: 'outra', type: 'newsletter', position: 2, campaign_id: undefined })
    const { rerender } = montar([bloco(), outra])
    expect(document.querySelectorAll('[data-recem-salvo="true"]')).toHaveLength(0)

    act(() => {
      rerender([bloco({ campaign_id: 'c-maes' }), outra])
    })

    expect(linha()).toHaveAttribute('data-recem-salvo', 'true')
    expect(document.querySelectorAll('[data-recem-salvo="true"]')).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(ACENDE_MS)
    })
    expect(linha()).not.toHaveAttribute('data-recem-salvo')
  })
})
