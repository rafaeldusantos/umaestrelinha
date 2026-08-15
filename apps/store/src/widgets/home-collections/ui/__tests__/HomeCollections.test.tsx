import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeCollections, { type HomeCollectionItem } from '../HomeCollections'

/**
 * As fileiras de coleção — `HOME-32`, `HOME-42`.
 *
 * As fileiras deixaram de escolher o que mostram: a lista chega resolvida, e o que este arquivo
 * prova é o que sobrou do widget — o ritmo do chão alternado, o lugar da faixa institucional, e a
 * regra que **não** completa vaga com o automático.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { produtos } = vi.hoisted(() => ({ produtos: { data: [] as any[] } }))

vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))

vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))

produtos.data = [{ id: 'p1', name: 'Peça 1' }]

const colecao = (n: number, over: Partial<HomeCollectionItem> = {}): HomeCollectionItem => ({
  id: `c${n}`,
  label: `Coleção ${n}`,
  slug: `colecao-${n}`,
  description: null,
  href: `/colecao-${n}`,
  imageUrl: null,
  ...over,
})

const renderFileiras = (props: Partial<React.ComponentProps<typeof HomeCollections>> = {}) =>
  render(
    <MemoryRouter>
      <HomeCollections collections={props.collections ?? []} {...props} />
    </MemoryRouter>,
  )

const titulos = () =>
  screen.getAllByRole('heading', { name: /^Coleção \d$/ }).map(h => h.textContent)

describe('HomeCollections — a lista é a que chega (HOME-32, HOME-42)', () => {
  it('desenha uma fileira por coleção recebida, na ordem recebida', () => {
    renderFileiras({ collections: [colecao(2), colecao(1), colecao(3)] })

    expect(titulos()).toEqual(['Coleção 2', 'Coleção 1', 'Coleção 3'])
  })

  it('a vaga que sobra fica VAZIA: o widget não completa com nada', () => {
    // `HOME-32`. Completar com o automático poria na Home coleção que a dona não escolheu — e a
    // prova de que isso não acontece é o widget não ter mais de onde tirar uma.
    renderFileiras({ collections: [colecao(1)] })

    expect(titulos()).toEqual(['Coleção 1'])
  })

  it('o chão alterna de uma fileira para a outra, e recomeça na quinta', () => {
    // Quatro fileiras no mesmo creme viram uma faixa só, e a cliente perde onde uma coleção termina.
    const { container } = renderFileiras({ collections: [1, 2, 3, 4, 5].map(n => colecao(n)) })

    const chaos = [...container.querySelectorAll('section')].map(s =>
      /bg-estrelinha-(ground-deep|surface|ground)/.exec(s.className)?.[1],
    )
    expect(chaos).toEqual(['ground', 'ground-deep', 'surface', 'ground', 'ground'])
  })
})

describe('HomeCollections — onde a faixa institucional entra', () => {
  const faixa = <p data-testid="faixa">faixa institucional</p>

  const posicaoDaFaixa = () => {
    const marca = screen.getByTestId('faixa')
    return screen
      .getAllByRole('heading', { name: /^Coleção \d$/ })
      .filter(
        h => h.compareDocumentPosition(marca) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).length
  }

  it('sem `interludeAfter`, entra depois da 1ª fileira — onde a Home a põe hoje', () => {
    renderFileiras({ collections: [1, 2, 3].map(n => colecao(n)), interlude: faixa })

    expect(posicaoDaFaixa()).toBe(1)
  })

  it('com `interludeAfter`, entra depois da fileira que a própria faixa declara', () => {
    // O número mora na faixa (`config.interlude_after`), não nas fileiras: um dono só.
    renderFileiras({
      collections: [1, 2, 3].map(n => colecao(n)),
      interlude: faixa,
      interludeAfter: 2,
    })

    expect(posicaoDaFaixa()).toBe(3)
  })

  it('catálogo vazio NÃO engole a faixa: ela renderiza sozinha', () => {
    // Estado real da loja logo depois de um `db reset`, antes do importador. A faixa é texto de
    // marca e não depende de produto nenhum — sumir com ela seria perder conteúdo em silêncio.
    renderFileiras({ collections: [], interlude: faixa })

    expect(screen.getByTestId('faixa')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { name: /^Coleção \d$/ })).toHaveLength(0)
  })

  it('catálogo vazio e sem faixa não desenha nada — nunca moldura vazia', () => {
    const { container } = renderFileiras({ collections: [] })

    expect(container).toBeEmptyDOMElement()
  })
})
