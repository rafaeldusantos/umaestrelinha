import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeSection, ResolvedItem } from '@estrelinha/core/home'

/* eslint-disable @typescript-eslint/no-explicit-any */
const { consulta, carrossel } = vi.hoisted(() => ({
  consulta: { data: undefined as any, isLoading: false, isError: false, ids: [] as readonly string[] },
  carrossel: { props: null as any },
}))

vi.mock('@/entities/product/api/useProductsByIds', () => ({
  useProductsByIds: (ids: readonly string[]) => {
    consulta.ids = ids
    return consulta
  },
}))

/**
 * O `ProductCarousel` é dublado **de propósito**: o que se prova aqui é a delegação — quais peças,
 * em que ordem, com que forma e com quantas vagas reservadas. As classes das três formas são
 * medidas em `ProductCarouselLayout.test.tsx`, contra o componente de verdade; repeti-las aqui seria
 * a mesma asserção em duas camadas.
 */
vi.mock('@/widgets/product-carousel/ui/ProductCarousel', () => ({
  default: (props: any) => {
    carrossel.props = props
    return (
      <section data-testid="carrossel" data-layout={props.layout} aria-busy={!!props.loading}>
        <h2>{props.title}</h2>
        {props.subtitle && <p data-testid="descricao">{props.subtitle}</p>}
        <ol>
          {props.products.map((p: any) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ol>
      </section>
    )
  },
}))

import FeaturedProducts from '../FeaturedProducts'

/**
 * `DST-04`, `DST-17`, `DST-21` e `DST-22` — o bloco Produtos em destaque.
 */

const secao = (config: Record<string, unknown> = {}): HomeSection => ({
  id: 'sec-1',
  type: 'product_carousel',
  position: 1,
  active: true,
  config: { title: 'Peças do Dia das Mães', ...config },
})

/** Um item curado, como `resolveItem` o devolve para destino de produto. */
const escolhido = (productId: string): ResolvedItem => ({
  id: `item-${productId}`,
  categoryId: null,
  productId,
  slug: `peca-${productId}`,
  label: '',
  description: null,
  href: `/produtos/peca-${productId}`,
  imageUrl: null,
  imageMobileUrl: null,
  curated: true,
})

const produto = (id: string, nome: string) => ({ id, name: nome }) as never

const desenha = (section: HomeSection, items: ResolvedItem[]) =>
  render(
    <MemoryRouter>
      <FeaturedProducts section={section} items={items} />
    </MemoryRouter>,
  )

beforeEach(() => {
  consulta.data = undefined
  consulta.ids = []
  consulta.isLoading = false
  consulta.isError = false
  carrossel.props = null
})

describe('FeaturedProducts — a ordem é a da dona (DST-22)', () => {
  it('a resposta vem FORA de ordem e os cards saem na ordem da curadoria', () => {
    // A fixture devolve invertido de propósito: `.in()` não garante ordem, e uma implementação que
    // desenhasse `data` como veio passaria com uma resposta já ordenada.
    consulta.data = [produto('p3', 'Terceira'), produto('p1', 'Primeira'), produto('p2', 'Segunda')]

    desenha(secao(), [escolhido('p1'), escolhido('p2'), escolhido('p3')])

    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Primeira',
      'Segunda',
      'Terceira',
    ])
  })

  it('a ordem dos ids é a dos itens recebidos, e é ela que vai à consulta', () => {
    consulta.data = []
    desenha(secao(), [escolhido('p2'), escolhido('p1')])
    expect(consulta.ids).toEqual(['p2', 'p1'])
  })
})

describe('FeaturedProducts — peça que saiu do ar (DST-16)', () => {
  it('produto que não volta da consulta simplesmente não desenha, e os outros ficam', () => {
    consulta.data = [produto('p1', 'Primeira'), produto('p3', 'Terceira')]

    desenha(secao(), [escolhido('p1'), escolhido('p2'), escolhido('p3')])

    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual([
      'Primeira',
      'Terceira',
    ])
  })

  it('item órfão (sem `productId`) não é pedido ao banco', () => {
    consulta.data = []
    const orfao = { ...escolhido('p1'), productId: null }
    desenha(secao(), [orfao, escolhido('p2')])
    expect(consulta.ids).toEqual(['p2'])
  })
})

describe('FeaturedProducts — enquanto carrega (DST-21)', () => {
  it('reserva uma vaga por peça escolhida, e anuncia que está carregando', () => {
    consulta.isLoading = true
    consulta.data = undefined

    desenha(secao(), [escolhido('p1'), escolhido('p2'), escolhido('p3')])

    expect(carrossel.props.loading).toBe(true)
    // O número de vagas é o de ESCOLHIDAS: reservar quatro para desenhar doze devolveria o
    // deslocamento que a feature 40 mediu.
    expect(carrossel.props.skeletonCount).toBe(3)
    expect(screen.getByTestId('carrossel')).toHaveAttribute('aria-busy', 'true')
  })

  it('resolvido deixa de anunciar carregamento', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao(), [escolhido('p1')])
    expect(carrossel.props.loading).toBe(false)
  })
})

describe('FeaturedProducts — a consulta em erro (DST-17)', () => {
  it('o widget devolve `null` e NADA é lançado — a Home continua de pé', () => {
    consulta.isError = true
    consulta.data = undefined

    expect(() => desenha(secao(), [escolhido('p1')])).not.toThrow()
    expect(screen.queryByTestId('carrossel')).toBeNull()
  })
})

describe('FeaturedProducts — a apresentação (DST-10)', () => {
  it('`display: grid` chega como `layout="grid"`', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao({ display: 'grid' }), [escolhido('p1')])
    expect(screen.getByTestId('carrossel')).toHaveAttribute('data-layout', 'grid')
  })

  it('`display` ausente chega como `layout="slider"`', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao(), [escolhido('p1')])
    expect(screen.getByTestId('carrossel')).toHaveAttribute('data-layout', 'slider')
  })

  it('`display` desconhecido chega como `layout="slider"`, sem quebrar', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao({ display: 'mosaico' }), [escolhido('p1')])
    expect(screen.getByTestId('carrossel')).toHaveAttribute('data-layout', 'slider')
  })
})

describe('FeaturedProducts — título e descrição (DST-04)', () => {
  it('o título sai de `config.title`', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao(), [escolhido('p1')])
    expect(screen.getByRole('heading', { name: 'Peças do Dia das Mães' })).toBeInTheDocument()
  })

  it('a descrição sai de `config.subtitle`', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao({ subtitle: 'Escolhidas a dedo pela Adri' }), [escolhido('p1')])
    expect(screen.getByTestId('descricao')).toHaveTextContent('Escolhidas a dedo pela Adri')
  })

  it('sem descrição, nada é desenhado no lugar dela', () => {
    consulta.data = [produto('p1', 'Primeira')]
    desenha(secao(), [escolhido('p1')])
    expect(screen.queryByTestId('descricao')).toBeNull()
    expect(carrossel.props.subtitle).toBeUndefined()
  })
})
