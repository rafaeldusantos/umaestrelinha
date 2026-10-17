import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeSection, ResolvedItem } from '@estrelinha/core/home'
import { imagePriority, renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CategoryList from '../CategoryList'

/**
 * O bloco **Lista de categorias** (feature 64) — `LCT-01..LCT-13`, `LCT-31..LCT-38`, `LCT-40`.
 *
 * jsdom devolve 0 para toda medida de layout, então o tamanho do círculo, o corte do quarto item e
 * a centralização são provados aqui como **classe por token exato**, com o positivo no celular E no
 * `md` (`L-029`, `L-034`); a medida de verdade é a prova em navegador (T16).
 */

const STORAGE = 'https://proj.supabase.co/storage/v1/object/public/home-images/'

const secao = (config: HomeSection['config'] = {}): HomeSection => ({
  id: 'lista-1',
  type: 'category_grid',
  position: 1,
  active: true,
  config,
})

/** Um item como `categoryListItem` o entrega: rótulo já decidido, arte só a enviada. */
const item = (n: number, over: Partial<ResolvedItem> = {}): ResolvedItem => ({
  id: `item-${n}`,
  categoryId: `cat-${n}`,
  productId: null,
  slug: `colecao-${n}`,
  label: `Coleção ${n}`,
  description: null,
  href: `/colecao-${n}`,
  imageUrl: `${STORAGE}circulo-${n}.png`,
  imageMobileUrl: null,
  curated: true,
  ...over,
})

const desenha = (items: ResolvedItem[], config: HomeSection['config'] = {}) =>
  render(
    <MemoryRouter>
      <CategoryList section={secao(config)} items={items} />
    </MemoryRouter>,
  )

/** As classes de um nó, por token — `'min-h-20'.includes('h-20')` é `true`, e token não é. */
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/** As vagas de ARTE. O círculo de quem não tem arte é outra coisa, com fundo e raio de propósito. */
const vagas = (container: HTMLElement) => Array.from(container.querySelectorAll('img')) as HTMLElement[]

describe('CategoryList — a fileira (LCT-01..LCT-04)', () => {
  it('desenha um item por categoria, NA ORDEM recebida (LCT-01)', () => {
    desenha([item(3), item(1), item(2)])

    const links = within(screen.getByRole('navigation', { name: 'Categorias' })).getAllByRole('link')
    expect(links.map(l => l.textContent)).toEqual(['Coleção 3', 'Coleção 1', 'Coleção 2'])
  })

  it('o rótulo é o que a resolução decidiu — o widget não reescreve (LCT-02)', () => {
    // `categoryListItem` já pôs o título no `label`. Um widget que lesse outro campo mostraria o
    // nome da coleção ao lado de um título que a dona escreveu.
    desenha([item(1, { label: 'Leite materno' })])
    expect(screen.getByRole('link', { name: 'Leite materno' })).toBeInTheDocument()
  })

  it('cada item é UM link para a coleção, com o rótulo como nome acessível (LCT-03, LCT-04)', () => {
    const { container } = desenha([item(1), item(2)])

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/colecao-1')
    expect(links[0]).toHaveAccessibleName('Coleção 1')
    // O círculo está DENTRO do link: tocar na foto também navega.
    expect(links[0].querySelector('img')).not.toBeNull()
    // Um link por `<li>`, nada além.
    for (const li of Array.from(container.querySelectorAll('li'))) {
      expect(li.querySelectorAll('a')).toHaveLength(1)
    }
  })

  it('a imagem tem `alt` vazio — o rótulo já nomeia o link (LCT-04)', () => {
    const { container } = desenha([item(1)])
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('sem itens não desenha nada — nem título, nem faixa (LCT-11)', () => {
    const { container } = desenha([], { title: 'Escolha por material' })
    expect(container.innerHTML).toBe('')
  })
})

describe('CategoryList — a vaga é da arte (LCT-05, LCT-35)', () => {
  it('quadrada: 80 no celular e 104 a partir de `md`, com `object-contain`', () => {
    const { container } = desenha([item(1)])
    const img = container.querySelector('img')!
    const t = tokens(img)

    expect(t).toEqual(expect.arrayContaining(['h-20', 'w-20', 'object-contain']))
    expect(t).toEqual(expect.arrayContaining(['md:h-[104px]', 'md:w-[104px]']))
  })

  it('SEM fundo, borda, sombra, raio, overflow nem recorte — o círculo é o da arte', () => {
    // Com qualquer um desses, a arte de cantos transparentes ganharia um disco ou um quadrado de
    // cor que a dona não desenhou — e a arte opaca seria recortada, que LCT-35 proíbe.
    const { container } = desenha([item(1), item(2)])

    // Âncora: a varredura achou as duas vagas — sem ela, um seletor errado aprovaria o nada.
    expect(vagas(container)).toHaveLength(2)
    for (const vaga of vagas(container)) {
      const proibidos = tokens(vaga).filter(c =>
        /^(?:[a-z-]+:)*(?:bg-|border|shadow|rounded|overflow-|clip-path|\[clip-path)/.test(c),
      )
      expect(proibidos).toEqual([])
    }
  })

  it('a régua da vaga DE FATO pegaria um `rounded-full` — sensor', () => {
    const regra = (c: string) =>
      /^(?:[a-z-]+:)*(?:bg-|border|shadow|rounded|overflow-|clip-path|\[clip-path)/.test(c)
    expect(['md:rounded-full', 'bg-estrelinha-surface', 'overflow-hidden', 'border'].every(regra)).toBe(
      true,
    )
    expect(['h-20', 'object-contain', 'md:w-[104px]'].some(regra)).toBe(false)
  })
})

describe('CategoryList — a foto no tamanho do círculo (LCT-06)', () => {
  it('`src`, `srcSet` e `sizes` vêm do dono da rendição', () => {
    const url = `${STORAGE}circulo-1.png`
    const { container } = desenha([item(1, { imageUrl: url })])
    const img = container.querySelector('img')!

    expect(img).toHaveAttribute('src', renditionUrl(url, 208))
    expect(img).toHaveAttribute('srcset', renditionSrcSet(url, [80, 104, 160, 208]))
    expect(img).toHaveAttribute('sizes', '(min-width: 768px) 104px, 80px')
  })

  it('o `loading` sai de `imagePriority` pela posição', () => {
    const items = Array.from({ length: 8 }, (_, i) => item(i + 1))
    const { container } = desenha(items)
    const imgs = Array.from(container.querySelectorAll('img'))

    expect(imgs.map(i => i.getAttribute('loading'))).toEqual(
      items.map((_, i) => imagePriority(i).loading),
    )
    // E a lista tem dos dois: sem o `lazy` no fim, a asserção acima valeria com tudo `eager`.
    expect(imgs.map(i => i.getAttribute('loading'))).toEqual(
      expect.arrayContaining(['eager', 'lazy']),
    )
  })

  it('o primeiro círculo NÃO carrega `fetchpriority` — a dica é do Banner principal (design R4)', () => {
    // `imagePriority(0)` traz `fetchPriority: 'high'`; repassá-lo faria um círculo de 80px disputar
    // o LCP com a arte de campanha logo acima.
    expect(imagePriority(0).fetchPriority).toBe('high')

    const { container } = desenha([item(1), item(2)])
    for (const img of Array.from(container.querySelectorAll('img'))) {
      expect(img.hasAttribute('fetchpriority')).toBe(false)
      expect(img.hasAttribute('fetchPriority')).toBe(false)
    }
  })

  it('arte de fora do Storage sai inalterada e sem `srcset` inventado', () => {
    const { container } = desenha([item(1, { imageUrl: 'https://cdn.test/arte.png' })])
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/arte.png')
    expect(img.hasAttribute('srcset')).toBe(false)
  })
})

describe('CategoryList — o título da seção (LCT-07)', () => {
  it('com título, um `<h2>` acima da fileira', () => {
    const { container } = desenha([item(1)], { title: 'Escolha pelo material' })
    const h2 = screen.getByRole('heading', { level: 2, name: 'Escolha pelo material' })

    const nav = screen.getByRole('navigation', { name: 'Categorias' })
    expect(h2.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelectorAll('h2')).toHaveLength(1)
  })

  it('sem título, ou só com espaço, NENHUM cabeçalho — nem um vazio ocupando altura', () => {
    for (const config of [{}, { title: '' }, { title: '   ' }]) {
      const { container, unmount } = desenha([item(1)], config)
      expect(container.querySelectorAll('h1, h2, h3, h4')).toHaveLength(0)
      unmount()
    }
  })

  it('a tipografia do título: 22/28 no celular e 28/34 a partir de `md`, em `ink` (LCT-07)', () => {
    desenha([item(1)], { title: 'Escolha pelo material' })
    const t = tokens(screen.getByRole('heading', { level: 2 }))
    expect(t).toEqual(
      expect.arrayContaining(['font-display', 'text-[22px]', 'leading-[28px]', 'text-estrelinha-ink']),
    )
    expect(t).toEqual(expect.arrayContaining(['md:text-[28px]', 'md:leading-[34px]']))
  })
})

describe('CategoryList — o rolador (LCT-08, LCT-34)', () => {
  it('é um `<nav>` rotulado que rola dentro de si, com encaixe por item', () => {
    desenha([item(1), item(2)])
    const nav = screen.getByRole('navigation', { name: 'Categorias' })

    expect(nav.tagName).toBe('NAV')
    expect(tokens(nav)).toEqual(
      expect.arrayContaining(['overflow-x-auto', 'snap-x', 'snap-mandatory']),
    )
    // O `<ul>` é o primeiro filho: é ele que o hook observa para notar a lista crescer.
    expect(nav.firstElementChild?.tagName).toBe('UL')
  })

  it('cada `<li>` encaixa e não encolhe: 96px no celular, 148px a partir de `md`', () => {
    const { container } = desenha([item(1), item(2), item(3)])
    for (const li of Array.from(container.querySelectorAll('li'))) {
      expect(tokens(li)).toEqual(expect.arrayContaining(['snap-start', 'shrink-0', 'w-24']))
      expect(tokens(li)).toContain('md:w-[148px]')
    }
  })

  it('centraliza por margem automática no primeiro e no último — NUNCA `justify-center` (A-09)', () => {
    // `justify-center` num contêiner rolável corta o começo quando estoura; a margem automática se
    // resolve em zero no estouro.
    const { container } = desenha([item(1), item(2), item(3)])
    const lis = Array.from(container.querySelectorAll('li'))

    expect(tokens(lis[0])).toContain('ml-auto')
    expect(tokens(lis[0])).not.toContain('mr-auto')
    expect(tokens(lis[2])).toContain('mr-auto')
    expect(tokens(lis[2])).not.toContain('ml-auto')
    expect(tokens(lis[1])).not.toEqual(expect.arrayContaining(['ml-auto']))
    expect(tokens(lis[1])).not.toContain('mr-auto')

    const ul = container.querySelector('ul')!
    expect(tokens(ul).filter(c => /justify-center$/.test(c))).toEqual([])
  })

  it('um item só leva as duas margens', () => {
    const { container } = desenha([item(1)])
    expect(tokens(container.querySelector('li')!)).toEqual(
      expect.arrayContaining(['ml-auto', 'mr-auto']),
    )
  })

  it('o `<ul>` mede o conteúdo quando estoura e a largura toda quando cabe (`w-max min-w-full`)', () => {
    // Achado da prova em navegador (T16): com o `<ul>` em 100% do rolador, os itens transbordavam
    // o `<ul>` e o recuo final do rolador (`px-4`/`md:px-12`) ficava FORA da área rolável — em
    // 1440, com 8 itens, a seta "Próximas" rolava 8px; em 390 o último item encostava na borda.
    // Com `w-max` o `<ul>` é que transborda, e o recuo final entra na rolagem; `min-w-full` mantém
    // a largura toda quando cabe, que é o que as margens automáticas usam para centralizar.
    const { container } = desenha([item(1), item(2)])
    expect(tokens(container.querySelector('ul')!)).toEqual(
      expect.arrayContaining(['w-max', 'min-w-full']),
    )
  })

  it('os itens alinham pelo topo (LCT-10)', () => {
    const { container } = desenha([item(1), item(2)])
    expect(tokens(container.querySelector('ul')!)).toContain('items-start')
  })
})

describe('CategoryList — o rótulo (LCT-10, LCT-37)', () => {
  it('duas linhas no máximo, centralizado, quebrando qualquer palavra, em `ink`', () => {
    desenha([item(1, { label: 'Pelodoseucompanheiroquerido' })])
    const rotulo = screen.getByText('Pelodoseucompanheiroquerido')

    expect(tokens(rotulo)).toEqual(
      expect.arrayContaining([
        'line-clamp-2',
        'text-center',
        '[overflow-wrap:anywhere]',
        'text-estrelinha-ink',
      ]),
    )
  })

  it('a tipografia do rótulo: 14/18 no celular e 16/21 a partir de `md` (LCT-10)', () => {
    desenha([item(1, { label: 'Cinzas' })])
    const t = tokens(screen.getByText('Cinzas'))
    expect(t).toEqual(expect.arrayContaining(['font-body', 'text-[14px]', 'leading-[18px]']))
    expect(t).toEqual(expect.arrayContaining(['md:text-[16px]', 'md:leading-[21px]']))
  })
})

describe('CategoryList — a foto que falta (LCT-36, LCT-40)', () => {
  it('item sem arte: o círculo na cor da loja, do MESMO tamanho da vaga, sem `<img>`', () => {
    const { container } = desenha([item(1, { imageUrl: null, label: 'Penas' })])

    expect(container.querySelector('img')).toBeNull()
    const circulo = container.querySelector('[data-circulo-sem-arte]')!
    expect(circulo).not.toBeNull()
    expect(tokens(circulo)).toEqual(
      expect.arrayContaining([
        'h-20',
        'w-20',
        'md:h-[104px]',
        'md:w-[104px]',
        'rounded-full',
        'bg-estrelinha-primary',
      ]),
    )
  })

  it('item sem arte: o nome fica DENTRO do círculo, em `on-primary`, e não se repete embaixo', () => {
    const { container } = desenha([item(1, { imageUrl: null, label: 'Penas' })])

    const circulo = container.querySelector('[data-circulo-sem-arte]')!
    const rotulo = within(circulo as HTMLElement).getByText('Penas')
    expect(tokens(rotulo)).toEqual(
      expect.arrayContaining(['text-estrelinha-on-primary', 'line-clamp-3', '[overflow-wrap:anywhere]']),
    )
    // Uma ocorrência só: o rótulo de baixo diria o mesmo nome duas vezes.
    expect(screen.getAllByText('Penas')).toHaveLength(1)
    // E o link continua nomeado pelo rótulo.
    expect(screen.getByRole('link', { name: 'Penas' })).toHaveAttribute('href', expect.any(String))
  })

  it('item COM arte não ganha o círculo — e o rótulo continua embaixo', () => {
    const { container } = desenha([item(1, { label: 'Cinzas' })])

    expect(container.querySelector('[data-circulo-sem-arte]')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
    expect(screen.getByText('Cinzas').closest('[data-circulo-sem-arte]')).toBeNull()
  })

  it('foto que não carrega: some só a imagem; a caixa e o rótulo ficam', () => {
    const { container } = desenha([item(1, { label: 'Cinzas' })])
    const img = container.querySelector('img')!

    expect(img.style.visibility).toBe('')
    fireEvent.error(img)

    // A caixa continua no DOM (sem deslocar vizinho) e só a pintura some.
    expect(container.querySelector('img')).toBe(img)
    expect(img.style.visibility).toBe('hidden')
    expect(tokens(img)).toEqual(expect.arrayContaining(['h-20', 'w-20']))
    expect(screen.getByText('Cinzas')).toBeVisible()
  })
})

describe('CategoryList — não nasce invisível (LCT-13)', () => {
  it('nenhuma opacidade zero, `invisible` ou animação de entrada no arquivo', () => {
    const fonte = readFileSync(resolve(__dirname, '../CategoryList.tsx'), 'utf8')
    // Âncora: o arquivo foi lido e é o widget.
    expect(fonte).toContain('const CategoryList')

    const codigo = fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')
    expect(codigo).not.toMatch(/opacity-0(?![-\w])|opacity-\[0\]|opacity:\s*0(?![.\d])/)
    expect(codigo).not.toMatch(/(?<![-\w])invisible(?![-\w])/)
    expect(codigo).not.toMatch(/animate-(?:fade|scale|slide)-|fade-in|animateIn/)
  })
})

/**
 * As setas do computador — `LCT-31..LCT-34`, `LCT-38`.
 *
 * jsdom devolve 0 para toda medida, então o estado é exercitado com as três medidas fixadas à mão
 * no nó e o `scroll` disparado — o molde de `Header.test.tsx` (`BL-028`).
 */
describe('CategoryList — as setas (LCT-31..LCT-34, LCT-38)', () => {
  const VISIVEL = 1184
  const TOTAL = 1872
  const FIM = TOTAL - VISIVEL

  const medir = (nav: HTMLElement, scrollLeft: number, total = TOTAL) => {
    let atual = scrollLeft
    Object.defineProperty(nav, 'scrollWidth', { configurable: true, get: () => total })
    Object.defineProperty(nav, 'clientWidth', { configurable: true, get: () => VISIVEL })
    Object.defineProperty(nav, 'scrollLeft', {
      configurable: true,
      get: () => atual,
      set: (valor: number) => {
        atual = valor
      },
    })
    act(() => {
      nav.dispatchEvent(new Event('scroll'))
    })
  }

  const doze = Array.from({ length: 12 }, (_, i) => item(i + 1))
  const anterior = () => screen.queryByRole('button', { name: 'Categorias anteriores' })
  const proxima = () => screen.queryByRole('button', { name: 'Próximas categorias' })
  const rolador = () => screen.getByRole('navigation', { name: 'Categorias' })

  it('quando CABE, nenhuma seta (LCT-31, LCT-34)', () => {
    desenha(doze)
    medir(rolador(), 0, VISIVEL)
    expect(anterior()).toBeNull()
    expect(proxima()).toBeNull()
  })

  it('no começo, só "Próximas categorias"', () => {
    desenha(doze)
    medir(rolador(), 0)
    expect(anterior()).toBeNull()
    expect(proxima()).toBeInTheDocument()
  })

  it('no meio, as duas', () => {
    desenha(doze)
    medir(rolador(), 300)
    expect(anterior()).toBeInTheDocument()
    expect(proxima()).toBeInTheDocument()
  })

  it('no fim, só "Categorias anteriores"', () => {
    desenha(doze)
    medir(rolador(), FIM)
    expect(anterior()).toBeInTheDocument()
    expect(proxima()).toBeNull()
  })

  it('o clique rola ~uma janela (0,8) para o lado da seta (LCT-32)', () => {
    desenha(doze)
    const nav = rolador()
    medir(nav, 0)

    fireEvent.click(proxima()!)
    expect(nav.scrollLeft).toBeCloseTo(VISIVEL * 0.8)

    fireEvent.click(anterior()!)
    expect(nav.scrollLeft).toBeCloseTo(0)
  })

  it('a suavização é do CSS, desligada para quem pede menos movimento (LCT-32)', () => {
    desenha(doze)
    expect(tokens(rolador())).toEqual(
      expect.arrayContaining(['scroll-smooth', 'motion-reduce:scroll-auto']),
    )
  })

  it('a raia das setas: 48px de cada lado a partir de `md`, 16px no celular', () => {
    desenha(doze)
    expect(tokens(rolador())).toEqual(expect.arrayContaining(['px-4', 'md:px-12']))
  })

  it('a seta: alvo de 44, disco de 36, posicionada no centro do círculo, só a partir de `md` (LCT-33)', () => {
    desenha(doze)
    const nav = rolador()
    medir(nav, 300)

    for (const seta of [anterior()!, proxima()!]) {
      const t = tokens(seta)
      // Posição: o `absolute` sobreviveu ao `twMerge` com o `relative` do `TAP_44`.
      expect(t).toContain('absolute')
      expect(t).not.toContain('relative')
      expect(t).toEqual(expect.arrayContaining(['top-[52px]', '-translate-y-1/2']))
      // Disco visível de 36 e o alvo de 44 do auxiliar.
      expect(t).toEqual(expect.arrayContaining(['h-9', 'w-9', 'before:h-11', 'before:w-11']))
      // Nunca abaixo de `md`.
      expect(t).toEqual(expect.arrayContaining(['hidden', 'md:flex']))
    }
    expect(tokens(anterior()!)).toContain('left-1')
    expect(tokens(proxima()!)).toContain('right-1')
  })

  it('as setas ficam FORA do rolador — o título não desloca a âncora delas', () => {
    desenha(doze, { title: 'Escolha pelo material' })
    const nav = rolador()
    medir(nav, 300)
    expect(nav.contains(proxima()!)).toBe(false)
    expect(screen.getByRole('heading', { level: 2 }).contains(proxima()!)).toBe(false)
  })

  it('duas fileiras na mesma árvore têm estados de seta independentes (LCT-38)', () => {
    render(
      <MemoryRouter>
        <CategoryList section={{ ...secao(), id: 'a' }} items={doze} />
        <CategoryList section={{ ...secao(), id: 'b' }} items={doze} />
      </MemoryRouter>,
    )
    const [a, b] = screen.getAllByRole('navigation', { name: 'Categorias' })
    medir(a, 300)
    medir(b, 0, VISIVEL)

    const secoes = Array.from(document.querySelectorAll('section'))
    expect(within(secoes[0]).queryByRole('button', { name: 'Categorias anteriores' })).not.toBeNull()
    expect(within(secoes[0]).queryByRole('button', { name: 'Próximas categorias' })).not.toBeNull()
    expect(within(secoes[1]).queryAllByRole('button')).toHaveLength(0)

    // Rolar uma não move a outra.
    fireEvent.click(within(secoes[0]).getByRole('button', { name: 'Próximas categorias' }))
    expect(b.scrollLeft).toBe(0)
  })
})
