import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeCollection } from '@estrelinha/core/home'

/**
 * `PRF-09` — **a fileira pede ao servidor só o que desenha**.
 *
 * Medido em 2026-09-05 contra o deploy provisório: a home disparava QUATRO consultas de
 * categoria-raiz e `joias-afetivas` sozinha trazia 505 produtos / 1,10 MB comprimidos para desenhar
 * **quatro** cards. O `.slice(0, 4)` cortava no cliente — depois de a rede já ter pago a conta.
 *
 * O que este arquivo prova é a CHAMADA: quantas linhas a fileira pede. O que ela desenha continua
 * sendo assunto do `ProductCarousel`, e o corte no cliente segue existindo como rede de segurança.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { useProductsMock } = vi.hoisted(() => ({ useProductsMock: vi.fn() }))

vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: useProductsMock }))

vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))

import HomeCollectionRow from '../HomeCollectionRow'

const peca = (n: number) => ({ id: `p${n}`, name: `Peça ${n}` }) as any

const colecao = (over: Partial<HomeCollection> = {}): HomeCollection => ({
  id: 'c1',
  name: 'Joias afetivas',
  slug: 'joias-afetivas',
  description: null,
  href: '/joias-afetivas',
  bannerUrl: null,
  ...over,
})

const renderRow = (over: Partial<HomeCollection> = {}) =>
  render(
    <MemoryRouter>
      <HomeCollectionRow collection={colecao(over)} tone="ground" />
    </MemoryRouter>,
  )

/** Os argumentos da última chamada de `useProducts` — o que de fato viaja para o servidor. */
const chamada = () => useProductsMock.mock.calls.at(-1) as [string | undefined, { limit?: number }]

beforeEach(() => {
  useProductsMock.mockReset()
  useProductsMock.mockReturnValue({ data: [peca(1), peca(2), peca(3), peca(4)] })
})

describe('HomeCollectionRow — a fileira pede o que desenha (PRF-09)', () => {
  it('sem banner, pede QUATRO linhas ao servidor — não a árvore da categoria', () => {
    renderRow()

    const [slug, options] = chamada()
    expect(slug).toBe('joias-afetivas')
    expect(options.limit).toBe(4)
  })

  it('com banner, pede TRÊS — o card do banner ocupa a primeira vaga da linha de quatro', () => {
    renderRow({ bannerUrl: 'https://exemplo.invalid/banner.webp' })

    expect(chamada()[1].limit).toBe(3)
  })

  it('o limite não é opcional: a fileira nunca chama sem teto', () => {
    // O modo de falha silencioso desta task é a chamada voltar a ser `useProducts(slug)`: nada
    // quebra, a fileira desenha os mesmos quatro cards, e a home volta a baixar 1,10 MB.
    renderRow()

    expect(chamada()[1]).toBeDefined()
    expect(typeof chamada()[1].limit).toBe('number')
  })

  it('o `.slice` continua como rede de segurança — um cache antigo não faz a fileira desenhar cinco', () => {
    useProductsMock.mockReturnValue({ data: [peca(1), peca(2), peca(3), peca(4), peca(5)] })

    renderRow()

    expect(screen.getAllByTestId('produto')).toHaveLength(4)
  })

  it('com banner, a rede de segurança corta em três', () => {
    useProductsMock.mockReturnValue({ data: [peca(1), peca(2), peca(3), peca(4)] })

    renderRow({ bannerUrl: 'https://exemplo.invalid/banner.webp' })

    expect(screen.getAllByTestId('produto')).toHaveLength(3)
  })

  it('coleção sem produto continua sumindo — a fileira não vira título com buracos', () => {
    useProductsMock.mockReturnValue({ data: [] })

    const { container } = renderRow()

    expect(container.querySelector('section')).toBeNull()
  })
})
