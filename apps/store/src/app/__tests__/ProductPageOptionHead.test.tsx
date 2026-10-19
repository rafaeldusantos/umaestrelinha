import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes, useLocation, useNavigate, type Location, type NavigateFunction } from 'react-router-dom'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * Feature 68 · SVR-08..16 — o `<head>` da página de OPÇÃO, medido pela `ProductPage` REAL.
 *
 * Quem decide é `productHead` (`@estrelinha/core/seo`), testado lá com todos os ramos. O que este
 * arquivo prova é a FIAÇÃO, que nenhum teste de `core` alcança: que a página lê o `?variant=` da URL
 * (e não a seleção do seletor), passa a peça inteira — marcações incluídas — à regra, escreve o
 * título e a canônica que ela devolve, remonta o corpo quando a URL muda de variação, e não declara
 * nada antes de ter a peça.
 *
 * As expectativas são LITERAIS, escritas à mão a partir da letra da spec — chamar `productHead` aqui
 * para calcular o esperado faria o teste concordar com qualquer coisa que a função devolvesse.
 *
 * A fixture é a "Pingente Pata" do Independent Test: três cores, só Prata 925 e Rosé marcadas, e o
 * eixo `Tamanho` também marcado — que NÃO gera página, porque só o primeiro eixo marcado gera.
 */

const { useProductMock, trackSpy } = vi.hoisted(() => ({ useProductMock: vi.fn(), trackSpy: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  useSeoSettings: () => ({ title: '', description: '', og_image: '' }),
}))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))
vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

/**
 * A sonda: expõe a linha aberta e um botão que faz o que o seletor faz — `purchase.select` —, sem a
 * página saber que é um teste. É o caminho de SVR-12: trocar de cor sem tocar na URL.
 */
vi.mock('@/entities/product/ui/ProductInfo', () => ({
  default: ({
    purchase,
  }: {
    purchase: { variant: { id: string } | null; select: (v: Record<string, string>) => void }
  }) => (
    <div>
      <span>linha:{purchase.variant?.id ?? 'nenhuma'}</span>
      <button type="button" onClick={() => purchase.select({ Cor: 'Prata 925', Tamanho: 'P' })}>
        escolher prata
      </button>
    </div>
  ),
}))

import ProductPage from '@/pages/ProductPage'
import PageViewTracker from '@/app/PageViewTracker'

const ROSE = 'Prata 925 Folheado a Ouro Rose'

const variante = (over: Partial<ProductVariant>): ProductVariant =>
  ({
    id: 'v', product_id: 'p-pata', option_values: {}, name: null, sku: null,
    price: 189, compare_price: null, stock: 5, weight_kg: null, image_url: null,
    is_active: true, position: 0, nuvemshop_id: null,
    ...over,
  }) as ProductVariant

const pata = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p-pata',
    name: 'Pingente Pata',
    slug: 'pingente-pata',
    price: 189,
    compare_price: null,
    category_id: '', category_slug: '',
    description: '<p>Pingente feito à mão com o material que você envia.</p>',
    seo_title: null, seo_description: null,
    image_url: '', images: [],
    stock_policy: 'track', category_links: [], stock_total: 10, low_stock_threshold: 5,
    is_new: false, is_featured: false, tags: [],
    options: [
      { name: 'Cor', values: ['Prata 925', 'Prata 925 Folheado a Ouro', ROSE], position: 0 },
      { name: 'Tamanho', values: ['P', 'G'], position: 1 },
    ],
    variants: [
      variante({ id: 'v-prata-p', option_values: { Cor: 'Prata 925', Tamanho: 'P' }, position: 0, nuvemshop_id: 1001 }),
      variante({ id: 'v-prata-g', option_values: { Cor: 'Prata 925', Tamanho: 'G' }, position: 1, nuvemshop_id: 1002 }),
      variante({ id: 'v-ouro-p', option_values: { Cor: 'Prata 925 Folheado a Ouro', Tamanho: 'P' }, position: 2, nuvemshop_id: 1003 }),
      variante({ id: 'v-rose-p', option_values: { Cor: ROSE, Tamanho: 'P' }, position: 3, nuvemshop_id: 1004 }),
      variante({ id: 'v-rose-g', option_values: { Cor: ROSE, Tamanho: 'G' }, position: 4, nuvemshop_id: 1005 }),
    ],
    option_marks: [
      { option_name: 'Cor', option_value: 'Prata 925', value_id: 'val-prata' },
      { option_name: 'Cor', option_value: ROSE, value_id: 'val-rose' },
      { option_name: 'Tamanho', option_value: 'P', value_id: 'val-pequeno' },
    ],
    ...over,
  }) as Product

