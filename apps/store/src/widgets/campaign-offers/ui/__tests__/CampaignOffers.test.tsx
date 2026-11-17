import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeSection, HomeSectionItem, ResolvedItem } from '@estrelinha/core/home'
import CampaignOffers from '../CampaignOffers'

/**
 * O bloco "Joias em oferta".
 *
 * O que se prova: o bloco aparece só quando a campanha dele é a vigente que o banco entrega — sem
 * campanha, com outra em vigência, ou carregando, ele não desenha nada. Com ela: um cartão por
 * percentual levando à vitrine recortada; o selo acima do título; o título e a descrição da dona, ou
 * os recuos para o nome da campanha e a frase dos percentuais; e a fileira — as peças escolhidas na
 * ordem da dona, em fita, sem completar a vaga da que deixou de valer, ou as quatro primeiras da
 * campanha quando não há escolha.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { campanha, pecas, escolhidas } = vi.hoisted(() => ({
  campanha: { estado: { data: null, isLoading: false, isError: false } as any },
  pecas: { estado: { data: [], isLoading: false, isError: false } as any, pedidos: [] as unknown[] },
  escolhidas: { estado: { data: [], isLoading: false, isError: false } as any, pedidos: [] as unknown[] },
}))

vi.mock('@/entities/campaign', () => ({ useLiveCampaign: () => campanha.estado }))
vi.mock('../../model/useCampaignOfferProducts', () => ({
  useCampaignOfferProducts: (id: unknown) => {
    pecas.pedidos.push(id)
    return pecas.estado
  },
}))
vi.mock('@/entities/product/api/useProductsByIds', () => ({
  useProductsByIds: (ids: readonly string[]) => {
    escolhidas.pedidos.push([...ids])
    return escolhidas.estado
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

const secao = (over: Partial<HomeSection> = {}): HomeSection => ({
  id: 'sec-ofertas',
  type: 'campaign_offers',
  position: 2,
  active: true,
  config: {},
  items: [],
  campaign_id: 'camp-bf',
  ...over,
})

/** A linha curada como o banco a guarda. */
const linha = (productId: string, position: number): HomeSectionItem => ({
  id: `item-${productId}`,
  section_id: 'sec-ofertas',
  position,
  category_id: null,
  product_id: productId,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: null,
})

/** O item já resolvido, como o renderizador o entrega. */
const resolvido = (productId: string): ResolvedItem => ({
  id: `item-${productId}`,
  categoryId: null,
  productId,
  slug: productId,
  label: '',
  description: null,
  href: `/produtos/${productId}`,
  imageUrl: null,
  imageMobileUrl: null,
  curated: true,
})

/** Uma seção com estas peças escolhidas, na ordem. */
const comEscolhidas = (ids: string[], over: Partial<HomeSection> = {}) => ({
  section: secao({ items: ids.map((id, i) => linha(id, i)), ...over }),
  items: ids.map(resolvido),
})

const peca = (id: string, name: string, campanhaId: string | null = 'camp-bf') => ({
  id,
  name,
  campaign: campanhaId ? { id: campanhaId } : null,
})

const montar = (props: { section?: HomeSection; items?: ResolvedItem[] } = {}) =>
  render(
    <MemoryRouter>
      <CampaignOffers section={props.section ?? secao()} items={props.items ?? []} />
    </MemoryRouter>,
  )

const cartoes = () => screen.queryAllByTestId('cartao-percentual')

beforeEach(() => {
  campanha.estado = { data: null, isLoading: false, isError: false }
  pecas.estado = { data: [], isLoading: false, isError: false }
  pecas.pedidos = []
  escolhidas.estado = { data: [], isLoading: false, isError: false }
  escolhidas.pedidos = []
})

