// Feature 17 / T15 — a listagem de `/admin/promocoes` (PRM-01).
//
// O que se prova aqui é o board `Promoções — listagem`: as seis colunas, o resumo de faixas
// (`3 · 5 · 10 un` + `R$ 5,00 → R$ 4,20 /un`), o selo `vitrine do kit`, a linha pausada em tom
// apagado com o selo `Pausada`, e os dois estados sem dado (carregando e vazio).
//
// O dublê de `useAdminPromotions` é o que permite provar a TELA sem subir Supabase; a ordenação por
// `created_at` desc é da query e está provada em
// `packages/core/src/hooks/__tests__/usePromotionsAdmin.test.ts`.

import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminPromotion } from '@nanapin/core/hooks/usePromotions'

const state = vi.hoisted(() => ({
  promotions: [] as unknown[],
  isLoading: false,
  categories: [] as unknown[],
  /** PRM-24 — `null` é "não há o que medir"; o cartão mostra `—`. */
  stats: {
    discountGranted: null as number | null,
    itemsWithPromotion: null as number | null,
    itemsWithoutPromotion: null as number | null,
  },
}))

const hook = vi.hoisted(() => ({
  deleteMutate: vi.fn().mockResolvedValue(undefined),
  updateMutate: vi.fn().mockResolvedValue('promo-kit'),
  createMutate: vi.fn().mockResolvedValue('promo-copia'),
}))

// O módulo real de `usePromotions` importa o client do Supabase no topo, e ele lança sem as env do
// `.env`. Dublar o client é a convenção do repo (`useAdminCategories.test.ts`) e deixa o teste
// independente de ambiente.
vi.mock('@nanapin/supabase/client', () => ({ supabase: {} }))

// `promotionCopyPayload` NÃO é dublado: ele é a regra da cópia (PRM-22) e está provado unitariamente
// em `packages/core/src/hooks/__tests__/usePromotionsAdmin.test.ts`. Dublá-lo aqui deixaria de provar
// que a tela manda o payload certo — que é justamente o que esta suíte cobre.
vi.mock('@nanapin/core/hooks/usePromotions', async importOriginal => {
  const real = await importOriginal<typeof import('@nanapin/core/hooks/usePromotions')>()
  return {
    promotionCopyPayload: real.promotionCopyPayload,
    useAdminPromotions: () => ({ data: state.promotions, isLoading: state.isLoading }),
    useDeletePromotion: () => ({ mutateAsync: hook.deleteMutate, isPending: false }),
    useUpdatePromotion: () => ({ mutateAsync: hook.updateMutate, isPending: false }),
    useCreatePromotion: () => ({ mutateAsync: hook.createMutate, isPending: false }),
    usePromotionStats: () => ({ data: state.stats, isLoading: false }),
  }
})

vi.mock('@/entities/category', () => ({
  useAdminCategories: () => ({ categories: state.categories, loading: false, error: null }),
}))

