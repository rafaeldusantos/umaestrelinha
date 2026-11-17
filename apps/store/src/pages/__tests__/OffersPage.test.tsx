import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

/**
 * A vitrine da campanha de desconto em vigência, pela PÁGINA REAL (`/ofertas`).
 *
 * Quem lê a campanha é o `useLiveCampaign` de verdade, quem lê as peças é o hook de verdade e quem
 * monta cada peça é o mapeador de verdade (o preço efetivo e a faixa da campanha): o dublê é só o
 * client do Supabase, que REGISTRA a tabela, o `select` e os filtros de cada consulta — sem isso
 * "a vitrine pede só as peças da campanha em vigência" seria inauditável. O cartão é o de verdade,
 * para o selo da campanha ser o que a cliente vê.
 */
interface Consulta {
  tabela: string
  select?: string
  filtros: [string, string, unknown][]
}

const { estado } = vi.hoisted(() => ({
  estado: {
    consultas: [] as Consulta[],
    respostas: {} as Record<string, { data: unknown; error: unknown }>,
  },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      const c: Consulta = { tabela, filtros: [] }
      estado.consultas.push(c)
      const q = {
        select(colunas: string) {
          c.select = colunas
          return q
        },
        eq(coluna: string, valor: unknown) {
          c.filtros.push(['eq', coluna, valor])
          return q
        },
        in(coluna: string, valor: unknown) {
          c.filtros.push(['in', coluna, valor])
          return q
        },
        order() {
          return q
        },
        limit() {
          return q
        },
        then(ok: (r: unknown) => unknown, falha?: (e: unknown) => unknown) {
          return Promise.resolve(estado.respostas[tabela] ?? { data: [], error: null }).then(ok, falha)
        },
      }
      return q
    },
  },
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import OffersPage from '../OffersPage'

const BLACK_FRIDAY = {
  id: 'camp-bf',
  name: 'Black Friday',
  // O texto do selo é DIFERENTE do nome: o título e a trilha dizem o nome, o selo diz o texto dele.
  badge_text: 'BLACK FRIDAY',
  band_color: '#161514',
  accent_color: '#C2A063',
  // Exclusivo: 01/12 00:00 de Brasília ⇒ vale até 30/11 23:59.
  ends_at: '2026-12-01T03:00:00Z',
}
const DIA_DAS_MAES = {
  id: 'camp-maes',
  name: 'Dia das Mães',
  badge_text: 'DIA DAS MÃES',
  band_color: '#6E2433',
  accent_color: '#F6DCD8',
  ends_at: '2027-05-11T03:00:00Z',
}

/** A linha da campanha como a leitura pública a devolve. */
const campanha = (c: typeof BLACK_FRIDAY, percents: number[]) => ({
  ...c,
  campaign_percents: percents.map(percent => ({ percent })),
})

/** Uma peça marcada na campanha, como o `select` da vitrine a devolve. */
const peca = (id: string, name: string, percent: number, c = BLACK_FRIDAY, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: id,
  base_price: 200,
  original_price: null,
  images: [{ url: `${id}.webp` }],
  stock_policy: 'track',
  stock_total: 10,
  low_stock_threshold: 5,
  product_campaigns: [{ percent, campaigns: c }],
  ...extra,
})

const URL_ATUAL = { busca: '' }
const Espiao = () => {
  URL_ATUAL.busca = useLocation().search
  return null
}

