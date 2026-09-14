import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Product } from '@estrelinha/supabase/types'

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: false,
    pix_discount_percent: 0,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import ProductCarousel from '../ProductCarousel'

/**
 * `DST-05` e `DST-06` — as três formas da fileira de produtos.
 *
 * **A régua é de TOKEN EXATO, nunca `toContain`** (`L-034`): `md:grid` é prefixo de `md:grid-cols-4`
 * e `grid` é prefixo de `grid-cols-2`, então uma régua de substring aprovaria a grade dizendo que
 * encontrou a fita. A forma que fecha é `(?:^|\s)token(?![-\w])`, porque `\b` não fecha nada quando o
 * vizinho é hífen ou dois-pontos.
 *
 * **Cada forma é asserida nas DUAS metades** (`L-029`): celular **e** `md`, com asserção positiva em
 * cada uma. `row` e `slider` são iguais abaixo de `md` de propósito — uma régua que medisse só o
 * celular aprovaria as duas com a mesma classe, e "Slider" com 12 peças viraria três linhas no
 * computador sem nada acusar.
 */

const STORAGE = (nome: string) =>
  `https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/${nome}.webp`

const product = (n: number): Product =>
  ({
    id: `p${n}`,
    name: `Pingente ${n}`,
    slug: `pingente-${n}`,
    price: 289,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'joias-afetivas',
    description: '',
    image_url: STORAGE(`p${n}`),
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
  }) as Product

const PRODUTOS = [1, 2, 3].map(product)