const SLUG = '/produtos/pingente-pata'
const ORIGEM = window.location.origin

/** Os três `<head>` possíveis desta peça, escritos à mão a partir de SVR-08/09/10. */
const TITULO_PECA = 'Pingente Pata | Uma Estrelinha'
const TITULO_PRATA = 'Pingente Pata — Prata 925 | Uma Estrelinha'
// 63 caracteres com a marca: passa do teto de 60, então sai SEM a marca (SVR-08) — e nunca cortado.
const TITULO_ROSE = `Pingente Pata — ${ROSE}`

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null
const descricao = () =>
  document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') ?? null
const linha = () => screen.getByText(/^linha:/).textContent

/**
 * O roteador de teste com uma alça: `navigate` e `location` do próprio router, para navegar como a
 * cliente navega (link, voltar) e ler para onde a página mandou. A página continua a REAL.
 */
interface Alca {
  navigate: NavigateFunction
  location: Location
}
const montar = (path: string): Alca => {
  const alca = {} as Alca
  const Sonda = () => {
    alca.navigate = useNavigate()
    alca.location = useLocation()
    return null
  }
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sonda />
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return alca
}

beforeEach(() => {
  useProductMock.mockReset()
  useProductMock.mockReturnValue({ data: pata(), isFetching: false })
  trackSpy.mockReset()
  document.title = 'sentinela'
  for (const m of Array.from(document.head.querySelectorAll('meta[name="description"]'))) m.remove()
})
afterEach(() => {
  for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
})

describe('ProductPage — `?variant=` de opção marcada ⇒ o `<head>` da opção (SVR-08, SVR-09, SVR-11)', () => {
  it('a representante do Rosé: título da opção, sem a marca acima de 60, e a canônica com o mesmo `?variant=`', () => {
    montar(`${SLUG}?variant=1004`)
    expect(document.title).toBe(TITULO_ROSE)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1004`)
    expect(linha()).toBe('linha:v-rose-p')
  })

  it('a descrição começa pelo texto da opção e segue com a da peça (SVR-09)', () => {
    montar(`${SLUG}?variant=1004`)
    expect(descricao()).toBe(`${ROSE}. Pingente feito à mão com o material que você envia.`)
  })

  it('a Prata 925 cabe em 60 com a marca, e leva a marca', () => {
    montar(`${SLUG}?variant=1001`)
    expect(document.title).toBe(TITULO_PRATA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1001`)
  })

  it('outra variação do mesmo texto abre NELA, e canoniza para a representante (SVR-07)', () => {
    montar(`${SLUG}?variant=1005`)
    expect(linha()).toBe('linha:v-rose-g')
    expect(document.title).toBe(TITULO_ROSE)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1004`)
  })

  it('pelo UUID de uma variação com `nuvemshop_id`, a canônica usa o id público', () => {
    montar(`${SLUG}?variant=v-rose-p`)
    expect(linha()).toBe('linha:v-rose-p')
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1004`)
  })

  it('outros parâmetros da URL não entram na canônica (SVR-11)', () => {
    montar(`${SLUG}?variant=1001&utm_source=instagram`)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1001`)
  })
})

describe('ProductPage — todo o resto ⇒ o `<head>` da peça (SVR-10, SVR-11)', () => {
  it('cor sem marcação: título e canônica da peça, e a página abre na variação pedida', () => {
    montar(`${SLUG}?variant=1003`)
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
    expect(linha()).toBe('linha:v-ouro-p')
  })

  it('id desconhecido: o `<head>` da peça', () => {
    montar(`${SLUG}?variant=999999`)
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
  })

  it('sem parâmetro: o `<head>` da peça, como sempre', () => {
    montar(SLUG)
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
    expect(descricao()).toBe('Pingente feito à mão com o material que você envia.')
  })

  it('variação marcada mas INATIVA não é opção — a página não pode declarar o que não vende', () => {
    useProductMock.mockReturnValue({
      data: pata({
        variants: pata().variants.map(v => (v.nuvemshop_id === 1001 || v.nuvemshop_id === 1002 ? { ...v, is_active: false } : v)),
      }),
      isFetching: false,
    })
    montar(`${SLUG}?variant=1001`)
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
  })
})

describe('ProductPage — o seletor não mexe no `<head>` (SVR-12)', () => {
  it('trocar do Rosé para a Prata no seletor muda a linha, e título e canônica ficam os do Rosé', () => {
    montar(`${SLUG}?variant=1004`)
    fireEvent.click(screen.getByRole('button', { name: 'escolher prata' }))
    expect(linha()).toBe('linha:v-prata-p')
    expect(document.title).toBe(TITULO_ROSE)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1004`)
  })
})

