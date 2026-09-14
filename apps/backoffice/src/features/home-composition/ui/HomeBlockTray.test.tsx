// A bandeja de blocos — `HOME-10` e os dois edge cases da spec (tipo único e teto).
//
// O que esta suíte prova é que a bandeja **responde antes do clique**. Uma bandeja que oferecesse
// tudo e recusasse depois teria o mesmo comportamento final e uma experiência diferente: a dona
// descobriria a regra por erro, e não por leitura.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HOME_COMPOSITION,
  MAX_HOME_SECTIONS,
  type HomeSection,
} from '@estrelinha/core/home'
import HomeBlockTray from './HomeBlockTray'

const montar = (sections: readonly HomeSection[] = DEFAULT_HOME_COMPOSITION) => {
  const onAdd = vi.fn()
  render(<HomeBlockTray sections={sections} onAdd={onAdd} />)
  return onAdd
}

const bloco = (type: string) => screen.getByTestId(`bloco-${type}`) as HTMLButtonElement

describe('HomeBlockTray — tipo único que já está na Home', () => {
  it('aparece esmaecido e DIZ que já está, em vez de recusar depois do clique', () => {
    montar()
    expect(bloco('newsletter')).toBeDisabled()
    expect(screen.getByTestId('motivo-newsletter')).toHaveTextContent('já está na Home')
    expect(bloco('newsletter')).toHaveAttribute(
      'title',
      '“Newsletter” já está na Home. Este bloco só pode existir uma vez.',
    )
  })

  it('clicar num bloqueado não acrescenta nada', () => {
    const onAdd = montar()
    fireEvent.click(bloco('hero'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('tipo único AUSENTE da Home é oferecido normalmente', () => {
    const semNewsletter = DEFAULT_HOME_COMPOSITION.filter(s => s.type !== 'newsletter')
    const onAdd = montar(semNewsletter)
    expect(bloco('newsletter')).not.toBeDisabled()
    fireEvent.click(bloco('newsletter'))
    expect(onAdd).toHaveBeenCalledWith('newsletter')
  })

  it('tipo repetível continua oferecido mesmo já estando na Home', () => {
    // Grade de banners e destaque em coleção são blocos de campanha: a dona pode querer dois.
    const onAdd = montar()
    expect(bloco('banner_grid')).not.toBeDisabled()
    fireEvent.click(bloco('banner_grid'))
    expect(onAdd).toHaveBeenCalledWith('banner_grid')
  })
})

// A emenda `E3` pôs os DOIS tipos de P3 como "em breve". A feature 50 implementou um deles, e as
// três asserções abaixo foram **viradas, não removidas**: `product_carousel` passa a ser oferecido,
// `category_grid` continua sendo o único esmaecido, e a régua do teto muda de sujeito.
//
// Queda de contagem sem reaparecimento do outro lado é deleção silenciosa — e este bloco existe
// para que, se alguém devolver `product_carousel` a `COMING_SOON`, a suíte diga isso em vez de
// aprovar um bloco que a Adri nunca descobriria que existe.
describe('HomeBlockTray — o tipo de P3 que sobrou (emenda E3, feature 50)', () => {
  it('SÓ a grade de coleções aparece como "em breve"', () => {
    montar()
    expect(bloco('category_grid')).toBeDisabled()
    expect(screen.getByTestId('motivo-category_grid')).toHaveTextContent('em breve')
  })

  it('Produtos em destaque é oferecido — não esmaecido, não "em breve" (DST-01)', () => {
    // O outro sentido da mesma régua. Um bloco esmaecido é um bloco que a Adri nunca descobre que
    // existe, e foi assim que `product_carousel` passou vinte e seis features na bandeja sem tela.
    montar()
    const alvo = bloco('product_carousel')

    expect(alvo).not.toBeDisabled()
    expect(alvo).toHaveTextContent('Produtos em destaque')
    expect(alvo).not.toHaveTextContent('em breve')
    expect(screen.queryByTestId('motivo-product_carousel')).toBeNull()
  })

  it('clicar em Produtos em destaque acrescenta o bloco', () => {
    const onAdd = montar()
    fireEvent.click(bloco('product_carousel'))
    expect(onAdd).toHaveBeenCalledWith('product_carousel')
  })

  it('mais de um Produtos em destaque é permitido — o tipo é repetível (DST-01)', () => {
    const comUm: HomeSection[] = [
      ...DEFAULT_HOME_COMPOSITION,
      { id: 'pc1', type: 'product_carousel', position: 99, active: true, config: {} },
    ]
    const onAdd = montar(comUm)

    expect(bloco('product_carousel')).not.toBeDisabled()
    fireEvent.click(bloco('product_carousel'))
    expect(onAdd).toHaveBeenCalledWith('product_carousel')
  })

  it('a frase do que ainda não existe fala da GRADE DE COLEÇÕES', () => {
    montar()
    expect(bloco('category_grid')).toHaveAttribute(
      'title',
      'Este bloco ainda não existe na loja.',
    )
  })

  it('"em breve" vence o teto: com a Home cheia, o P3 continua dizendo "em breve"', () => {
    // Dizer "a Home já tem 30 seções" sobre uma grade que nem tem editor mandaria a dona apagar
    // uma seção à toa. O sujeito mudou; a regra de precedência, não.
    const cheia: HomeSection[] = Array.from({ length: MAX_HOME_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      type: 'banner_grid',
      position: i + 1,
      active: true,
      config: {},
    }))
    montar(cheia)
    expect(screen.getByTestId('motivo-category_grid')).toHaveTextContent('em breve')

    // E o par: agora que Produtos em destaque existe, ele é recusado pelo TETO, como qualquer
    // tipo — e não mais por "em breve".
    expect(screen.getByTestId('motivo-product_carousel')).toHaveTextContent('Home cheia')
  })
})

describe('HomeBlockTray — o teto de 30 (edge case da spec)', () => {
  const cheia = (n: number): HomeSection[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      type: 'banner_grid' as const,
      position: i + 1,
      active: true,
      config: {},
    }))

  it('a 31ª é recusada DIZENDO o teto', () => {
    montar(cheia(MAX_HOME_SECTIONS))
    expect(bloco('banner_grid')).toBeDisabled()
    expect(bloco('banner_grid')).toHaveAttribute(
      'title',
      'A Home já tem 30 seções. Remova uma antes de acrescentar outra.',
    )
    expect(screen.getByTestId('motivo-banner_grid')).toHaveTextContent('Home cheia')
  })

  it('com 29 seções ainda dá para acrescentar', () => {
    const onAdd = montar(cheia(MAX_HOME_SECTIONS - 1))
    expect(bloco('banner_grid')).not.toBeDisabled()
    fireEvent.click(bloco('banner_grid'))
    expect(onAdd).toHaveBeenCalledWith('banner_grid')
  })
})

describe('HomeBlockTray — a bandeja mostra o catálogo inteiro', () => {
  it('oferece os onze tipos, e nenhum deles é contagem regressiva ou prova social', () => {
    montar()
    expect(screen.getAllByTestId(/^bloco-/)).toHaveLength(11)
    const ids = screen.getAllByTestId(/^bloco-/).map(b => b.getAttribute('data-testid'))
    expect(ids.some(id => /countdown|social|proof|depoiment/i.test(id ?? ''))).toBe(false)
  })

  it('oferece o Banner principal, e SEM a etiqueta “em breve” (BNR-01)', () => {
    // Vizinha da contagem acima, e não substituta: aquela mede o total, esta nomeia o bloco que a
    // feature 41 acrescenta. Um bloco esmaecido é um bloco que a Adri nunca descobre que existe.
    montar()
    const bloco = screen.getByTestId('bloco-hero_carousel')

    expect(bloco).toHaveTextContent('Banner principal')
    expect(bloco).not.toHaveTextContent('em breve')
    expect(bloco).not.toBeDisabled()
  })

  it('diz que a seção nova nasce desligada (HOME-10)', () => {
    montar()
    expect(screen.getByText(/nasce desligada/)).toBeInTheDocument()
  })
})

describe('HomeBlockTray — o Banner principal e o teto (BNR-03, BNR-05)', () => {
  const secao = (type: HomeSection['type'], id: string = type): HomeSection => ({
    id,
    type,
    position: 1,
    active: true,
    config: {},
  })

  it('acrescentar um SEGUNDO Banner principal é permitido — o tipo é repetível', () => {
    // O par da regra de unicidade: os tipos únicos aparecem esmaecidos com "já está na Home", e
    // este não pode ser um deles. Sem esta asserção, pôr `hero_carousel` em `UNIQUE_SECTION_TYPES`
    // esconderia o segundo bloco atrás de uma recusa que soa correta.
    const onAdd = montar([...DEFAULT_HOME_COMPOSITION, secao('hero_carousel')])

    expect(bloco('hero_carousel')).not.toBeDisabled()
    expect(screen.queryByTestId('motivo-hero_carousel')).toBeNull()

    fireEvent.click(bloco('hero_carousel'))
    expect(onAdd).toHaveBeenCalledWith('hero_carousel')
  })

  it('com a Home cheia, o Banner principal é recusado pelo teto — como qualquer tipo', () => {
    const cheia = Array.from({ length: MAX_HOME_SECTIONS }, (_, i) => secao('banner_grid', `s${i}`))
    montar(cheia)

    expect(bloco('hero_carousel')).toBeDisabled()
    expect(screen.getByTestId('motivo-hero_carousel')).toHaveTextContent('Home cheia')
  })
})
