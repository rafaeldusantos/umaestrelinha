import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product, ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// O card lê `usePaymentSettings` desde que passou a mostrar Pix e parcela na vitrine (board
// `7CF-0`). São os MESMOS valores que o caixa cobra, então o mock repete os defaults de
// `DEFAULT_PAYMENT` — um mock com número inventado aqui provaria uma tela que não existe.
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))

import ProductCard from '../ProductCard'

/**
 * A superfície do card de produto na identidade papelaria (`PAP-08`).
 *
 * O card é o componente mais repetido da loja — aparece em quatro seções da
 * home, na categoria, na busca e nos relacionados. Uma cor errada aqui não é um
 * defeito local: é o defeito multiplicado por toda a vitrine.
 *
 * A regra que estes testes congelam é a da prancha 20b: **Carmim é todo o
 * dinheiro da tela**, e o resto do card é Grafite. Só o desconto ganha cor de
 * dinheiro; "Novo", "Últimas" e "Destaque" saem em Grafite — senão a listagem
 * vira um mostruário de etiquetas coloridas disputando atenção, que era
 * exatamente o problema da versão com selo rosa, amarelo e verde-água.
 */

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton Naruto Uzumaki',
  slug: 'botton-naruto',
  price: 8.9,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'anime',
  description: '',
  image_url: '',
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
  ...overrides,
})

/**
 * A rota do produto entra na montagem porque `COR-11` cobra o oposto dela: clicar na placa de cores
 * **não** pode navegar. Sem um destino de verdade, "não navegou" seria uma afirmação sem medida.
 */
const renderCard = (p: Product) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={p} />} />
        <Route path="/produtos/:slug" element={<div>rota-produto</div>} />
      </Routes>
    </MemoryRouter>,
  )

/** `useIsMobile` decide pela largura da janela; jsdom nasce em 1024 (desktop). */
const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

beforeEach(() => setViewport(1024))

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (
  option_values: Record<string, string>,
  overrides: Partial<ProductVariant> = {},
): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values,
  name: null,
  sku: null,
  price: 8.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

/**
 * Uma peça com eixo de cor. `fotos` omitido dá foto a todas; passar `null` numa posição é o caso de
 * `COR-15`, que no catálogo real são 193 das 3.245 variações.
 */
const comCor = (cores: string[], fotos?: (string | null)[]): Product =>
  product({
    options: [option('Cor', cores, 0)],
    variants: cores.map((cor, i) =>
      variant({ Cor: cor }, { position: i, image_url: fotos ? fotos[i] : `${cor}.webp` }),
    ),
  })

/** A placa é UM controle — por isso ela se acha pelo papel, e as vagas são os filhos dela. */
const placa = () => screen.getByRole('button', { name: 'Escolher a cor' })
const vagas = () => Array.from(placa().children)

describe('card de produto — superfícies', () => {
  it('o palco da foto é Mata-borrão', () => {
    const { container } = renderCard(product())
    expect(container.querySelector('.bg-estrelinha-ground-deep')).not.toBeNull()
  })

  it('o disco de adicionar é Grafite e continua DISCO', () => {
    // A forma de ação virou 14px na v2, mas o disco é a assinatura da marca —
    // o produto é redondo. É a única exceção declarada da regra.
    renderCard(product())
    const add = screen.getByRole('button', { name: /adicionar ao carrinho/i })
    expect(add).toHaveClass('bg-estrelinha-ink', 'rounded-full')
    expect(add).not.toHaveClass('rounded-sm')
  })

  it('o disco de favoritar é branco', () => {
    renderCard(product())
    expect(screen.getByRole('button', { name: /favoritos/i })).toHaveClass('bg-white', 'rounded-full')
  })
})

describe('card de produto — só o desconto ganha cor de dinheiro', () => {
  it('o preço sai em Carmim', () => {
    // Prancha 20b: Carmim é "todo o dinheiro da tela".
    renderCard(product())
    expect(screen.getByText('R$ 8,90')).toHaveClass('text-estrelinha-primary')
  })

  it('o selo de desconto é Carmim', () => {
    renderCard(product({ price: 7.5, compare_price: 8.9 }))
    expect(screen.getByText('-16%')).toHaveClass('bg-estrelinha-primary')
  })

  it.each([
    ['Novo', { is_new: true }],
    ['Últimas', { stock_total: 3 }],
    ['Destaque', { is_featured: true }],
  ])('o selo "%s" é Grafite, não Carmim', (label, overrides) => {
    renderCard(product(overrides as Partial<Product>))
    const badge = screen.getByText(label)
    expect(badge).toHaveClass('bg-estrelinha-ink')
    expect(badge).not.toHaveClass('bg-estrelinha-primary')
  })

  it('o preço riscado é Carbono, não Carmim — dois vermelhos empatariam', () => {
    renderCard(product({ price: 7.5, compare_price: 8.9 }))
    expect(screen.getByText('R$ 8,90')).toHaveClass('text-estrelinha-ink-soft', 'line-through')
  })
})

