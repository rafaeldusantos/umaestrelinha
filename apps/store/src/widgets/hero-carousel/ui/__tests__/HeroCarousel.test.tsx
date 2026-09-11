import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HERO_CAROUSEL_SLOTS, type HomeSection, type ResolvedItem } from '@estrelinha/core/home'
import HeroCarousel from '../HeroCarousel'

/**
 * `BNR-17`..`BNR-27`, `BNR-34`..`BNR-38`.
 *
 * **Nada aqui mede layout.** jsdom devolve 0 para largura, altura e rolagem, então o que se prova é
 * o que existe no DOM: qual URL foi pedida, qual atributo de carregamento saiu, quais controles
 * apareceram e o que eles dizem. A prova de que a faixa não desloca nada — e de que o primeiro slide
 * pinta cedo — é do navegador, e está declarada nos Success Criteria da spec.
 */

const STORAGE = 'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/home-images'

const item = (id: string, over: Partial<ResolvedItem> = {}): ResolvedItem => ({
  id,
  categoryId: 'cat',
  productId: null,
  slug: 'leite-materno',
  label: `arte de ${id}`,
  description: null,
  href: `/${id}`,
  imageUrl: `${STORAGE}/${id}-d.jpg`,
  imageMobileUrl: `${STORAGE}/${id}-m.jpg`,
  curated: true,
  ...over,
})

const secao = (config: HomeSection['config'] = {}): HomeSection => ({
  id: 's1',
  type: 'hero_carousel',
  position: 1,
  active: true,
  config,
})

const montar = (items: ResolvedItem[], config: HomeSection['config'] = {}) =>
  render(
    <MemoryRouter>
      <HeroCarousel section={secao(config)} items={items} />
    </MemoryRouter>,
  )

// ---------------------------------------------------------------------------
// BNR-18..BNR-20 — a largura
// ---------------------------------------------------------------------------

describe('a largura da faixa (BNR-18, BNR-19, BNR-20)', () => {
  it('`full` NÃO usa o container — a faixa vai de borda a borda', () => {
    montar([item('a')], { width: 'full' })
    const faixa = screen.getByTestId('hero-carousel')

    expect(faixa.className).not.toContain('container')
    expect(faixa.dataset.largura).toBe('full')
  })

  it('`full` não usa `w-screen` — ele inclui a barra de rolagem e rola o `body`', () => {
    // O defeito medido na auditoria da 27: `scrollWidth` 634 numa viewport de 390. "Sem container" é
    // a implementação literal de largura cheia; `100vw` é outra coisa.
    montar([item('a')], { width: 'full' })
    expect(screen.getByTestId('hero-carousel').className).not.toContain('w-screen')
  })

  it('`wide` usa o container e arredonda o canto', () => {
    montar([item('a')], { width: 'wide' })
    const faixa = screen.getByTestId('hero-carousel')

    expect(faixa.className).toContain('container')
    expect(faixa.dataset.largura).toBe('wide')
    expect(within(faixa).getByRole('region').className).toContain('rounded-lg')
  })

  it('sem largura declarada desenha como `full`', () => {
    montar([item('a')], {})
    expect(screen.getByTestId('hero-carousel').dataset.largura).toBe('full')
  })

  it('largura desconhecida desenha como `full` em vez de sair sem forma', () => {
    montar([item('a')], { width: 'gigante' } as never)
    expect(screen.getByTestId('hero-carousel').dataset.largura).toBe('full')
  })
})

// ---------------------------------------------------------------------------
// BNR-21..BNR-24, BNR-26 — a arte
// ---------------------------------------------------------------------------

describe('a arte por dispositivo (BNR-21, BNR-22)', () => {
  it('a arte de computador vai no `<source media>`, e a de celular no `<img>`', () => {
    // O navegador baixa UMA. Duas `<img>` escondidas por CSS baixariam as duas, e a que não aparece
    // sairia do orçamento do celular — que é ~90% dos acessos.
    const { container } = montar([item('a')])
    const source = container.querySelector('source')!

    expect(source.getAttribute('media')).toBe('(min-width: 768px)')
    expect(source.getAttribute('srcset')).toContain('a-d.jpg')
    expect(screen.getByRole('img').getAttribute('src')).toContain('a-m.jpg')
  })

  it('sem arte de celular, o `<img>` cai na de computador', () => {
    montar([item('a', { imageMobileUrl: null })])
    expect(screen.getByRole('img').getAttribute('src')).toContain('a-d.jpg')
  })

  it('sem arte de computador, o `<source>` cai na de celular', () => {
    const { container } = montar([item('a', { imageUrl: null })])
    expect(container.querySelector('source')!.getAttribute('srcset')).toContain('a-m.jpg')
  })

  it('a descrição da dona vira o `alt` — a frase da campanha está dentro da imagem', () => {
    montar([item('a', { label: 'Coleção de leite materno, 20% off' })])
    expect(screen.getByAltText('Coleção de leite materno, 20% off')).toBeInTheDocument()
  })
})

