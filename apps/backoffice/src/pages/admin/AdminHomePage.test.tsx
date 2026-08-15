// `/admin/home` — a tela (feature 24).
//
// As ACs provadas aqui são as duas da T25 mais as três que a tela junta: falha de LEITURA é
// superfície explícita com "Tentar de novo" e nunca lista vazia (`HOME-14`); em 390px a tela
// ALTERNA `Seções | Prévia` em vez de espremer as duas colunas (`HOME-15`); e ligar, reordenar e
// acrescentar chegam ao hook com o payload certo (`HOME-08`, `HOME-10`, `HOME-11`).
//
// O dublê do hook é o que permite provar **o que foi para o banco** sem subir Supabase.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_HOME_COMPOSITION } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    active: true,
    sort_order: 0,
    parent_id: null,
    product_count: 0,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as AdminCategory

const CATALOGO = [
  cat({ id: 'leite', name: 'Joias com leite materno', sort_order: 1, banner_url: 'leite.webp' }),
  cat({ id: 'cinzas', name: 'Eternize as cinzas', sort_order: 2, banner_url: 'cinzas.webp' }),
  cat({ id: 'cabelo', name: 'Mecha de cabelo', sort_order: 3 }),
  cat({ id: 'pet', name: 'Pelo de pet', sort_order: 4 }),
]

const hook = vi.hoisted(() => ({
  fetchSections: vi.fn(),
  createSection: vi.fn().mockResolvedValue({ error: null, id: 'nova' }),
  updateSectionConfig: vi.fn().mockResolvedValue(null),
  setSectionActive: vi.fn().mockResolvedValue(null),
  deleteSection: vi.fn().mockResolvedValue(null),
  reorderSectionsTo: vi.fn().mockResolvedValue(null),
  curateSection: vi.fn().mockResolvedValue(null),
}))

const state = vi.hoisted(() => ({
  sections: [] as unknown[],
  loading: false,
  error: null as string | null,
}))

const toastMock = vi.hoisted(() => vi.fn())

vi.mock('@/entities/home', () => ({
  useAdminHomeSections: () => ({
    sections: state.sections,
    loading: state.loading,
    error: state.error,
    ...hook,
  }),
}))

vi.mock('@/entities/category', () => ({
  useAdminCategories: () => ({ categories: CATALOGO, loading: false, error: null }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))

import AdminHomePage from './AdminHomePage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminHomePage />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.sections = DEFAULT_HOME_COMPOSITION.map(s => ({ ...s }))
  state.loading = false
  state.error = null
})

describe('AdminHomePage — a tela junta lista, bandeja e prévia', () => {
  it('mostra as duas colunas, cada uma com o próprio conteúdo', () => {
    renderPage()
    expect(within(screen.getByTestId('coluna-secoes')).getByText('Seções da Home')).toBeInTheDocument()
    expect(within(screen.getByTestId('coluna-previa')).getByText('Prévia da Home')).toBeInTheDocument()
  })

  it('a bandeja fica DENTRO do cartão da lista, não num modal', () => {
    renderPage()
    const coluna = screen.getByTestId('coluna-secoes')
    expect(within(coluna).getByText('Blocos que você pode acrescentar')).toBeInTheDocument()
    expect(within(coluna).getByTestId('bloco-collection_feature')).toBeInTheDocument()
  })
})

describe('AdminHomePage — falha de leitura é superfície explícita (HOME-14)', () => {
  it('mostra o erro e o botão "Tentar de novo" — nunca uma lista vazia sem explicação', () => {
    state.error = 'permission denied for table home_sections'
    state.sections = []
    renderPage()

    const surface = screen.getByTestId('home-erro')
    expect(surface).toHaveTextContent('Não foi possível carregar as seções da Home')
    expect(surface).toHaveTextContent('permission denied for table home_sections')
    expect(within(surface).getByRole('button', { name: /Tentar de novo/ })).toBeInTheDocument()
  })

  it('"Tentar de novo" refaz a leitura', () => {
    state.error = 'network'
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    expect(hook.fetchSections).toHaveBeenCalled()
  })

  it('sem erro, nenhuma superfície de erro aparece', () => {
    renderPage()
    expect(screen.queryByTestId('home-erro')).toBeNull()
  })
})

describe('AdminHomePage — 390px alterna Seções | Prévia (HOME-15)', () => {
  it('as abas existem só abaixo de `lg` — no desktop as duas colunas cabem', () => {
    renderPage()
    expect(screen.getByTestId('abas-mobile').className).toContain('lg:hidden')
  })

  it('começa em Seções: a prévia fica escondida no celular e visível no desktop', () => {
    renderPage()
    expect(screen.getByTestId('coluna-secoes').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-previa').className).toContain('hidden lg:block')
  })

  it('trocar para Prévia esconde a lista — as duas NÃO ficam lado a lado no celular', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Prévia' }))
    expect(screen.getByTestId('coluna-previa').className).not.toContain('hidden')
    expect(screen.getByTestId('coluna-secoes').className).toContain('hidden lg:block')
  })

  it('cada aba tem 44px de alvo e diz qual está ativa', () => {
    renderPage()
    const secoes = screen.getByRole('button', { name: 'Seções' })
    expect(secoes.className).toContain('min-h-11')
    expect(secoes).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Prévia' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('AdminHomePage — o que chega ao banco', () => {
  it('ligar/desligar manda id e estado', async () => {
    renderPage()
    fireEvent.click(within(screen.getByTestId('secao-newsletter')).getByRole('switch'))
    await waitFor(() => expect(hook.setSectionActive).toHaveBeenCalledWith('newsletter', false))
  })

  it('acrescentar um bloco chama o hook com o tipo escolhido', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('bloco-collection_feature'))
    await waitFor(() => expect(hook.createSection).toHaveBeenCalledWith('collection_feature'))
  })

  it('arrastar grava posições absolutas só das linhas que mudaram', async () => {
    renderPage()
    fireEvent.drop(screen.getByTestId('secao-hero'), {
      dataTransfer: { getData: () => 'newsletter', setData: vi.fn() },
    })
    await waitFor(() => expect(hook.reorderSectionsTo).toHaveBeenCalled())
    const [moves] = hook.reorderSectionsTo.mock.calls[0] as [{ id: string; position: number }[]]
    expect(moves[0]).toEqual({ id: 'newsletter', position: 1 })
    expect(moves.every(m => typeof m.position === 'number')).toBe(true)
  })

  it('falha de gravação vira toast com a mensagem do banco, e a tela não é remontada', async () => {
    hook.setSectionActive.mockResolvedValueOnce({ message: 'permission denied' })
    renderPage()
    fireEvent.click(within(screen.getByTestId('secao-newsletter')).getByRole('switch'))
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'permission denied', variant: 'destructive' }),
      ),
    )
    // O que a dona já via continua lá — a tela não some por causa de uma gravação recusada.
    expect(screen.getByTestId('secao-newsletter')).toBeInTheDocument()
  })
})

describe('AdminHomePage — a prévia acompanha a seleção', () => {
  it('clicar numa linha contorna o bloco correspondente na prévia', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))
    expect(screen.getByTestId('previa-trending_tags').closest('.ring-2')).not.toBeNull()
  })
})

describe('AdminHomePage — enquanto carrega', () => {
  it('mostra o esqueleto, não uma lista vazia', () => {
    state.loading = true
    renderPage()
    expect(screen.queryByTestId('coluna-secoes')).toBeNull()
  })
})
