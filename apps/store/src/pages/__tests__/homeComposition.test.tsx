import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from '../HomePage'

/**
 * **O guarda de `HOME-04`: a Home não muda de aparência quando a composição vira dado.**
 *
 * A feature 24 move as 7 seções da ordem do JSX para o banco. É o risco nº 1 dela, e o que o torna
 * risco é que **nada acusaria**: o build passa, o `tsc` passa, o teste de cada widget passa, e quem
 * descobre que a Home trocou de cara é a cliente. Este arquivo congela a página **de hoje** — a
 * sequência, os literais, os limites e as duas cores do título do hero — antes de qualquer edição de
 * widget.
 *
 * **Regra de uso, e ela é o ponto do arquivo:** da task da `HomePage` em diante o gate é *"este teste
 * continua verde SEM uma única alteração aqui"*. Se ele precisar mudar, a composição mudou — e é
 * exatamente a falha que `HOME-04` existe para pegar. Ajustar a asserção seria mover a trave.
 *
 * Por isso ele mede pelo **DOM renderizado**, nunca pela estrutura interna da página: nenhuma
 * asserção olha import, nome de componente ou hierarquia de `<div>`. A página pode encolher para
 * hook → resolve → render que a medição continua valendo.
 *
 * **A Home renderiza sem backend, de propósito.** Toda leitura devolve vazio, e o que sobra é a
 * composição semeada — que é o mesmo piso que `HOME-07` manda usar quando a leitura das seções
 * falha. É o que mantém este arquivo válido depois da virada.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))

const { catalogo, produtos } = vi.hoisted(() => ({
  catalogo: { data: [] as any[] },
  produtos: { data: [] as any[] },
}))

vi.mock('@/entities/category/api/useCategories', () => ({
  useCategories: () => catalogo,
  useCategoryBySlug: () => ({ data: null }),
}))

vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))

// Dublê de harness. O que se mede aqui é a COMPOSIÇÃO da página; o card tem prova própria em
// `ProductCardSurface.test.tsx`, e mantê-lo real obrigaria a fixture a carregar grade, estoque e
// preço — dado que não participa de nenhuma asserção deste arquivo.
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))

interface CatFixture {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  sort_order: number
  active: boolean
  show_in_menu: boolean
  banner_url: string | null
}

const categoria = (
  slug: string,
  name: string,
  sort_order: number,
  extra: Partial<CatFixture> = {},
): CatFixture => ({
  id: slug,
  name,
  slug,
  description: null,
  parent_id: null,
  sort_order,
  active: true,
  show_in_menu: false,
  banner_url: null,
  ...extra,
})

/**
 * A fixture tem **mais candidatas do que vagas em toda seção** — é isso que faz os limites serem
 * medidos em vez de presumidos: 13 temas para 12 chips, 6 raízes para 4 fileiras, 4 artes para 3
 * vagas de banner.
 *
 * Os temas vêm primeiro no array porque `pickTrendingCategories` corta na ordem em que a lista
 * chega; as fileiras e a grade ordenam por `sort_order` e não dependem disso.
 */
const temas = Array.from({ length: 13 }, (_, i) =>
  categoria(`tema-${i + 1}`, `Tema ${i + 1}`, 100 + i, { parent_id: 'colecao-1' }),
)
const colecoes = Array.from({ length: 6 }, (_, i) =>
  categoria(`colecao-${i + 1}`, `Coleção ${i + 1}`, i + 1),
)
const campanhas = Array.from({ length: 4 }, (_, i) =>
  categoria(`campanha-${i + 1}`, `Campanha ${i + 1}`, 7 + i, {
    banner_url: `https://cdn.test/campanha-${i + 1}.webp`,
  }),
)

catalogo.data = [...temas, ...colecoes, ...campanhas]
produtos.data = Array.from({ length: 4 }, (_, i) => ({ id: `p${i + 1}`, name: `Peça ${i + 1}` }))

