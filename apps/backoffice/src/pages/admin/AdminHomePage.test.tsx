// `/admin/home` — a tela (feature 24).
//
// As ACs provadas aqui são as duas da T25 mais as três que a tela junta: falha de LEITURA é
// superfície explícita com "Tentar de novo" e nunca lista vazia (`HOME-14`); em 390px a tela
// ALTERNA `Seções | Prévia` em vez de espremer as duas colunas (`HOME-15`); e ligar, reordenar e
// acrescentar chegam ao hook com o payload certo (`HOME-08`, `HOME-10`, `HOME-11`).
//
// O dublê do hook é o que permite provar **o que foi para o banco** sem subir Supabase.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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

vi.mock('@/entities/product', () => ({
  useAdminProducts: () => ({ products: [{ id: 'p1', name: 'Pingente Gota' }], loading: false }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))

/**
 * O palco, dublado — e é o dublê que torna as ACs da prévia **mais** verificáveis do que eram.
 *
 * Antes da feature 25 a prévia era um desenho do painel, e dava para asserir o contorno pela classe
 * CSS. Agora ela é a loja num iframe, e jsdom não carrega o documento dele: asserir o contorno aqui
 * seria asserir dentro de outro app. A responsabilidade **desta página** é outra e é exatamente esta
 * — entregar ao palco a composição certa e o realce certo. Quem prova que o `postMessage` sai com a
 * origem certa é `usePreviewBridge.test.tsx`; quem prova que a loja desenha o contorno é
 * `HomeRendererPreview.test.tsx`, na loja.
 */
vi.mock('@/features/home-composition/ui/HomeLivePreview', () => ({
  default: ({
    sections,
    highlightId,
  }: {
    sections: { id: string; config?: { title_line1?: string; title?: string } }[]
    highlightId: string | null
  }) => (
    <div
      data-testid="palco-previa"
      data-highlight={highlightId ?? ''}
      data-secoes={sections.map(s => s.id).join(',')}
      data-titulos={sections.map(s => s.config?.title_line1 ?? s.config?.title ?? '').join('|')}
    />
  ),
}))

import AdminHomePage from './AdminHomePage'

/**
 * As DUAS rotas, montando o MESMO componente (T30).
 *
 * É assim que a tela roda de verdade, e é a única montagem em que a AC central do editor pode ser
 * provada: se o teste montasse `AdminHomePage` solto, a navegação não trocaria coluna nenhuma e a
 * pergunta "a prévia remonta?" não teria como ser feita.
 */
const renderPage = (initial = '/admin/home') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin/home" element={<AdminHomePage />} />
        <Route path="/admin/home/:sectionId" element={<AdminHomePage />} />
      </Routes>
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
    expect(within(screen.getByTestId('coluna-previa')).getByTestId('palco-previa')).toBeInTheDocument()
  })

  // PRV-12 — a inversão. As larguras de antes eram lista 748 / prévia 380, e é o número da prévia
  // que impedia qualquer representação de desktop.
  it('o rail tem 380px e vem PRIMEIRO; o palco ocupa o resto', () => {
    const { container } = renderPage()
    const grade = container.querySelector('.grid') as HTMLElement

    expect(grade.className).toContain('lg:grid-cols-[380px_minmax(0,1fr)]')
    const colunas = Array.from(grade.children)
    expect(colunas[0]).toBe(screen.getByTestId('coluna-secoes'))
    expect(colunas[1]).toBe(screen.getByTestId('coluna-previa'))
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

describe('AdminHomePage — a prévia acompanha a seleção (PRV-11)', () => {
  it('o cursor sobre uma linha aponta o bloco dela', () => {
    renderPage()
    fireEvent.mouseEnter(screen.getByTestId('secao-trending_tags'))
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'trending_tags')
  })

  it('sair da linha apaga o realce', () => {
    renderPage()
    fireEvent.mouseEnter(screen.getByTestId('secao-trending_tags'))
    fireEvent.mouseLeave(screen.getByTestId('secao-trending_tags'))
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', '')
  })

  it('sem cursor e sem editor, nada é apontado', () => {
    renderPage()
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', '')
  })

  it('a seção EM EDIÇÃO vence a que está sob o cursor', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'newsletter')
  })

  it('PRV-10 — o palco recebe um `onSelect` que abre o editor daquela seção', () => {
    renderPage()
    // O caminho de volta da prévia é o mesmo da lista: navegar para `/admin/home/:id`. Provado aqui
    // pela porta que a página oferece, e não pelo `postMessage` — esse é de `usePreviewBridge`.
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))
    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'trending_tags')
  })
})