describe('card de produto — tipografia', () => {
  it('o nome sai em Libre Baskerville 500 na tinta primária', () => {
    renderCard(product())
    expect(screen.getByRole('heading', { name: 'Botton Naruto Uzumaki' })).toHaveClass(
      'font-display',
      'font-medium',
      'text-estrelinha-ink',
    )
  })

  it('o nome encolhe para 14px/20px em DUAS linhas, para o preço vir primeiro (COR-09)', () => {
    renderCard(product())
    const nome = screen.getByRole('heading', { name: 'Botton Naruto Uzumaki' })

    expect(nome).toHaveClass('text-[14px]', 'leading-[20px]', 'line-clamp-2')
    // O board sempre desenhou duas linhas e o código sempre truncou em uma. Reduzir a fonte sem
    // trocar o clamp deixaria o nome cortado, só que menor.
    expect(nome).not.toHaveClass('line-clamp-1')
  })

  it('a altura do nome é reservada em 40px, para os preços empatarem na fileira (COR-09)', () => {
    renderCard(product())
    expect(screen.getByRole('heading', { name: 'Botton Naruto Uzumaki' })).toHaveClass(
      'min-h-[40px]',
    )
  })
})

/**
 * A placa de cores do card — `COR-10`..`COR-15`.
 *
 * A regra pura vive em `lib/variantSelection` e tem prova própria; aqui se mede o que só a tela
 * responde: quais classes chegam ao DOM, quantas vagas cada largura mostra e o que o clique faz.
 */
describe('card de produto — quando a placa de cores existe (COR-10)', () => {
  it('produto com duas ou mais cores mostra a placa', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))
    expect(placa()).toBeInTheDocument()
  })

  it('produto SEM grade não mostra placa, e o palco fica idêntico ao de hoje', () => {
    const { container } = renderCard(product())

    expect(screen.queryByRole('button', { name: 'Escolher a cor' })).toBeNull()
    expect(container.querySelector('.aspect-\\[4\\/5\\].rounded-xl.bg-estrelinha-ground-deep')).not.toBeNull()
  })

  it('produto com grade e SEM eixo de cor não mostra placa', () => {
    renderCard(
      product({
        options: [option('Tamanho', ['45 cm', '50 cm'], 0)],
        variants: [variant({ Tamanho: '45 cm' }), variant({ Tamanho: '50 cm' })],
      }),
    )
    expect(screen.queryByRole('button', { name: 'Escolher a cor' })).toBeNull()
  })

  it('eixo de cor com UM valor só não mostra placa — não há escolha a mostrar', () => {
    renderCard(comCor(['Prata 925']))
    expect(screen.queryByRole('button', { name: 'Escolher a cor' })).toBeNull()
  })
})

describe('card de produto — a placa é um controle só, e abre o seletor que já existe (COR-11)', () => {
  it('as miniaturas não são controles — a placa é o único botão ali dentro', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro', 'Ouro Rose']))

    expect(placa().querySelectorAll('button, a, [role="button"]')).toHaveLength(0)
    expect(placa().querySelectorAll('img')).toHaveLength(3)
  })

  it('no desktop o clique abre o QuickAddDrawer e NÃO navega para a página do produto', () => {
    setViewport(1024)
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))

    fireEvent.click(placa())

    expect(screen.getByRole('button', { name: 'Fechar seleção de variações' })).toBeInTheDocument()
    expect(screen.queryByText('rota-produto')).toBeNull()
  })

  it('no celular o clique abre o mesmo bottom sheet que o "+" abre', () => {
    setViewport(390)
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))

    fireEvent.click(placa())

    expect(screen.getByRole('button', { name: /^Adicionar à sacola/ })).toBeInTheDocument()
    expect(screen.queryByText('rota-produto')).toBeNull()
  })
})

