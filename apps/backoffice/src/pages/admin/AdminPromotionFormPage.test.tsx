// Feature 18 / T5-T7 — a promoção em tela própria (DSC-01, DSC-03, DSC-04).
//
// Esta suíte MIGROU de `features/promotion-form/ui/PromotionFormDialog.test.tsx`, asserção por
// asserção: as ACs de PRM-02 a PRM-08 (escopo, faixas, prévia, chaves, vigência, save por uma RPC)
// continuam sendo o que se prova, porque a feature 18 trocou a moldura e não a regra. O que mudou nas
// asserções foi só o desfecho — "fecha o dialog" virou "navega para a listagem" — e a vigência, que
// agora é calendário e não `<input type="date">`.
//
// A navegação é provada por uma rota-sentinela dentro de um `MemoryRouter` de verdade, não por um
// dublê de `useNavigate`: assim o teste falha se a rota de destino estiver errada.
//
// `useEligiblePreview` roda de VERDADE (o dublê é do client do Supabase): é a única forma de a
// contagem provar o roll-up por `parent_id`, que é justamente onde ela erraria — no banco real os
// universos são filhas de `Bottons`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbCategory } from '@nanapin/supabase/types'
import type { AdminPromotion } from '@nanapin/core/hooks/usePromotions'

const db = vi.hoisted(() => ({
  /** `product_categories`: quem está em qual categoria. */
  links: [] as { category_id: string; product_id: string }[],
  products: [] as { id: string; base_price: number; is_active: boolean }[],
  /** Os `category_id` que a leitura pediu — a prova do roll-up. */
  askedCategoryIds: [] as string[],
}))

vi.mock('@nanapin/supabase/client', () => {
  const build = (table: string) => {
    const filters: Record<string, unknown> = {}
    const builder = {
      in: (column: string, values: unknown[]) => {
        filters[column] = values
        if (table === 'product_categories' && column === 'category_id') {
          db.askedCategoryIds = values as string[]
        }
        return builder
      },
      eq: (column: string, value: unknown) => {
        filters[column] = value
        return builder
      },
      then: (resolve: (r: { data: unknown; error: null }) => unknown) => {
        if (table === 'product_categories') {
          const wanted = (filters.category_id as string[]) ?? []
          return resolve({
            data: db.links
              .filter(link => wanted.includes(link.category_id))
              .map(link => ({ product_id: link.product_id })),
            error: null,
          })
        }
        const ids = filters.id as string[] | undefined
        return resolve({
          data: db.products
            .filter(p => p.is_active && (!ids || ids.includes(p.id)))
            .map(p => ({ base_price: p.base_price })),
          error: null,
        })
      },
    }
    return builder
  }
  return { supabase: { from: (table: string) => ({ select: () => build(table) }) } }
})

const state = vi.hoisted(() => ({
  promotions: [] as unknown[],
  isLoading: false,
}))

const mutations = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue('promo-new'),
  update: vi.fn().mockResolvedValue('promo-1'),
}))

vi.mock('@nanapin/core/hooks/usePromotions', () => ({
  useAdminPromotions: () => ({ data: state.promotions, isLoading: state.isLoading }),
  useCreatePromotion: () => ({ mutateAsync: mutations.create, isPending: false }),
  useUpdatePromotion: () => ({ mutateAsync: mutations.update, isPending: false }),
}))