describe('a rendição vem do dono único (BNR-23)', () => {
  it('a arte de celular é pedida no tamanho da vaga do celular', () => {
    montar([item('a')])
    const src = screen.getByRole('img').getAttribute('src')!

    expect(src).toContain('render/image')
    expect(src).toContain(`width=${HERO_CAROUSEL_SLOTS.mobile.width}`)
    expect(src).toContain('resize=contain')
  })

  it('a arte de computador é pedida no tamanho da vaga do computador', () => {
    const { container } = montar([item('a')])
    expect(container.querySelector('source')!.getAttribute('srcset')).toContain(
      `width=${HERO_CAROUSEL_SLOTS.desktop.width}`,
    )
  })

  it('cada vaga tem `srcset` de duas larguras — a de 2× cobre tela retina', () => {
    const { container } = montar([item('a')])

    expect(screen.getByRole('img').getAttribute('srcset')!.split(',')).toHaveLength(2)
    expect(container.querySelector('source')!.getAttribute('srcset')!.split(',')).toHaveLength(2)
  })

  it('arte de fora do Storage sai INALTERADA, sem `srcset` inventado', () => {
    // O `render/image` só transforma o que está no Storage do projeto. Inventar `srcset` para uma
    // URL externa faria o navegador escolher um candidato que responde 404.
    montar([item('a', { imageUrl: 'https://exemplo.invalid/x.jpg', imageMobileUrl: null })])
    const img = screen.getByRole('img')

    expect(img.getAttribute('src')).toBe('https://exemplo.invalid/x.jpg')
    expect(img.getAttribute('srcset')).toBeNull()
  })
})

describe('a prioridade de carregamento (BNR-24)', () => {
  it('o primeiro slide nasce `eager` e com prioridade alta', () => {
    montar([item('a'), item('b'), item('c')])
    const primeiro = within(screen.getByTestId('hero-carousel-slide-0')).getByRole('img')

    expect(primeiro.getAttribute('loading')).toBe('eager')
    expect(primeiro.getAttribute('fetchpriority')).toBe('high')
  })

  it('os demais nascem `lazy` e SEM prioridade alta', () => {
    // Mais de um `high` dilui a dica e o navegador passa a ignorar todas — e slide fora da vista é
    // download que ninguém pediu.
    montar([item('a'), item('b'), item('c')])

    for (const i of [1, 2]) {
      const img = within(screen.getByTestId(`hero-carousel-slide-${i}`)).getByRole('img')
      expect(img.getAttribute('loading')).toBe('lazy')
      expect(img.getAttribute('fetchpriority')).toBeNull()
    }
  })
})

describe('a vaga tem altura antes da imagem chegar (BNR-26)', () => {
  it('as duas proporções saem de `HERO_CAROUSEL_SLOTS`, por variável CSS', () => {
    montar([item('a')])
    const estilo = screen.getByTestId('hero-carousel').getAttribute('style')!

    expect(estilo).toContain(
      `${HERO_CAROUSEL_SLOTS.mobile.width} / ${HERO_CAROUSEL_SLOTS.mobile.height}`,
    )
    expect(estilo).toContain(
      `${HERO_CAROUSEL_SLOTS.desktop.width} / ${HERO_CAROUSEL_SLOTS.desktop.height}`,
    )
  })

  it('cada slide reserva a vaga nos dois tamanhos', () => {
    montar([item('a')])
    const slide = screen.getByTestId('hero-carousel-slide-0')

    expect(slide.className).toContain('aspect-[var(--vaga-celular)]')
    expect(slide.className).toContain('md:aspect-[var(--vaga-computador)]')
  })
})

// ---------------------------------------------------------------------------
// BNR-27 — o destino
// ---------------------------------------------------------------------------

describe('o destino (BNR-27)', () => {
  it('o slide inteiro é o link', () => {
    montar([item('a', { href: '/leite-materno' })])
    expect(screen.getByTestId('hero-carousel-slide-0').getAttribute('href')).toBe('/leite-materno')
  })

  it('cada slide leva ao próprio destino', () => {
    montar([item('a', { href: '/um' }), item('b', { href: '/dois' })])

    expect(screen.getByTestId('hero-carousel-slide-0').getAttribute('href')).toBe('/um')
    expect(screen.getByTestId('hero-carousel-slide-1').getAttribute('href')).toBe('/dois')
  })
})

