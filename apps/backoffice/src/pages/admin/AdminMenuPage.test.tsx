// Feature 16 / T16 — a tela onde o menu da loja é decidido.
//
// As ACs provadas aqui: MENU-05 (lista com caminho e contagem), MENU-06 (a 5ª vaga é recusada e NÃO
// grava), MENU-07 (ligar/desligar persiste), MENU-08 (arraste grava só o delta), MENU-09 (as duas
// fixas aparecem travadas e fora da contagem), MENU-10 (marcada-e-inativa é sinalizada), MENU-24/26
// (o card exige destino e acusa destino inválido).
//
// O dublê do hook é o que permite provar **o que foi para o banco** sem subir Supabase.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null, image_url: null, banner_url: null, color_accent: null,
    active: true, sort_order: 0, parent_id: null, product_count: 0,
    show_in_menu: false, menu_promo: null,
    ...over,
  }) as AdminCategory

/**
 * A árvore que o banco tinha de verdade: guarda-chuva "Bottons" com os universos dentro. É ela que
 * mostra por que `show_in_menu` tem de valer em qualquer profundidade — nenhum universo é raiz.
 */
const CATALOGO = [
  cat({ id: 'bottons', name: 'Bottons', sort_order: 0 }),
  cat({ id: 'anime', name: 'Anime', parent_id: 'bottons', sort_order: 1, show_in_menu: true }),
  cat({ id: 'kpop', name: 'K-Pop', parent_id: 'bottons', sort_order: 2, show_in_menu: true }),
  cat({ id: 'filmes', name: 'Filmes', parent_id: 'bottons', sort_order: 3, show_in_menu: true }),
  cat({ id: 'games', name: 'Games', parent_id: 'bottons', sort_order: 4, show_in_menu: true }),
  cat({ id: 'bandas', name: 'Bandas', parent_id: 'bottons', sort_order: 5 }),
  cat({ id: 'naruto', name: 'Naruto', parent_id: 'anime', sort_order: 1, product_count: 7 }),
  cat({
    id: 'villains', name: 'Villains', parent_id: 'anime', sort_order: 2,
    description: '12 pins dos vilões.', product_count: 12,
  }),
]

const hook = vi.hoisted(() => ({
  updateCategory: vi.fn().mockResolvedValue(null),
  updateSortOrders: vi.fn().mockResolvedValue(null),
  fetchCategories: vi.fn(),
}))

const state = vi.hoisted(() => ({
  categories: [] as unknown[],
  error: null as string | null,
  loading: false,
}))

vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({
    categories: state.categories,
    tree: [],
    loading: state.loading,
    error: state.error,
    ...hook,
  }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminMenuPage from './AdminMenuPage'
import { toast } from '@estrelinha/ui/hooks/use-toast'

const renderPage = (categories: AdminCategory[] = CATALOGO, over: Partial<typeof state> = {}) => {
  state.categories = categories
  state.error = over.error ?? null
  state.loading = over.loading ?? false
  return render(
    <MemoryRouter>
      <AdminMenuPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  for (const fn of Object.values(hook)) fn.mockClear()
  vi.mocked(toast).mockClear()
})

const switchOf = (id: string) => within(screen.getByTestId(`vaga-${id}`)).getByRole('switch')

// ---------------------------------------------------------------------------
describe('MENU-05 — a lista de vagas', () => {
  it('mostra o caminho na árvore e a contagem de subcategorias', () => {
    renderPage()
    const anime = screen.getByTestId('vaga-anime')
    // Só "Anime" não diria o que está sendo posto no menu: no banco real ele é filho de "Bottons".
    expect(anime).toHaveTextContent('Bottons › Anime')
    expect(anime).toHaveTextContent('2 subcategorias')
  })

  it('categoria sem filha diz "sem subcategoria", não "0 subcategorias"', () => {
    renderPage()
    expect(screen.getByTestId('vaga-kpop')).toHaveTextContent('sem subcategoria')
  })

  it('lista categorias de qualquer profundidade — os universos são filhas de "Bottons"', () => {
    renderPage()
    for (const id of ['bottons', 'anime', 'kpop', 'naruto', 'villains']) {
      expect(screen.getByTestId(`vaga-${id}`)).toBeInTheDocument()
    }
  })
})

describe('MENU-06 — o limite de 4 vagas', () => {
  it('o contador mostra quantas estão ocupadas', () => {
    renderPage()
    expect(screen.getByTestId('contador-vagas')).toHaveTextContent('4 de 4 vagas')
  })

  it('ligar a quinta é RECUSADO e não chama o save', async () => {
    renderPage()
    fireEvent.click(switchOf('bandas'))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls[0][0]).toMatchObject({
      title: 'Sem vaga na barra',
      variant: 'destructive',
    })
    expect(vi.mocked(toast).mock.calls[0][0].description).toContain('Desligue uma')
    // A prova que importa: nada foi para o banco.
    expect(hook.updateCategory).not.toHaveBeenCalled()
  })

  it('com três ocupadas, a quarta entra e é gravada', async () => {
    renderPage(CATALOGO.map(c => (c.id === 'games' ? { ...c, show_in_menu: false } : c)))
    expect(screen.getByTestId('contador-vagas')).toHaveTextContent('3 de 4 vagas')

    fireEvent.click(switchOf('bandas'))
    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('bandas', { show_in_menu: true }),
    )
  })

  it('cinco marcadas no banco: o contador ACUSA em vez de esconder a quinta', () => {
    renderPage(CATALOGO.map(c => (c.id === 'bandas' ? { ...c, show_in_menu: true } : c)))
    // Truncar em 4 esconderia a quinta da única tela onde ela pode ser desmarcada.
    expect(screen.getByTestId('contador-vagas')).toHaveTextContent('5 de 4 vagas')
    expect(switchOf('bandas')).toBeChecked()
  })
})

