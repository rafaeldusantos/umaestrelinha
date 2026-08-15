import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { layoutRatios, layoutSlots, type HomeBannerLayout } from '@estrelinha/core/home'
import HomeBannerGrid, { type HomeBannerItem } from '../HomeBannerGrid'

/**
 * A grade de banners — `HOME-22`, `HOME-25`, `HOME-26`, `HOME-29`.
 *
 * A grade deixou de escolher o que mostra: a lista chega resolvida (curadoria da dona, ou a
 * derivação de sempre por `categories.banner_url`), e o que sobra aqui é **desenho** — quantas
 * vagas, com que proporção, e o que acontece quando a arte não carrega.
 */

const banner = (n: number, over: Partial<HomeBannerItem> = {}): HomeBannerItem => ({
  id: `b${n}`,
  href: `/campanha-${n}`,
  label: `Campanha ${n}`,
  imageUrl: `https://cdn.test/campanha-${n}.webp`,
  ...over,
})

const renderGrade = (banners: HomeBannerItem[], layout?: HomeBannerLayout) =>
  render(
    <MemoryRouter>
      <HomeBannerGrid banners={banners} layout={layout} />
    </MemoryRouter>,
  )

/** A razão que uma classe `aspect-[w/h]` desenha. */
const razaoDaClasse = (className: string): number => {
  const m = className.match(/aspect-\[(\d+)\/(\d+)\]/)!
  return Number(m[1]) / Number(m[2])
}

const links = () => screen.getAllByRole('link')

describe('HomeBannerGrid — os quatro arranjos (HOME-22)', () => {
  it.each([
    ['single', 1],
    ['pair', 2],
    ['hero_pair', 3],
    ['quad', 4],
  ] as const)('`%s` desenha %i banner(s), mesmo com 4 disponíveis', (layout, vagas) => {
    renderGrade([1, 2, 3, 4].map(n => banner(n)), layout)

    expect(links()).toHaveLength(vagas)
  })

  it('sem arranjo declarado, a grade é a de hoje: 3 vagas, na ordem da fileira', () => {
    // `HOME-04`: a virada não pode mudar a página, e `hero_pair` é o que a Home mostra hoje.
    renderGrade([1, 2, 3, 4].map(n => banner(n)))

    expect(links().map(l => l.getAttribute('href'))).toEqual([
      '/campanha-1',
      '/campanha-2',
      '/campanha-3',
    ])
  })

  it('arranjo desconhecido cai no de hoje em vez de sumir com a seção', () => {
    // `config` vem de `jsonb`: um valor gravado por uma versão mais nova é possível, e apagar a
    // grade por causa dele tiraria da Home a arte que a dona subiu.
    renderGrade([1, 2, 3, 4].map(n => banner(n)), 'mosaico_novo' as HomeBannerLayout)

    expect(links()).toHaveLength(3)
  })

  it('as proporções desenhadas são as que `core/home` declara para o arranjo', () => {
    // O Tailwind compila classe estática, então a classe não pode ser montada a partir da medida —
    // as duas cópias existem, e é esta comparação que as prende uma à outra.
    for (const layout of ['single', 'pair', 'hero_pair', 'quad'] as const) {
      const { unmount } = renderGrade([1, 2, 3, 4].map(n => banner(n)), layout)
      const medidas = layoutRatios(layout)

      expect(links()).toHaveLength(layoutSlots(layout))
      links().forEach((link, i) => {
        expect(razaoDaClasse(link.className), `${layout}, vaga ${i + 1}`).toBeCloseTo(
          medidas[i].width / medidas[i].height,
          5,
        )
      })

      unmount()
    }
  })
})

