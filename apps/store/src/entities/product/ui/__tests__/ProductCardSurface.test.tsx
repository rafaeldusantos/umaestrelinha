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
import { COLOR_SLOT_TIERS, COLOR_THUMB_PX } from '../../lib/variantSelection'

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

/**
 * A fileira não é mais um controle: cada miniatura é o seu (`COR-11`, revisão de 2026-08-15). Por
 * isso ela se acha pelo papel de grupo, e as vagas são os filhos dela.
 */
const fileira = () => screen.getByRole('group', { name: 'Cores disponíveis' })
const semFileira = () => screen.queryByRole('group', { name: 'Cores disponíveis' })
const vagas = () => Array.from(fileira().children)
const miniatura = (cor: string) => screen.getByRole('button', { name: `Ver na cor ${cor}` })
/** A foto em destaque do palco — é ela que a escolha de cor troca. */
const emDestaque = () => screen.getByAltText('Botton Naruto Uzumaki') as HTMLImageElement

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
describe('card de produto — quando a fileira de cores existe (COR-10)', () => {
  it('produto com duas ou mais cores mostra a fileira', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))
    expect(fileira()).toBeInTheDocument()
  })

  it('produto SEM grade não mostra fileira, e o palco fica idêntico ao de hoje', () => {
    const { container } = renderCard(product())

    expect(semFileira()).toBeNull()
    expect(container.querySelector('.aspect-\\[4\\/5\\].rounded-xl.bg-estrelinha-ground-deep')).not.toBeNull()
  })

  it('produto com grade e SEM eixo de cor não mostra fileira', () => {
    renderCard(
      product({
        options: [option('Tamanho', ['45 cm', '50 cm'], 0)],
        variants: [variant({ Tamanho: '45 cm' }), variant({ Tamanho: '50 cm' })],
      }),
    )
    expect(semFileira()).toBeNull()
  })

  it('eixo de cor com UM valor só não mostra fileira — não há escolha a mostrar', () => {
    renderCard(comCor(['Prata 925']))
    expect(semFileira()).toBeNull()
  })
})

