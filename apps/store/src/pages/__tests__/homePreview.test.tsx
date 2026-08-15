// Feature 25 — a `HomePage` dentro do iframe do painel (`PRV-01`, `PRV-02`, `PRV-05`).
//
// Três coisas que falhariam em silêncio se não fossem medidas aqui: a consulta continuar viva em
// modo prévia (e sobrescrever o rascunho um instante depois), o clique navegando e tirando o iframe
// da home, e o modo ligando fora de um iframe.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  DEFAULT_HOME_COMPOSITION,
  PREVIEW_SECTION_ATTR,
  PREVIEW_SOURCE,
  type HomeSection,
} from '@estrelinha/core/home'

/* eslint-disable @typescript-eslint/no-explicit-any */
const { categorias, produtos, useHomeSectionsMock } = vi.hoisted(() => ({
  categorias: { data: [] as any[] },
  produtos: { data: [] as any[] },
  useHomeSectionsMock: vi.fn(),
}))

vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, max_installments: 6 }),
  useShippingSettings: () => ({ free_shipping_threshold: 150 }),
}))

// O hook real da leitura é dublado para se poder medir **se ele foi chamado desligado** — que é a
// única forma de provar `PRV-02 AC 1` sem uma consulta de verdade.
vi.mock('@/entities/home/api/useHomeSections', () => ({ useHomeSections: useHomeSectionsMock }))

import HomePage from '../HomePage'

const paiFalso = { postMessage: vi.fn() }
const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

const emIframe = () =>
  Object.defineProperty(window, 'parent', { value: paiFalso, configurable: true })

const secao = (type: string, over: Partial<HomeSection> = {}): HomeSection => {
  const semeada = DEFAULT_HOME_COMPOSITION.find(s => s.type === type)!
  return { ...semeada, ...over } as HomeSection
}

const receber = (data: unknown) => {
  const evento = new MessageEvent('message', { data })
  Object.defineProperty(evento, 'source', { value: paiFalso })
  act(() => {
    window.dispatchEvent(evento)
  })
}

const renderPage = () => render(<MemoryRouter><HomePage /></MemoryRouter>)

beforeEach(() => {
  paiFalso.postMessage.mockClear()
  useHomeSectionsMock.mockReset()
  useHomeSectionsMock.mockReturnValue({ data: [secao('newsletter', { id: 'do-banco' })] })
  categorias.data = []
  produtos.data = []
  window.history.replaceState({}, '', '/?preview=1')
  emIframe()
})

afterEach(() => {
  if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
  window.history.replaceState({}, '', '/')
})

describe('PRV-02 — em modo prévia a consulta é DESLIGADA, não filtrada depois', () => {
  it('`useHomeSections` é chamado com `enabled: false`', () => {
    renderPage()
    expect(useHomeSectionsMock).toHaveBeenCalledWith({ enabled: false })
  })

  it('fora do modo prévia é chamado com `enabled: true`', () => {
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
    renderPage()
    expect(useHomeSectionsMock).toHaveBeenCalledWith({ enabled: true })
  })

  it('o que a prévia desenha é o RASCUNHO, e não o que a consulta devolveu', async () => {
    renderPage()
    receber({
      source: PREVIEW_SOURCE,
      type: 'draft',
      sections: [secao('hero', { id: 'do-rascunho' })],
    })

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('O que você ama,')
    expect(screen.queryByRole('heading', { name: 'Quer saber das novidades?' })).toBeNull()
  })
})

describe('PRV-01 — fora do iframe a página é a normal', () => {
  it('sem iframe não há invólucro de prévia e o conteúdo vem da consulta', () => {
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
    const { container } = renderPage()

    expect(screen.queryByTestId('home-previa')).toBeNull()
    expect(container.querySelectorAll(`[${PREVIEW_SECTION_ATTR}]`)).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
  })
})

describe('PRV-05 — o clique não navega, ele seleciona', () => {
  it('clicar dentro de um bloco devolve o id dele ao painel', async () => {
    renderPage()
    receber({
      source: PREVIEW_SOURCE,
      type: 'draft',
      sections: [secao('hero', { id: 'sec-hero' })],
    })

    const titulo = await screen.findByRole('heading', { level: 1 })
    paiFalso.postMessage.mockClear()
    titulo.click()

    expect(paiFalso.postMessage).toHaveBeenCalledWith(
      { source: PREVIEW_SOURCE, type: 'select', sectionId: 'sec-hero' },
      '*',
    )
  })

  it('o clique é cancelado — o `<a>` do renderizador não navega', async () => {
    renderPage()
    receber({
      source: PREVIEW_SOURCE,
      type: 'draft',
      sections: [secao('hero', { id: 'sec-hero' })],
    })

    const cta = await screen.findByRole('link', { name: /Explorar/i })
    const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
    cta.dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(true)
  })

  it('clique fora de qualquer bloco não posta nada', () => {
    renderPage()
    paiFalso.postMessage.mockClear()

    screen.getByTestId('home-previa').click()

    expect(paiFalso.postMessage).not.toHaveBeenCalled()
  })
})