vi.mock('@nanapin/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import { toast } from '@nanapin/ui/hooks/use-toast'

import AdminPromotionsPage from './AdminPromotionsPage'

const promo = (over: Partial<AdminPromotion> = {}): AdminPromotion =>
  ({
    id: 'promo-kit',
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
    tiers: [
      { min_qty: 3, value: 5 },
      { min_qty: 5, value: 4.6 },
      { min_qty: 10, value: 4.2 },
    ],
    categoryIds: ['cat-bottons'],
    ...over,
  }) as AdminPromotion

const renderPage = (promotions: AdminPromotion[] = [promo()], over: Partial<typeof state> = {}) => {
  state.promotions = promotions
  state.isLoading = over.isLoading ?? false
  state.categories = over.categories ?? [
    { id: 'cat-bottons', name: 'Bottons' },
    { id: 'cat-chaveiros', name: 'Chaveiros' },
  ]
  state.stats = over.stats ?? {
    discountGranted: null,
    itemsWithPromotion: null,
    itemsWithoutPromotion: null,
  }
  // Feature 18: o editor virou ROTA. As duas rotas-sentinela abaixo provam para onde a tela navega —
  // um dublê de `useNavigate` diria que navegou, e não para onde nem com qual `id`.
  return render(
    <MemoryRouter initialEntries={['/admin/promocoes']}>
      <Routes>
        <Route path="/admin/promocoes" element={<AdminPromotionsPage />} />
        <Route path="/admin/promocoes/nova" element={<div>EDITOR EM BRANCO</div>} />
        <Route path="/admin/promocoes/:id/editar" element={<EditorSentinel />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Reporta o `:id` que a rota de edição recebeu. */
const EditorSentinel = () => <div>EDITOR DE {useParams().id}</div>

const rowOf = (name: string) => screen.getByText(name).closest('tr') as HTMLElement

/**
 * O valor de um `StatCard` a partir do rótulo dele (o segundo `<p>` do cartão).
 *
 * O espaço de `formatPrice` é NBSP — comparar com espaço comum falha com as duas strings parecendo
 * idênticas no diff.
 */
const cardValue = (label: string) => {
  const card = screen.getByText(label).closest('div')?.parentElement as HTMLElement
  return card.querySelectorAll('p')[1]?.textContent?.replace(/\u00a0/g, ' ')
}

/**
 * Uma data de vigência como o editor a grava: meia-noite **local** convertida para ISO (o mesmo
 * `new Date(s + 'T00:00:00').toISOString()` de `AdminCouponsPage`).
 *
 * Escrever `'2999-09-30T00:00:00.000Z'` na fixture faria o teste depender do fuso da máquina: em
 * UTC−3 essa marca é 29/09 às 21h locais, e a tela exibiria `29/09`. A ida e a volta pelo horário
 * local é o contrato real da coluna.
 */
const asStored = (date: string) => new Date(`${date}T00:00:00`).toISOString()

beforeEach(() => {
  hook.deleteMutate.mockClear()
  hook.updateMutate.mockClear()
  hook.updateMutate.mockResolvedValue('promo-kit')
  hook.createMutate.mockClear()
  hook.createMutate.mockResolvedValue('promo-copia')
  vi.mocked(toast).mockClear()
})

/** O payload que a tela mandou para `upsert_promotion` na n-ésima chamada. */
const payloadOf = (call = 0) =>
  hook.updateMutate.mock.calls[call][0] as Record<string, unknown>

/** O payload da cópia (PRM-22) — `useCreatePromotion`, não `useUpdatePromotion`. */
const copyPayloadOf = (call = 0) =>
  hook.createMutate.mock.calls[call][0] as Record<string, unknown>

describe('PRM-01 — cabeçalho e colunas do board', () => {
  it('mostra o título e o subtítulo do board', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Promoções' })).toBeInTheDocument()
    expect(
      screen.getByText('Regras que descontam sozinhas, sem o cliente digitar código.'),
    ).toBeInTheDocument()
  })

  it('mostra as seis colunas do board, na ordem, mais a de ações', () => {
    renderPage()

    const headers = screen.getAllByRole('columnheader').map(th => th.textContent)
    expect(headers).toEqual([
      'Promoção',
      'Tipo',
      'Escopo',
      'Faixas',
      'Vigência',
      'Status',
      'Ações',
    ])
  })

  it('mostra o tipo por extenso e o escopo como chip com o nome da categoria', () => {
    renderPage()

    const row = within(rowOf('Kit de bottons'))
    expect(row.getByText('Progressivo por qtd.')).toBeInTheDocument()
    expect(row.getByText('Bottons')).toBeInTheDocument()
  })

  it('preserva a ordem em que a query devolveu as promoções — a tela não reordena', () => {
    renderPage([
      promo({ id: 'nova', name: 'Chaveiros em dupla', created_at: '2026-08-03T00:00:00.000Z' }),
      promo({ id: 'antiga', name: 'Kit de bottons', created_at: '2026-08-01T00:00:00.000Z' }),
    ])

    const names = screen
      .getAllByRole('row')
      .slice(1)
      .map(tr => tr.querySelector('span')?.textContent)
    expect(names).toEqual(['Chaveiros em dupla', 'Kit de bottons'])
  })
})

describe('PRM-01 — resumo de faixas como no board', () => {
  it('faixas de preço por unidade saem como `3 · 5 · 10 un` e `R$ 5,00 → R$ 4,20 /un`', () => {
    renderPage()

    const row = within(rowOf('Kit de bottons'))
    expect(row.getByText('3 · 5 · 10 un')).toBeInTheDocument()
    expect(row.getByText('R$ 5,00 → R$ 4,20 /un')).toBeInTheDocument()
  })

  it('faixas em percentual saem como `2 · 4 un` e `10% → 18% off`', () => {
    renderPage([
      promo({
        name: 'Chaveiros em dupla',
        discount_kind: 'percent',
        tiers: [
          { min_qty: 2, value: 10 },
          { min_qty: 4, value: 18 },
        ],
      }),
    ])

    const row = within(rowOf('Chaveiros em dupla'))
    expect(row.getByText('2 · 4 un')).toBeInTheDocument()
    expect(row.getByText('10% → 18% off')).toBeInTheDocument()
  })

  it('uma faixa só não desenha seta — não há progressão para anunciar', () => {
    renderPage([
      promo({ name: 'Leve 3', discount_kind: 'percent', tiers: [{ min_qty: 3, value: 33 }] }),
    ])

    const row = within(rowOf('Leve 3'))
    expect(row.getByText('3 un')).toBeInTheDocument()
    expect(row.getByText('33% off')).toBeInTheDocument()
  })

  it('promoção sem nenhuma faixa diz "Sem faixas" em vez de coluna vazia', () => {
    renderPage([promo({ name: 'Rascunho', tiers: [] })])

    expect(within(rowOf('Rascunho')).getByText('Sem faixas')).toBeInTheDocument()
  })
})

describe('PRM-01 — vigência e status', () => {
  it('sem vigência nenhuma mostra "Sem fim" e o selo Ativa', () => {
    renderPage()

    const row = within(rowOf('Kit de bottons'))
    expect(row.getByText('Sem fim')).toBeInTheDocument()
    expect(row.getByText('Ativa')).toBeInTheDocument()
  })

  it('só com fim mostra `até 30/09`; com as duas datas mostra `01/08 – 31/08`', () => {
    renderPage([
      promo({ id: 'a', name: 'Só fim', valid_until: asStored('2999-09-30') }),
      promo({
        id: 'b',
        name: 'Janela',
        valid_from: asStored('2026-08-01'),
        valid_until: asStored('2999-08-31'),
      }),
    ])

    expect(within(rowOf('Só fim')).getByText('até 30/09')).toBeInTheDocument()
    expect(within(rowOf('Janela')).getByText('01/08 – 31/08')).toBeInTheDocument()
  })

  it('promoção pausada tem o selo `Pausada` e o nome em tom apagado', () => {
    renderPage([promo({ name: 'Leve 3, pague 2 · Kawaii', active: false })])

    const row = within(rowOf('Leve 3, pague 2 · Kawaii'))
    expect(row.getByText('Pausada')).toBeInTheDocument()
    expect(row.getByText('Leve 3, pague 2 · Kawaii')).toHaveClass('text-muted-foreground')
  })

  it('promoção com `active` mas fora da vigência não se apresenta como Ativa', () => {
    renderPage([promo({ name: 'Vencida', active: true, valid_until: '2020-01-01T00:00:00.000Z' })])

    const row = within(rowOf('Vencida'))
    expect(row.getByText('Expirada')).toBeInTheDocument()
    expect(row.queryByText('Ativa')).not.toBeInTheDocument()
  })
})

describe('PRM-01 — escopo e vitrine', () => {
  it('a promoção marcada como vitrine do kit traz o selo e a frase do board', () => {
    renderPage([promo({ is_kit_showcase: true })])

    const row = within(rowOf('Kit de bottons'))
    expect(row.getByText('vitrine do kit')).toBeInTheDocument()
    expect(row.getByText('Monte seu kit lê esta regra')).toBeInTheDocument()
  })

  it('sem vitrine, a linha diz que não há vitrine própria', () => {
    renderPage()

    expect(within(rowOf('Kit de bottons')).getByText('Sem vitrine própria na loja')).toBeInTheDocument()
  })

  it('escopo `all` aparece como "Toda a loja"', () => {
    renderPage([promo({ name: 'Tudo', scope: 'all', categoryIds: [] })])

    expect(within(rowOf('Tudo')).getByText('Toda a loja')).toBeInTheDocument()
  })

  it('escopo por categoria SEM nenhum vínculo é sinalizado — nunca lido como "toda a loja"', () => {
    renderPage([promo({ name: 'Órfã', scope: 'categories', categoryIds: [] })])

    const row = within(rowOf('Órfã'))
    expect(row.getByText('Nenhuma categoria')).toBeInTheDocument()
    expect(row.queryByText('Toda a loja')).not.toBeInTheDocument()
  })
})

describe('PRM-01 — estados sem dado', () => {
  it('carregando mostra o esqueleto da tabela, não a tabela vazia', () => {
    renderPage([], { isLoading: true })

    expect(screen.getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lista vazia convida a criar a primeira regra', () => {
    renderPage([])

    expect(screen.getByText('Nenhuma promoção cadastrada.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /nova promoção/i }).length).toBeGreaterThan(0)
  })
})

describe('T16 / DSC-01 AC 4 — a listagem NAVEGA para o editor', () => {
  it('"Nova promoção" leva a `/admin/promocoes/nova`', () => {
    renderPage()

    expect(screen.queryByText('EDITOR EM BRANCO')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /nova promoção/i }))

    expect(screen.getByText('EDITOR EM BRANCO')).toBeInTheDocument()
  })

  it('o lápis da linha leva a `/admin/promocoes/:id/editar` com o id DAQUELA promoção', () => {
    renderPage([promo({ id: 'promo-kit' }), promo({ id: 'promo-natal', name: 'Natal' })])

    fireEvent.click(screen.getByRole('button', { name: 'Editar Natal' }))

    expect(screen.getByText('EDITOR DE promo-natal')).toBeInTheDocument()
  })

  it('o convite do estado vazio também leva ao editor em branco', () => {
    renderPage([])

    // Dois botões com o mesmo rótulo: o do cabeçalho e o do convite. O do convite é o último.
    const invites = screen.getAllByRole('button', { name: /nova promoção/i })
    fireEvent.click(invites[invites.length - 1])

    expect(screen.getByText('EDITOR EM BRANCO')).toBeInTheDocument()
  })

  it('nenhuma modal de promoção sobra na tela', () => {
    renderPage()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('T15 — excluir promoção', () => {
  it('confirmar a exclusão chama a mutação com o id da promoção', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Kit de bottons' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(hook.deleteMutate).toHaveBeenCalledWith('promo-kit'))
  })

  it('cancelar não exclui nada', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Kit de bottons' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(hook.deleteMutate).not.toHaveBeenCalled()
  })
})

// Feature 17 / T20 — pausar e reativar pela linha da tabela (PRM-21).
//
// O que precisa de prova aqui não é o clique: é a **forma do payload**. `upsert_promotion` trata
// chave ausente como "não mexer" e chave presente como "substituir" — então um pausar que mandasse
// `tiers: []` apagaria em silêncio todas as faixas da promoção, e um que não mandasse `name` voltaria
// com "A promoção precisa de um nome" (o corpo da RPC faz `name = payload->>'name'` sem `coalesce`).
// Os dois contratos foram provados por probe no lote 1 e no lote 3.
describe('PRM-21 — pausar e reativar pela listagem', () => {
  it('pausar manda `{ id, name, active: false }` — e nada mais', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))

    expect(payloadOf()).toEqual({ id: 'promo-kit', name: 'Kit de bottons', active: false })
  })

  it('pausar NÃO manda `tiers` nem `category_ids` — chave presente substituiria (vazio = limpa)', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))

    expect('tiers' in payloadOf()).toBe(false)
    expect('category_ids' in payloadOf()).toBe(false)
  })

  it('a linha pausada oferece reativar, e o clique manda `active: true`', () => {
    renderPage([promo({ active: false })])

    expect(screen.queryByRole('button', { name: 'Pausar Kit de bottons' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reativar Kit de bottons' }))

    expect(payloadOf()).toEqual({ id: 'promo-kit', name: 'Kit de bottons', active: true })
  })

  it('promoção expirada mas com `active` ainda oferece pausar — o botão segue a coluna, não o selo', () => {
    renderPage([promo({ active: true, valid_until: '2020-01-01T00:00:00.000Z' })])

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))

    expect(payloadOf().active).toBe(false)
  })

  /**
   * O invariante do `PRM-21`: pausar **não** altera pedido já pago.
   *
   * A prova de tela é negativa e é a que importa — o único efeito do pausar é `active` naquela
   * promoção. Nenhum campo de pedido entra no payload, e a promoção **não** é excluída: apagá-la
   * dispararia `on delete set null` em `orders.promotion_id`, mexendo justamente no histórico que
   * este AC protege. A prova positiva (o pedido pago relido byte a byte igual depois do pausar) é o
   * probe HTTP registrado no corpo da task.
   */
  it('pausar não exclui a promoção nem carrega campo de pedido no payload (PRM-21)', () => {
    renderPage([promo({ is_kit_showcase: true, stacks_with_coupon: true })])

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))

    expect(hook.deleteMutate).not.toHaveBeenCalled()
    expect(Object.keys(payloadOf()).sort()).toEqual(['active', 'id', 'name'])
  })

  it('pausar mais de uma promoção manda um payload por linha, cada um com o seu nome', () => {
    renderPage([
      promo({ id: 'kit', name: 'Kit de bottons' }),
      promo({ id: 'dupla', name: 'Chaveiros em dupla' }),
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pausar Chaveiros em dupla' }))

    expect(payloadOf(0)).toEqual({ id: 'kit', name: 'Kit de bottons', active: false })
    expect(payloadOf(1)).toEqual({ id: 'dupla', name: 'Chaveiros em dupla', active: false })
  })

  it('falha da RPC avisa com a mensagem do banco — a tela não pode achar que pausou', async () => {
    hook.updateMutate.mockRejectedValueOnce(new Error('A promoção precisa de um nome'))
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar Kit de bottons' }))

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'A promoção precisa de um nome',
          variant: 'destructive',
        }),
      ),
    )
  })
})