describe('card de produto — quantas vagas em cada largura (COR-12)', () => {
  it('3 cores — a mediana do catálogo — cabem inteiras nas duas larguras, sem contador', () => {
    renderCard(comCor(['Folheado a Ouro', 'Folheado a Ouro Branco', 'Folheado a Ródio']))

    expect(vagas()).toHaveLength(3)
    // `classList`, não `className`: `overflow-hidden` contém "hidden" e faria a asserção mentir.
    expect(vagas().filter(v => v.classList.contains('hidden'))).toEqual([])
    expect(placa()).toHaveTextContent('')
  })

  it('4 cores: as quatro a partir de `md`; abaixo de `md`, duas e o contador `+2`', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio']))
    const [um, dois, tres, quatro, contador] = vagas()

    expect(vagas()).toHaveLength(5)
    // A metade do celular: as duas primeiras vagas e o contador aparecem sem prefixo.
    expect(um).toHaveClass('block')
    expect(dois).toHaveClass('block')
    expect(contador).toHaveTextContent('+2')
    expect(contador).toHaveClass('flex', 'md:hidden')
    // A metade de `md`: as duas últimas miniaturas só existem a partir do prefixo.
    expect(tres).toHaveClass('hidden', 'md:block')
    expect(quatro).toHaveClass('hidden', 'md:block')
  })

  it('5 cores: `+2` a partir de `md` e `+3` abaixo — o contador ocupa a última vaga', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']))
    const [, , terceira, contadorMd, contadorCelular] = vagas()

    expect(vagas()).toHaveLength(5)
    expect(terceira).toHaveClass('hidden', 'md:block')
    expect(contadorMd).toHaveTextContent('+2')
    expect(contadorMd).toHaveClass('hidden', 'md:flex')
    expect(contadorCelular).toHaveTextContent('+3')
    expect(contadorCelular).toHaveClass('flex', 'md:hidden')
  })
})

describe('card de produto — as medidas do board (COR-13)', () => {
  it('a placa mede 44px de altura, com padding e gap de 6px, raio 12px e contorno `field`', () => {
    renderCard(comCor(['Prata', 'Ouro']))

    expect(placa()).toHaveClass(
      'h-11',
      'p-1.5',
      'gap-1.5',
      'rounded-md',
      'border',
      'border-estrelinha-field',
      'bg-estrelinha-surface',
    )
  })

  it('a placa fica a 14px das bordas esquerda e inferior do palco', () => {
    renderCard(comCor(['Prata', 'Ouro']))
    expect(placa()).toHaveClass('absolute', 'bottom-3.5', 'left-3.5')
  })

  it('a miniatura é 32×32 com raio 6px, e o contador ocupa vaga do mesmo tamanho', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']))
    const todas = vagas()

    expect(todas.filter(v => v.classList.contains('h-8') && v.classList.contains('w-8'))).toHaveLength(
      todas.length,
    )
    expect(todas.filter(v => v.classList.contains('rounded-sm'))).toHaveLength(todas.length)
  })
})

describe('card de produto — a cor escolhida (COR-14)', () => {
  it('a escolhida tem contorno de 2px em `ink`; as demais, 1px `field`', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ródio']))
    const [escolhida, outra] = vagas()

    expect(escolhida).toHaveClass('border-2', 'border-estrelinha-ink')
    expect(outra).toHaveClass('border', 'border-estrelinha-field')
    expect(outra).not.toHaveClass('border-2')
  })
})

describe('card de produto — cor sem foto (COR-15)', () => {
  it('a cor sem foto vira palco vazio, sem `<img>` — nunca a foto de outra cor', () => {
    renderCard(comCor(['Prata', 'Ouro'], ['prata.webp', null]))
    const [comFoto, semFoto] = vagas()

    expect(comFoto.querySelector('img')).toHaveAttribute('src', 'prata.webp')
    expect(semFoto.querySelector('img')).toBeNull()
    expect(semFoto).toHaveClass('bg-estrelinha-ground-deep')
  })

  it('nenhuma `<img>` da placa fica sem `src` — é o modo de falha que a AC descreve', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ródio'], ['prata.webp', null, null]))
    const imagens = Array.from(placa().querySelectorAll('img'))

    // Âncora: sem ela, uma placa que parasse de renderizar imagem passaria com a lista vazia.
    expect(imagens).toHaveLength(1)
    expect(imagens.filter(img => !img.getAttribute('src'))).toEqual([])
  })
})
