import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

// PST-07: "WHEN a loja recebe `/produtos/<slug-antigo>` E existe registro em `product_redirects`
// THEN SHALL redirecionar para o slug atual do produto."
//
// `useProduct` devolve o produto com o slug ATUAL; a página compara com o slug da URL e navega.
// Por isso o teste da página mede a URL final — é ela que a cliente vê e compartilha.
//
// A feature 23 muda o CAMINHO, não o mecanismo: o canônico passa a ser `/produtos/:slug` (`URL-01`,
// `AD-018`) e o singular vira rota legada com espelho de 301 (`URL-02`).

const { useProductMock } = vi.hoisted(() => ({ useProductMock: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/entities/product/ui/ProductInfo', () => ({ default: () => <div>info</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))

import ProductPage from '../ProductPage'

const product = (slug: string): Product =>
  ({
    id: 'p1',
    name: 'Botton Sailor Moon',
    slug,
    price: 4.9,
    compare_price: null,
    category_id: '',
    category_slug: '',
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
  }) as Product

/** Prova por valor qual URL a página deixou no histórico. */
const UrlProbe = () => <span>url:{useLocation().pathname}</span>

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UrlProbe />
      <Routes>
        {/* O espelho da rota legada, igual ao que o `App.tsx` monta — em produção quem responde
            este salto é o 301 do edge. */}
        <Route path="/produto/:slug" element={<ProductPage legacy />} />
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null

beforeEach(() => {
  useProductMock.mockReset()
})

afterEach(() => {
  for (const link of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) {
    link.remove()
  }
})

describe('ProductPage — redirect de slug antigo (PST-07, agora em /produtos)', () => {
  it('slug antigo com registro em product_redirects vai para o slug atual', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produtos/sailor-moon-antigo')

    expect(screen.getByText('url:/produtos/botton-sailor-moon')).toBeInTheDocument()
  })

  it('a URL LEGADA com slug antigo chega ao caminho novo com o slug atual', () => {
    // Os dois saltos que a feature 23 encadeia: `/produto/<antigo>` → `/produtos/<antigo>` (espelho
    // do 301 do edge) → `/produtos/<atual>` (`product_redirects`).
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produto/sailor-moon-antigo')

    expect(screen.getByText('url:/produtos/botton-sailor-moon')).toBeInTheDocument()
    expect(screen.getByText('galeria')).toBeInTheDocument()
  })

  it('depois de redirecionar, a página RENDERIZA o produto — sem segundo salto', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produtos/sailor-moon-antigo')

    // O slug da URL agora casa com o do produto, então a condição de redirect é falsa e a página
    // monta. Se houvesse loop, `galeria` nunca apareceria.
    expect(screen.getByText('galeria')).toBeInTheDocument()
    expect(screen.getByText('url:/produtos/botton-sailor-moon')).toBeInTheDocument()
  })

  it('slug atual não redireciona — a URL fica onde está', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produtos/botton-sailor-moon')

    expect(screen.getByText('url:/produtos/botton-sailor-moon')).toBeInTheDocument()
    expect(screen.getByText('galeria')).toBeInTheDocument()
  })

  it('slug inexistente e sem redirect cai na 404 PRÓPRIA da loja, na mesma URL (URL-04)', () => {
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produtos/nao-existe')

    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
    expect(screen.getByText('url:/produtos/nao-existe')).toBeInTheDocument()
  })

  it('o bloco "Produto não encontrado" deixou de existir', () => {
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produtos/nao-existe')

    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument()
  })

  it('redirect que aponta para produto deletado cai no 404, sem loop', () => {
    // `useProduct` devolve `null` quando o alvo do redirect já não existe.
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produtos/slug-de-produto-apagado')

    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
    expect(screen.getByText('url:/produtos/slug-de-produto-apagado')).toBeInTheDocument()
  })

  it('enquanto a consulta corre, o 404 NÃO pisca', () => {
    useProductMock.mockReturnValue({ data: undefined, isFetching: true })

    const { container } = renderAt('/produtos/botton-sailor-moon')

    expect(screen.queryByRole('heading', { name: 'Essa página não existe.' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

// URL-01 — uma URL canônica por conteúdo.
describe('ProductPage — a tag canônica (URL-01)', () => {
  it('declara `/produtos/<slug atual>` no <head>', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produtos/botton-sailor-moon')

    expect(canonical()).toBe(`${window.location.origin}/produtos/botton-sailor-moon`)
  })

  it('produto inexistente não declara canônica nenhuma', () => {
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produtos/nao-existe')

    expect(canonical()).toBeNull()
  })
})

// PIN-07: as avaliações da página eram três depoimentos escritos à mão em `entities/review` — não
// havia tabela, RLS nem moderação. Depoimento inventado sobre a morte de alguém não é a mesma coisa
// que depoimento inventado sobre um pin, então a seção saiu inteira em vez de mudar de texto.
//
// O que precisa de prova aqui é que a PÁGINA sobreviveu à remoção: o bloco ficava entre a ficha
// técnica e os relacionados, e tirar um filho do meio de uma coluna é onde o layout costuma
// desmontar sem ninguém notar (a suíte de rota acima passaria igual).
describe('ProductPage — sem as avaliações de demonstração (PIN-07)', () => {
  beforeEach(() => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })
  })

  it('o que vinha antes e depois do bloco continua montado, na ordem', () => {
    renderAt('/produtos/botton-sailor-moon')

    const page = screen.getByText('galeria').closest('div.container')!
    const marcos = ['galeria', 'info', 'Cuidados e Conservação', 'Perguntas Frequentes']
    for (const marco of marcos) expect(screen.getByText(marco)).toBeInTheDocument()

    // A ordem no documento é a do board menos o bloco removido — se a coluna tivesse desmontado, ou
    // a ficha técnica tivesse subido para dentro da grade de cima, esta sequência mudaria.
    const texto = page.textContent ?? ''
    expect(texto.indexOf('galeria')).toBeLessThan(texto.indexOf('Cuidados e Conservação'))
    expect(texto.indexOf('Cuidados e Conservação')).toBeLessThan(texto.indexOf('Perguntas Frequentes'))
  })

  it('nenhum depoimento fabricado, nota agregada ou estrela é renderizado', () => {
    renderAt('/produtos/botton-sailor-moon')

    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Compra verificada/)).not.toBeInTheDocument()
    expect(screen.queryByText(/avaliaç(ão|ões)/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /de 5 estrelas/ })).not.toBeInTheDocument()
  })
})
