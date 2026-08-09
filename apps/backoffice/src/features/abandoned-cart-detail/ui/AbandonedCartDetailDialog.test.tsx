import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { DbAbandonedCart } from '@estrelinha/supabase/types/abandonedCart'

/**
 * `URL-01` — o item do carrinho abandonado abre a LOJA, não uma rota do painel.
 *
 * O defeito que este teste congela é anterior a esta feature e passava despercebido por um motivo
 * específico: o nome do produto era um `<Link to={…}>` para o caminho do produto na loja, e `<Link>`
 * é do roteador **do backoffice**. Aquele caminho não existe entre as rotas de `/admin/*`, então
 * clicar no produto levava a admin para a **404 do painel** — nunca para a loja. Nada quebrava: o
 * link existia, era clicável, e simplesmente não ia a lugar nenhum útil.
 *
 * `storeUrlFor` é dublado aqui de propósito: ele lê `VITE_STORE_URL` no escopo do módulo, e um teste
 * que dependesse do `.env` da máquina passaria ou falharia por ambiente. Que ele monta o caminho
 * canônico é provado no seu próprio nível, em `SlugField.test.tsx`. O que se prova AQUI é o que é
 * desta tela: que ela pergunta pelo endereço da loja e que o entrega como link externo.
 */

const { storeUrlMock } = vi.hoisted(() => ({ storeUrlMock: vi.fn() }))
vi.mock('@/features/product-form/lib/storeUrl', () => ({ storeUrlFor: storeUrlMock }))

import AbandonedCartDetailDialog from './AbandonedCartDetailDialog'

const cart = (): DbAbandonedCart => ({
  id: 'cart-1',
  customer_email: 'cliente@exemplo.com',
  customer_name: 'Cliente',
  customer_id: null,
  items: [
    {
      product_id: 'p1',
      product_name: 'Joia de leite materno',
      product_image: null,
      product_slug: 'joia-de-leite-materno',
      size: '',
      finish: '',
      quantity: 1,
      unit_price: 39000,
    },
  ],
  subtotal: 39000,
  coupon_code: null,
  marketing_consent: false,
  status: 'abandoned',
  reminder_sent_at: null,
  reminder_sent_count: 0,
  recovered_order_id: null,
  last_activity_at: '2026-08-01T12:00:00Z',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T12:00:00Z',
})

const setup = () =>
  render(
    <MemoryRouter>
      <AbandonedCartDetailDialog cart={cart()} open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  )

beforeEach(() => {
  storeUrlMock.mockReset()
})

describe('AbandonedCartDetailDialog — o item abre a loja (URL-01)', () => {
  it('pergunta o endereço da loja pelo slug do item', () => {
    storeUrlMock.mockReturnValue('https://umaestrelinha.com.br/produtos/joia-de-leite-materno')

    setup()

    expect(storeUrlMock).toHaveBeenCalledWith('joia-de-leite-materno')
  })

  it('o nome do produto é um link EXTERNO para a loja, em aba nova', () => {
    storeUrlMock.mockReturnValue('https://umaestrelinha.com.br/produtos/joia-de-leite-materno')

    setup()

    const link = screen.getByRole('link', { name: /Joia de leite materno/ })
    expect(link).toHaveAttribute(
      'href',
      'https://umaestrelinha.com.br/produtos/joia-de-leite-materno',
    )
    expect(link).toHaveAttribute('target', '_blank')
    // `noreferrer` acompanha todo `target="_blank"` — sem ele a página aberta ganha `window.opener`.
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('o destino é outro host, e não uma rota do painel', () => {
    storeUrlMock.mockReturnValue('https://umaestrelinha.com.br/produtos/joia-de-leite-materno')

    setup()

    const href = screen.getByRole('link', { name: /Joia de leite materno/ }).getAttribute('href')
    // A prova do defeito: caminho relativo aqui significa rota do backoffice, que é a 404 do painel.
    expect(href.startsWith('/')).toBe(false)
    expect(href).toMatch(/^https:\/\//)
  })

  it('sem loja configurada, o nome vira texto — nunca um link morto', () => {
    storeUrlMock.mockReturnValue(null)

    setup()

    expect(screen.queryByRole('link', { name: /Joia de leite materno/ })).not.toBeInTheDocument()
    expect(screen.getByText('Joia de leite materno')).toBeInTheDocument()
  })
})
