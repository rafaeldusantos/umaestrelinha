// A campanha de desconto na lista de produtos, pela página real: o filtro (no endereço, no chip e
// na consulta), o percentual na linha, e a edição em massa que põe e tira as peças da campanha pela
// porta única das marcações.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { AdminListRow } from '@/entities/product/api/productQuery'
import type { AdminCampaign } from '@/entities/campaign'

const { listMock, toastMock, refetchMock, campaignsRefetchMock, setCampaignMock, campanhas } = vi.hoisted(() => ({
  listMock: vi.fn(),
  toastMock: vi.fn(),
  refetchMock: vi.fn(),
  campaignsRefetchMock: vi.fn(),
  setCampaignMock: vi.fn(),
  campanhas: { atual: [] as AdminCampaign[] },
}))

vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProductList: listMock,
  useProductViewCounts: () => ({}),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [] }),
}))
vi.mock('@/entities/supplier', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/supplier')>()),
  useSuppliers: () => ({ suppliers: [], loading: false, error: null }),
}))
// A leitura das campanhas é React Query, e a escrita é a porta da entidade: as duas dubladas aqui, o
// resto da entidade (a régua de quais campanhas estão abertas) é o de verdade.
vi.mock('@/entities/campaign', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/campaign')>()),
  useCampaigns: () => ({ campaigns: campanhas.atual, loading: false, error: null, refetch: campaignsRefetchMock }),
  setProductsCampaign: setCampaignMock,
}))
vi.mock('@/shared/lib/storeOrigin', () => ({ storeOrigin: () => null }))
vi.mock('@/features/csv-import/ui/CsvImportDialog', () => ({ default: () => null }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: vi.fn() } }))

import AdminProductsPage from './AdminProductsPage'

const DIA = 24 * 60 * 60 * 1000
const iso = (deslocamento: number) => new Date(Date.now() + deslocamento).toISOString()

const campanha = (over: Partial<AdminCampaign>): AdminCampaign => ({
  id: 'x', name: 'X', badge_text: 'X', band_color: '#000000', accent_color: '#FFFFFF',
  starts_at: iso(-DIA), ends_at: iso(10 * DIA), active: true,
  created_at: iso(-30 * DIA), updated_at: iso(-30 * DIA),
  percents: [], usage: {}, productCount: 0,
  ...over,
})

const BF = campanha({ id: 'bf', name: 'Black Friday', percents: [10, 15, 20] })
const NATAL = campanha({ id: 'natal', name: 'Natal', starts_at: iso(20 * DIA), ends_at: iso(40 * DIA), percents: [5, 30] })
const MAES = campanha({ id: 'maes', name: 'Dia das Mães', starts_at: iso(-200 * DIA), ends_at: iso(-190 * DIA), percents: [25] })

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  price: 189,
  compare_price: null,
  images: [],
  tags: [],
  is_active: true,
  stock_total: 3,
  low_stock_threshold: 1,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: [],
  seo_title: 'SEO',
  seo_description: 'SEO',
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
  ...over,
})

const DUAS = [row(), row({ id: 'p2', name: 'Anel Lua', slug: 'anel-lua' })]

const abrir = (url: string, rows: AdminListRow[] = DUAS) => {
  listMock.mockReturnValue({
    rows, total: rows.length, loading: false, error: null, refetch: refetchMock,
    fetchAllFiltered: vi.fn().mockResolvedValue([]), createProductsBatch: vi.fn(),
    updateProductsBatch: vi.fn().mockResolvedValue({ changed: 0, failed: [] }),
    deleteProductsBatch: vi.fn(), applyCategoryWrites: vi.fn(),
  })
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/produtos" element={<AdminProductsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const ultimaConsulta = () => listMock.mock.calls[listMock.mock.calls.length - 1][0]
const barra = () => within(screen.getByRole('toolbar', { name: 'Ações em massa' }))

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  campanhas.atual = [NATAL, MAES, BF]
  listMock.mockReset()
  toastMock.mockReset()
  refetchMock.mockReset().mockResolvedValue(undefined)
  campaignsRefetchMock.mockReset().mockResolvedValue(undefined)
  setCampaignMock.mockReset().mockResolvedValue(2)
})