describe('ProductPage — navegar de `?variant=A` para `?variant=B` da mesma peça (SVR-16)', () => {
  it('reabre na variação de B e troca o `<head>` para o de B', () => {
    const router = montar(`${SLUG}?variant=1004`)
    expect(linha()).toBe('linha:v-rose-p')
    act(() => {
      router.navigate(`${SLUG}?variant=1001`)
    })
    expect(linha()).toBe('linha:v-prata-p')
    expect(document.title).toBe(TITULO_PRATA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1001`)
  })

  it('para uma variação NÃO marcada: reabre nela, e o `<head>` volta a ser o da peça', () => {
    const router = montar(`${SLUG}?variant=1004`)
    act(() => {
      router.navigate(`${SLUG}?variant=1003`)
    })
    expect(linha()).toBe('linha:v-ouro-p')
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
  })
})

describe('ProductPage — antes da peça, nenhum título nem canônica (SVR-13)', () => {
  it('carregando: o título fica onde estava e não há canônica', () => {
    useProductMock.mockReturnValue({ data: undefined, isFetching: true })
    montar(`${SLUG}?variant=1004`)
    expect(document.title).toBe('sentinela')
    expect(canonical()).toBeNull()
  })
})

describe('ProductPage — peça sem marcações ⇒ o `<head>` da peça, aberta na variação da URL (SVR-15)', () => {
  it.each([
    ['ausentes', undefined],
    ['vazias', []],
  ])('marcações %s', (_, marcas) => {
    useProductMock.mockReturnValue({ data: pata({ option_marks: marcas }), isFetching: false })
    montar(`${SLUG}?variant=1004`)
    expect(document.title).toBe(TITULO_PECA)
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata`)
    expect(linha()).toBe('linha:v-rose-p')
  })
})

describe('ProductPage — slug antigo preserva o `?variant=` (edge case da spec)', () => {
  it('troca para o slug atual mantendo a query, e a canônica é a da opção no slug atual', () => {
    const router = montar('/produtos/pata-antiga?variant=1004')
    expect(router.location.pathname).toBe('/produtos/pingente-pata')
    expect(router.location.search).toBe('?variant=1004')
    expect(canonical()).toBe(`${ORIGEM}/produtos/pingente-pata?variant=1004`)
    expect(document.title).toBe(TITULO_ROSE)
  })
})

describe('ProductPage — página que vai navegar não declara `<head>` (A9 da `62`, SVR-13)', () => {
  it('rota legada com `?variant=`: nenhum título nem canônica no endereço que está saindo', () => {
    // Sem a rota de destino montada, o que sobra no documento é só o que a página LEGADA escreveu.
    render(
      <MemoryRouter initialEntries={['/produto/pingente-pata?variant=1004']}>
        <Routes>
          <Route path="/produto/:slug" element={<ProductPage legacy />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(document.title).toBe('sentinela')
    expect(canonical()).toBeNull()
  })
})

describe('ProductPage — o `page_view` leva o título da opção e o `?variant=` (SVR-14)', () => {
  it('o rastreador de página envia o título que a página declarou, com a URL inteira', () => {
    window.history.replaceState({}, '', `${SLUG}?variant=1004`)
    render(
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/produtos/:slug" element={<ProductPage />} />
        </Routes>
      </BrowserRouter>,
    )
    const pageViews = trackSpy.mock.calls.map(c => c[0]).filter(e => e?.name === 'page_view')
    expect(pageViews).toHaveLength(1)
    expect(pageViews[0].params.page_title).toBe(TITULO_ROSE)
    expect(new URL(pageViews[0].params.page_location).search).toBe('?variant=1004')
    window.history.replaceState({}, '', '/')
  })
})