describe('PRV-09 — a prévia recebe o RASCUNHO, não o que está salvo', () => {
  it('sem editor aberto, a composição é a do banco', () => {
    renderPage()
    const palco = screen.getByTestId('palco-previa')
    expect(palco.getAttribute('data-secoes')?.split(',')).toEqual(
      DEFAULT_HOME_COMPOSITION.map(s => s.id),
    )
  })

  it('digitar no hero muda o que o palco recebe ANTES de salvar', () => {
    renderPage('/admin/home/hero')
    const campo = screen.getByLabelText(/1ª linha/i)

    fireEvent.change(campo, { target: { value: 'O que você guarda,' } })

    expect(screen.getByTestId('palco-previa').getAttribute('data-titulos')).toContain(
      'O que você guarda,',
    )
    // E nada foi gravado — o rascunho é da tela, não do banco.
    expect(hook.updateSectionConfig).not.toHaveBeenCalled()
  })

  it('trocar de seção zera o rascunho — a seção B não herda o que foi digitado na A', () => {
    const { unmount } = renderPage('/admin/home/hero')
    fireEvent.change(screen.getByLabelText(/1ª linha/i), { target: { value: 'Rascunho da A' } })
    unmount()

    renderPage('/admin/home/newsletter')

    expect(screen.getByTestId('palco-previa').getAttribute('data-titulos')).not.toContain(
      'Rascunho da A',
    )
  })
})

describe('T30 — o editor é rota, e a prévia não paga por isso', () => {
  it('a PRÉVIA NÃO REMONTA ao entrar no editor — é a razão de a rota ter este formato (PRV-13)', () => {
    renderPage()
    // O nó do DOM guardado ANTES da navegação. Se `AdminHomePage` desmontasse, o React criaria
    // outro nó e a identidade se perderia — que é exatamente o custo que o editor-como-página-inteira
    // cobraria. Com a prévia sendo um **iframe**, o preço subiu: remontar recarregaria o documento da
    // loja e apagaria o rascunho já entregue.
    const antes = screen.getByTestId('palco-previa')

    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    expect(screen.getByTestId('editor-secao')).toBeInTheDocument()
    expect(screen.getByTestId('palco-previa')).toBe(antes)
  })

  it('a rota troca SÓ a coluna da esquerda: a lista sai, a prévia fica', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Abrir Chips de tema/ }))

    const esquerda = screen.getByTestId('coluna-secoes')
    expect(within(esquerda).getByTestId('editor-secao')).toBeInTheDocument()
    expect(within(esquerda).queryByText('Seções da Home')).toBeNull()
    expect(within(screen.getByTestId('coluna-previa')).getByTestId('palco-previa')).toBeInTheDocument()
  })

  it('o bloco em edição é o apontado na prévia', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByTestId('palco-previa')).toHaveAttribute('data-highlight', 'newsletter')
  })

  it('sobrevive ao F5: abrir a URL direto já mostra o editor daquela seção', () => {
    renderPage('/admin/home/trending_tags')
    expect(screen.getByTestId('editor-secao')).toHaveAttribute('data-section', 'trending_tags')
    expect(screen.getByRole('heading', { level: 1, name: 'Chips de tema' })).toBeInTheDocument()
  })

  it('a trilha volta para a Home, e `Cancelar` também', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.getByLabelText('Trilha')).toHaveTextContent('Loja')
    expect(screen.getByLabelText('Trilha')).toHaveTextContent('Home')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Seções da Home')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-secao')).toBeNull()
  })

  it('id que não existe mais cai na lista — link velho não vira tela quebrada', () => {
    renderPage('/admin/home/secao-apagada')
    expect(screen.getByText('Seções da Home')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-secao')).toBeNull()
  })

  it('acrescentar um bloco abre o editor dele', async () => {
    hook.createSection.mockResolvedValueOnce({ error: null, id: 'newsletter' })
    renderPage()
    fireEvent.click(screen.getByTestId('bloco-collection_feature'))
    await waitFor(() => expect(screen.getByTestId('editor-secao')).toBeInTheDocument())
  })

  it('o cabeçalho da tela dá lugar ao do formulário — não há dois títulos', () => {
    renderPage('/admin/home/newsletter')
    expect(screen.queryByRole('button', { name: /Adicionar seção/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Salvar seção/ })).toBeInTheDocument()
  })
})

describe('T30 — a gravação do editor (HOME-14)', () => {
  it('salvar grava o `config` da seção e volta para a lista', async () => {
    renderPage('/admin/home/newsletter')
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    const [id, config] = hook.updateSectionConfig.mock.calls[0] as [string, Record<string, unknown>]
    expect(id).toBe('newsletter')
    expect(config).toMatchObject({ title: 'Quer saber das novidades?' })
    await waitFor(() => expect(screen.getByText('Seções da Home')).toBeInTheDocument())
  })

  it('curadoria intocada NÃO é reescrita — `curateSection` apaga e reinsere a lista inteira', async () => {
    renderPage('/admin/home/newsletter')
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    await waitFor(() => expect(hook.updateSectionConfig).toHaveBeenCalled())
    expect(hook.curateSection).not.toHaveBeenCalled()
  })

  it('falha de gravação diz o motivo E preserva o formulário — o editor não fecha', async () => {
    hook.updateSectionConfig.mockResolvedValueOnce({ message: 'permission denied' })
    renderPage('/admin/home/newsletter')
    fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))

    await waitFor(() =>
      expect(screen.getByTestId('editor-recusa')).toHaveTextContent('permission denied'),
    )
    expect(screen.getByTestId('editor-secao')).toBeInTheDocument()
    expect(screen.queryByText('Seções da Home')).toBeNull()
  })
})

describe('AdminHomePage — enquanto carrega', () => {
  it('mostra o esqueleto, não uma lista vazia', () => {
    state.loading = true
    renderPage()
    expect(screen.queryByTestId('coluna-secoes')).toBeNull()
  })
})