describe('card de produto — cada miniatura troca a imagem em destaque (COR-11)', () => {
  it('cada cor é um controle próprio — a fileira não é mais um botão só', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro', 'Ouro Rose']))

    expect(fileira().querySelectorAll('button')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Escolher a cor' })).toBeNull()
  })

  it('clicar numa cor põe a foto DELA no palco, no lugar da capa', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))
    expect(emDestaque().getAttribute('src')).toBe('')

    fireEvent.click(miniatura('Folheado a Ouro'))

    expect(emDestaque()).toHaveAttribute('src', 'Folheado a Ouro.webp')
  })

  it('clicar NÃO navega para a página do produto e NÃO abre o seletor', () => {
    renderCard(comCor(['Prata 925', 'Folheado a Ouro']))

    fireEvent.click(miniatura('Folheado a Ouro'))

    expect(screen.queryByText('rota-produto')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fechar seleção de variações' })).toBeNull()
  })

  it('cor SEM foto mantém a imagem atual — não esvazia o palco', () => {
    renderCard(comCor(['Prata', 'Ouro'], ['prata.webp', null]))
    fireEvent.click(miniatura('Prata'))
    expect(emDestaque()).toHaveAttribute('src', 'prata.webp')

    fireEvent.click(miniatura('Ouro'))

    expect(emDestaque()).toHaveAttribute('src', 'prata.webp')
  })

  it('a cor clicada passa a ser a escolhida, e a anterior deixa de ser', () => {
    renderCard(comCor(['Prata', 'Ouro']))
    expect(miniatura('Prata')).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(miniatura('Ouro'))

    expect(miniatura('Ouro')).toHaveAttribute('aria-pressed', 'true')
    expect(miniatura('Prata')).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('card de produto — o preço acompanha a cor escolhida (COR-12)', () => {
  /** 70% dos produtos com eixo de cor mudam de preço com a cor — medido em 2026-08-15. */
  const precoPorCor = product({
    options: [option('Cor', ['Prata', 'Ouro'], 0)],
    variants: [
      variant({ Cor: 'Prata' }, { position: 0, price: 100, image_url: 'prata.webp' }),
      variant({ Cor: 'Ouro' }, { position: 1, price: 200, image_url: 'ouro.webp' }),
    ],
  })

  it('trocar a cor troca o preço exibido — a foto e o valor são da MESMA variação', () => {
    renderCard(precoPorCor)
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument()

    fireEvent.click(miniatura('Ouro'))

    expect(screen.getByText('R$ 200,00')).toBeInTheDocument()
    expect(screen.queryByText('R$ 100,00')).toBeNull()
  })

  it('o Pix e a parcela saem do preço da cor escolhida, não do produto', () => {
    renderCard(precoPorCor)
    // 5% de desconto e 6x, os mesmos valores que o caixa aplica.
    expect(screen.getByText('R$ 95,00 com Pix')).toBeInTheDocument()

    fireEvent.click(miniatura('Ouro'))

    expect(screen.getByText('R$ 190,00 com Pix')).toBeInTheDocument()
    expect(screen.getByText('6x de R$ 33,33 sem juros')).toBeInTheDocument()
  })

  /**
   * `PDP-15` — o valor do card é o que o CAIXA cobra.
   *
   * R$ 100 e R$ 200 (o caso acima) dão o mesmo número nas duas fórmulas possíveis, então aquele
   * teste passaria mesmo com a conta errada. Este preço discrimina: a expressão que vivia inline
   * aqui arredondava o preço final e produzia R$ 7,51; `resolveOrderPricing` arredonda o desconto e
   * cobra R$ 7,50. Eram 81 dos 259 preços distintos do catálogo (31%) a 5%.
   */
  it('o Pix mostra o valor cobrado, e não o da fórmula que arredondava o preço final', () => {
    renderCard(product({ price: 7.9 }))

    expect(screen.getByText('R$ 7,50 com Pix')).toBeInTheDocument()
    expect(screen.queryByText('R$ 7,51 com Pix')).toBeNull()
  })

  it('o "de" riscado também segue a variação — senão a % do selo mistura duas linhas', () => {
    renderCard(
      product({
        options: [option('Cor', ['Prata', 'Ouro'], 0)],
        variants: [
          variant({ Cor: 'Prata' }, { position: 0, price: 100, compare_price: 200, image_url: 'p.webp' }),
          variant({ Cor: 'Ouro' }, { position: 1, price: 300, compare_price: 400, image_url: 'o.webp' }),
        ],
      }),
    )
    expect(screen.getByText('-50%')).toBeInTheDocument()

    fireEvent.click(miniatura('Ouro'))

    expect(screen.getByText('-25%')).toBeInTheDocument()
    expect(screen.getByText('R$ 400,00')).toBeInTheDocument()
  })
})

describe('card de produto — as medidas do board (COR-13)', () => {
  it('a fileira fica a 14px das bordas esquerda e inferior, com gap de 6px e SEM placa', () => {
    renderCard(comCor(['Prata', 'Ouro']))

    expect(fileira()).toHaveClass('absolute', 'bottom-3.5', 'left-3.5', 'gap-1.5')
    // A placa branca saiu na revisão de 2026-08-15: as miniaturas assentam direto sobre a foto.
    expect(fileira()).not.toHaveClass('bg-estrelinha-surface')
    expect(fileira()).not.toHaveClass('h-11')
  })

  it('a miniatura é 40×40 no celular e 45×45 no desktop, com raio 6px — contador incluído', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']))
    const todas = vagas()

    // 3 miniaturas (o máximo que a faixa mais larga mostra) + 1 contador por faixa.
    expect(todas).toHaveLength(6)
    // As DUAS metades, positivas (lição `L-029`): o lado do celular e o do desktop.
    for (const vaga of todas) {
      expect(vaga).toHaveClass('h-10', 'w-10', 'md:h-[45px]', 'md:w-[45px]', 'rounded-sm')
    }
  })

  it('cada miniatura carrega o alvo de toque de 44px — passo de 46px, sem sobreposição', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ródio']))

    // É o que torna a reversão de `COR-11` possível: 40 de desenho + 6 de gap = 46 > 44.
    for (const cor of ['Prata', 'Ouro', 'Ródio']) {
      expect(miniatura(cor)).toHaveClass('before:h-11', 'before:w-11', 'relative')
    }
  })

  it('a foto da miniatura é recortada com zoom de 1,6× — a peça é pequena sobre fundo branco', () => {
    renderCard(comCor(['Prata', 'Ouro']))
    const fotos = Array.from(fileira().querySelectorAll('img'))

    expect(fotos).toHaveLength(2)
    expect(fotos.filter(f => f.classList.contains('scale-[1.6]'))).toHaveLength(2)
    expect(fotos.filter(f => f.classList.contains('object-cover'))).toHaveLength(2)
  })
})

describe('card de produto — quantas vagas em cada largura de CARD (COR-16)', () => {
  it('abaixo de 162px de card a fileira inteira some — nem duas miniaturas cabem', () => {
    renderCard(comCor(['Prata', 'Ouro']))
    // A ausência é declarada por container query, e não por recorte do `overflow-hidden` do palco.
    expect(fileira()).toHaveClass('hidden', '@[162px]:flex')
  })

  it('os pisos escritos no CSS são os mesmos de `COLOR_SLOT_TIERS` — dois donos, um número', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']))
    const literais = new Set<number>()
    for (const el of [fileira(), ...vagas()]) {
      for (const c of Array.from(el.classList)) {
        const m = /^@\[(\d+)px\]:/.exec(c)
        if (m) literais.add(Number(m[1]))
      }
    }

    // Âncora: sem ela, um seletor errado varreria zero classe e o teste passaria vazio.
    expect(literais.size).toBe(COLOR_SLOT_TIERS.length)
    expect([...literais].sort((a, b) => a - b)).toEqual(COLOR_SLOT_TIERS.map(t => t.minCardPx))
  })

  it('os pisos comportam o lado MAIOR da miniatura, que é o do desktop', () => {
    // A miniatura cresce por viewport e as vagas por largura de card: um card de 220px aparece nas
    // duas larguras de miniatura, então o piso tem de valer para a de 45.
    for (const { minCardPx, slots } of COLOR_SLOT_TIERS) {
      const passo = COLOR_THUMB_PX.desktop + 6
      expect(passo * slots - 6).toBeLessThanOrEqual(minCardPx - 66)
    }
  })

  it('3 cores — a mediana do catálogo — cabem inteiras a partir de 200px, sem contador', () => {
    renderCard(comCor(['Folheado a Ouro', 'Folheado a Ouro Branco', 'Folheado a Ródio']))
    const [uma, duas, tres] = vagas()

    expect(vagas()).toHaveLength(4)
    // `classList`, não `className`: `overflow-hidden` contém "hidden" e faria a asserção mentir.
    expect(uma.classList.contains('hidden')).toBe(false)
    expect(duas).toHaveClass('hidden', '@[213px]:block')
    expect(tres).toHaveClass('hidden', '@[213px]:block')
    // Na faixa de 2 vagas sobra uma cor, e ela vira contador só naquela faixa.
    expect(vagas()[3]).toHaveTextContent('+2')
    expect(vagas()[3]).toHaveClass('hidden', '@[162px]:flex', '@[213px]:hidden')
  })

  it('4 cores: as quatro só a partir de 248px — nas faixas menores a última vaga é contador', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio']))
    const [uma, duas, tres, quatro] = vagas()

    expect(uma.classList.contains('hidden')).toBe(false)
    expect(duas).toHaveClass('hidden', '@[213px]:block')
    // A 3ª só aparece em 248: na faixa de 3 vagas ela cede o lugar ao `+2`, porque o contador
    // OCUPA vaga em vez de se pendurar ao lado.
    expect(tres).toHaveClass('hidden', '@[264px]:block')
    expect(quatro).toHaveClass('hidden', '@[264px]:block')
  })

  it('5 cores: um contador por faixa, e só o da faixa vigente aparece', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ouro Branco', 'Ródio', 'Rose']))
    const contadores = vagas().filter(v => /^\+\d+$/.test(v.textContent ?? ''))

    expect(contadores.map(c => c.textContent)).toEqual(['+4', '+3', '+2'])
    expect(contadores[0]).toHaveClass('hidden', '@[162px]:flex', '@[213px]:hidden')
    expect(contadores[1]).toHaveClass('hidden', '@[213px]:flex', '@[264px]:hidden')
    expect(contadores[2]).toHaveClass('hidden', '@[264px]:flex')
  })
})

