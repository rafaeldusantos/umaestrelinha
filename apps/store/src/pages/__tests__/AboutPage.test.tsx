import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * A página Sobre — feature 29 (`SOB-01`..`SOB-11`).
 *
 * O que este arquivo mede é o que **a página promete à leitora**, não como ela está montada: a
 * sequência das quatro faixas, o texto exato do artboard, a vaga da foto quando não há foto, o
 * portão do WhatsApp e a canônica.
 *
 * As medidas do desenho entram como classe asserida (fundo da faixa, altura mínima do botão) porque
 * jsdom devolve 0 para toda medida de layout — a régua de verdade continua sendo a auditoria em
 * 390×844, e a classe é o proxy. É a mesma decisão registrada no `CLAUDE.md` para a `ProductPage`.
 */

const { settingsGeral } = vi.hoisted(() => ({
  settingsGeral: { whatsapp: '', store_name: 'Uma Estrelinha' },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settingsGeral,
}))

import AboutPage, { ABOUT_PATH } from '../AboutPage'

beforeEach(() => {
  settingsGeral.whatsapp = ''
  settingsGeral.store_name = 'Uma Estrelinha'
})

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={[ABOUT_PATH]}>
      <AboutPage />
    </MemoryRouter>,
  )

const secoes = () => Array.from(document.querySelectorAll('section'))

describe('Sobre — as quatro faixas (SOB-01, AC-1)', () => {
  it('monta as quatro faixas na ordem do artboard', () => {
    renderPagina()

    expect(secoes().map(s => s.getAttribute('data-testid'))).toEqual([
      'sobre-hero',
      'sobre-historia',
      'sobre-o-nome',
      'sobre-fecho',
    ])
  })

  it('cada faixa sai com o fundo medido no artboard', () => {
    renderPagina()

    const fundo = (testid: string) =>
      secoes()
        .find(s => s.getAttribute('data-testid') === testid)!
        .className.split(/\s+/)
        .find(c => c.startsWith('bg-estrelinha-'))

    expect(fundo('sobre-hero')).toBe('bg-estrelinha-ground-deep')
    expect(fundo('sobre-historia')).toBe('bg-estrelinha-ground')
    expect(fundo('sobre-o-nome')).toBe('bg-estrelinha-primary')
    expect(fundo('sobre-fecho')).toBe('bg-estrelinha-ground-deep')
  })
})

describe('Sobre — o hero (SOB-03, AC-2)', () => {
  it('traz o título e a frase de abertura com o texto exato do artboard', () => {
    renderPagina()

    expect(screen.getByRole('heading', { level: 1, name: 'Sobre a Uma Estrelinha' })).toBeInTheDocument()
    // A frase inteira, e não um fragmento: é a linha que abre a página, e meia frase asserida deixa
    // a copy divergir do desenho sem quebrar teste.
    expect(
      screen.getByText('Algumas lembranças são preciosas demais para ficarem apenas na memória.'),
    ).toBeInTheDocument()
  })

  it('a legenda apresenta a Adri, o ofício e a cidade', () => {
    renderPagina()

    expect(
      screen.getByText(
        'Adri Muniz, fundadora da Uma Estrelinha. Cada peça é feita à mão por ela, em Porto Alegre/RS.',
      ),
    ).toBeInTheDocument()
  })
})

const vagaDaFoto = () => document.querySelector('[class*="aspect-[4/3]"]')

describe('Sobre — a vaga da foto (SOB-04, AC-3, AC-13)', () => {
  /**
   * Sem arquivo, **nenhum `<img>`** — nem um `src` vazio, que o navegador trata como pedido à
   * própria página. A vaga existe, mantém a proporção e mostra o símbolo da marca.
   */
  it('sem foto, mostra o palco da marca e nenhum <img>', () => {
    renderPagina()

    expect(document.querySelector('img')).toBeNull()

    const vaga = vagaDaFoto()
    expect(vaga).not.toBeNull()
    expect(vaga!.className).toContain('rounded-lg')
    // O palco não é caixa vazia: o símbolo da marca é o que ocupa a vaga.
    expect(vaga!.querySelector('svg')).not.toBeNull()
  })

  /**
   * Proporção ÚNICA nos dois tamanhos (`SOB-04`). A fotografia é um arquivo só: se a vaga fosse
   * retrato no celular e paisagem no computador, o mesmo arquivo sairia cortado de dois jeitos —
   * e a dona teria de mandar dois recortes sem ninguém explicar por quê.
   */
  it('a vaga é 4:3 paisagem nos dois tamanhos, sem variante por breakpoint', () => {
    renderPagina()

    const classes = vagaDaFoto()!.className
    expect(classes).toContain('aspect-[4/3]')
    expect(classes).not.toMatch(/md:aspect-/)
    // O teto de largura encolheu no desktop: 520, e não os 650 de altura do desenho anterior.
    expect(classes).toContain('md:max-w-[520px]')
  })
})