// Feature 17 / T21 — duplicar (PRM-22).
//
// A cópia é um `upsert_promotion` **sem `id`**, montado por `promotionCopyPayload` (que não é dublado
// nesta suíte, de propósito). O que a tela decide é: qual promoção, por qual mutação, e que a original
// não é tocada.
describe('PRM-22 — duplicar pela listagem', () => {
  it('a cópia nasce inativa, sem vitrine, com o nome sufixado', () => {
    renderPage([promo({ is_kit_showcase: true })])

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Kit de bottons' }))

    expect(copyPayloadOf()).toMatchObject({
      name: 'Kit de bottons (cópia)',
      active: false,
      is_kit_showcase: false,
    })
  })

  it('as faixas e as categorias vêm junto', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Kit de bottons' }))

    expect(copyPayloadOf().tiers).toEqual([
      { min_qty: 3, value: 5 },
      { min_qty: 5, value: 4.6 },
      { min_qty: 10, value: 4.2 },
    ])
    expect(copyPayloadOf().category_ids).toEqual(['cat-bottons'])
  })

  it('duplicar cria — não atualiza a original nem manda o `id` dela', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Kit de bottons' }))

    expect(hook.createMutate).toHaveBeenCalledTimes(1)
    expect(hook.updateMutate).not.toHaveBeenCalled()
    expect('id' in copyPayloadOf()).toBe(false)
  })

  it('duplica a promoção DAQUELA linha, não a primeira da lista', () => {
    renderPage([
      promo({ id: 'kit', name: 'Kit de bottons' }),
      promo({ id: 'dupla', name: 'Chaveiros em dupla', categoryIds: ['cat-chaveiros'] }),
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Chaveiros em dupla' }))

    expect(copyPayloadOf()).toMatchObject({
      name: 'Chaveiros em dupla (cópia)',
      category_ids: ['cat-chaveiros'],
    })
  })

  it('falha ao duplicar avisa com a mensagem do banco', async () => {
    hook.createMutate.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Duplicar Kit de bottons' }))

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Erro ao duplicar promoção',
          variant: 'destructive',
        }),
      ),
    )
  })
})