const abrir = (url = '/ofertas') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <Espiao />
        <Routes>
          <Route path="/ofertas" element={<OffersPage />} />
          <Route path="/" element={<div>a home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const cartoes = () => [...document.querySelectorAll('h3')].map(h => h.textContent ?? '')

const chips = () =>
  within(screen.getByRole('group', { name: 'Filtrar por desconto' }))
    .getAllByRole('button')
    .map(b => `${b.textContent?.replace(/\s+/g, ' ').trim()}${b.getAttribute('aria-pressed') === 'true' ? ' [x]' : ''}`)

beforeEach(() => {
  estado.consultas = []
  estado.respostas = {}
  document.title = ''
})

describe('a vitrine com campanha em vigência', () => {
  beforeEach(() => {
    estado.respostas = {
      live_campaigns: { data: [campanha(BLACK_FRIDAY, [20, 10, 15])], error: null },
      products: {
        data: [
          peca('p1', 'Colar de cinzas', 20),
          peca('p2', 'Anel de leite materno', 15),
          peca('p3', 'Pingente de mecha', 10),
          peca('p4', 'Brinco de flores', 15),
          // Marcada, mas o "de/por" de hoje já é melhor que a campanha: o mapeador não a marca, e a
          // vitrine não anuncia um desconto que a peça não tem.
          peca('p5', 'Pulseira já em promoção', 10, BLACK_FRIDAY, { base_price: 100, original_price: 200 }),
        ],
        error: null,
      },
      filter_groups: { data: [], error: null },
    }
  })

  it('o nome da campanha no título e na trilha, e a linha com os percentuais e a data', async () => {
    abrir()
    expect(await screen.findByRole('heading', { level: 1, name: 'Black Friday' })).toBeInTheDocument()
    expect(screen.getByText('Peças com 10%, 15% e 20% de desconto até 30 de novembro.')).toBeInTheDocument()
    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(within(trilha).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/')
    expect(trilha.textContent).toBe('Início›Black Friday')
    await waitFor(() => expect(document.title).toBe('Black Friday | Uma Estrelinha'))
  })

  it('o título tem 28 px no celular e 44 px a partir de 1024', async () => {
    abrir()
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Black Friday' })
    const classes = h1.className.split(/\s+/)
    expect(classes).toEqual(expect.arrayContaining(['text-[28px]', 'lg:text-[44px]']))
    expect(classes.some(c => /^md:text-/.test(c))).toBe(false)
  })

  it('a partir de 768 px, os chips e a ordenação ficam na mesma linha', async () => {
    abrir()
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    const linha = screen.getByTestId('linha-dos-chips')
    expect(within(linha).getByRole('group', { name: 'Filtrar por desconto' })).toBeInTheDocument()
    const ordenar = within(linha).getByRole('combobox', { name: 'Ordenar por' })
    // A ordenação da linha dos chips é a do computador; no celular ela mora na barra de filtros.
    expect(ordenar.parentElement).toHaveClass('hidden', 'md:block')
    expect(screen.getAllByRole('combobox', { name: 'Ordenar por', hidden: true })).toHaveLength(2)
  })

  it('pede só as peças da campanha em vigência, e lista exatamente as que ela baixa', async () => {
    abrir()
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    expect(cartoes().sort()).toEqual(
      ['Anel de leite materno', 'Brinco de flores', 'Colar de cinzas', 'Pingente de mecha'].sort(),
    )
    const pecas = estado.consultas.find(c => c.tabela === 'products')!
    expect(pecas.filtros).toEqual([['eq', 'oferta.campaign_id', 'camp-bf']])
    expect(pecas.select).toContain('oferta:live_product_campaigns!inner(campaign_id)')
  })

  it('os chips "Todas · N" e "{p}% · n", com a contagem de cada percentual', async () => {
    abrir()
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    expect(chips()).toEqual(['Todas · 4 [x]', '10% · 1', '15% · 2', '20% · 1'])
  })

  it('`?percentual=15` filtra, e o chip de 15% fica pressionado', async () => {
    abrir('/ofertas?percentual=15')
    await waitFor(() => expect(cartoes()).toHaveLength(2))
    expect(cartoes().sort()).toEqual(['Anel de leite materno', 'Brinco de flores'])
    expect(chips()).toEqual(['Todas · 4', '10% · 1', '15% · 2 [x]', '20% · 1'])
  })

  it('tocar num chip escreve `?percentual=` na URL e recorta; "Todas" o tira', async () => {
    abrir()
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    fireEvent.click(screen.getByRole('button', { name: /^20%/ }))
    await waitFor(() => expect(cartoes()).toEqual(['Colar de cinzas']))
    expect(URL_ATUAL.busca).toBe('?percentual=20')
    fireEvent.click(screen.getByRole('button', { name: /^Todas/ }))
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    expect(URL_ATUAL.busca).toBe('')
  })

  it('um percentual que a campanha não oferece vale como "Todas"', async () => {
    abrir('/ofertas?percentual=50')
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    expect(chips()[0]).toBe('Todas · 4 [x]')
  })

  it('cada cartão leva a faixa da campanha com o percentual da peça', async () => {
    abrir()
    expect(await screen.findByRole('img', { name: 'BLACK FRIDAY, 20% de desconto' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: 'BLACK FRIDAY, 15% de desconto' })).toHaveLength(2)
  })

  it('o tom: nada de contagem regressiva, escassez ou exclamação', async () => {
    abrir()
    await waitFor(() => expect(cartoes()).toHaveLength(4))
    expect(document.body.textContent).not.toMatch(/!|últimas|restam|corra|acaba em|horas/i)
  })
})

describe('a vitrine com outra campanha ("Dia das Mães")', () => {
  it('o título e o selo são os dela, sem mudança de código', async () => {
    estado.respostas = {
      live_campaigns: { data: [campanha(DIA_DAS_MAES, [15])], error: null },
      products: { data: [peca('p1', 'Colar de cinzas', 15, DIA_DAS_MAES)], error: null },
      filter_groups: { data: [], error: null },
    }
    abrir()
    expect(await screen.findByRole('heading', { level: 1, name: 'Dia das Mães' })).toBeInTheDocument()
    expect(screen.getByText('Peças com 15% de desconto até 10 de maio.')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'DIA DAS MÃES, 15% de desconto' })).toBeInTheDocument()
    expect(chips()).toEqual(['Todas · 1 [x]', '15% · 1'])
    await waitFor(() => expect(document.title).toBe('Dia das Mães | Uma Estrelinha'))
  })
})

describe('a vitrine sem campanha em vigência', () => {
  beforeEach(() => {
    estado.respostas = { live_campaigns: { data: [], error: null }, filter_groups: { data: [], error: null } }
  })

  it('diz que não há ofertas agora, com a trilha, o texto e o botão literais, e leva às coleções', async () => {
    abrir()
    expect(await screen.findByRole('heading', { level: 1, name: 'Não há ofertas agora' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Trilha' }).textContent).toBe('Início›Ofertas')
    expect(
      screen.getByText(
        'Quando houver uma campanha com peças em oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas.',
        { normalizer: t => t },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver as coleções' })).toHaveAttribute('href', '/')
  })

  it('não pede peça nenhuma, e a página sai do índice', async () => {
    abrir()
    await screen.findByRole('heading', { level: 1, name: 'Não há ofertas agora' })
    expect(estado.consultas.some(c => c.tabela === 'products')).toBe(false)
    await waitFor(() => expect(document.title).toBe('Ofertas | Uma Estrelinha'))
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex')
  })
})