// ---------------------------------------------------------------------------
// BNR-31, BNR-34..BNR-38 — os controles
// ---------------------------------------------------------------------------

describe('um slide não é carrossel (BNR-31)', () => {
  it('sem bolinha, sem seta e sem anúncio', () => {
    montar([item('a')])

    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByTestId('hero-carousel-anuncio')).toBeNull()
  })

  it('o slide único continua sendo desenhado', () => {
    montar([item('a')])
    expect(screen.getByTestId('hero-carousel-slide-0')).toBeInTheDocument()
  })
})

describe('as bolinhas (BNR-34)', () => {
  it('há uma por slide', () => {
    montar([item('a'), item('b'), item('c')])
    expect(screen.getAllByRole('button', { name: /^Ver o banner/ })).toHaveLength(3)
  })

  it('cada uma diz QUAL banner abre, e não só o número', () => {
    montar([item('a', { label: 'Prata 925' }), item('b', { label: 'Leite materno' })])

    expect(screen.getByRole('button', { name: 'Ver o banner 1: Prata 925' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver o banner 2: Leite materno' })).toBeInTheDocument()
  })

  it('a do slide visível se declara a atual', () => {
    montar([item('a'), item('b')])
    const bolinhas = screen.getAllByRole('button', { name: /^Ver o banner/ })

    expect(bolinhas[0].getAttribute('aria-current')).toBe('true')
    expect(bolinhas[1].getAttribute('aria-current')).toBe('false')
  })

  it('clicar numa bolinha troca o slide corrente', () => {
    montar([item('a'), item('b'), item('c')])

    fireEvent.click(screen.getByRole('button', { name: /^Ver o banner 3/ }))

    const bolinhas = screen.getAllByRole('button', { name: /^Ver o banner/ })
    expect(bolinhas[2].getAttribute('aria-current')).toBe('true')
    expect(bolinhas[0].getAttribute('aria-current')).toBe('false')
  })
})

describe('as setas (BNR-35)', () => {
  it('existem, rotuladas, e escondidas no celular', () => {
    montar([item('a'), item('b')])
    const anterior = screen.getByRole('button', { name: 'Banner anterior' })

    expect(anterior).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo banner' })).toBeInTheDocument()
    // No celular quem troca de slide é o dedo, e uma seta sobre a arte tampa o texto da campanha.
    expect(anterior.className).toContain('hidden')
    expect(anterior.className).toContain('md:flex')
  })

  it('“próximo” avança', () => {
    montar([item('a'), item('b')])

    fireEvent.click(screen.getByRole('button', { name: 'Próximo banner' }))
    expect(screen.getAllByRole('button', { name: /^Ver o banner/ })[1].getAttribute('aria-current')).toBe(
      'true',
    )
  })

  it('“anterior” circula do primeiro para o último', () => {
    montar([item('a'), item('b'), item('c')])

    fireEvent.click(screen.getByRole('button', { name: 'Banner anterior' }))
    expect(screen.getAllByRole('button', { name: /^Ver o banner/ })[2].getAttribute('aria-current')).toBe(
      'true',
    )
  })
})

describe('o alvo de toque (BNR-36)', () => {
  it('bolinhas e setas adotam a medida única do projeto', () => {
    // A bolinha pintada tem 8px. Sem `TAP_44` ela seria um alvo de 8px num dedo — e a medida mora
    // num lugar só de propósito.
    montar([item('a'), item('b')])

    for (const botao of screen.getAllByRole('button')) {
      expect(botao.className, botao.getAttribute('aria-label') ?? '').toContain('before:h-11')
      expect(botao.className).toContain('before:w-11')
    }
  })
})

describe('o anúncio e a identificação (BNR-38)', () => {
  it('a região se identifica como carrossel, com nome', () => {
    montar([item('a'), item('b')])
    const regiao = screen.getByRole('region', { name: 'Banners da loja' })

    expect(regiao.getAttribute('aria-roledescription')).toBe('carrossel')
  })

  it('cada slide se identifica e se numera', () => {
    montar([item('a'), item('b')])
    const slide = screen.getByTestId('hero-carousel-slide-1')

    expect(slide.getAttribute('aria-roledescription')).toBe('slide')
    expect(slide.getAttribute('aria-label')).toBe('2 de 2')
  })

  it('a troca é anunciada de forma educada', () => {
    montar([item('a'), item('b'), item('c')])
    const anuncio = screen.getByTestId('hero-carousel-anuncio')

    expect(anuncio.getAttribute('aria-live')).toBe('polite')
    expect(anuncio).toHaveTextContent('Banner 1 de 3')
  })

  it('o anúncio acompanha a troca', () => {
    montar([item('a'), item('b'), item('c')])

    fireEvent.click(screen.getByRole('button', { name: 'Próximo banner' }))
    expect(screen.getByTestId('hero-carousel-anuncio')).toHaveTextContent('Banner 2 de 3')
  })
})

describe('o trilho (BNR-37)', () => {
  it('é um container de rolagem com encaixe — o arrasto é o do navegador', () => {
    // É o que faz o gesto funcionar sem JS e sem sequestrar a rolagem vertical da página.
    montar([item('a'), item('b')])
    const trilho = screen.getByTestId('hero-carousel-trilho')

    expect(trilho.className).toContain('overflow-x-auto')
    expect(trilho.className).toContain('snap-x')
    expect(trilho.className).toContain('snap-mandatory')
  })

  it('cada slide ocupa uma vaga inteira e encaixa', () => {
    montar([item('a'), item('b')])
    const slide = screen.getByTestId('hero-carousel-slide-0')

    expect(slide.className).toContain('w-full')
    expect(slide.className).toContain('shrink-0')
    expect(slide.className).toContain('snap-center')
  })

  it('o trilho NÃO embrulha — embrulhar esconde o estouro em vez de rolar', () => {
    // A mesma lição da barra de departamentos (`BL-028`): `flex-wrap` faz o conteúdo que não cabe
    // sumir para baixo, e ninguém descobre que ele existe.
    expect(screen.queryByTestId('hero-carousel-trilho')).toBeNull()
    montar([item('a'), item('b')])
    expect(screen.getByTestId('hero-carousel-trilho').className).not.toContain('flex-wrap')
  })
})

// ---------------------------------------------------------------------------
// BNR-39 — nenhum link fica escondido e focável ao mesmo tempo
// ---------------------------------------------------------------------------
//
// A AC foi escrita para o modelo de trilho TRANSLADADO, onde os slides fora de vista ficam
// visualmente escondidos e continuam no alcance do Tab — o defeito clássico do padrão: o foco some
// da tela e a cliente não sabe onde está.
//
// Com trilho de ROLAGEM o estado não existe: os slides não estão escondidos, estão fora da vista num
// container rolável, e dar Tab neles os traz para a vista (que é o comportamento correto de um
// scroller). A propriedade que a AC cobra continua valendo — mas por construção, e por isso ela
// precisa ser asserida aqui: "por construção" que ninguém mede é só uma frase.

describe('nenhum slide fica oculto E focável (BNR-39)', () => {
  it('nenhum slide é escondido do leitor de tela', () => {
    montar([item('a'), item('b'), item('c')])

    for (const i of [0, 1, 2]) {
      const slide = screen.getByTestId(`hero-carousel-slide-${i}`)
      expect(slide.getAttribute('aria-hidden')).toBeNull()
      expect(slide.hasAttribute('hidden')).toBe(false)
    }
  })

  it('nenhum slide é tirado do alcance do teclado', () => {
    // O par: esconder por CSS e tirar do Tab são os dois jeitos de errar. Um scroller não faz
    // nenhum dos dois — todo link continua alcançável, e alcançá-lo o traz para a vista.
    montar([item('a'), item('b'), item('c')])

    for (const i of [0, 1, 2]) {
      expect(screen.getByTestId(`hero-carousel-slide-${i}`).getAttribute('tabindex')).toBeNull()
    }
  })

  it('nenhum slide é escondido por CSS', () => {
    // Régua de TOKEN EXATO, e não `includes`: o slide legitimamente carrega `overflow-hidden`, e uma
    // régua de substring acusaria a classe certa. É a mesma lição de `cardSkeletonBox`, onde
    // `'min-h-[40px]'.includes('h-[40px]')` é `true`.
    const token = (nome: string) => new RegExp(`(?:^|\\s)${nome}(?![-\\w])`)
    montar([item('a'), item('b')])

    for (const i of [0, 1]) {
      const classe = screen.getByTestId(`hero-carousel-slide-${i}`).className
      expect(classe).not.toMatch(token('hidden'))
      expect(classe).not.toMatch(token('invisible'))
    }
  })
})