describe('a lista de produtos filtrada pela campanha', () => {
  it('o endereço do "Ver as peças" com percentual abre a lista já recortada, com o chip', () => {
    abrir('/admin/produtos?campanha=bf&percentual=15')

    expect(ultimaConsulta().filters).toMatchObject({ campaignId: 'bf', campaignPercent: 15 })
    expect(screen.getByRole('button', { name: 'Remover filtro Campanha: Black Friday · 15%' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Campanha' })).toHaveTextContent('Black Friday')
    expect(screen.getByRole('combobox', { name: 'Percentual da campanha' })).toHaveTextContent('15%')
  })

  it('o "Ver as peças" de uma campanha encerrada abre com o nome dela, no chip e no filtro', () => {
    abrir('/admin/produtos?campanha=maes')

    expect(ultimaConsulta().filters).toMatchObject({ campaignId: 'maes', campaignPercent: null })
    expect(screen.getByRole('button', { name: 'Remover filtro Campanha: Dia das Mães' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Campanha' })).toHaveTextContent('Dia das Mães')
  })

  it('o filtro começa pela campanha: as agendadas e a em vigência, na ordem do início; depois o percentual', async () => {
    abrir('/admin/produtos')

    expect(screen.queryByRole('combobox', { name: 'Percentual da campanha' })).toBeNull()
    fireEvent.click(screen.getByRole('combobox', { name: 'Campanha' }))
    const opcoes = (await screen.findAllByRole('option')).map(o => o.textContent)
    expect(opcoes).toEqual(['Todas as peças', 'Black Friday', 'Natal'])

    fireEvent.click(screen.getByRole('option', { name: 'Black Friday' }))
    await waitFor(() => expect(ultimaConsulta().filters).toMatchObject({ campaignId: 'bf', campaignPercent: null }))

    fireEvent.click(screen.getByRole('combobox', { name: 'Percentual da campanha' }))
    expect((await screen.findAllByRole('option')).map(o => o.textContent)).toEqual([
      'Todos os percentuais', '10%', '15%', '20%',
    ])
    fireEvent.click(screen.getByRole('option', { name: '20%' }))
    await waitFor(() => expect(ultimaConsulta().filters).toMatchObject({ campaignId: 'bf', campaignPercent: 20 }))
    expect(ultimaConsulta().page).toBe(1)
  })

  it('o `x` do chip tira a campanha e o percentual', async () => {
    abrir('/admin/produtos?campanha=bf&percentual=15')

    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Campanha: Black Friday · 15%' }))

    await waitFor(() => expect(ultimaConsulta().filters).toMatchObject({ campaignId: null, campaignPercent: null }))
  })
})

describe('o percentual na linha', () => {
  it('a peça marcada mostra o nome da campanha e o percentual; a sem marcação, nada', () => {
    abrir('/admin/produtos', [
      row({ campaigns: [{ campaign_id: 'bf', percent: 15 }] }),
      row({ id: 'p2', name: 'Anel Lua', slug: 'anel-lua', campaigns: [] }),
    ])

    const linha = (nome: string) => screen.getByRole('link', { name: nome }).closest('tr') as HTMLElement
    expect(within(linha('Pingente Estrela')).getByText('Black Friday · 15%')).toBeInTheDocument()
    expect(within(linha('Anel Lua')).queryByText(/Black Friday/)).toBeNull()
  })
})

describe('a edição em massa põe e tira as peças da campanha', () => {
  const abrirPainel = async () => {
    abrir('/admin/produtos')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))
    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar campanha'))
  }
  const escolher = async (nome: string, opcao: string) => {
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('combobox', { name: nome }))
    fireEvent.click(await screen.findByRole('option', { name: opcao }))
  }

  it('primeiro a campanha, depois o percentual — os percentuais oferecidos são os da campanha', async () => {
    await abrirPainel()
    const dialogo = screen.getByRole('dialog')

    expect(within(dialogo).getByRole('combobox', { name: 'Percentual na campanha' })).toBeDisabled()
    fireEvent.click(within(dialogo).getByRole('combobox', { name: 'Campanha das peças' }))
    expect((await screen.findAllByRole('option')).map(o => o.textContent)).toEqual(['Black Friday', 'Natal'])
    fireEvent.click(screen.getByRole('option', { name: 'Natal' }))

    fireEvent.click(within(dialogo).getByRole('combobox', { name: 'Percentual na campanha' }))
    expect((await screen.findAllByRole('option')).map(o => o.textContent)).toEqual(['Natal: 5%', 'Natal: 30%', 'Tirar da Natal'])
  })

  it('escolher a campanha e 20% grava pela porta, com os ids selecionados', async () => {
    await abrirPainel()
    await escolher('Campanha das peças', 'Black Friday')
    await escolher('Percentual na campanha', 'Black Friday: 20%')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 2 produto/ }))
    })

    expect(setCampaignMock).toHaveBeenCalledTimes(1)
    expect(setCampaignMock).toHaveBeenCalledWith(['p1', 'p2'], 'bf', 20)
    expect(refetchMock).toHaveBeenCalled()
    expect(campaignsRefetchMock).toHaveBeenCalled()
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '2 peça(s) na Black Friday com 20%' }))
  })

  it('"Tirar da Black Friday" grava pela porta com o percentual nulo', async () => {
    await abrirPainel()
    await escolher('Campanha das peças', 'Black Friday')
    await escolher('Percentual na campanha', 'Tirar da Black Friday')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 2 produto/ }))
    })

    expect(setCampaignMock).toHaveBeenCalledWith(['p1', 'p2'], 'bf', null)
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: '2 peça(s) tiradas da Black Friday' }))
  })

  it('sem o percentual escolhido, não há o que aplicar', async () => {
    await abrirPainel()
    await escolher('Campanha das peças', 'Black Friday')

    expect(screen.getByRole('button', { name: /Aplicar a/ })).toBeDisabled()
  })

  it('a recusa da porta vira aviso, e nada é dado como gravado', async () => {
    setCampaignMock.mockRejectedValue(new Error('20% não é um percentual desta campanha.'))
    await abrirPainel()
    await escolher('Campanha das peças', 'Black Friday')
    await escolher('Percentual na campanha', 'Black Friday: 20%')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 2 produto/ }))
    })

    expect(toastMock).toHaveBeenCalledTimes(1)
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: '20% não é um percentual desta campanha.', variant: 'destructive' }),
    )
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: '2 peça(s) na Black Friday com 20%' }))
    expect(refetchMock).not.toHaveBeenCalled()
    expect(campaignsRefetchMock).not.toHaveBeenCalled()
  })
})

