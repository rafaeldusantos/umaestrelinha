import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MENU_PREVIEW_SOURCE } from '@estrelinha/core/menu'
import { PREVIEW_SOURCE } from '@estrelinha/core/home'

/**
 * `PRF-11` — **os overlays de gesto não entram no chunk inicial**.
 *
 * Gaveta do carrinho, busca em tela cheia, folha de menu do celular e login por OTP ficavam montados
 * em toda rota, desde o primeiro pixel. Nenhum aparece sem alguém tocar em alguma coisa, e o login
 * sozinho arrasta sete passos de formulário.
 *
 * O que jsdom consegue provar é a **montagem**: o overlay só existe na árvore depois da primeira
 * abertura. Que o arquivo saiu do chunk de entrada é prova do build, e está em `viteChunks`.
 *
 * O segundo comportamento provado aqui é o **latch**: fechar não desmonta. Desmontar seria o desenho
 * óbvio e cortaria a animação de saída do `Sheet`/`Dialog` pela metade — e, depois de baixado, manter
 * o chunk montado não custa rede nenhuma.
 */

vi.mock('@/widgets/header/ui/Header', () => ({ default: () => <div>header</div> }))
vi.mock('@/widgets/footer/ui/Footer', () => ({ default: () => <div>footer</div> }))
vi.mock('@/widgets/mobile-nav/ui/MobileNav', () => ({ default: () => <nav /> }))
vi.mock('@/widgets/whatsapp-float/ui/WhatsAppFloat', () => ({ default: () => null }))

// Os quatro dublês estão nos caminhos PROFUNDOS, que são os que o `lazy` importa. Se alguém trocar
// o import por um barrel, estes dublês param de casar e o teste acusa.
vi.mock('@/widgets/cart-drawer/ui/CartDrawer', () => ({
  default: () => <div data-testid="gaveta" />,
}))
vi.mock('@/features/search/ui/SearchOverlay', () => ({
  default: () => <div data-testid="busca" />,
}))
vi.mock('@/widgets/mobile-menu/ui/MobileMenu', () => ({
  default: () => <div data-testid="menu" />,
}))
vi.mock('@/features/auth/ui/AuthOverlay', () => ({
  default: () => <div data-testid="entrar" />,
}))

import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useMenuUiStore } from '@/entities/category/model/menuUiStore'
import { useAuthUiStore } from '@/features/auth/model/authUiStore'
import { useSearchUiStore } from '@/features/search/model/searchUiStore'
import StoreLayout from '../StoreLayout'

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<div>home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  useCartUiStore.setState({ open: false })
  useSearchUiStore.setState({ open: false })
  useMenuUiStore.setState({ open: false })
  useAuthUiStore.setState({ isOpen: false })
})

