// A conferência das peças escolhidas contra as marcações da campanha, com a leitura DE VERDADE.
//
// O `CampaignOffersEditor.test.tsx` dubla os hooks de `entities/campaign` e entrega o erro pronto; aqui
// os hooks rodam, e o dublê fica no client do Supabase. O `QueryClient` é o do painel, com as opções
// padrão (`App.tsx`): é com elas que a leitura que falha precisa chegar à tela — um cliente de teste
// sem novas tentativas esconderia o tempo que a falha leva para aparecer.

import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeSection, ResolvedSection } from '@estrelinha/core/home'
import type { AdminCampaign } from '@/entities/campaign'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const h = vi.hoisted(() => ({
  responder: (() => ({ data: [] })) as (r: unknown) => unknown,
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble(r => h.responder(r) as Resposta)
  return { supabase: { from: duble.from } }
})

const DIA = 24 * 60 * 60 * 1000
const em = (dias: number) => new Date(Date.now() + dias * DIA).toISOString()

const NATAL: AdminCampaign = {
  id: 'c-natal',
  name: 'Natal 2026',
  badge_text: 'Oferta',
  band_color: '#000',
  accent_color: '#fff',
  starts_at: em(-10),
  ends_at: em(10),
  active: true,
  created_at: em(-30),
  updated_at: em(-30),
  percents: [10],
  usage: { 10: 2 },
  productCount: 2,
}

vi.mock('@/entities/campaign', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/campaign')>()),
  useCampaigns: () => ({ campaigns: [NATAL], loading: false, error: null, refetch: vi.fn() }),
}))

import HomeSectionEditor from './HomeSectionEditor'

const PECAS = [
  { id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true, base_price: 289 },
  { id: 'p2', name: 'Pingente Gota', slug: 'pingente-gota', is_active: true, base_price: 189 },
  { id: 'p3', name: 'Anel Coração', slug: 'anel-coracao', is_active: true, base_price: 159 },
]

const ehContagem = (r: Registro) => (r.select?.[1] as { head?: boolean } | undefined)?.head === true

/** O catálogo e as marcações da campanha: p1 e p2 marcadas, p3 não. */
const leituraCerta = (r: Registro): Resposta => {
  if (r.table === 'product_campaigns') {
    if (ehContagem(r)) return { count: 2 }
    return {
      data: [
        { product_id: 'p1', percent: 10 },
        { product_id: 'p2', percent: 10 },
      ],
    }
  }
  if (r.table === 'products') {
    return {
      data: PECAS.map(p => ({
        id: p.id,
        name: p.name,
        is_active: true,
        base_price: p.base_price,
        original_price: null,
        product_variants: [],
      })),
    }
  }
  return { data: [] }
}

const item = (n: number, product_id: string) => ({
  id: `i${n}`,
  section_id: 'bloco',
  position: n,
  category_id: null,
  product_id,
  product_slug: product_id,
  href: null,
  image_url: null,
  image_mobile_url: null,
  alt: null,
  title: null,
  label_snapshot: null,
})

const montar = (items: ReturnType<typeof item>[]) => {
  const section: HomeSection = {
    id: 'bloco',
    type: 'campaign_offers',
    position: 2,
    active: true,
    config: {},
    items,
    campaign_id: 'c-natal',
  }
  const hero = { ...section, id: 'hero', type: 'hero', position: 1, items: [], campaign_id: null } as HomeSection
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <HomeSectionEditor
          entry={
            {
              section,
              renders: true,
              hiddenReason: null,
              items: [],
              droppedCount: 0,
              nestedUnder: null,
            } as unknown as ResolvedSection
          }
          sections={[hero, section]}
          categories={[]}
          products={PECAS}
          saving={false}
          onCancel={vi.fn()}
          onSave={vi.fn().mockResolvedValue(null)}
          onDraftChange={vi.fn()}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const nomesNaLista = () =>
  within(screen.getByTestId('curadoria'))
    .queryAllByTestId(/^nome-peca-/)
    .map(n => n.textContent)

beforeEach(() => {
  h.responder = r => leituraCerta(r as Registro)
})

describe('A conferência das peças escolhidas ao abrir o editor, com a leitura das marcações de verdade', () => {
  it.each([
    ['a leitura volta com erro', () => ({ count: null, error: { message: 'permission denied for table product_campaigns' } })],
    [
      'a requisição é abortada',
      () => {
        throw new TypeError('Failed to fetch')
      },
    ],
  ])(
    'falhando (%s): sai de "Conferindo…", diz que não conseguiu conferir, e nenhuma peça sai',
    async (_caso, falha) => {
      h.responder = r => ((r as Registro).table === 'product_campaigns' ? falha() : leituraCerta(r as Registro))
      montar([item(1, 'p1'), item(2, 'p3')])

      expect(screen.getByTestId('marcacoes-carregando')).toHaveTextContent(
        'Conferindo as peças marcadas na campanha…',
      )
      await waitFor(() => expect(screen.getByTestId('marcacoes-com-erro')).toBeInTheDocument(), { timeout: 2000 })

      expect(screen.queryByTestId('marcacoes-carregando')).toBeNull()
      expect(screen.getByTestId('marcacoes-com-erro')).toHaveTextContent(
        'Não foi possível conferir as peças da campanha.',
      )
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
      expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Anel Coração'])
      expect(screen.queryByTestId('pecas-que-sairam')).toBeNull()
      expect(screen.queryByText('Alterações não salvas')).toBeNull()
    },
  )

  it('com a leitura certa, a peça tirada da campanha sai ao abrir, nomeada, e o editor abre alterado', async () => {
    montar([item(1, 'p1'), item(2, 'p3')])

    await waitFor(() => expect(nomesNaLista()).toEqual(['Colar de Cinzas']))
    expect(screen.getByTestId('pecas-que-sairam')).toHaveTextContent('“Anel Coração”')
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.queryByTestId('marcacoes-carregando')).toBeNull()
    expect(screen.queryByTestId('marcacoes-com-erro')).toBeNull()
  })
})