describe('MENU-07 — desligar persiste', () => {
  it('desligar grava show_in_menu false', async () => {
    renderPage()
    fireEvent.click(switchOf('anime'))
    await waitFor(() =>
      expect(hook.updateCategory).toHaveBeenCalledWith('anime', { show_in_menu: false }),
    )
  })
})

describe('MENU-08 — o arraste grava só o delta', () => {
  const drop = (targetId: string, draggedId: string) =>
    fireEvent.drop(screen.getByTestId(`vaga-${targetId}`), {
      dataTransfer: { getData: () => draggedId, setData: vi.fn() },
    })

  it('soltar entre irmãs grava apenas as linhas que mudaram de posição', async () => {
    renderPage()
    drop('kpop', 'games')

    await waitFor(() => expect(hook.updateSortOrders).toHaveBeenCalled())
    const [moves] = hook.updateSortOrders.mock.calls[0] as [{ id: string; sort_order: number }[]]
    // Arrastar Games para o lugar de K-Pop reordena o trecho, não a lista inteira (são 5 irmãs).
    expect(moves.length).toBeLessThan(5)
    expect(moves.every(m => typeof m.sort_order === 'number')).toBe(true)
  })

  it('soltar em outro ramo NÃO grava — mudar de pai é a tela de Categorias', async () => {
    renderPage()
    // "naruto" é filho de "anime"; "kpop" é filho de "bottons".
    drop('kpop', 'naruto')

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(vi.mocked(toast).mock.calls[0][0]).toMatchObject({ variant: 'destructive' })
    expect(hook.updateSortOrders).not.toHaveBeenCalled()
  })

  it('não há alça de arraste em categoria fora do menu', () => {
    renderPage()
    expect(screen.getByTestId('vaga-anime')).toHaveAttribute('draggable', 'true')
    expect(screen.getByTestId('vaga-bandas')).toHaveAttribute('draggable', 'false')
  })
})

describe('MENU-09 — as entradas fixas', () => {
  it('aparecem travadas, com a rota, e fora da contagem de vagas', () => {
    renderPage()
    expect(screen.getByTestId('fixa-Crie o Seu')).toHaveTextContent('/crie-seu-botton')
    expect(screen.getByTestId('fixa-Sobre')).toHaveTextContent('/sobre')
    // Sem elas a tela diz "4 vagas" e a loja mostra 6 itens.
    expect(screen.getByTestId('contador-vagas')).toHaveTextContent('4 de 4 vagas')
    expect(within(screen.getByTestId('fixa-Sobre')).queryByRole('switch')).toBeNull()
  })

  it('a prévia da barra mostra as entradas do menu seguidas das duas fixas', () => {
    renderPage()
    expect(screen.getByTestId('previa-fixa-Crie o Seu')).toBeInTheDocument()
    expect(screen.getByTestId('previa-fixa-Sobre')).toBeInTheDocument()
  })

  it('menu vazio: a prévia avisa em vez de mostrar uma barra que parece certa', () => {
    renderPage(CATALOGO.map(c => ({ ...c, show_in_menu: false })))
    expect(screen.getByTestId('previa-vazia')).toHaveTextContent('Nenhuma categoria no menu')
  })
})

