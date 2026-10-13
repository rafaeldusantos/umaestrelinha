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

// A emenda `E3` pôs os DOIS tipos de P3 como "em breve". A feature 50 implementou um deles e a 64 o
// outro (a Lista de categorias), e as asserções abaixo foram **viradas, não removidas**: as duas
// vezes o sujeito mudou e a régua continuou medindo. Hoje NENHUM bloco é "em breve", e este bloco
// existe para que, se alguém devolver um tipo a `COMING_SOON`, a suíte diga isso em vez de aprovar
// um bloco que a Adri nunca descobriria que existe.
//
// Queda de contagem sem reaparecimento do outro lado é deleção silenciosa — os seis casos de antes
// continuam seis.
describe('HomeBlockTray — os tipos de P3 ganharam tela (emenda E3, features 50 e 64)', () => {
  it('NENHUM bloco aparece como "em breve" (LCT-14)', () => {
    montar()
    const blocos = screen.getAllByTestId(/^bloco-/)
    // Âncora: a varredura alcançou o catálogo inteiro, senão a ausência abaixo seria vazia.
    expect(blocos).toHaveLength(11)
    for (const b of blocos) expect(b).not.toHaveTextContent('em breve')
    expect(screen.queryByTitle('Este bloco ainda não existe na loja.')).toBeNull()
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

  it('a Lista de categorias é oferecida pelo nome novo, e acrescentá-la funciona — também duas vezes (LCT-14)', () => {
    // Era aqui que a bandeja dizia "Este bloco ainda não existe na loja." sobre a grade de coleções.
    const comUma: HomeSection[] = [
      ...DEFAULT_HOME_COMPOSITION,
      { id: 'cg1', type: 'category_grid', position: 99, active: true, config: {} },
    ]
    const onAdd = montar(comUma)
    const alvo = bloco('category_grid')

    expect(alvo).not.toBeDisabled()
    expect(alvo).toHaveTextContent('Lista de categorias')
    expect(alvo).not.toHaveTextContent('Grade de coleções')
    expect(alvo).not.toHaveTextContent('em breve')
    expect(alvo).not.toHaveAttribute('title', 'Este bloco ainda não existe na loja.')
    expect(screen.queryByTestId('motivo-category_grid')).toBeNull()

    fireEvent.click(alvo)
    expect(onAdd).toHaveBeenCalledWith('category_grid')
  })

  it('com a Home cheia, a Lista de categorias é recusada pelo TETO — como qualquer tipo', () => {
    // Antes: "em breve" vencia o teto, porque dizer "a Home já tem 30 seções" sobre um bloco sem
    // editor mandaria a dona apagar uma seção à toa. A regra de precedência continua no componente
    // (`HomeBlockTray.tsx`); o que mudou é que ela não tem mais sujeito no catálogo, e a Lista de
    // categorias passa a ser recusada pelo motivo verdadeiro.
    const cheia: HomeSection[] = Array.from({ length: MAX_HOME_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      type: 'banner_grid',
      position: i + 1,
      active: true,
      config: {},
    }))
    montar(cheia)
    expect(bloco('category_grid')).toBeDisabled()
    expect(screen.getByTestId('motivo-category_grid')).toHaveTextContent('Home cheia')
    expect(screen.getByTestId('motivo-category_grid')).not.toHaveTextContent('em breve')

    // E o par: Produtos em destaque, idem.
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