describe('Sobre — a legenda troca de coluna, não de texto (SOB-03, AC-12)', () => {
  it('existe uma única vez no DOM', () => {
    renderPagina()

    expect(
      screen.getAllByText(
        'Adri Muniz, fundadora da Uma Estrelinha. Cada peça é feita à mão por ela, em Porto Alegre/RS.',
      ),
    ).toHaveLength(1)
  })

  /**
   * A ordem do DOM é a do MOBILE — título, foto, legenda —, porque é a ordem de leitura em ~90% dos
   * acessos e é a que o leitor de tela segue. Quem repõe a legenda na coluna de texto do desktop é a
   * grade, e é por isso que ela carrega `col-start-1 / row-start-2`.
   */
  it('no DOM vem depois da foto; no desktop a grade a devolve para a coluna de texto', () => {
    renderPagina()

    const hero = secoes().find(s => s.getAttribute('data-testid') === 'sobre-hero')!
    const grade = hero.firstElementChild!
    // `getAttribute('class')`, e não `.className`: um dos filhos da grade é `<svg>` (a estrela do
    // mobile), e ali `className` é um `SVGAnimatedString`, não string.
    const classes = (el: Element) => el.getAttribute('class') ?? ''
    const filhos = Array.from(grade.children)

    const iFoto = filhos.findIndex(el => classes(el).includes('aspect-[4/3]'))
    const iLegenda = filhos.findIndex(el => classes(el).includes('md:row-start-2'))
    expect(iFoto).toBeGreaterThan(-1)
    expect(iLegenda).toBeGreaterThan(iFoto)

    expect(classes(filhos[iLegenda])).toContain('md:col-start-1')
    expect(classes(filhos[iFoto])).toContain('md:col-start-2')
    expect(classes(filhos[iFoto])).toContain('md:row-span-2')
  })

  /**
   * `minmax(0, …)` nas DUAS trilhas, e não só a partir de um item largo: o mínimo automático de uma
   * coluna implícita é o min-content do item, e foi exatamente assim que a página do produto passou a
   * rolar na horizontal no celular (`CLAUDE.md`).
   */
  it('a grade declara minmax(0,…) nas duas colunas', () => {
    renderPagina()

    const grade = secoes().find(s => s.getAttribute('data-testid') === 'sobre-hero')!
      .firstElementChild!
    expect(grade.className).toContain('md:grid-cols-[minmax(0,600px)_minmax(0,520px)]')
  })
})

