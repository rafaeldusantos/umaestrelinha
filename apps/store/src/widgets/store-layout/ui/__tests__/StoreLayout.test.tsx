import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// Uma barra de rodapé por vez. Empilhar a barra de compra da página do produto sobre o `MobileNav`
// somava 133px de rodapé — com o header, 30% de um iPhone SE. O que se prova aqui é que as duas
// nunca coexistem, e que a folga do fim do documento vem DEPOIS do rodapé.

vi.mock('@/widgets/header/ui/Header', () => ({ default: () => <div>header</div> }))
vi.mock('@/widgets/footer/ui/Footer', () => ({ default: () => <div data-testid="footer" /> }))
vi.mock('@/widgets/mobile-nav/ui/MobileNav', () => ({
  default: () => <nav data-testid="mobile-nav" />,
}))
vi.mock('@/widgets/cart-drawer/ui/CartDrawer', () => ({ default: () => null }))
vi.mock('@/widgets/whatsapp-float/ui/WhatsAppFloat', () => ({ default: () => null }))
vi.mock('@/widgets/mobile-menu', () => ({ MobileMenu: () => null }))
vi.mock('@/features/auth', () => ({ AuthOverlay: () => null }))
vi.mock('@/features/search', () => ({ SearchOverlay: () => null }))

import StoreLayout from '../StoreLayout'

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<div>home</div>} />
          <Route path="/:slug" element={<div>colecao</div>} />
          <Route path="/produtos/:slug" element={<div>produto</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('StoreLayout — uma barra de rodapé por vez', () => {
  it('na página do produto o MobileNav sai de cena — a barra de compra ocupa o lugar', () => {
    renderAt('/produtos/joia-de-leite-materno')

    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
    expect(screen.getByText('produto')).toBeInTheDocument()
  })

  it('nas demais rotas o MobileNav segue montado', () => {
    renderAt('/')
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
  })

  it('a listagem de coleção mantém as abas', () => {
    renderAt('/joias-afetivas')
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
  })
})

describe('StoreLayout — a folga da barra fixa fica no fim do documento', () => {
  /**
   * Era um `padding-bottom` no `main`, o que reservava espaço ANTES do rodapé: rolando até o fim de
   * verdade, a barra fixa cobria a última faixa do `Footer` (cujo `pb-8` não cobre 64px). Este teste
   * prende a ordem — folga depois do rodapé —, que é a parte fácil de desfazer sem perceber.
   */
  // O VALOR da reserva se prova em `shared/lib/__tests__/storeChrome.test.ts`: o CSSOM do jsdom
  // rejeita `env()`, então o `style` do nó chega vazio aqui e não há o que ler. O que este arquivo
  // prende é a ORDEM, que é a parte fácil de desfazer sem perceber.

  it('o espaçador vem depois do Footer na ordem do documento', () => {
    renderAt('/')
    const footer = screen.getByTestId('footer')
    const spacer = screen.getByTestId('bottom-bar-reserve')

    // `DOCUMENT_POSITION_FOLLOWING` = o espaçador vem depois do rodapé.
    expect(footer.compareDocumentPosition(spacer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('o main não carrega mais a reserva — ela seria no lugar errado', () => {
    const { container } = renderAt('/')
    const main = container.querySelector('main')!

    expect(main.className).not.toMatch(/pb-/)
  })

  it('a reserva existe também na página do produto, onde a barra é a de compra', () => {
    // A altura é a mesma nas duas barras, e é isso que deixa a reserva ser incondicional.
    renderAt('/produtos/joia-de-leite-materno')

    expect(screen.getByTestId('bottom-bar-reserve')).toBeInTheDocument()
  })
})