describe('MENU-10 — categoria marcada e inativa', () => {
  it('é sinalizada como fora da loja, e continua ocupando a vaga', () => {
    renderPage(CATALOGO.map(c => (c.id === 'anime' ? { ...c, active: false } : c)))
    expect(screen.getByTestId('vaga-anime')).toHaveTextContent('não aparece na loja')
    // A vaga fica reservada: se não contasse, reativá-la depois faria a barra ter 5 itens.
    expect(screen.getByTestId('contador-vagas')).toHaveTextContent('4 de 4 vagas')
  })
})

describe('MENU-24 / MENU-26 — o card promocional', () => {
  const promoSwitch = () => screen.getByLabelText('Ativar card promocional')

  it('o painel abre na primeira entrada do menu, com as subcategorias em leitura', () => {
    renderPage()
    expect(screen.getByText('Painel de “Anime”')).toBeInTheDocument()
    expect(screen.getByText('Naruto · Villains')).toBeInTheDocument()
    expect(screen.getByText('Editar em Categorias →')).toHaveAttribute('href', '/admin/categorias')
  })

  it('ativar o card grava um destino já escolhido — nunca um jsonb sem category_id', async () => {
    renderPage()
    fireEvent.click(promoSwitch())

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalled())
    const [id, payload] = hook.updateCategory.mock.calls[0] as [string, { menu_promo: unknown }]
    expect(id).toBe('anime')
    expect(payload.menu_promo).toMatchObject({ category_id: expect.any(String) })
    expect((payload.menu_promo as { category_id: string }).category_id).not.toBe('')
  })

  it('desligar grava menu_promo nulo — nulo é "sem card", não objeto vazio', async () => {
    renderPage(
      CATALOGO.map(c => (c.id === 'anime' ? { ...c, menu_promo: { category_id: 'villains' } } : c)),
    )
    fireEvent.click(promoSwitch())
    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalledWith('anime', { menu_promo: null }))
  })

  it('com destino resolvido mostra o link e a contagem que vem da view', () => {
    renderPage(
      CATALOGO.map(c => (c.id === 'anime' ? { ...c, menu_promo: { category_id: 'villains' } } : c)),
    )
    expect(screen.getByText('/colecao/villains · 12 produtos')).toBeInTheDocument()
  })

  it('título vazio mostra o nome do destino como placeholder — o valor herdado', () => {
    renderPage(
      CATALOGO.map(c => (c.id === 'anime' ? { ...c, menu_promo: { category_id: 'villains' } } : c)),
    )
    expect(screen.getByLabelText('Título')).toHaveAttribute('placeholder', 'Villains')
    expect(screen.getByLabelText('Texto')).toHaveAttribute('placeholder', '12 pins dos vilões.')
  })

  it('destino OCULTO é acusado na tela (MENU-26)', () => {
    renderPage(
      CATALOGO.map(c => {
        if (c.id === 'anime') return { ...c, menu_promo: { category_id: 'villains' } }
        if (c.id === 'villains') return { ...c, active: false }
        return c
      }),
    )
    expect(screen.getByTestId('promo-destino-invalido')).toHaveTextContent('está oculta')
  })

  it('destino APAGADO é acusado na tela (MENU-26)', () => {
    renderPage(
      CATALOGO.filter(c => c.id !== 'villains').map(c =>
        c.id === 'anime' ? { ...c, menu_promo: { category_id: 'villains' } } : c,
      ),
    )
    expect(screen.getByTestId('promo-destino-invalido')).toBeInTheDocument()
  })
})

describe('falha de leitura é superfície explícita', () => {
  it('mostra o erro e um botão de tentar de novo — não uma lista vazia', async () => {
    // Foi engolir este erro que fez a tela de Coleções parecer "sem conteúdo" por meses, em cima de
    // uma tabela que nunca existiu.
    renderPage([], { error: 'Could not find the table' })
    expect(screen.getByTestId('menu-erro')).toHaveTextContent('Could not find the table')

    fireEvent.click(screen.getByRole('button', { name: /Tentar de novo/ }))
    await waitFor(() => expect(hook.fetchCategories).toHaveBeenCalled())
  })
})
