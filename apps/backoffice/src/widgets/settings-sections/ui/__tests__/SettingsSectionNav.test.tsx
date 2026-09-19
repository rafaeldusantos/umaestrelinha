// Feature 55 — a navegação das seções.
//
// O que se prova: que ela é **derivada do registro** (nunca uma lista escrita à mão ao lado dele),
// que só uma linha é marcada, que o marcador é `lg:`-only, e que o teclado alcança e ativa as
// quatro. O molde é `NavRail.test.tsx`, que guarda a mesma classe de coisa para o trilho.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import {
  SETTINGS_SECTIONS,
  settingsSectionPath,
  type SettingsSectionSlug,
} from '@/shared/lib/settingsSections'
import { SettingsSectionNav } from '../SettingsSectionNav'

const montar = (ativa: SettingsSectionSlug = 'dados-da-loja') =>
  render(
    <MemoryRouter>
      <SettingsSectionNav ativa={ativa} />
    </MemoryRouter>,
  )

const linhas = () => within(screen.getByTestId('settings-section-nav')).getAllByRole('link')

/**
 * Classe presente por **token exato**.
 *
 * `className.includes('h-11')` acha também `min-h-11`, e `border-l-primary` acharia
 * `border-l-primary-strong`. Dividir por espaço e comparar a string inteira é exato por construção —
 * sem regex e sem as camadas de escape que ela pede. É `L-034`: a borda de palavra não fecha nada
 * quando o vizinho é hífen.
 */
const temClasse = (elemento: Element, token: string): boolean =>
  elemento.className.split(/\s+/).includes(token)

describe('SettingsSectionNav — as quatro seções, derivadas do registro (CFG-01)', () => {
  it('renderiza exatamente os destinos do registro, na ordem dele', () => {
    // Âncora **derivada da fonte**: a lista esperada sai de `SETTINGS_SECTIONS`, nunca de quatro
    // strings escritas aqui. Uma lista à mão passaria a ser um segundo dono da ordem, e divergiria
    // em silêncio no dia da quinta seção.
    montar()

    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(0)
    expect(linhas().map(a => a.getAttribute('href'))).toEqual(
      SETTINGS_SECTIONS.map(s => settingsSectionPath(s.slug)),
    )
  })

  it('cada linha mostra o rótulo e a descrição da seção', () => {
    montar()

    for (const secao of SETTINGS_SECTIONS) {
      const linha = screen.getByTestId(`settings-section-link-${secao.slug}`)
      expect(within(linha).getByText(secao.label)).toBeInTheDocument()
      expect(within(linha).getByText(secao.description)).toBeInTheDocument()
    }
  })

  it('não há classe que dependa da CONTAGEM de seções', () => {
    // É a promessa que motivou a feature: a tela antiga levava `grid-cols-3 sm:grid-cols-8` no
    // `TabsList`, e a oitava aba só coube depois de um remendo de CSS documentado no código como
    // conserto local. Uma quinta seção aqui não pode pedir remendo nenhum.
    montar()

    expect(screen.getByTestId('settings-section-nav').className).not.toMatch(/grid-cols-\d/)
    for (const linha of linhas()) {
      expect(linha.className).not.toMatch(/grid-cols-\d/)
    }
  })

  it('a navegação tem nome acessível', () => {
    montar()
    expect(screen.getByRole('navigation', { name: /seções das configurações/i })).toBeInTheDocument()
  })
})