describe('o bloco aparece só com a campanha dele em vigência', () => {
  it('nenhuma campanha em vigência (agendada, encerrada ou desligada): nada no DOM', () => {
    const { container } = montar()
    expect(container).toBeEmptyDOMElement()
  })

  it('a vigente é OUTRA campanha: nada no DOM, e não pede peça nenhuma', () => {
    campanha.estado = {
      data: { ...blackFriday([10]), id: 'camp-maes', name: 'Dia das Mães' },
      isLoading: false,
      isError: false,
    }
    const { container } = montar(comEscolhidas(['p1']))
    expect(container).toBeEmptyDOMElement()
    expect(pecas.pedidos.filter(Boolean)).toEqual([])
    expect(escolhidas.pedidos.filter(ids => (ids as string[]).length > 0)).toEqual([])
  })

  it('o bloco sem campanha (nunca teve, ou a campanha foi apagada): nada no DOM, mesmo com uma vigente', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    const { container } = montar({ section: secao({ campaign_id: null }) })
    expect(container).toBeEmptyDOMElement()
  })

  it('a seção lida sem a coluna (campaign_id ausente): nada no DOM', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    const semColuna = secao()
    delete semColuna.campaign_id
    const { container } = montar({ section: semColuna })
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

describe('o selo, o título e a descrição', () => {
  it('título e descrição do bloco, como a dona escreveu, com o selo da campanha acima', () => {
    campanha.estado = { data: blackFriday([10, 15, 20]), isLoading: false, isError: false }
    montar({
      section: secao({
        config: { title: 'Presentes que guardam memória', subtitle: 'Joias para quem você ama.' },
      }),
    })

    const titulo = screen.getByRole('heading', { level: 2, name: 'Presentes que guardam memória' })
    const selo = screen.getByText('BLACK FRIDAY')
    expect(screen.getByText('Joias para quem você ama.')).toBeInTheDocument()
    expect(screen.queryByText(/Peças selecionadas com/)).toBeNull()
    expect(screen.queryByRole('heading', { level: 2, name: 'Black Friday' })).toBeNull()
    // O selo vem ANTES do título no documento.
    expect(selo.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('título e descrição vazios recuam para o nome da campanha e a frase dos percentuais', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    montar({ section: secao({ config: { title: '  ', subtitle: '' } }) })

    expect(screen.getByRole('heading', { level: 2, name: 'Black Friday' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Peças selecionadas com 10% e 20% de desconto. O valor de cada joia já aparece com o desconto.',
      ),
    ).toBeInTheDocument()
  })

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
    montar({ section: secao({ campaign_id: 'camp-maes' }) })

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

describe('a fileira das peças escolhidas', () => {
  it('as escolhidas na ordem da dona, não na da resposta', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    escolhidas.estado = {
      data: [peca('p1', 'Pingente Estrela'), peca('p3', 'Brinco Lua'), peca('p2', 'Anel Memória')],
      isLoading: false,
      isError: false,
    }
    montar(comEscolhidas(['p2', 'p3', 'p1']))

    expect(escolhidas.pedidos).toContainEqual(['p2', 'p3', 'p1'])
    expect(screen.getAllByTestId('peca').map(p => p.textContent)).toEqual([
      'Anel Memória',
      'Brinco Lua',
      'Pingente Estrela',
    ])
    // Com escolha, as primeiras da campanha não são pedidas.
    expect(pecas.pedidos.filter(Boolean)).toEqual([])
  })

  it('em fita: rola no celular e continua fita no computador', () => {
    campanha.estado = { data: blackFriday([10]), isLoading: false, isError: false }
    escolhidas.estado = { data: [peca('p1', 'Pingente Estrela')], isLoading: false, isError: false }
    montar(comEscolhidas(['p1']))

    const trilho = screen.getByTestId('joias-em-oferta').querySelector('[aria-busy]')!
    const tokens = trilho.className.split(/\s+/)
    expect(tokens).toEqual(expect.arrayContaining(['flex', 'overflow-x-auto']))
    expect(tokens).not.toContain('md:grid')
    expect(tokens).not.toContain('md:grid-cols-4')
  })

  it('carregando: uma vaga de esqueleto por peça escolhida', () => {
    campanha.estado = { data: blackFriday([10]), isLoading: false, isError: false }
    escolhidas.estado = { data: undefined, isLoading: true, isError: false }
    montar(comEscolhidas(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']))

    const bloco = screen.getByTestId('joias-em-oferta')
    expect(bloco.querySelector('[aria-busy="true"]')!.childElementCount).toBe(6)
  })

  it('a peça tirada da campanha e a que a campanha não barateia somem, e a vaga fica vazia', () => {
    campanha.estado = { data: blackFriday([10]), isLoading: false, isError: false }
    escolhidas.estado = {
      data: [
        peca('p1', 'Pingente Estrela'),
        // Tirada da campanha, ou marcada sem que o preço baixe: o mapeador a entrega sem campanha.
        peca('p2', 'Anel Memória', null),
        // De outra campanha.
        peca('p3', 'Brinco Lua', 'camp-maes'),
        peca('p4', 'Colar Saudade'),
      ],
      isLoading: false,
      isError: false,
    }
    montar(comEscolhidas(['p1', 'p2', 'p3', 'p4']))

    expect(screen.getAllByTestId('peca').map(p => p.textContent)).toEqual([
      'Pingente Estrela',
      'Colar Saudade',
    ])
    // Sem completar com outra peça da campanha.
    expect(pecas.pedidos.filter(Boolean)).toEqual([])
  })

  it('todas as escolhidas deixaram de valer: só os cartões, sem a fileira', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    escolhidas.estado = {
      data: [peca('p1', 'Pingente Estrela', null), peca('p2', 'Anel Memória', null)],
      isLoading: false,
      isError: false,
    }
    montar(comEscolhidas(['p1', 'p2']))

    expect(cartoes()).toHaveLength(2)
    expect(screen.queryAllByTestId('peca')).toEqual([])
    expect(screen.queryByRole('heading', { name: 'Algumas das peças em oferta' })).toBeNull()
    expect(pecas.pedidos.filter(Boolean)).toEqual([])
  })

  it('todas as escolhidas saíram do ar (nenhuma resolveu): só os cartões, sem completar', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    const { section } = comEscolhidas(['p1', 'p2'])
    montar({ section, items: [] })

    expect(cartoes()).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Algumas das peças em oferta' })).toBeNull()
    expect(pecas.pedidos.filter(Boolean)).toEqual([])
  })

  it('a leitura das escolhidas falhou: os cartões ficam, a fileira some', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    escolhidas.estado = { data: undefined, isLoading: false, isError: true }
    montar(comEscolhidas(['p1', 'p2']))

    expect(cartoes()).toHaveLength(2)
    expect(screen.queryByRole('heading', { name: 'Algumas das peças em oferta' })).toBeNull()
  })
})

describe('sem peça escolhida, as primeiras da campanha', () => {
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

  it('"Ver todas" também no celular: nada que o esconda abaixo do `md`, e alvo de 44 px', () => {
    campanha.estado = { data: blackFriday([10, 20]), isLoading: false, isError: false }
    pecas.estado = { data: [{ id: 'p1', name: 'Pingente Estrela' }], isLoading: false, isError: false }
    montar()

    const link = screen.getByRole('link', { name: 'Ver todas' })
    const tokens = link.className.split(/\s+/)
    expect(link).toHaveAttribute('href', '/ofertas')
    expect(tokens).not.toContain('hidden')
    expect(tokens).not.toContain('invisible')
    expect(tokens.filter(t => /^(sm|md|lg):(inline|block|flex|inline-flex)$/.test(t))).toEqual([])
    expect(tokens).toEqual(expect.arrayContaining(['before:h-11', 'before:inset-x-0', 'relative']))
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