describe('HomeBannerGrid — o celular empilha tudo (HOME-26)', () => {
  it.each(['single', 'pair', 'hero_pair', 'quad'] as const)(
    'em `%s` o contêiner é coluna até `md`, e cada banner ocupa a largura cheia',
    layout => {
      // Medido: o contêiner deixa 358px em 390, e `quad` proporcional daria 82px por célula — a arte
      // desta loja tem texto embutido, e texto em 82px é ilegível em ~90% dos acessos.
      const { container } = renderGrade([1, 2, 3, 4].map(n => banner(n)), layout)

      const grade = container.querySelector('section > div')!
      expect(grade.className).toContain('flex-col')
      expect(grade.className).not.toMatch(/(^|\s)grid(\s|$)/)
      expect(grade.className).not.toMatch(/(^|\s)flex-row(\s|$)/)

      for (const link of links()) expect(link.className).toContain('w-full')
    },
  )

  /**
   * A METADE DESKTOP precisa de asserção POSITIVA — achado do Verifier no fecho da feature.
   *
   * As asserções acima são todas de negação (`not.toMatch(/grid/)`), desenhadas para tolerar o
   * `md:grid` que só vale do breakpoint para cima. Mas negação sozinha não prova que o mosaico
   * existe: apagar `md:flex-row` ou `md:grid md:grid-cols-2` deixaria a grade em **coluna única no
   * desktop** com a suíte inteira verde.
   *
   * `HOME-26` tem duas metades ("empilha em 390px" **e** "forma o mosaico no desktop"), e as duas
   * precisam de guarda. Lição que vale para todo par mobile/desktop desta loja.
   */
  it('`hero_pair` vira DUAS COLUNAS do `md` para cima — o grande ao lado dos dois de apoio', () => {
    const { container } = renderGrade([1, 2, 3].map(n => banner(n)), 'hero_pair')

    const grade = container.querySelector('section > div')!
    expect(grade.className).toContain('md:flex-row')
  })

  it.each(['pair', 'quad'] as const)(
    'em `%s` o mosaico do desktop é uma grade de 2 colunas',
    layout => {
      const { container } = renderGrade([1, 2, 3, 4].map(n => banner(n)), layout)

      const grade = container.querySelector('section > div')!
      expect(grade.className).toContain('md:grid')
      expect(grade.className).toContain('md:grid-cols-2')
    },
  )

  it('`single` NÃO vira grade no desktop: uma vaga só não é mosaico', () => {
    const { container } = renderGrade([banner(1)], 'single')

    const grade = container.querySelector('section > div')!
    expect(grade.className).not.toContain('md:grid')
  })

  it('a ordem no celular é a da fileira: a chamada vem antes do apoio', () => {
    renderGrade([1, 2, 3].map(n => banner(n)), 'hero_pair')

    expect(links().map(l => l.getAttribute('href'))).toEqual([
      '/campanha-1',
      '/campanha-2',
      '/campanha-3',
    ])
  })
})

describe('HomeBannerGrid — arte que não carrega e banner órfão (HOME-25, HOME-29)', () => {
  it('a proporção e o chão ficam no LINK, então imagem quebrada não desloca nada abaixo', () => {
    renderGrade([banner(1)], 'single')

    const link = links()[0]
    expect(link.className).toContain('aspect-[588/510]')
    expect(link.className).toContain('bg-estrelinha-ground-deep')
  })

  it('banner sem arte não é desenhado, e a vaga NÃO é preenchida por outro', () => {
    renderGrade([banner(1, { imageUrl: null }), banner(2), banner(3)], 'hero_pair')

    expect(screen.queryByRole('link', { name: 'Campanha 1' })).toBeNull()
    expect(links()).toHaveLength(2)
  })

  it('banner sem destino não é desenhado', () => {
    // Sem destino o clique cairia em lugar nenhum — pior que a ausência do banner.
    renderGrade([banner(1, { href: '' }), banner(2)], 'pair')

    expect(screen.queryByRole('link', { name: 'Campanha 1' })).toBeNull()
    expect(links()).toHaveLength(1)
  })

  it('sem banner nenhum a seção some inteira — nunca moldura vazia', () => {
    const { container } = renderGrade([])

    expect(container).toBeEmptyDOMElement()
  })

  it('o `alt` de cada banner é o rótulo do item, e não o nome do arquivo', () => {
    renderGrade([banner(1)], 'single')

    expect(screen.getByRole('img', { name: 'Campanha 1' })).toHaveAttribute(
      'src',
      'https://cdn.test/campanha-1.webp',
    )
  })
})
