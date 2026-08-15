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

describe('HomeBlockTray — os dois tipos de P3 (emenda E3)', () => {
  it('carrossel de produtos e grade de coleções aparecem como "em breve"', () => {
    montar()
    for (const type of ['product_carousel', 'category_grid']) {
      expect(bloco(type)).toBeDisabled()
      expect(screen.getByTestId(`motivo-${type}`)).toHaveTextContent('em breve')
    }
  })

  it('a frase não promete o que não existe', () => {
    montar()
    expect(bloco('product_carousel')).toHaveAttribute(
      'title',
      'Este bloco ainda não existe na loja.',
    )
  })

  it('"em breve" vence o teto: com a Home cheia, o P3 continua dizendo "em breve"', () => {
    // Dizer "a Home já tem 30 seções" sobre um carrossel que nem tem editor mandaria a dona apagar
    // uma seção à toa.
    const cheia: HomeSection[] = Array.from({ length: MAX_HOME_SECTIONS }, (_, i) => ({
      id: `s${i}`,
      type: 'banner_grid',
      position: i + 1,
      active: true,
      config: {},
    }))
    montar(cheia)
    expect(screen.getByTestId('motivo-product_carousel')).toHaveTextContent('em breve')
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
  it('oferece os dez tipos, e nenhum deles é contagem regressiva ou prova social', () => {
    montar()
    expect(screen.getAllByTestId(/^bloco-/)).toHaveLength(10)
    const ids = screen.getAllByTestId(/^bloco-/).map(b => b.getAttribute('data-testid'))
    expect(ids.some(id => /countdown|social|proof|depoiment/i.test(id ?? ''))).toBe(false)
  })

  it('diz que a seção nova nasce desligada (HOME-10)', () => {
    montar()
    expect(screen.getByText(/nasce desligada/)).toBeInTheDocument()
  })
})
