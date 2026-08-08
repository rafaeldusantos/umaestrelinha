import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// PFM-01 (P1.3 AC 1): "SHALL exibir 5 abas — Geral · Mídia · Preços & variações · SEO ·
// Relacionados — e a aba `Variações` SHALL não existir mais".
// PFM-11 AC 2-3: badge de pendência por aba, e o clique leva ao primeiro campo inválido.

vi.mock('@nanapin/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
}))
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    products: [],
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [{ id: 'cat-anime', name: 'Anime' }] }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@/features/mockup-studio', () => ({
  MockupStudioDialog: () => null,
  appendImages: (prev: string[], next: string[]) => [...prev, ...next],
}))
vi.mock('@nanapin/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminProductFormPage from './AdminProductFormPage'

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/produtos/novo']}>
      <AdminProductFormPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('AdminProductFormPage — as 5 abas (PFM-01)', () => {
  it('exibe exatamente 5 abas, com os rótulos da spec', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(5)
    expect(tabs.map(t => t.textContent?.replace(/\d+$/, '').trim())).toEqual([
      'Geral',
      'Mídia',
      'Preços & variações',
      'SEO',
      'Relacionados',
    ])
  })

  it('a aba Variações NÃO existe mais', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    expect(screen.queryByRole('tab', { name: /^Variações/ })).not.toBeInTheDocument()
  })

  it('a aba Mídia existe como slot — o conteúdo atual segue lá até a feature 12', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Mídia/ })).toBeInTheDocument())

    expect(screen.getByRole('tab', { name: /Mídia/ })).toBeInTheDocument()
  })
})

describe('AdminProductFormPage — badge de pendência (PFM-11 AC 2-3)', () => {
  it('produto novo e vazio mostra badge nas abas com erro, com a contagem', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    // Nome vazio (Geral) e preço 0 sem grade (Preços) — um erro em cada.
    expect(screen.getByLabelText('1 pendência(s) em Geral')).toBeInTheDocument()
    expect(screen.getByLabelText('1 pendência(s) em Preços & variações')).toBeInTheDocument()
  })

  it('abas sem pendência não mostram badge', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    expect(screen.queryByLabelText(/pendência\(s\) em SEO/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/pendência\(s\) em Relacionados/)).not.toBeInTheDocument()
  })
})

describe('AdminProductFormPage — a aba Geral em três cards (artboard `aba Geral`)', () => {
  it('separa Identidade, Categorias e Tags — não um `Informações gerais` só', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    expect(screen.getByText('Identidade')).toBeInTheDocument()
    expect(screen.getByText('Categorias')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.queryByText('Informações gerais')).not.toBeInTheDocument()
  })

  it('cada card leva a contagem no próprio cabeçalho, uma vez só', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    // `getByTestId` falha com duplicata — e é o ponto: a contagem morava ao mesmo tempo no
    // cabeçalho da página e dentro do componente.
    expect(screen.getByTestId('name-counter').textContent).toBe('0 / 70')
    expect(screen.getByTestId('category-counter').textContent).toBe('0 selecionadas')
    expect(screen.getByTestId('tag-counter').textContent).toBe('0 de 15')
  })
})

describe('AdminProductFormPage — a ordem do inspetor (artboard `Aside`)', () => {
  it('vai de Publicação a Prévia na loja, com o checklist antes do Resumo', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Pronto para publicar')).toBeInTheDocument())

    const titles = ['Publicação', 'Pronto para publicar', 'Resumo', 'Prévia na loja']
    const positions = titles.map(title => {
      const node = screen.getByText(title)
      // `compareDocumentPosition` responde a pergunta certa — quem vem antes no documento — sem
      // depender de índice de `querySelectorAll` nem de classe de layout.
      return { title, node }
    })
    for (let i = 0; i < positions.length - 1; i += 1) {
      const relation = positions[i].node.compareDocumentPosition(positions[i + 1].node)
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })
})

describe('AdminProductFormPage — o estoque do Resumo', () => {
  it('produto novo sem grade mostra o saldo do produto, não `Não controla`', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Resumo')).toBeInTheDocument())

    expect(screen.getByTestId('summary-stock').textContent).toBe('0 un.')
    expect(screen.getByText('Estoque')).toBeInTheDocument()
    expect(screen.queryByText('Estoque somado')).not.toBeInTheDocument()
  })

  it('marcar `Não controlar` troca o número por `Não controla`', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Preços/ })).toBeInTheDocument())

    // `mouseDown`, não `click`: é nele que o `TabsTrigger` do Radix troca de aba.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Preços/ }))
    fireEvent.click(await screen.findByRole('radio', { name: /Não controlar/ }))

    expect(screen.getByTestId('summary-stock').textContent).toBe('Não controla')
  })
})

describe('AdminProductFormPage — cabeçalho e checklist', () => {
  it('monta o cabeçalho com as três ações no lugar do Salvar único', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar e publicar/ })).toBeInTheDocument()
  })

  it('produto novo e vazio não pode ser publicado — o checklist bloqueia (P1.7 AC 13)', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /Salvar e publicar/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeEnabled()
  })

  it('o checklist aparece no inspetor com os itens pendentes acionáveis', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Pronto para publicar')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: /Nome do produto/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ao menos uma imagem/ })).toBeInTheDocument()
  })
})
