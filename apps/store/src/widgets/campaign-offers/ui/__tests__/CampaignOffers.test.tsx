import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CampaignOffers from '../CampaignOffers'

/**
 * O bloco "Joias em oferta".
 *
 * O que se prova: sem campanha em vigência o bloco não desenha nada; com ela, um cartão por
 * percentual levando à vitrine recortada, o rótulo e o título da própria campanha (outra campanha,
 * outro texto, sem mudança de código) e a fileira de peças marcadas.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { campanha, pecas } = vi.hoisted(() => ({
  campanha: { estado: { data: null, isLoading: false, isError: false } as any },
  pecas: { estado: { data: [], isLoading: false, isError: false } as any, pedidos: [] as unknown[] },
}))

vi.mock('@/entities/campaign', () => ({ useLiveCampaign: () => campanha.estado }))
vi.mock('../../model/useCampaignOfferProducts', () => ({
  useCampaignOfferProducts: (id: unknown) => {
    pecas.pedidos.push(id)
    return pecas.estado
  },
}))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="peca">{product.name}</div>,
}))

const blackFriday = (percents: number[]) => ({
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'BLACK FRIDAY',
  band_color: '#23303A',
  accent_color: '#F7F3EC',
  ends_at: '2026-12-01T03:00:00Z',
  percents,
})

const montar = () =>
  render(
    <MemoryRouter>
      <CampaignOffers />
    </MemoryRouter>,
  )

const cartoes = () => screen.queryAllByTestId('cartao-percentual')

beforeEach(() => {
  campanha.estado = { data: null, isLoading: false, isError: false }
  pecas.estado = { data: [], isLoading: false, isError: false }
  pecas.pedidos = []
})

describe('sem campanha em vigência, o bloco não aparece', () => {
  it('campanha `null`: nada no DOM', () => {
    const { container } = montar()
    expect(container).toBeEmptyDOMElement()
  })

  it('enquanto a campanha não respondeu: nada — não reserva vaga para o que não sabe se existe', () => {
    campanha.estado = { data: undefined, isLoading: true, isError: false }
    const { container } = montar()
    expect(container).toBeEmptyDOMElement()
  })

  it('a leitura da campanha falhou: nada, sem derrubar a Home', () => {
    campanha.estado = { data: undefined, isLoading: false, isError: true }
    const { container } = montar()
    expect(container).toBeEmptyDOMElement()
  })
})

describe('os cartões de percentual', () => {
  it('com 3 percentuais, 3 cartões levando a `/ofertas?percentual=<p>`, em ordem', () => {
    campanha.estado = { data: blackFriday([10, 15, 20]), isLoading: false, isError: false }
    montar()

    expect(cartoes()).toHaveLength(3)
    expect(cartoes().map(c => c.getAttribute('href'))).toEqual([
      '/ofertas?percentual=10',
      '/ofertas?percentual=15',
      '/ofertas?percentual=20',
    ])
    expect(screen.getByRole('link', { name: 'Ver as peças com 15% de desconto' })).toHaveAttribute(
      'href',
      '/ofertas?percentual=15',
    )
    const primeiro = cartoes()[0]
    expect(primeiro).toHaveTextContent('10%')
    expect(primeiro).toHaveTextContent('de desconto')
    expect(primeiro).toHaveTextContent('Ver as peças →')
  })

  it('com 1 percentual, um cartão', () => {
    campanha.estado = { data: blackFriday([25]), isLoading: false, isError: false }
    montar()
    expect(cartoes()).toHaveLength(1)
    expect(cartoes()[0]).toHaveAttribute('href', '/ofertas?percentual=25')
  })

  it('com 5 percentuais, cinco cartões', () => {
    campanha.estado = { data: blackFriday([5, 10, 15, 20, 25]), isLoading: false, isError: false }
    montar()
    expect(cartoes()).toHaveLength(5)
    expect(cartoes()[4]).toHaveAttribute('href', '/ofertas?percentual=25')
  })

  it('uma coluna no celular e três a partir do `md`', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    montar()
    const grade = cartoes()[0].closest('ul')!
    expect(grade.className.split(/\s+/)).toEqual(expect.arrayContaining(['grid-cols-1', 'md:grid-cols-3']))
  })

  it('os tons da paleta: fundo claro, ouro, e escuro com o número em ouro', () => {
    campanha.estado = { data: blackFriday([10, 15, 20]), isLoading: false, isError: false }
    montar()
    const classes = (el: Element) => el.className.split(/\s+/)
    const [claro, ouro, escuro] = cartoes()
    const numeros = screen.getAllByTestId('numero-percentual')

    expect(classes(claro)).toEqual(expect.arrayContaining(['bg-estrelinha-ground-deep', 'text-estrelinha-ink']))
    expect(classes(ouro)).toEqual(expect.arrayContaining(['bg-estrelinha-accent', 'text-estrelinha-ink']))
    expect(classes(escuro)).toEqual(expect.arrayContaining(['bg-estrelinha-ink', 'text-estrelinha-on-primary']))
    expect(classes(numeros[2])).toContain('text-estrelinha-accent')
    expect(classes(numeros[0])).not.toContain('text-estrelinha-accent')
    expect(classes(numeros[1])).not.toContain('text-estrelinha-accent')
  })

  it('o movimento do cartão respeita "menos movimento"', () => {
    campanha.estado = { data: blackFriday([10]), isLoading: false, isError: false }
    montar()
    expect(cartoes()[0].className.split(/\s+/)).toContain('motion-reduce:transition-none')
  })
})

describe('o texto vem da campanha', () => {
  it('Black Friday: o rótulo, o título e o texto com os percentuais', () => {
    campanha.estado = { data: blackFriday([10, 15, 20]), isLoading: false, isError: false }
    montar()

    expect(screen.getByRole('heading', { level: 2, name: 'Black Friday' })).toBeInTheDocument()
    expect(screen.getByText('BLACK FRIDAY')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto.',
      ),
    ).toBeInTheDocument()
  })

  it('Dia das Mães: o mesmo bloco com o nome e o selo dela, sem mudança de código', () => {
    campanha.estado = {
      data: { ...blackFriday([15]), id: 'camp-maes', name: 'Dia das Mães', badge_text: 'DIA DAS MÃES' },
      isLoading: false,
      isError: false,
    }
    montar()

    expect(screen.getByRole('heading', { level: 2, name: 'Dia das Mães' })).toBeInTheDocument()
    expect(screen.getByText('DIA DAS MÃES')).toBeInTheDocument()
    expect(screen.queryByText(/black friday/i)).toBeNull()
  })

  it('tom: nada de contagem regressiva nem de escassez', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    const { container } = montar()
    expect(container.textContent).not.toMatch(/últimas|restam|corra|acaba em|só hoje|!/i)
  })
})

describe('a fileira de peças em oferta', () => {
  it('pede as peças da MESMA campanha do título e as desenha, com "Ver todas" para a vitrine', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    pecas.estado = {
      data: [
        { id: 'p1', name: 'Pingente Estrela' },
        { id: 'p2', name: 'Anel Memória' },
      ],
      isLoading: false,
      isError: false,
    }
    montar()

    expect(pecas.pedidos).toContain('camp-bf')
    expect(screen.getByRole('heading', { name: 'Algumas das peças em oferta' })).toBeInTheDocument()
    expect(screen.getAllByTestId('peca').map(p => p.textContent)).toEqual([
      'Pingente Estrela',
      'Anel Memória',
    ])
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/ofertas')
  })

  it('a fileira falhou: os cartões ficam, a fileira some', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    pecas.estado = { data: undefined, isLoading: false, isError: true }
    montar()

    expect(cartoes()).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Algumas das peças em oferta' })).toBeNull()
  })

  it('carregando: a fileira reserva quatro vagas', () => {
    campanha.estado = { data: blackFriday([10]), isLoading: false, isError: false }
    pecas.estado = { data: undefined, isLoading: true, isError: false }
    montar()

    const bloco = screen.getByTestId('joias-em-oferta')
    expect(within(bloco).getByRole('heading', { name: 'Algumas das peças em oferta' })).toBeInTheDocument()
    expect(bloco.querySelector('[aria-busy="true"]')!.childElementCount).toBe(4)
  })
})
