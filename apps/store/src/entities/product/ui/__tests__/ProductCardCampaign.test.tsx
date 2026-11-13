import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import ProductCard from '../ProductCard'
import { mapDbToProduct } from '../../lib/mapProduct'

// O cartão da peça de campanha. A peça é montada pelo MAPEADOR a partir da linha do banco, como a
// vitrine a recebe: a faixa, o preço e o "de" que o cartão mostra são os que a leitura entrega.

const BLACK_FRIDAY = {
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-12-01T03:00:00Z',
}
const DIA_DAS_MAES = {
  id: 'camp-maes',
  name: 'Dia das Mães',
  badge_text: 'Dia das Mães',
  band_color: '#6E2433',
  accent_color: '#F6DCD8',
  ends_at: '2027-05-10T03:00:00Z',
}

const linha = (extra: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Pingente com cinzas',
  slug: 'pingente-com-cinzas',
  base_price: 209.9,
  original_price: null,
  images: [{ url: 'capa.webp' }],
  stock_policy: 'track',
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: true,
  is_featured: true,
  ...extra,
})

const marcada = (campanha = BLACK_FRIDAY, percent = 20, extra: Record<string, unknown> = {}) =>
  mapDbToProduct(linha({ product_campaigns: [{ percent, campaigns: campanha }], ...extra }))

const renderCard = (p = marcada()) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={p} />} />
        <Route path="/produtos/:slug" element={<div>rota-produto</div>} />
      </Routes>
    </MemoryRouter>,
  )

const plano = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
const faixa = () => screen.queryByTestId('faixa-da-campanha')

describe('o cartão da peça de campanha, durante a vigência', () => {
  it('mostra a faixa da campanha no pé da foto, com o texto e o percentual', () => {
    renderCard()
    const selo = screen.getByRole('img', { name: 'Black Friday, 20% de desconto' })
    expect(selo).toBe(faixa())
    // Dentro do palco da foto (o contêiner com os cantos de 20 px que cortam a faixa).
    expect(selo.parentElement).toHaveClass('relative', 'overflow-hidden', 'rounded-xl')
    expect(plano(selo)).toBe('Black Friday−20%')
  })

  it('a faixa usa as cores da campanha, cruzadas', () => {
    renderCard()
    expect(screen.getByText('Black Friday')).toHaveStyle({ backgroundColor: '#161514', color: '#C2A063' })
    expect(screen.getByText('−20%')).toHaveStyle({ backgroundColor: '#C2A063', color: '#161514' })
  })

  it('nenhum selo do canto na peça de campanha — nem desconto de hoje, Novo, Últimas ou Destaque', () => {
    renderCard(marcada(BLACK_FRIDAY, 20, { original_price: 259.9, base_price: 239.9 }))
    for (const selo of ['Novo', 'Destaque', 'Últimas']) expect(screen.queryByText(selo)).toBeNull()
    expect(screen.queryByText(/^-\d+%$/)).toBeNull()
  })

  it('o preço com desconto (R$ 167,92) e o cheio riscado, lido "De R$ 209,90"', () => {
    const { container } = renderCard()
    const riscado = container.querySelector('.line-through')
    expect(plano(riscado)).toBe('De R$ 209,90')
    // O "De " existe só para o leitor de tela.
    expect(riscado!.querySelector('.sr-only')?.textContent).toBe('De ')
    const preco = screen.getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 167,92')
    expect(preco).toBeInTheDocument()
    // O cheio vem ACIMA do preço com desconto.
    expect(riscado!.compareDocumentPosition(preco) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('"de/por" na campanha: cobra o menor (R$ 233,91) e risca o "de" (R$ 259,90)', () => {
    const { container } = renderCard(marcada(BLACK_FRIDAY, 10, { original_price: 259.9, base_price: 239.9 }))
    expect(plano(container.querySelector('.line-through'))).toBe('De R$ 259,90')
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 233,91')).toBeInTheDocument()
  })

  it('outra campanha ("Dia das Mães") mostra o texto e as cores dela', () => {
    renderCard(marcada(DIA_DAS_MAES, 15))
    expect(screen.getByRole('img', { name: 'Dia das Mães, 15% de desconto' })).toBeInTheDocument()
    expect(screen.getByText('Dia das Mães')).toHaveStyle({ backgroundColor: '#6E2433', color: '#F6DCD8' })
  })
})

describe('o cartão fora da vigência — a loja de hoje', () => {
  it('a peça marcada cuja campanha a leitura não entregou: preço de sempre, sem faixa, selos de hoje', () => {
    renderCard(mapDbToProduct(linha({ product_campaigns: [] })))
    expect(faixa()).toBeNull()
    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 209,90')).toBeInTheDocument()
    expect(document.querySelector('.line-through')).toBeNull()
  })

  it('o "de/por" de hoje continua com o selo de desconto do canto', () => {
    renderCard(mapDbToProduct(linha({ base_price: 239.9, original_price: 259.9 })))
    expect(faixa()).toBeNull()
    expect(screen.getByText('-8%')).toBeInTheDocument()
  })
})

describe('as miniaturas de cor com a faixa', () => {
  const comCor = (campanha: boolean) =>
    mapDbToProduct(
      linha({
        options: [{ name: 'Cor', values: ['Prata 925', 'Folheado a Ouro'], position: 0 }],
        product_variants: [
          { id: 'v1', price: 209.9, compare_price: null, stock: 5, image_url: 'prata.webp', is_active: true, position: 0, option_values: { Cor: 'Prata 925' } },
          { id: 'v2', price: 229.9, compare_price: null, stock: 5, image_url: 'ouro.webp', is_active: true, position: 1, option_values: { Cor: 'Folheado a Ouro' } },
        ],
        product_campaigns: campanha ? [{ percent: 20, campaigns: BLACK_FRIDAY }] : [],
      }),
    )
  const fileira = () => screen.getByRole('group', { name: 'Cores disponíveis' })

  it('sobem acima da faixa: 40 px do pé no celular e 42 px a partir de 768 px', () => {
    renderCard(comCor(true))
    expect(fileira()).toHaveClass('bottom-10', 'md:bottom-[42px]', 'left-3.5')
    expect(fileira()).not.toHaveClass('bottom-3.5')
  })

  it('sem campanha, ficam a 14 px do pé, como hoje', () => {
    renderCard(comCor(false))
    expect(fileira()).toHaveClass('bottom-3.5')
    expect(fileira()).not.toHaveClass('bottom-10')
  })

  it('tocar numa miniatura troca a foto e o preço da variação, sem navegar', () => {
    renderCard(comCor(true))
    fireEvent.click(screen.getByRole('button', { name: 'Ver na cor Folheado a Ouro' }))
    expect(screen.getByAltText('Pingente com cinzas')).toHaveAttribute('src', 'ouro.webp')
    expect(screen.queryByText('rota-produto')).toBeNull()
    // 20% sobre os R$ 229,90 da própria variação.
    expect(screen.getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 183,92')).toBeInTheDocument()
    expect(plano(document.querySelector('.line-through'))).toBe('De R$ 229,90')
  })
})