describe('StoreLayout — os overlays nascem fechados e desmontados (PRF-11)', () => {
  it('com tudo fechado, nenhum dos quatro está na árvore', () => {
    renderLayout()

    expect(screen.queryByTestId('gaveta')).not.toBeInTheDocument()
    expect(screen.queryByTestId('busca')).not.toBeInTheDocument()
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('entrar')).not.toBeInTheDocument()
  })

  it('a moldura da loja continua inteira sem eles', () => {
    // O que sai é o painel de gesto, não o layout: header, rodapé e a página seguem montados.
    renderLayout()

    expect(screen.getByText('header')).toBeInTheDocument()
    expect(screen.getByText('footer')).toBeInTheDocument()
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('abrir a gaveta do carrinho a monta', async () => {
    renderLayout()

    act(() => useCartUiStore.getState().openCart())

    expect(await screen.findByTestId('gaveta')).toBeInTheDocument()
  })

  it('abrir a busca monta a busca — e só ela', async () => {
    renderLayout()

    act(() => useSearchUiStore.getState().openSearch())

    expect(await screen.findByTestId('busca')).toBeInTheDocument()
    expect(screen.queryByTestId('entrar')).not.toBeInTheDocument()
  })

  it('abrir a folha de menu a monta', async () => {
    renderLayout()

    act(() => useMenuUiStore.getState().openMenu())

    expect(await screen.findByTestId('menu')).toBeInTheDocument()
  })

  it('abrir o login o monta', async () => {
    renderLayout()

    act(() => useAuthUiStore.getState().open())

    expect(await screen.findByTestId('entrar')).toBeInTheDocument()
  })

  it('FECHAR não desmonta — senão a animação de saída morre no meio', async () => {
    renderLayout()

    act(() => useCartUiStore.getState().openCart())
    expect(await screen.findByTestId('gaveta')).toBeInTheDocument()

    act(() => useCartUiStore.getState().closeCart())

    expect(screen.getByTestId('gaveta')).toBeInTheDocument()
  })
})

/**
 * `NAV-43` × `PRF-11` — **na prévia do celular, a folha do menu precisa existir sem toque**.
 *
 * Achado na prova em navegador da feature `86` (T23): a folha abre sozinha na prévia por um efeito
 * que mora DENTRO do `MobileMenu`; com o latch da `38` o `MobileMenu` só monta depois da primeira
 * abertura, então o efeito nunca rodava e a prévia do celular mostrava a home e um hambúrguer. Quem
 * decide agora é o layout: dentro da prévia, a folha acompanha o tamanho do quadro — aberta no de
 * 390, fechada no de 1024 (no computador ela cobriria a barra que a prévia existe para mostrar).
 */
describe('StoreLayout — a folha do menu na prévia do painel (NAV-43)', () => {
  const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')
  const matchMediaOriginal = window.matchMedia
  let compacto = true
  const ouvintes = new Set<() => void>()

  const pai = { postMessage: vi.fn() }
  const entrarNaPrevia = () => {
    window.history.replaceState({}, '', '/?preview=1')
    Object.defineProperty(window, 'parent', { value: pai, configurable: true })
  }

  /** Uma mensagem vinda do pai — `event.source` só se define no evento já criado (jsdom). */
  const receber = (data: unknown) => {
    const evento = new MessageEvent('message', { data })
    Object.defineProperty(evento, 'source', { value: pai })
    act(() => {
      window.dispatchEvent(evento)
    })
  }

  /** O rascunho que SÓ a prévia do menu manda — é o que distingue o palco do menu do da Home. */
  const rascunhoDoMenu = () =>
    receber({
      source: MENU_PREVIEW_SOURCE,
      type: 'draft',
      draft: { categories: [], document: { version: 2, items: [] } },
    })

  beforeEach(() => {
    compacto = true
    ouvintes.clear()
    window.matchMedia = ((q: string) => ({
      get matches() {
        return q.includes('max-width: 767px') ? compacto : false
      },
      media: q,
      addEventListener: (_: string, f: () => void) => ouvintes.add(f),
      removeEventListener: (_: string, f: () => void) => ouvintes.delete(f),
    })) as unknown as typeof window.matchMedia
  })

  const sair = () => {
    if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
    window.history.replaceState({}, '', '/')
    window.matchMedia = matchMediaOriginal
  }

  it('no quadro do celular da prévia do MENU a folha monta e abre sem ninguém tocar', async () => {
    entrarNaPrevia()
    try {
      renderLayout()
      rascunhoDoMenu()
      expect(await screen.findByTestId('menu')).toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(true)
    } finally {
      sair()
    }
  })

  it('no quadro do computador ela não abre; trocar para o celular abre, e voltar fecha', async () => {
    compacto = false
    entrarNaPrevia()
    try {
      renderLayout()
      rascunhoDoMenu()
      expect(screen.queryByTestId('menu')).not.toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(false)

      compacto = true
      act(() => ouvintes.forEach(f => f()))
      expect(await screen.findByTestId('menu')).toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(true)

      compacto = false
      act(() => ouvintes.forEach(f => f()))
      expect(useMenuUiStore.getState().open).toBe(false)
    } finally {
      sair()
    }
  })

  /**
   * Q01 (`BUG-20261028-previa-da-home-no-celular-abre-o-menu`) — a prévia da HOME usa o mesmo
   * `?preview=1` dentro de iframe, e o lote 4 abria a folha nela também: a dona conferia a Home no
   * celular e via o menu por cima. Quem distingue os dois palcos é o canal: só o do menu manda
   * rascunho com o carimbo `MENU_PREVIEW_SOURCE`.
   */
  it('na prévia da HOME em 390 a folha NÃO abre — nem com as mensagens do canal da Home', async () => {
    entrarNaPrevia()
    try {
      renderLayout()
      receber({ source: PREVIEW_SOURCE, type: 'draft', sections: [] })
      receber({ source: PREVIEW_SOURCE, type: 'select', sectionId: 'x' })
      await act(async () => {})
      expect(screen.queryByTestId('menu')).not.toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(false)

      // E trocar de quadro na prévia da Home também não a abre.
      compacto = false
      act(() => ouvintes.forEach(f => f()))
      compacto = true
      act(() => ouvintes.forEach(f => f()))
      expect(useMenuUiStore.getState().open).toBe(false)
    } finally {
      sair()
    }
  })

  it('na prévia da Home, abrir pelo hambúrguer continua funcionando (a folha é da cliente)', async () => {
    entrarNaPrevia()
    try {
      renderLayout()
      act(() => useMenuUiStore.getState().openMenu())
      expect(await screen.findByTestId('menu')).toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(true)
    } finally {
      sair()
    }
  })

  it('fora da prévia (`?preview=1` sem iframe) nada abre sozinho, nem no celular', () => {
    window.history.replaceState({}, '', '/?preview=1')
    try {
      renderLayout()
      expect(screen.queryByTestId('menu')).not.toBeInTheDocument()
      expect(useMenuUiStore.getState().open).toBe(false)
    } finally {
      sair()
    }
  })
})