describe('o "Desfazer" do lote de campanha devolve as marcações de antes', () => {
  const QUATRO_A_15 = ['p1', 'p2', 'p3', 'p4'].map(id =>
    row({ id, name: `Peça ${id}`, slug: `peca-${id}`, campaigns: [{ campaign_id: 'bf', percent: 15 }] }),
  )

  const aplicar = async (rows: AdminListRow[], opcao: string) => {
    setCampaignMock.mockResolvedValue(rows.length)
    abrir('/admin/produtos', rows)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))
    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar campanha'))
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('combobox', { name: 'Campanha das peças' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Black Friday' }))
    fireEvent.click(within(dialogo).getByRole('combobox', { name: 'Percentual na campanha' }))
    fireEvent.click(await screen.findByRole('option', { name: opcao }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Aplicar a ${rows.length} produto`) }))
    })
  }

  /** O aviso do lote (o que tem `Desfazer`) e o toque nele. */
  const desfazer = async () => {
    const aviso = toastMock.mock.calls.map(c => c[0]).find(p => p.action)
    expect(aviso?.action.props.altText).toBe('Desfazer')
    setCampaignMock.mockClear()
    refetchMock.mockClear()
    campaignsRefetchMock.mockClear()
    await act(async () => {
      await aviso.action.props.onClick()
    })
  }

  it('quatro peças a 15% levadas a 10%: o aviso tem "Desfazer", e ele as devolve a 15%', async () => {
    await aplicar(QUATRO_A_15, 'Black Friday: 10%')

    expect(setCampaignMock).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'], 'bf', 10)
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '4 peça(s) na Black Friday com 10%' }),
    )

    await desfazer()

    expect(setCampaignMock.mock.calls).toEqual([[['p1', 'p2', 'p3', 'p4'], 'bf', 15]])
    expect(refetchMock).toHaveBeenCalled()
    expect(campaignsRefetchMock).toHaveBeenCalled()
  })

  it('peças com percentuais diferentes e uma fora da campanha: cada uma volta ao que tinha', async () => {
    await aplicar(
      [
        row({ id: 'p1', name: 'Peça 1', slug: 'peca-1', campaigns: [{ campaign_id: 'bf', percent: 15 }] }),
        row({ id: 'p2', name: 'Peça 2', slug: 'peca-2', campaigns: [{ campaign_id: 'bf', percent: 20 }] }),
        // Marcada em OUTRA campanha: na Black Friday ela não estava, e volta a não estar.
        row({ id: 'p3', name: 'Peça 3', slug: 'peca-3', campaigns: [{ campaign_id: 'natal', percent: 30 }] }),
        row({ id: 'p4', name: 'Peça 4', slug: 'peca-4', campaigns: [] }),
      ],
      'Black Friday: 10%',
    )

    await desfazer()

    expect(setCampaignMock.mock.calls).toEqual([
      [['p1'], 'bf', 15],
      [['p2'], 'bf', 20],
      [['p3', 'p4'], 'bf', null],
    ])
  })

  it('"Tirar da Black Friday" em lote e "Desfazer": as peças voltam com o percentual que tinham', async () => {
    await aplicar(
      [
        row({ id: 'p1', name: 'Peça 1', slug: 'peca-1', campaigns: [{ campaign_id: 'bf', percent: 15 }] }),
        row({ id: 'p2', name: 'Peça 2', slug: 'peca-2', campaigns: [{ campaign_id: 'bf', percent: 20 }] }),
        row({ id: 'p3', name: 'Peça 3', slug: 'peca-3', campaigns: [] }),
      ],
      'Tirar da Black Friday',
    )
    expect(setCampaignMock).toHaveBeenCalledWith(['p1', 'p2', 'p3'], 'bf', null)

    await desfazer()

    expect(setCampaignMock.mock.calls).toEqual([
      [['p1'], 'bf', 15],
      [['p2'], 'bf', 20],
    ])
  })
})