describe('Sobre — a trilha (SOB-12, AC-11)', () => {
  it('abre a página com Início › Sobre', () => {
    renderPagina()

    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    expect(trilha).toBeInTheDocument()

    const inicio = screen.getByRole('link', { name: 'Início' })
    expect(inicio).toHaveAttribute('href', '/')
    // Texto em fluxo usa `TAP_ROW`, nunca `TAP_44`: um quadrado de 44 centrado num rótulo curto
    // deixaria as pontas fora do alvo.
    expect(inicio.className).toContain('before:h-11')

    // O item corrente não é link — levar a leitora para a página em que ela já está é ruído.
    const atual = trilha.querySelector('[aria-current="page"]')!
    expect(atual.textContent).toBe('Sobre')
    expect(atual.querySelector('a')).toBeNull()
  })

  it('a trilha vem antes do hero', () => {
    renderPagina()

    const trilha = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    const hero = secoes().find(s => s.getAttribute('data-testid') === 'sobre-hero')!
    expect(trilha.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('Sobre — a história (SOB-05, AC-4)', () => {
  it('traz o texto da Adri na ordem escrita', () => {
    renderPagina()

    const historia = secoes().find(s => s.getAttribute('data-testid') === 'sobre-historia')!
    const inicios = Array.from(historia.querySelectorAll('h2, p')).map(el =>
      (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 28),
    )

    expect(inicios).toEqual([
      'Prazer, eu sou Adri Muniz, f',
      'Sou mãe de duas meninas, esp',
      'Durante a pandemia, encontre',
      '“Quando meus gatos virarem e',
      'Eu ainda não sabia como aqui',
      'O que começou pensando nos m',
      'Ao longo dessa caminhada, pe',
      'Cada material que chega até ',
      'E talvez essa seja a parte m',
    ])
  })

  it('a fala vai destacada por fio em accent, dentro de uma citação', () => {
    renderPagina()

    const citacao = document.querySelector('blockquote')
    expect(citacao).not.toBeNull()
    expect(citacao!.textContent).toBe(
      '“Quando meus gatos virarem estrelinha, eu quero fazer isso também.”',
    )
    expect(citacao!.querySelector('.bg-estrelinha-accent')).not.toBeNull()
  })
})

describe('Sobre — a faixa do nome (SOB-06, AC-5)', () => {
  it('nenhum TEXTO da faixa escura usa accent — só o traço da estrela', () => {
    renderPagina()

    const faixa = secoes().find(s => s.getAttribute('data-testid') === 'sobre-o-nome')!
    const emAccent = Array.from(faixa.querySelectorAll('[class*="text-estrelinha-accent"]'))

    // O ouro mede 3,07:1 sobre `primary`: reprova como texto (4,5:1) e passa como elemento gráfico
    // (3:1). Logo tudo que carrega a cor tem de ser desenho — texto nenhum.
    expect(emAccent.length).toBeGreaterThan(0)
    for (const el of emAccent) {
      expect(el.textContent).toBe('')
      expect(el.tagName.toLowerCase()).toBe('svg')
    }
  })

  it('o rótulo da faixa sai em serenity, e o corpo em on-primary', () => {
    renderPagina()

    const faixa = secoes().find(s => s.getAttribute('data-testid') === 'sobre-o-nome')!
    const rotulo = faixa.querySelector('.estrelinha-eyebrow')!
    expect(rotulo.textContent).toBe('O nome')
    expect(rotulo.className).toContain('text-estrelinha-serenity')

    expect(screen.getByText('Apenas passa a brilhar de outro lugar.').className).toContain(
      'text-estrelinha-on-primary',
    )
  })
})

describe('Sobre — o ouro só é traço (SOB-06)', () => {
  /**
   * O artboard traz o versalete da assinatura em ouro, e a implementação diverge de propósito:
   * `accent-strong` sobre `ground-deep` mede 3,17:1 — objeto gráfico passa, texto não. Sem esta
   * asserção, a próxima pessoa que "corrigir a divergência do desenho" reintroduz o defeito, e a
   * `accentText.test.ts` não pega (aquele arquivo já está na lista curta por causa dos ícones).
   */
  it('o versalete da assinatura não é ouro', () => {
    renderPagina()

    const fecho = secoes().find(s => s.getAttribute('data-testid') === 'sobre-fecho')!
    const assinatura = fecho.querySelector('.estrelinha-eyebrow')!
    expect(assinatura.textContent).toBe('Uma Estrelinha')
    expect(assinatura.className).toContain('text-estrelinha-ink-soft')
    expect(assinatura.className).not.toMatch(/text-estrelinha-accent/)
  })

  it('todo elemento em ouro da página é desenho, nunca texto', () => {
    renderPagina()

    const emOuro = Array.from(document.querySelectorAll('[class*="text-estrelinha-accent"]'))
    expect(emOuro.length).toBeGreaterThan(0)
    for (const el of emOuro) {
      expect(el.textContent).toBe('')
      expect(el.tagName.toLowerCase()).toBe('svg')
    }
  })
})

describe('Sobre — as duas ações (SOB-07, SOB-08, SOB-11)', () => {
  it('sem WhatsApp configurado, a ação some e a primária permanece (AC-6)', () => {
    renderPagina()

    expect(screen.queryByRole('link', { name: /Falar com a Adri/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Conhecer as joias/ })).toHaveAttribute('href', '/busca')
  })

  it('número curto demais é número não configurado', () => {
    settingsGeral.whatsapp = '(51) 9865'
    renderPagina()

    expect(screen.queryByRole('link', { name: /Falar com a Adri/ })).toBeNull()
  })

  it('com WhatsApp, o link sai com os dígitos do número (AC-7)', () => {
    settingsGeral.whatsapp = '(51) 98655-0542'
    renderPagina()

    const acao = screen.getByRole('link', { name: /Falar com a Adri/ })
    expect(acao.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5198655054/)
    expect(acao).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('as duas ações têm 44px de altura mínima (AC-10)', () => {
    settingsGeral.whatsapp = '(51) 98655-0542'
    renderPagina()

    for (const nome of [/Conhecer as joias/, /Falar com a Adri/]) {
      const acao = screen.getByRole('link', { name: nome })
      expect(acao.className).toContain('min-h-11')
      // Ação é 6px nesta loja; pílula é forma de rótulo.
      expect(acao.className).toContain('rounded-sm')
      expect(acao.className).not.toContain('rounded-pill')
    }
  })
})

describe('Sobre — a canônica (SOB-09, AC-8)', () => {
  it('declara /sobre e remove a tag ao desmontar', () => {
    const { unmount } = renderPagina()

    const canonica = document.head.querySelector('link[rel="canonical"]')
    expect(canonica?.getAttribute('href')).toBe(`${window.location.origin}${ABOUT_PATH}`)

    unmount()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })
})