// Feature 17 / T23 — os três cartões do board (PRM-24).
//
// O contador de ativas sai das linhas que a listagem já tem; os outros dois vêm de
// `usePromotionStats`. O que precisa de prova é o **travessão**: sem pedido pago na janela, `R$ 0,00`
// afirmaria uma venda que não houve, e uma divisão por zero escreveria `NaN` no cartão.
describe('PRM-24 — os três cartões da listagem', () => {
  it('conta como ativa só o que a loja está praticando — expirada e programada ficam fora', () => {
    renderPage([
      promo({ id: 'a', name: 'Vigente' }),
      promo({ id: 'b', name: 'Pausada', active: false }),
      promo({ id: 'c', name: 'Vencida', valid_until: '2020-01-01T00:00:00.000Z' }),
      promo({ id: 'd', name: 'Futura', valid_from: '2999-01-01T00:00:00.000Z' }),
    ])

    expect(cardValue('Promoções ativas')).toBe('1')
    expect(screen.getByText('de 4 cadastradas')).toBeInTheDocument()
  })

  it('desconto concedido sai em reais, com a janela nomeada', () => {
    renderPage([promo()], {
      stats: { discountGranted: 1234.5, itemsWithPromotion: null, itemsWithoutPromotion: null },
    })

    expect(cardValue('Desconto concedido')).toBe('R$ 1.234,50')
    expect(screen.getByText('pedidos pagos nos últimos 30 dias')).toBeInTheDocument()
  })

  it('itens por pedido compara os dois lados, com uma casa decimal', () => {
    renderPage([promo()], {
      stats: { discountGranted: 20, itemsWithPromotion: 4.5, itemsWithoutPromotion: 2 },
    })

    expect(cardValue('Itens por pedido')).toBe('4,5 vs 2,0')
    expect(screen.getByText('com promoção vs sem promoção')).toBeInTheDocument()
  })

  it('sem nenhum pedido pago, os dois cartões de pedido mostram `—` — nunca `R$ 0,00` nem `NaN`', () => {
    renderPage()

    expect(cardValue('Desconto concedido')).toBe('—')
    expect(cardValue('Itens por pedido')).toBe('—')
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument()
  })

  it('houve pedido pago mas nenhum com promoção ⇒ `R$ 0,00` de desconto e travessão só no lado sem amostra', () => {
    renderPage([promo()], {
      stats: { discountGranted: 0, itemsWithPromotion: null, itemsWithoutPromotion: 2.5 },
    })

    expect(cardValue('Desconto concedido')).toBe('R$ 0,00')
    expect(cardValue('Itens por pedido')).toBe('— vs 2,5')
  })

  it('carregando, o contador de ativas fica em `—` em vez de piscar `0`', () => {
    renderPage([], { isLoading: true })

    expect(cardValue('Promoções ativas')).toBe('—')
  })

  it('os cartões existem mesmo com a lista vazia — o convite para criar não os substitui', () => {
    renderPage([])

    expect(cardValue('Promoções ativas')).toBe('0')
    expect(screen.getByText('Nenhuma promoção cadastrada.')).toBeInTheDocument()
  })
})