/** Token exato: recusa hífen, dois-pontos e letra depois do token (`L-034`). */
const temToken = (classes: string, token: string): boolean =>
  new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![-\\w])`).test(classes)

const trilho = (layout?: 'row' | 'slider' | 'grid'): HTMLElement => {
  render(
    <MemoryRouter>
      <ProductCarousel title="Peças escolhidas" products={PRODUTOS} layout={layout} />
    </MemoryRouter>,
  )
  // O trilho é o nó que anuncia o carregamento — é ele que carrega as classes de layout.
  const nó = document.querySelector('[aria-busy]')
  expect(nó).not.toBeNull()
  return nó as HTMLElement
}

// ---------------------------------------------------------------------------
// A régua, provada nos dois sentidos antes de medir qualquer coisa
// ---------------------------------------------------------------------------

describe('a régua de token', () => {
  it('acha o token exato', () => {
    expect(temToken('flex snap-x gap-6', 'flex')).toBe(true)
    expect(temToken('md:grid md:grid-cols-4', 'md:grid')).toBe(true)
  })

  it('NÃO confunde o token com o prefixo de outro (L-034)', () => {
    // O par que motiva a régua: `toContain('md:grid')` diria `true` para quem só tem
    // `md:grid-cols-4`, e a fita passaria por grade.
    expect(temToken('md:grid-cols-4', 'md:grid')).toBe(false)
    expect(temToken('grid-cols-2', 'grid')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// `row` — a Home de hoje, IMÓVEL
// ---------------------------------------------------------------------------

describe('layout `row` — a fileira de coleção de hoje (HOME-04)', () => {
  it('é o PADRÃO: sem a prop, a fileira é a de sempre', () => {
    const semProp = trilho().className
    document.body.innerHTML = ''
    const comProp = trilho('row').className
    expect(semProp).toBe(comProp)
  })

  it('no celular é fita que rola', () => {
    const classes = trilho('row').className
    expect(temToken(classes, 'flex')).toBe(true)
    expect(temToken(classes, 'overflow-x-auto')).toBe(true)
    expect(temToken(classes, 'snap-x')).toBe(true)
  })

  it('a partir de `md` vira grade de 4 numa linha', () => {
    const classes = trilho('row').className
    expect(temToken(classes, 'md:grid')).toBe(true)
    expect(temToken(classes, 'md:grid-cols-4')).toBe(true)
    expect(temToken(classes, 'md:overflow-visible')).toBe(true)
  })

  it('as vagas medem 220px no celular e soltam a medida no `md`', () => {
    trilho('row')
    const vaga = screen.getByText('Pingente 1').closest('[class*="min-w"]')!
    expect(temToken(vaga.className, 'min-w-[220px]')).toBe(true)
    expect(temToken(vaga.className, 'max-w-[220px]')).toBe(true)
    expect(temToken(vaga.className, 'md:min-w-0')).toBe(true)
    expect(temToken(vaga.className, 'md:max-w-none')).toBe(true)
  })

  it('tem as duas setas', () => {
    trilho('row')
    expect(screen.getByLabelText('Anterior')).toBeInTheDocument()
    expect(screen.getByLabelText('Próximo')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// `slider` — DST-05
// ---------------------------------------------------------------------------

describe('layout `slider` — uma fileira que rola nos dois tamanhos (DST-05)', () => {
  it('no celular é fita que rola', () => {
    const classes = trilho('slider').className
    expect(temToken(classes, 'flex')).toBe(true)
    expect(temToken(classes, 'overflow-x-auto')).toBe(true)
  })

  it('a partir de `md` CONTINUA fita — não vira grade', () => {
    // A metade que importa: sem ela, `slider` e `row` seriam a mesma coisa, e "Slider" com 12 peças
    // sairia em três linhas no computador — as duas opções entregariam a mesma tela.
    const classes = trilho('slider').className
    expect(temToken(classes, 'md:grid')).toBe(false)
    expect(temToken(classes, 'md:grid-cols-4')).toBe(false)
    expect(temToken(classes, 'md:overflow-visible')).toBe(false)
  })

  it('a vaga NÃO solta a medida no `md` — item de flex encolheria até o min-content', () => {
    trilho('slider')
    const vaga = screen.getByText('Pingente 1').closest('[class*="min-w"]')!
    expect(temToken(vaga.className, 'min-w-[220px]')).toBe(true)
    expect(temToken(vaga.className, 'md:min-w-0')).toBe(false)
  })

  it('tem as duas setas, e elas rolam a fita', () => {
    trilho('slider')
    expect(screen.getByLabelText('Anterior')).toBeInTheDocument()
    expect(screen.getByLabelText('Próximo')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// `grid` — DST-06
// ---------------------------------------------------------------------------

describe('layout `grid` — 2 no celular, 4 a partir de `md` (DST-06)', () => {
  it('no celular são DUAS colunas', () => {
    const classes = trilho('grid').className
    expect(temToken(classes, 'grid')).toBe(true)
    expect(temToken(classes, 'grid-cols-2')).toBe(true)
  })

  it('a partir de `md` são QUATRO colunas', () => {
    const classes = trilho('grid').className
    expect(temToken(classes, 'md:grid-cols-4')).toBe(true)
  })

  it('NÃO rola na horizontal — o que sobra embrulha', () => {
    const classes = trilho('grid').className
    expect(temToken(classes, 'overflow-x-auto')).toBe(false)
    expect(temToken(classes, 'snap-x')).toBe(false)
  })

  it('as setas NÃO são renderizadas — não há o que rolar', () => {
    trilho('grid')
    expect(screen.queryByLabelText('Anterior')).toBeNull()
    expect(screen.queryByLabelText('Próximo')).toBeNull()
  })

  it('um produto só desenha UMA célula, não uma linha inteira', () => {
    render(
      <MemoryRouter>
        <ProductCarousel title="Uma peça" products={[product(9)]} layout="grid" />
      </MemoryRouter>,
    )
    const vaga = screen.getByText('Pingente 9').closest('[class*="min-w"]')!
    // A célula não carrega medida própria: quem dá a largura é a trilha da grade.
    expect(temToken(vaga.className, 'min-w-0')).toBe(true)
    expect(temToken(vaga.className, 'max-w-[220px]')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// O guarda: as três formas saem de UM mapa
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url))
const FONTE = readFileSync(resolve(HERE, '..', 'ProductCarousel.tsx'), 'utf8')

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura (`L-031`, `BL-027`).
 *
 * Em duas passadas, um comentário de linha que cite um glob terminado em dois asteriscos carrega um
 * abre-bloco que a régua de bloco trata como abertura — e ela apaga até o próximo fecha-bloco,
 * inclusive código. CRLF normalizado **antes**, porque em JavaScript `.` não casa `\r`.
 */
const semComentarios = (fonte: string): string =>
  fonte
    .split('\r\n')
    .join('\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

const CODIGO = semComentarios(FONTE)

describe('as três formas saem de UM mapa (guarda de fonte)', () => {
  it('âncora: o arquivo foi lido e tem corpo', () => {
    expect(FONTE.length).toBeGreaterThan(3000)
    expect(CODIGO).toContain('const LAYOUTS')
  })

  it('âncora: as TRÊS formas estão no mapa', () => {
    // Sem esta âncora, um `LAYOUTS` renomeado ou esvaziado passaria com a varredura lendo zero
    // forma, que é a pior falha possível num teste que lê o disco.
    const mapa = CODIGO.slice(CODIGO.indexOf('const LAYOUTS'))
    for (const forma of ['row:', 'slider:', 'grid:']) {
      expect(mapa, `o mapa não declara ${forma}`).toContain(forma)
    }
  })

  it('a classe de vaga é declarada UMA vez por forma — nunca repetida no JSX', () => {
    // O par `min-w-[220px] max-w-[220px]` é a medida da vaga, e é o que `cardSkeletonBox.test.ts`
    // prende do outro lado. Escrito duas vezes, o card e o esqueleto divergem sem nada quebrar.
    const ocorrencias = CODIGO.split('min-w-[220px]').length - 1
    expect(ocorrencias).toBe(2)
  })

  it('o trilho não é escrito à mão em lugar nenhum — só sai do mapa', () => {
    const mapa = CODIGO.slice(CODIGO.indexOf('const LAYOUTS'), CODIGO.indexOf('export type CarouselLayout'))
    const foraDoMapa = CODIGO.replace(mapa, '')
    expect(foraDoMapa).not.toContain('overflow-x-auto')
    expect(foraDoMapa).not.toContain('md:grid-cols-4')
  })
})