describe('card de produto — a cor escolhida (COR-14)', () => {
  it('a escolhida tem contorno de 2px em `ink`; as demais, 1px `field`', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ródio']))

    expect(miniatura('Prata')).toHaveClass('border-2', 'border-estrelinha-ink')
    expect(miniatura('Ouro')).toHaveClass('border', 'border-estrelinha-field')
    expect(miniatura('Ouro')).not.toHaveClass('border-2')
  })
})

describe('card de produto — cor sem foto (COR-15)', () => {
  it('a cor sem foto vira palco vazio, sem `<img>` — nunca a foto de outra cor', () => {
    renderCard(comCor(['Prata', 'Ouro'], ['prata.webp', null]))

    expect(miniatura('Prata').querySelector('img')).toHaveAttribute('src', 'prata.webp')
    expect(miniatura('Ouro').querySelector('img')).toBeNull()
    expect(miniatura('Ouro')).toHaveClass('bg-estrelinha-ground-deep')
  })

  it('nenhuma `<img>` da fileira fica sem `src` — é o modo de falha que a AC descreve', () => {
    renderCard(comCor(['Prata', 'Ouro', 'Ródio'], ['prata.webp', null, null]))
    const imagens = Array.from(fileira().querySelectorAll('img'))

    // Âncora: sem ela, uma fileira que parasse de renderizar imagem passaria com a lista vazia.
    expect(imagens).toHaveLength(1)
    expect(imagens.filter(img => !img.getAttribute('src'))).toEqual([])
  })
})