describe('SettingsSectionNav — o marcador (CFG-03)', () => {
  it('só uma linha é marcada, e é a que o painel está mostrando', () => {
    montar('frete-e-material')

    const marcadas = linhas().filter(a => a.getAttribute('aria-current') === 'page')
    expect(marcadas).toHaveLength(1)
    expect(marcadas[0]).toBe(screen.getByTestId('settings-section-link-frete-e-material'))
  })

  it('trocar a seção ativa move o marcador', () => {
    const { rerender } = montar('vendas')
    expect(screen.getByTestId('settings-section-link-vendas')).toHaveAttribute('aria-current', 'page')

    rerender(
      <MemoryRouter>
        <SettingsSectionNav ativa="notificacoes" />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('settings-section-link-vendas')).not.toHaveAttribute('aria-current')
    expect(screen.getByTestId('settings-section-link-notificacoes')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('a pintura do marcador é `lg:`-only — no celular a lista não marca nada', () => {
    // No desktop a rota-mãe marca a primeira seção porque o painel ao lado já está mostrando ela.
    // No celular a mesma rota é uma LISTA, e pintar uma linha diria que ela já está aberta.
    // As duas leituras saem desta única linha de classe; medir a janela em JS daria um quadro
    // errado na primeira pintura.
    montar('vendas')
    const marcada = screen.getByTestId('settings-section-link-vendas')

    expect(temClasse(marcada, 'lg:border-l-primary')).toBe(true)
    expect(temClasse(marcada, 'lg:bg-primary/5')).toBe(true)

    // O par que dá sentido ao caso: nenhuma das duas existe sem o prefixo.
    expect(temClasse(marcada, 'border-l-primary')).toBe(false)
    expect(temClasse(marcada, 'bg-primary/5')).toBe(false)
  })

  it('SENSOR: a régua de token exato distingue `border-l-primary` de `-strong`', () => {
    const falso = { className: 'border-l-primary-strong lg:bg-primary/50' } as unknown as Element

    expect(temClasse(falso, 'border-l-primary')).toBe(false)
    expect(temClasse(falso, 'lg:bg-primary/5')).toBe(false)
    expect(temClasse(falso, 'border-l-primary-strong')).toBe(true)
  })
})

describe('SettingsSectionNav — alvo de toque e afordância (CFG-14)', () => {
  it('a linha inteira é o alvo, e mede 60px de altura', () => {
    // 13 + 34 + 13 = 60, acima do piso de 44px. A régua é de **token exato** porque `py-[13px]`
    // é substring de nada, mas `h-[34px]` é substring de `min-h-[34px]` — e a próxima medida a
    // entrar aqui pode ser.
    montar()

    for (const linha of linhas()) {
      expect(temClasse(linha, 'py-[13px]')).toBe(true)
      const chip = linha.querySelector('span')!
      expect(temClasse(chip, 'h-[34px]')).toBe(true)
    }
  })

  it('o chevron existe e é `lg:hidden` — a seta é do celular', () => {
    // No desktop a seção abre ao lado; uma seta apontando para fora prometeria uma navegação que
    // não acontece.
    montar()

    for (const secao of SETTINGS_SECTIONS) {
      const linha = screen.getByTestId(`settings-section-link-${secao.slug}`)
      const chevron = linha.querySelector('svg.lg\\:hidden')
      expect(chevron, `chevron de ${secao.slug}`).not.toBeNull()
    }
  })
})

describe('SettingsSectionNav — teclado (Edge Case)', () => {
  it('as quatro linhas são alcançáveis por Tab', () => {
    // `<a href>` entra na ordem natural de tabulação. O que este caso protege é a ausência de
    // `tabIndex={-1}` — e que as linhas sejam links de verdade, não `<div onClick>`.
    montar()

    for (const linha of linhas()) {
      expect(linha.tagName).toBe('A')
      expect(linha).toHaveAttribute('href')
      expect(linha).not.toHaveAttribute('tabindex', '-1')
    }
  })

  it('tem foco visível', () => {
    montar()
    for (const linha of linhas()) {
      expect(linha.className).toContain('focus-visible:ring')
    }
  })

  it('Espaço ativa a linha — e segura a rolagem da página', () => {
    // Enter é do navegador em qualquer `<a href>`; **Espaço não é** — ele rola a página. A
    // *Edge Case* pede os dois, então o Espaço é tratado à mão.
    montar()
    const linha = screen.getByTestId('settings-section-link-vendas')

    let clicado = false
    linha.addEventListener('click', () => { clicado = true })

    const evento = fireEvent.keyDown(linha, { key: ' ' })

    expect(clicado).toBe(true)
    // `fireEvent` devolve `false` quando o handler chamou `preventDefault` — é assim que a rolagem
    // não acontece junto com a navegação.
    expect(evento).toBe(false)
  })

  it('SENSOR: outra tecla NÃO ativa a linha', () => {
    // O par do caso acima. Sem ele, um handler que clicasse em qualquer tecla passaria igual — e
    // navegar ao apertar seta ou letra seria pior que não ter o Espaço.
    montar()
    const linha = screen.getByTestId('settings-section-link-notificacoes')

    let clicado = false
    linha.addEventListener('click', () => { clicado = true })

    fireEvent.keyDown(linha, { key: 'ArrowDown' })
    fireEvent.keyDown(linha, { key: 'a' })

    expect(clicado).toBe(false)
  })
})
