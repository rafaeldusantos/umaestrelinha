import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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
