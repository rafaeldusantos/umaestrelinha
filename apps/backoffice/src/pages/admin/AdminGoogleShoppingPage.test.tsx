import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CUTOVER_STEPS } from '@/features/google-shopping/lib/cutover'

/**
 * Feature 30 · `GSH-15`..`GSH-17`, `GSH-22` — a tela que liga o feed.
 *
 * O que precisa ser provado aqui não é layout: é que **desligar depois de ligado avisa o efeito**, e
 * que **erro de leitura não vira zero**. As duas coisas custam o catálogo do Google se estiverem
 * erradas, e nenhuma das duas quebra nada visível quando quebra.
 */

const settings = vi.hoisted(() => ({
  atual: {
    enabled: false,
    ever_enabled: false,
    merchant_id: '685367464',
    default_product_category: 'Apparel & Accessories > Jewelry',
    last_fetched_at: null as string | null,
  },
}))
const salvar = vi.hoisted(() =>
  vi.fn(async (_input: { key: string; value: Record<string, unknown> }) => {}),
)
const inventario = vi.hoisted(() => ({
  estado: {
    data: {
      publicadas: 3233,
      total: 3245,
      porMotivo: { produto_inativo: 8, variacao_inativa: 3, sem_preco: 1 },
      excluidas: [
        {
          variantId: 'v1',
          productId: 'p1',
          productName: 'Pingente com cinzas',
          productSlug: 'pingente',
          motivo: 'sem_preco' as const,
        },
      ],
    } as unknown,
    isLoading: false,
    isError: false,
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGoogleShoppingSettings: () => settings.atual,
  useUpdateSettings: () => ({ mutateAsync: salvar, isPending: false }),
}))
vi.mock('@/features/google-shopping/model/useFeedInventory', () => ({
  useFeedInventory: () => inventario.estado,
}))
vi.mock('@/shared/lib/storeOrigin', () => ({
  storeOrigin: () => 'https://umaestrelinha.com.br',
}))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminGoogleShoppingPage from './AdminGoogleShoppingPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminGoogleShoppingPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  salvar.mockClear()
  settings.atual = {
    enabled: false,
    ever_enabled: false,
    merchant_id: '685367464',
    default_product_category: 'Apparel & Accessories > Jewelry',
    last_fetched_at: null,
  }
  // `data` é REPOSTO por inteiro, não espalhado: espalhar preservava a mutação do caso anterior, e
  // um teste passava a depender da ordem de execução do arquivo.
  inventario.estado = {
    data: {
      publicadas: 3233,
      total: 3245,
      porMotivo: { produto_inativo: 8, variacao_inativa: 3, sem_preco: 1 },
      excluidas: [
        {
          variantId: 'v1',
          productId: 'p1',
          productName: 'Pingente com cinzas',
          productSlug: 'pingente',
          motivo: 'sem_preco' as const,
        },
      ],
    } as unknown,
    isLoading: false,
    isError: false,
  }
})

describe('estado da integração (GSH-15)', () => {
  it('mostra o ID da conta Merchant Center', () => {
    renderPage()
    expect(screen.getByText('685367464')).toBeTruthy()
  })

  it('mostra o endereço absoluto do feed, pronto para colar no Google', () => {
    renderPage()
    expect(
      screen.getByText('https://umaestrelinha.com.br/feeds/google-shopping.xml'),
    ).toBeTruthy()
  })

  it('desligada, diz que o endereço responde 404', () => {
    renderPage()
    // A frase aparece duas vezes de propósito — no estado e no passo 2 do cutover. A asserção é
    // sobre a do ESTADO, então o escopo é a seção dele.
    const secao = document.querySelector('[aria-labelledby="gs-estado"]') as HTMLElement
    expect(within(secao).getByText(/responde 404/i)).toBeTruthy()
  })

  it('ligada, diz que o Google pode buscar', () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    expect(screen.getByText(/o Google pode buscar/i)).toBeTruthy()
  })

  it('sem busca ainda, diz isso explicitamente em vez de deixar vazio', () => {
    renderPage()
    expect(screen.getByText('O Google ainda não buscou o feed')).toBeTruthy()
  })

  it('com busca, mostra a data', () => {
    settings.atual = { ...settings.atual, last_fetched_at: '2026-08-16T12:00:00.000Z' }
    renderPage()
    expect(screen.getByText(/2026/)).toBeTruthy()
  })
})