const renderHome = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Os marcos, reordenados pela ordem do documento. Falha legível: sai a sequência real. */
const naOrdemDoDocumento = (marcos: [string, Element][]) =>
  [...marcos]
    .sort(([, a], [, b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    .map(([nome]) => nome)

describe('Home — a sequência das seções (HOME-04)', () => {
  it('desenha hero → vantagens → banners → fileiras com a faixa institucional depois da 1ª → chips → newsletter', () => {
    renderHome()

    const marcos: [string, Element][] = [
      ['hero', screen.getByRole('heading', { level: 1 })],
      ['vantagens', screen.getByText('Atendimento no WhatsApp')],
      ['grade de banners', screen.getByRole('link', { name: 'Campanha 1' })],
      ['1a fileira de colecao', screen.getByRole('heading', { name: 'Coleção 1' })],
      [
        'faixa institucional',
        screen.getByRole('heading', { name: 'Cada joia é uma memória eternizada à mão' }),
      ],
      ['2a fileira de colecao', screen.getByRole('heading', { name: 'Coleção 2' })],
      ['chips de tema', screen.getByRole('heading', { name: 'Explore por tema' })],
      ['newsletter', screen.getByRole('heading', { name: 'Quer saber das novidades?' })],
    ]

    expect(naOrdemDoDocumento(marcos)).toEqual(marcos.map(([nome]) => nome))
  })
})

describe('Home — os literais do hero (HOME-04)', () => {
  it('mantém sobretítulo, as duas linhas do título, o parágrafo e o CTA', () => {
    renderHome()

    expect(screen.getByText('Joias afetivas artesanais')).toBeInTheDocument()
    expect(screen.getByText('O que você ama,')).toBeInTheDocument()
    expect(screen.getByText('eternizado em joia.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Peças feitas à mão em resina com o seu material — leite materno, cabelos, pelos de pet, dentinhos ou cinzas. Cada joia é única, porque cada história é.',
      ),
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /Explorar coleções/ })
    expect(cta).toHaveAttribute('href', '/busca')
  })

  it('o título sai em DUAS cores: `ink` na 1ª linha, `primary` na 2ª', () => {
    // Não é decoração: é o que dá o pico de contraste sem um terceiro tamanho de fonte. Um remap que
    // uniformizasse as duas linhas passaria em build, `tsc` e teste de widget.
    renderHome()

    const [linha1, linha2] = Array.from(
      screen.getByRole('heading', { level: 1 }).querySelectorAll('span'),
    )

    expect(linha1).toHaveTextContent('O que você ama,')
    // `classList.contains` e não `toContain`: `text-estrelinha-ink` é prefixo de
    // `text-estrelinha-ink-soft`, e a busca por substring daria verde para a tinta errada.
    expect(linha1.classList.contains('text-estrelinha-ink')).toBe(true)

    expect(linha2).toHaveTextContent('eternizado em joia.')
    expect(linha2.classList.contains('text-estrelinha-primary')).toBe(true)
    expect(linha2.classList.contains('text-estrelinha-ink')).toBe(false)
  })
})

describe('Home — os literais da faixa institucional (HOME-04)', () => {
  it('mantém sobretítulo, título, parágrafo, assinatura e link de escape', () => {
    renderHome()

    expect(screen.getByText('Feito à mão, uma por vez')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Cada joia é uma memória eternizada à mão' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Trabalhamos com leite materno, cinzas de cremação, coto umbilical, cabelo, pelo de pet, dente de leite e flores para criar peças únicas em resina, prata 925 e aço inoxidável. Nada é produzido em série: cada história que chega até o ateliê vira uma peça só sua.',
      ),
    ).toBeInTheDocument()

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(screen.getByText('artesã · Porto Alegre/RS')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Conheça o ateliê' })).toHaveAttribute('href', '/sobre')
  })
})

describe('Home — os literais dos chips e da newsletter (HOME-04)', () => {
  it('mantém título e subtítulo dos chips de tema', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'Explore por tema' })).toBeInTheDocument()
    expect(screen.getByText('As linhas mais procuradas, direto ao ponto')).toBeInTheDocument()
  })

  it('mantém o "ver todos" dos chips, com rótulo e destino', () => {
    // **Emenda `E2`.** A primeira versão deste arquivo congelou título e subtítulo dos chips e
    // esqueceu o link — então a task que trocasse o texto do widget por prop poderia removê-lo e
    // nada acusaria, que é exatamente a classe de falha que este arquivo existe para pegar. O link
    // entra na composição como `link_label`/`link_href`, e aqui está o congelamento dele.
    renderHome()

    expect(screen.getByRole('link', { name: /Ver todos os temas/ })).toHaveAttribute('href', '/busca')
  })

  it('a seção dos chips mantém o chão `surface` e o respiro de hoje', () => {
    // A moldura da seção mora hoje na `HomePage` e vai migrar para o widget quando a composição
    // virar dado. Sem congelar o chão, a migração podia deixar os chips sobre `ground` — uma faixa
    // a menos no ritmo da página, sem nada quebrar.
    renderHome()

    const secao = screen.getByRole('heading', { name: 'Explore por tema' }).closest('section')!
    expect(secao.className).toContain('bg-estrelinha-surface')
    expect(secao.className).toContain('py-12')
  })

  it('mantém título, subtítulo e o rótulo do botão da newsletter', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
    expect(
      screen.getByText('Cadastre-se e fique por dentro das novidades da loja.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Me cadastrar' })).toBeInTheDocument()
  })
})

describe('Home — os limites de cada seção (HOME-04)', () => {
  it('a grade de banners tem 3 vagas, com 4 artes disponíveis', () => {
    renderHome()

    expect(screen.getAllByRole('link', { name: /^Campanha \d$/ })).toHaveLength(3)
    expect(screen.queryByRole('link', { name: 'Campanha 4' })).toBeNull()
  })

  it('a home mostra 4 fileiras de coleção, com 6 raízes disponíveis', () => {
    renderHome()

    expect(screen.getAllByRole('heading', { name: /^Coleção \d$/ })).toHaveLength(4)
    expect(screen.queryByRole('heading', { name: 'Coleção 5' })).toBeNull()
  })

  it('os chips de tema são 12, com 13 candidatas disponíveis', () => {
    renderHome()

    expect(screen.getAllByRole('link', { name: /^Tema \d+$/ })).toHaveLength(12)
    expect(screen.queryByRole('link', { name: 'Tema 13' })).toBeNull()
  })
})