vi.mock('@nanapin/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminPromotionFormPage from './AdminPromotionFormPage'
import { toast } from '@nanapin/ui/hooks/use-toast'
import { isoFromDateOnly } from '@/shared/lib/dateOnly'
import {
  MIN_QTY_TOO_LOW,
  PERCENT_OUT_OF_RANGE,
  SCOPE_WITHOUT_CATEGORY,
  UNIT_PRICE_NOT_POSITIVE,
  duplicateMinQty,
} from '@/features/promotion-form'

const cat = (id: string, name: string, parent_id: string | null = null): DbCategory =>
  ({ id, name, slug: id, parent_id, active: true, sort_order: 0 }) as DbCategory

/** A árvore que o banco tem de verdade: os universos são FILHAS de `Bottons`. */
const CATEGORIES = [
  cat('bottons', 'Bottons'),
  cat('anime', 'Anime', 'bottons'),
  cat('kpop', 'K-Pop', 'bottons'),
  cat('chaveiros', 'Chaveiros'),
]

vi.mock('@/entities/category', async importOriginal => {
  const real = await importOriginal<typeof import('@/entities/category')>()
  return { ...real, useAdminCategories: () => ({ categories: CATEGORIES, loading: false }) }
})

const editingPromotion = (over: Partial<AdminPromotion> = {}): AdminPromotion =>
  ({
    id: 'promo-1',
    name: 'Kit de bottons',
    type: 'progressive_qty',
    scope: 'categories',
    discount_kind: 'unit_price',
    stacks_with_coupon: false,
    is_kit_showcase: false,
    active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    tiers: [{ min_qty: 3, value: 5 }],
    categoryIds: ['anime'],
    ...over,
  }) as AdminPromotion

/** A rota-sentinela: se ela aparece, a tela navegou para `/admin/promocoes`. */
const LISTAGEM = 'LISTAGEM DE PROMOÇÕES'

const renderPage = (editing: AdminPromotion | null = null, over: { isLoading?: boolean } = {}) => {
  state.promotions = editing ? [editing] : []
  state.isLoading = over.isLoading ?? false
  const path = editing ? `/admin/promocoes/${editing.id}/editar` : '/admin/promocoes/nova'
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/promocoes" element={<div>{LISTAGEM}</div>} />
          <Route path="/admin/promocoes/nova" element={<AdminPromotionFormPage />} />
          <Route path="/admin/promocoes/:id/editar" element={<AdminPromotionFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const addCategory = (label: string) =>
  fireEvent.change(screen.getByLabelText('Adicionar categoria'), { target: { value: label } })

const save = () => fireEvent.click(screen.getByRole('button', { name: /Salvar promoção/ }))

/**
 * Preenche uma linha do repetidor de faixas.
 *
 * As ACs de save exigem **ao menos uma faixa válida**, então todo caminho felizmente salvo passa por
 * aqui — inclusive os casos de escopo, cujas asserções seguem sendo sobre o escopo.
 */
const fillTier = (index: number, minQty: number | string, value: number | string) => {
  fireEvent.change(screen.getByLabelText(`Quantidade da faixa ${index + 1}`), {
    target: { value: String(minQty) },
  })
  fireEvent.change(screen.getByLabelText(`Valor da faixa ${index + 1}`), {
    target: { value: String(value) },
  })
}

const addTier = () => fireEvent.click(screen.getByRole('button', { name: /adicionar faixa/i }))

beforeEach(() => {
  mutations.create.mockClear().mockResolvedValue('promo-new')
  mutations.update.mockClear().mockResolvedValue('promo-1')
  vi.mocked(toast).mockClear()
  db.askedCategoryIds = []
  db.links = [
    { category_id: 'anime', product_id: 'p-naruto' },
    { category_id: 'anime', product_id: 'p-gojo' },
    { category_id: 'kpop', product_id: 'p-newjeans' },
    { category_id: 'chaveiros', product_id: 'p-chave' },
  ]
  db.products = [
    { id: 'p-naruto', base_price: 8.9, is_active: true },
    { id: 'p-gojo', base_price: 8.9, is_active: true },
    { id: 'p-newjeans', base_price: 12.9, is_active: true },
    { id: 'p-chave', base_price: 19.9, is_active: true },
  ]
})

// ---------------------------------------------------------------------------------------------
// DSC-01 / DSC-03 — a moldura nova
// ---------------------------------------------------------------------------------------------

describe('DSC-01 — a tela substitui a modal', () => {
  it('renderiza em tela cheia, sem `Dialog`', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Nova promoção' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a trilha mostra o grupo, a listagem e o registro (DSC-03 AC 1)', () => {
    renderPage()

    const trilha = screen.getByRole('navigation', { name: 'Trilha' })
    expect(trilha).toHaveTextContent('Descontos')
    expect(trilha).toHaveTextContent('Promoções')
    expect(trilha).toHaveTextContent('Nova promoção')
  })

  it('editar carrega nome, categorias, faixas e título da promoção do `id` da URL (AC 2)', () => {
    renderPage(editingPromotion())

    expect(screen.getByLabelText('Nome')).toHaveValue('Kit de bottons')
    expect(screen.getByTestId('chip-anime')).toHaveTextContent('Anime')
    expect(screen.getByLabelText('Quantidade da faixa 1')).toHaveValue(3)
    expect(screen.getByRole('heading', { name: 'Kit de bottons' })).toBeInTheDocument()
  })

  it('`id` que não existe mostra "não encontrada" e NÃO um formulário vazio (AC 3)', () => {
    state.promotions = []
    state.isLoading = false
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/admin/promocoes/nao-existe/editar']}>
          <Routes>
            <Route path="/admin/promocoes" element={<div>{LISTAGEM}</div>} />
            <Route path="/admin/promocoes/:id/editar" element={<AdminPromotionFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Promoção não encontrada')).toBeInTheDocument()
    // O formulário que salvaria como promoção NOVA não está montado.
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar para Promoções' }))
    expect(screen.getByText(LISTAGEM)).toBeInTheDocument()
  })

  it('enquanto a listagem carrega, a edição não decide que não achou', () => {
    renderPage(null, { isLoading: true })
    // Sem `id` na URL não há o que carregar — o create nunca fica em "Carregando".
    expect(screen.getByRole('heading', { name: 'Nova promoção' })).toBeInTheDocument()

    state.promotions = []
    state.isLoading = true
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/admin/promocoes/promo-1/editar']}>
          <Routes>
            <Route path="/admin/promocoes/:id/editar" element={<AdminPromotionFormPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Carregando...')).toBeInTheDocument()
    expect(screen.queryByText('Promoção não encontrada')).not.toBeInTheDocument()
  })

  it('`Cancelar` volta para a listagem sem gravar (DSC-03 AC 4)', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText(LISTAGEM)).toBeInTheDocument()
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('o selo de pendência aparece só depois de mexer em algo (DSC-03 AC 3)', () => {
    renderPage()
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Kit' } })

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('`Ctrl+S` submete o formulário (DSC-03 AC 5)', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Kit de bottons' } })
    addCategory('anime')
    fillTier(0, 3, 5)

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
  })
})

describe('T16 — identidade da promoção', () => {
  it('o tipo é fixo em desconto progressivo por quantidade e não é editável', () => {
    renderPage()

    const tipo = screen.getByLabelText('Tipo de regra') as HTMLSelectElement
    expect(tipo).toBeDisabled()
    expect([...tipo.options].map(o => o.textContent)).toEqual([
      'Desconto progressivo por quantidade',
    ])
  })

  it('diz o que a promoção é, para não ser confundida com cupom', () => {
    renderPage()

    expect(screen.getByText('Vale sozinha, sem código. Cupom é outra coisa.')).toBeInTheDocument()
  })
})

describe('T16 — escopo: segmentos e chips', () => {
  it('o segmento `Produtos` é desabilitado e diz "em breve" (A8)', () => {
    renderPage()

    const produtos = screen.getByRole('button', { name: /produtos/i })
    expect(produtos).toBeDisabled()
    expect(produtos).toHaveTextContent('em breve')
  })

  it('adicionar categoria cria o chip e a remove do seletor', () => {
    renderPage()

    addCategory('anime')

    expect(screen.getByTestId('chip-anime')).toHaveTextContent('Anime')
    const options = [...(screen.getByLabelText('Adicionar categoria') as HTMLSelectElement).options]
    expect(options.map(o => o.value)).not.toContain('anime')
  })

  it('remover o chip devolve a categoria ao seletor', () => {
    renderPage()
    addCategory('anime')

    fireEvent.click(screen.getByRole('button', { name: 'Remover Anime' }))

    expect(screen.queryByTestId('chip-anime')).not.toBeInTheDocument()
    const options = [...(screen.getByLabelText('Adicionar categoria') as HTMLSelectElement).options]
    expect(options.map(o => o.value)).toContain('anime')
  })

  it('escopo `Toda a loja` troca a contagem para o catálogo inteiro e esconde os chips', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Toda a loja' }))

    await waitFor(() =>
      expect(
        screen.getByText('A regra vale para o pedido inteiro — 4 produtos no catálogo.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Adicionar categoria')).not.toBeInTheDocument()
  })
})

describe('T16 — contagem de elegíveis inclui subcategorias (A9)', () => {
  it('escolher o guarda-chuva `Bottons` conta os produtos das FILHAS', async () => {
    renderPage()

    addCategory('bottons')

    // `Bottons` não tem produto direto nenhum: os 3 vêm de `Anime` (2) e `K-Pop` (1).
    await waitFor(() =>
      expect(screen.getByText('3 produtos elegíveis · inclui subcategorias')).toBeInTheDocument(),
    )
    expect(db.askedCategoryIds).toEqual(['bottons', 'anime', 'kpop'])
  })

  it('a contagem reflete a seleção — somar uma categoria soma produtos', async () => {
    renderPage()

    addCategory('anime')
    await waitFor(() =>
      expect(screen.getByText('2 produtos elegíveis · inclui subcategorias')).toBeInTheDocument(),
    )

    addCategory('chaveiros')
    await waitFor(() =>
      expect(screen.getByText('3 produtos elegíveis · inclui subcategorias')).toBeInTheDocument(),
    )
  })

  it('produto contado uma vez só, mesmo vinculado a duas categorias escolhidas', async () => {
    db.links = [
      { category_id: 'anime', product_id: 'p-gojo' },
      { category_id: 'kpop', product_id: 'p-gojo' },
    ]
    renderPage()

    addCategory('anime')
    addCategory('kpop')

    await waitFor(() =>
      expect(screen.getByText('1 produtos elegíveis · inclui subcategorias')).toBeInTheDocument(),
    )
  })

  it('o aside diz para quantos produtos a regra passa a valer (DSC-04 AC 4)', async () => {
    renderPage()

    addCategory('anime')

    await waitFor(() =>
      expect(
        screen.getByText(/Ao salvar, a regra passa a valer para 2 produtos/),
      ).toBeInTheDocument(),
    )
  })
})

describe('T16 — save (PRM-02)', () => {
  it('escopo por categoria SEM categoria bloqueia o save e explica por quê', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Kit de bottons' } })

    save()

    await waitFor(() => expect(screen.getByText(SCOPE_WITHOUT_CATEGORY)).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('nome curto bloqueia o save com mensagem no campo', async () => {
    renderPage()
    addCategory('anime')
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'K' } })

    save()

    await waitFor(() => expect(screen.getByText('Dê um nome à promoção')).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('com nome e categoria, salva por UMA chamada com o escopo escolhido', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Kit de bottons' } })
    addCategory('bottons')
    fillTier(0, 3, 5)

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Kit de bottons',
        scope: 'categories',
        category_ids: ['bottons'],
      }),
    )
  })

  it('escopo `Toda a loja` grava `category_ids` vazio — vínculo herdado não sobrevive à troca', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Vale tudo' } })
    addCategory('anime')
    fillTier(0, 3, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Toda a loja' }))

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'all', category_ids: [] }),
    )
  })

  it('editar manda o `id` para a MESMA RPC, não um insert novo', async () => {
    renderPage(editingPromotion())

    save()

    await waitFor(() => expect(mutations.update).toHaveBeenCalledTimes(1))
    expect(mutations.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'promo-1' }))
    expect(mutations.create).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------------------------
// T17 — o repetidor de faixas (PRM-03, PRM-04)
// ---------------------------------------------------------------------------------------------

/** Nome + escopo prontos; só as faixas em disputa. Anime tem dois bottons a R$ 8,90 ⇒ mediana 8,90. */
const readyForTiers = async () => {
  renderPage()
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Kit de bottons' } })
  addCategory('anime')
  await waitFor(() => expect(screen.getByText(/Prévia sobre/)).toHaveTextContent('R$ 8,90'))
}

describe('T17 — validação de faixa (PRM-03)', () => {
  it('faixa começando em 1 unidade é recusada com a mensagem da AC 3, sem gravar', async () => {
    await readyForTiers()
    fillTier(0, 1, 5)

    save()

    await waitFor(() => expect(screen.getByText(MIN_QTY_TOO_LOW)).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('duas faixas com o mesmo `min_qty` são recusadas NOMEANDO a quantidade', async () => {
    await readyForTiers()
    fillTier(0, 5, 4.6)
    addTier()
    fillTier(1, 5, 4.2)

    save()

    await waitFor(() => expect(screen.getByText(duplicateMinQty(5))).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('preço por unidade zerado é recusado por campo', async () => {
    await readyForTiers()
    fillTier(0, 3, 0)

    save()

    await waitFor(() => expect(screen.getByText(UNIT_PRICE_NOT_POSITIVE)).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('percentual fora de 1–90 é recusado por campo', async () => {
    await readyForTiers()
    fireEvent.click(screen.getByRole('button', { name: '% off' }))
    fillTier(0, 3, 95)

    save()

    await waitFor(() => expect(screen.getByText(PERCENT_OUT_OF_RANGE)).toBeInTheDocument())
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it('as faixas válidas vão para o payload, com números e não strings', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    addTier()
    fillTier(1, 5, 4.6)

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_kind: 'unit_price',
        tiers: [
          { min_qty: 3, value: 5 },
          { min_qty: 5, value: 4.6 },
        ],
      }),
    )
  })
})

describe('T17 — adicionar e remover faixa', () => {
  it('`Adicionar faixa` acrescenta uma linha vazia', async () => {
    await readyForTiers()

    expect(screen.getAllByTestId(/^faixa-/)).toHaveLength(1)
    addTier()

    expect(screen.getAllByTestId(/^faixa-/)).toHaveLength(2)
    expect(screen.getByLabelText('Quantidade da faixa 2')).toHaveValue(null)
  })

  it('remover apaga a linha, e a última não pode ser removida', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    addTier()
    fillTier(1, 5, 4.6)

    fireEvent.click(screen.getByRole('button', { name: 'Remover faixa 2' }))

    expect(screen.getAllByTestId(/^faixa-/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Remover faixa 1' })).toBeDisabled()
  })
})

describe('T17 — prévia "Cliente paga" (PRM-04, AC 6)', () => {
  it('faixa de 5 un a R$ 4,60 sobre bottons de R$ 8,90 mostra R$ 23,00 e −48%', async () => {
    await readyForTiers()
    fillTier(0, 5, 4.6)

    expect(screen.getByTestId('paga-0')).toHaveTextContent('R$ 23,00')
    expect(screen.getByText('−48%')).toBeInTheDocument()
  })

  it('sem escopo escolhido não existe preço cheio, e a prévia não inventa número', () => {
    renderPage()

    expect(screen.getByTestId('paga-0')).toHaveTextContent('—')
    expect(
      screen.getByText('Escolha o escopo para ver quanto a cliente paga.'),
    ).toBeInTheDocument()
  })

  it('alternar `Preço por unidade` ↔ `% off` recalcula a prévia das TRÊS faixas', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    addTier()
    fillTier(1, 5, 4.6)
    addTier()
    fillTier(2, 10, 4.2)

    // Como preço por unidade: 3 × 5,00 · 5 × 4,60 · 10 × 4,20 — os três totais do board.
    expect(screen.getByTestId('paga-0')).toHaveTextContent('R$ 15,00')
    expect(screen.getByTestId('paga-1')).toHaveTextContent('R$ 23,00')
    expect(screen.getByTestId('paga-2')).toHaveTextContent('R$ 42,00')

    fireEvent.click(screen.getByRole('button', { name: '% off' }))

    // Como percentual sobre R$ 8,90, arredondando POR ITEM: 8,46 · 8,49 · 8,53.
    expect(screen.getByTestId('paga-0')).toHaveTextContent('R$ 25,38')
    expect(screen.getByTestId('paga-1')).toHaveTextContent('R$ 42,45')
    expect(screen.getByTestId('paga-2')).toHaveTextContent('R$ 85,30')
  })
})

// ---------------------------------------------------------------------------------------------
// DSC-04 AC 3 — o card `Na loja vai aparecer`
// ---------------------------------------------------------------------------------------------

describe('DSC-04 — a frase que a loja mostra', () => {
  it('mostra a frase da faixa de MAIOR quantidade, com o preço unitário e a economia', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    addTier()
    fillTier(1, 5, 4.6)

    // 5 × 8,90 = 44,50 cheios; 5 × 4,60 = 23,00 ⇒ economiza 21,50 (o número do board).
    expect(screen.getByTestId('vitrine-frase')).toHaveTextContent('“Escolha 5, pague R$ 23,00”')
    expect(screen.getByTestId('vitrine-detalhe')).toHaveTextContent('Cada item a R$ 4,60')
    expect(screen.getByTestId('vitrine-detalhe')).toHaveTextContent('economiza R$ 21,50')
  })

  it('a faixa é escolhida pela quantidade, não pela ordem das linhas', async () => {
    await readyForTiers()
    // A maior quantidade na PRIMEIRA linha; a segunda é menor.
    fillTier(0, 10, 4.2)
    addTier()
    fillTier(1, 3, 5)

    expect(screen.getByTestId('vitrine-frase')).toHaveTextContent('“Escolha 10, pague R$ 42,00”')
  })

  it('sem escopo, pede o escopo — e não inventa preço', () => {
    renderPage()

    expect(screen.getByTestId('vitrine-pendente')).toHaveTextContent(
      'Escolha o escopo para ver a frase que a loja mostra.',
    )
    expect(screen.queryByTestId('vitrine-frase')).not.toBeInTheDocument()
  })

  it('com escopo e sem faixa válida, pede a faixa', async () => {
    await readyForTiers()

    expect(screen.getByTestId('vitrine-pendente')).toHaveTextContent(
      'Preencha uma faixa para ver a frase que a loja mostra.',
    )
  })
})

// ---------------------------------------------------------------------------------------------
// T18 — chaves, vigência e o desfecho do save (PRM-05, PRM-08)
// ---------------------------------------------------------------------------------------------

const switchIn = (testid: string) => within(screen.getByTestId(testid)).getByRole('switch')

describe('T18 — as três chaves', () => {
  it('mostra as três chaves com a explicação de cada uma', async () => {
    await readyForTiers()

    expect(screen.getByText('Vitrine do kit')).toBeInTheDocument()
    expect(
      screen.getByText('A tela Monte seu kit da loja exibe esta promoção. Só uma por vez.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Acumula com cupom')).toBeInTheDocument()
    expect(
      screen.getByText('Desligado: cupom e promoção não somam no mesmo item.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })

  it('nasce ativa, sem acumular com cupom e sem vitrine — o default menos surpreendente', async () => {
    await readyForTiers()

    expect(switchIn('switch-ativa')).toBeChecked()
    expect(switchIn('switch-cupom')).not.toBeChecked()
    expect(switchIn('switch-vitrine')).not.toBeChecked()
  })

  it('ligar `Vitrine do kit` vai no payload da MESMA transação — é ela que desliga a anterior', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    fireEvent.click(switchIn('switch-vitrine'))

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({ is_kit_showcase: true }),
    )
    // Nenhuma segunda escrita do mesmo fato: `upsert_promotion` já garante a exclusividade.
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it('`Acumula com cupom` e `Ativa` vão para o payload como a pessoa deixou', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)
    fireEvent.click(switchIn('switch-cupom'))
    fireEvent.click(switchIn('switch-ativa'))

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({ stacks_with_coupon: true, active: false }),
    )
  })

  it('editar preenche as chaves com o que está gravado', () => {
    renderPage(
      editingPromotion({ is_kit_showcase: true, stacks_with_coupon: true, active: false }),
    )

    expect(switchIn('switch-vitrine')).toBeChecked()
    expect(switchIn('switch-cupom')).toBeChecked()
    expect(switchIn('switch-ativa')).not.toBeChecked()
  })
})

describe('T18 — vigência, agora por calendário (DSC-05)', () => {
  it('editar mostra a vigência gravada como dd/MM/yyyy, e não num `input[type=date]`', () => {
    renderPage(
      editingPromotion({
        valid_from: isoFromDateOnly('2026-08-01'),
        valid_until: isoFromDateOnly('2026-08-31'),
      }),
    )

    expect(screen.getByRole('button', { name: 'Válida de' })).toHaveTextContent('01/08/2026')
    expect(screen.getByRole('button', { name: 'Válida até' })).toHaveTextContent('31/08/2026')
    expect(document.querySelector('input[type="date"]')).toBeNull()
  })

  it('o dia escolhido no calendário vai para o payload como o MESMO dia', async () => {
    renderPage(editingPromotion({ valid_from: isoFromDateOnly('2026-08-01') }))

    fireEvent.click(screen.getByRole('button', { name: 'Válida de' }))
    fireEvent.click(screen.getByRole('gridcell', { name: '15' }))
    save()

    await waitFor(() => expect(mutations.update).toHaveBeenCalledTimes(1))
    expect(mutations.update.mock.calls[0][0].valid_from).toBe(isoFromDateOnly('2026-08-15'))
  })

  it('limpar a data grava nulo (DSC-05 AC 4)', async () => {
    renderPage(editingPromotion({ valid_until: isoFromDateOnly('2026-08-31') }))

    fireEvent.click(screen.getByRole('button', { name: 'Limpar Válida até' }))
    save()

    await waitFor(() => expect(mutations.update).toHaveBeenCalledTimes(1))
    expect(mutations.update.mock.calls[0][0].valid_until).toBeNull()
  })

  it('sem datas, a vigência vai nula — a regra vale enquanto estiver ativa', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({ valid_from: null, valid_until: null }),
    )
  })

  it('a vigência vazia diz o que significa, em vez de mostrar a data de hoje', async () => {
    await readyForTiers()

    expect(screen.getByRole('button', { name: 'Válida de' })).toHaveTextContent('Vale desde já')
    expect(screen.getByRole('button', { name: 'Válida até' })).toHaveTextContent('Sem fim')
  })
})

describe('T18 — o save que falha não pode parecer que deu certo', () => {
  it('erro do banco mantém a tela aberta com o que foi digitado, e avisa', async () => {
    mutations.create.mockRejectedValue(new Error('duplicate key value violates unique constraint'))
    await readyForTiers()
    fillTier(0, 3, 5)

    save()

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    // Nenhuma navegação otimista: a listagem NÃO aparece.
    expect(screen.queryByText(LISTAGEM)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Kit de bottons')
    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Erro ao salvar promoção',
        description: 'duplicate key value violates unique constraint',
        variant: 'destructive',
      }),
    )
  })

  it('save bem-sucedido navega para a listagem (DSC-01 AC 5)', async () => {
    await readyForTiers()
    fillTier(0, 3, 5)

    save()

    await waitFor(() => expect(screen.getByText(LISTAGEM)).toBeInTheDocument())
  })
})
