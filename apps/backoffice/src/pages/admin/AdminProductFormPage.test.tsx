import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PRODUCT_POOL_KEY } from '@/entities/product'

// PFM-01 (P1.3 AC 1): "SHALL exibir 5 abas — Geral · Mídia · Preços & variações · SEO ·
// Relacionados — e a aba `Variações` SHALL não existir mais".
// PFM-11 AC 2-3: badge de pendência por aba, e o clique leva ao primeiro campo inválido.

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
}))
/**
 * O dublê **não devolve `products`** — e isso é a asserção de `BUS-26`, não economia.
 *
 * Até a feature 51 este hook carregava o catálogo inteiro na montagem, e os dois seletores desta
 * página (produtos relacionados e compre junto) liam a lista dele. Hoje quem responde "quais peças
 * existem" é `useProductPool`, e o hook ficou só com a escrita.
 *
 * **O dublê sozinho NÃO prova `BUS-26`, e afirmar que provava era o defeito.** A verificação
 * independente da feature 51 devolveu o `products` a esta página e a suíte ficou **14/14 verde**:
 * os casos daqui nunca abriam a aba *Relacionados*, então `products={undefined}` não chegava a
 * renderizar nada. Quem prendia a regressão era só o `tsc`. O caso de `BUS-26` abaixo é o que
 * fecha isso — ele abre a aba e semeia o pool com uma peça que este dublê **não** devolve, de modo
 * que ver a peça é ver o pool.
 */
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [{ id: 'cat-anime', name: 'Anime' }] }),
}))
// Feature 28: a página passou a ler a biblioteca de perguntas. O dublê de supabase deste arquivo
// não conhece `faqs` nem `faq_usage`, e sem este mock o `useAdminFaqs` real sobe 14 erros não
// tratados (`.order is not a function`) — a suíte fica verde e o processo sai 1.
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({
  useAdminFaqs: () => ({
    faqs: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    create: vi.fn(async () => null),
    update: vi.fn(async () => null),
    toggle: vi.fn(async () => null),
    remove: vi.fn(async () => null),
  }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminProductFormPage from './AdminProductFormPage'

/**
 * O palco de React Query, com o POOL semeado (feature 51).
 *
 * A aba *Relacionados* deixou de receber o catálogo por prop: os dois seletores leem o pool
 * compartilhado de `entities/product`. Sem o provedor, abrir a aba lança "No QueryClient set" no
 * RENDER, e não na asserção (`L-030`) — e com `staleTime: Infinity` nenhuma requisição sai, o que
 * importa aqui porque o dublê de supabase deste arquivo não conhece a leitura do pool.
 */
const renderPage = (pool: unknown[] = []) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, pool)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/produtos/novo']}>
        <AdminProductFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('AdminProductFormPage — as abas (PFM-01, FAQ-16)', () => {
  it('exibe exatamente 6 abas, com os rótulos da spec', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(6)
    expect(tabs.map(t => t.textContent?.replace(/\d+$/, '').trim())).toEqual([
      'Geral',
      'Perguntas',
      'Mídia',
      'Preços & variações',
      'SEO',
      'Relacionados',
    ])
  })

  // A pergunta é a continuação da descrição, que está em `Geral`. Separá-las por três abas
  // esconderia a relação que o aviso da `FAQ-27` existe para tornar visível.
  it('`Perguntas` fica logo depois de `Geral` (FAQ-16)', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())

    const rotulos = screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '').trim())
    expect(rotulos.indexOf('Perguntas')).toBe(rotulos.indexOf('Geral') + 1)
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

/**
 * `BUS-26` — a aba *Relacionados* é alimentada pelo POOL, e não pelo catálogo de `useAdminProducts`.
 *
 * A régua é a **origem do dado**, não a presença do seletor: o dublê de `useAdminProducts` no topo
 * deste arquivo não devolve `products`, então uma peça que aparece na busca só pode ter vindo do
 * pool semeado aqui. É o que faz o caso ser falso no mundo mutado — devolver `products` à página
 * entrega `undefined` aos dois seletores, e a peça some.
 */
describe('AdminProductFormPage — a aba Relacionados lê o pool (BUS-26)', () => {
  const PECA = { id: 'p-pool', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true, base_price: 190 }

  const abrirRelacionados = async () => {
    renderPage([PECA])
    await waitFor(() => expect(screen.getByRole('tab', { name: /Geral/ })).toBeInTheDocument())
    // **`mouseDown`, e nao `click`.** O `TabsTrigger` do Radix troca de aba no `onMouseDown`, e
    // `fireEvent.click` NAO dispara mousedown — a aba nao mudaria e os tres casos abaixo
    // reprovariam por "nao achei o rotulo", que se le como defeito do componente errado.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Relacionados/ }))
  }

  it('os dois seletores existem, e nenhum recebe catálogo por prop', async () => {
    await abrirRelacionados()

    await waitFor(() => expect(screen.getByLabelText('Produtos relacionados')).toBeInTheDocument())
    expect(screen.getByLabelText('Compre junto')).toBeInTheDocument()
  })

  it('a peça do POOL aparece na busca — o dublê de `useAdminProducts` não a tem', async () => {
    await abrirRelacionados()

    await waitFor(() => expect(screen.getAllByTestId(`peca-${PECA.id}`).length).toBeGreaterThan(0))
    expect(screen.getAllByTestId(`peca-${PECA.id}`)[0]).toHaveTextContent('Colar de Cinzas')
  })

  it('o próprio produto não se relaciona consigo — `excluir` na edição', async () => {
    // Em `/admin/produtos/novo` não há id, então nada é excluído: as duas buscas mostram a peça.
    await abrirRelacionados()

    await waitFor(() => expect(screen.getAllByTestId(`peca-${PECA.id}`)).toHaveLength(2))
  })
})
