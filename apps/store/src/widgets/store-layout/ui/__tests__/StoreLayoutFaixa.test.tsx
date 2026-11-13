import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

/**
 * A faixa de avisos mora no `StoreLayout`, antes do cabeçalho — e por isso aparece em toda página do
 * layout (a Home, as categorias, o produto) e em nenhuma das telas de pagamento, que vivem fora dele.
 *
 * Duas metades: o layout real monta a faixa antes do `<header>` (componente), e o `App.tsx` real põe
 * as rotas certas dentro e fora do layout (lido do disco, molde de `contadorMontado.test.tsx`).
 */

vi.mock('@/widgets/announcement-bar', () => ({
  AnnouncementBar: () => <section aria-label="Avisos da loja" data-testid="faixa" />,
}))
vi.mock('@/widgets/header/ui/Header', () => ({ default: () => <header data-testid="header" /> }))
vi.mock('@/widgets/footer/ui/Footer', () => ({ default: () => <div /> }))
vi.mock('@/widgets/mobile-nav/ui/MobileNav', () => ({ default: () => <nav /> }))
vi.mock('@/widgets/whatsapp-float/ui/WhatsAppFloat', () => ({ default: () => null }))

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

describe('a faixa de avisos no StoreLayout', () => {
  it.each([
    ['/', 'home'],
    ['/joias-afetivas', 'colecao'],
    ['/produtos/joia-de-leite-materno', 'produto'],
  ])('em %s a faixa vem antes do cabeçalho', (caminho, pagina) => {
    renderAt(caminho)

    expect(screen.getByText(pagina)).toBeInTheDocument()
    const faixa = screen.getByTestId('faixa')
    const header = screen.getByTestId('header')
    expect(faixa.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

const APP = readFileSync(resolve(__dirname, '../../../../app/App.tsx'), 'utf-8')

/** Linha e bloco na MESMA varredura (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/**
 * O bloco das rotas do `StoreLayout`, do `<Route element={<StoreLayout />}>` até o `</Route>` que o
 * fecha — ou `null`, que derruba a âncora em vez de virar bloco vazio que aprova tudo.
 */
const blocoDoLayout = (fonte: string): { dentro: string; fora: string } | null => {
  const codigo = semComentario(fonte)
  const abre = codigo.indexOf('<Route element={<StoreLayout />}>')
  if (abre === -1) return null
  const fecha = codigo.indexOf('</Route>', abre)
  if (fecha === -1) return null
  return { dentro: codigo.slice(abre, fecha), fora: codigo.slice(0, abre) + codigo.slice(fecha) }
}

const rota = (caminho: string) => new RegExp(`<Route\\s+path="${caminho.replace(/[/*]/g, '\\$&')}"`)

describe('as rotas da faixa no App', () => {
  const bloco = blocoDoLayout(APP)

  it('âncora: o bloco do StoreLayout foi recortado, e há UM fechamento de rota no arquivo', () => {
    expect(bloco).not.toBeNull()
    expect(semComentario(APP).match(/<\/Route>/g)).toHaveLength(1)
  })

  it.each(['/', '/produtos/:slug', '/:slug'])('%s fica dentro do StoreLayout — tem faixa', caminho => {
    expect(bloco!.dentro).toMatch(rota(caminho))
    expect(bloco!.fora).not.toMatch(rota(caminho))
  })

  it.each(['/checkout', '/pedido-montado', '/pedido/:id/pagamento', '/pagar-com-cartao', '*'])(
    '%s fica fora do StoreLayout — sem faixa',
    caminho => {
      expect(bloco!.fora).toMatch(rota(caminho))
      expect(bloco!.dentro).not.toMatch(rota(caminho))
    },
  )

  it('SENSOR: o checkout movido para dentro do layout é acusado', () => {
    const mutado = APP.replace(
      '<Route path="/:slug" element={<CategoryPage />} />',
      '<Route path="/checkout" element={<CheckoutPage />} />\n<Route path="/:slug" element={<CategoryPage />} />',
    )
    expect(mutado).not.toBe(APP)
    expect(blocoDoLayout(mutado)!.dentro).toMatch(rota('/checkout'))
  })
})
