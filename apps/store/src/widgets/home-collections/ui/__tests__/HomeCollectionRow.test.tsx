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

/**
 * **A fiação de `PRF-17`** — a fileira repassa o estado de carregamento ao carrossel.
 *
 * Esta suíte nasceu de um **mutante sobrevivente** que a verificação independente da feature 40
 * encontrou: apagar `loading={isLoading}` e `skeletonCount={vagas}` do JSX passava nos **2531
 * testes do store**. E o custo de apagá-las é o número inteiro que a feature existe para zerar —
 * sem as props, a fileira volta a nascer com altura zero e o CLS da home volta a 0,244.
 *
 * O buraco era de par, e é o mesmo padrão que `fiacaoDaVitrine.test.ts` já tinha registrado: o
 * `ProductCarousel` ganhou seis casos provando que ele **desenha** esqueleto quando recebe
 * `loading` — mas provar que o componente honra a prop não prova que alguém a passa. São duas
 * afirmações, e só uma tinha teste.
 *
 * **A prova é pelo carrossel REAL**, não por um dublê que capture props: assim ela mede o que a
 * cliente vê, e não a forma da chamada. `ProductCard` continua dublado (é o que os outros casos
 * deste arquivo já fazem); `ProductCardSkeleton` renderiza de verdade.
 */
describe('HomeCollectionRow — repassa o carregamento ao carrossel (PRF-17)', () => {
  const carregando = () => useProductsMock.mockReturnValue({ data: undefined, isLoading: true })
  const esqueletos = (c: HTMLElement) => c.querySelectorAll('[aria-hidden="true"].flex.flex-col')

  it('carregando: a seção existe e reserva QUATRO vagas', () => {
    carregando()

    const { container } = renderRow()

    // Sem `loading={isLoading}` o carrossel devolveria `null` aqui — e a home voltaria a saltar.
    expect(container.querySelector('section')).not.toBeNull()
    expect(esqueletos(container)).toHaveLength(4)
  })

  it('carregando COM banner: reserva TRÊS — o banner ocupa a primeira vaga', () => {
    // Prova por deslocamento: sem `skeletonCount={vagas}` o carrossel cai no padrão de quatro, e a
    // fileira reservaria uma linha maior que a que vai aparecer — encolhendo ao carregar.
    carregando()

    const { container } = renderRow({ bannerUrl: 'https://exemplo.invalid/banner.webp' })

    expect(esqueletos(container)).toHaveLength(3)
  })

  it('resolvido: nenhuma vaga de esqueleto sobra', () => {
    const { container } = renderRow()

    expect(esqueletos(container)).toHaveLength(0)
  })
})