describe('os passos do cutover (GSH-17)', () => {
  it('mostra os cinco passos', () => {
    renderPage()
    expect(CUTOVER_STEPS).toHaveLength(5)
    for (const passo of CUTOVER_STEPS) {
      expect(screen.getByText(passo.titulo)).toBeTruthy()
    }
  })

  it.each(CUTOVER_STEPS.map((p, i) => [i + 1, p.titulo] as const))(
    'o passo %i está na tela: %s',
    (_i, titulo) => {
      renderPage()
      expect(screen.getByText(titulo)).toBeTruthy()
    },
  )

  it('os passos aparecem na ordem em que precisam ser executados', () => {
    renderPage()
    const corpo = document.body.textContent ?? ''
    const posicoes = CUTOVER_STEPS.map(p => corpo.indexOf(p.titulo))
    expect(posicoes.every(i => i >= 0)).toBe(true)
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes)
  })

  it('o DNS vem antes de ligar aqui — ligar antes publica links da loja antiga', () => {
    expect(CUTOVER_STEPS[0].onde).toBe('DNS')
    expect(CUTOVER_STEPS[1].onde).toBe('Aqui')
  })
})

describe('o interruptor (GSH-15, GSH-16)', () => {
  it('ligar grava enabled e ever_enabled', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar.mock.calls[0][0]).toMatchObject({
      key: 'google_shopping',
      value: expect.objectContaining({ enabled: true, ever_enabled: true }),
    })
  })

  it('desligar SEM histórico não pede confirmação', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: false }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar.mock.calls[0][0].value).toMatchObject({ enabled: false })
  })

  it('desligar COM histórico exige confirmação e não grava antes dela', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    expect(await screen.findByRole('alertdialog')).toBeTruthy()
    expect(salvar).not.toHaveBeenCalled()
  })

  it('o aviso DIZ que os produtos saem do Google — a frase é o motivo do diálogo existir', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText(/tira seus produtos do Google/i)).toBeTruthy()
    expect(within(dialogo).getByText(/saem do Shopping/i)).toBeTruthy()
  })

  it('cancelar a confirmação não grava nada', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    const dialogo = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: /manter ligada/i }))
    expect(salvar).not.toHaveBeenCalled()
  })

  it('confirmar desliga', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    const dialogo = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: /desligar mesmo assim/i }))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar.mock.calls[0][0].value).toMatchObject({ enabled: false, ever_enabled: true })
  })

  it('ever_enabled nunca volta a false — é memória de que o Google já recebeu o feed', async () => {
    settings.atual = { ...settings.atual, enabled: true, ever_enabled: true }
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    const dialogo = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: /desligar mesmo assim/i }))
    await waitFor(() => expect(salvar).toHaveBeenCalled())
    expect(salvar.mock.calls[0][0].value.ever_enabled).toBe(true)
  })
})

describe('o que o feed publica (GSH-22)', () => {
  it('mostra a contagem de publicáveis e o total', () => {
    renderPage()
    expect(screen.getByText('3.233')).toBeTruthy()
    expect(screen.getByText(/3\.245 variações/)).toBeTruthy()
  })

  it('mostra uma linha por motivo, inclusive as zeradas', () => {
    inventario.estado = {
      ...inventario.estado,
      data: {
        publicadas: 10,
        total: 11,
        porMotivo: { produto_inativo: 0, variacao_inativa: 1, sem_preco: 0 },
        excluidas: [],
      },
    }
    renderPage()
    expect(screen.getByText('Produto desativado')).toBeTruthy()
    expect(screen.getByText('Variação desativada')).toBeTruthy()
    expect(screen.getByText('Variação sem preço')).toBeTruthy()
  })

  it('a lista de excluídas leva ao produto — exclusão acionável, não só número', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /ver as 1 de fora/i }))
    const link = screen.getByRole('link', { name: 'Pingente com cinzas' })
    expect(link.getAttribute('href')).toBe('/admin/produtos/p1/editar')
  })

  it('erro de leitura NÃO vira zero — diz que a falha é da tela', () => {
    inventario.estado = { data: undefined, isLoading: false, isError: true }
    renderPage()
    expect(screen.getByText(/falha desta tela/i)).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('enquanto carrega, não afirma número nenhum', () => {
    inventario.estado = { data: undefined, isLoading: true, isError: false }
    renderPage()
    expect(screen.getByText(/contando o catálogo/i)).toBeTruthy()
  })
})
