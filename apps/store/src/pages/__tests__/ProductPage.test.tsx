import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

// PST-07: "WHEN a loja recebe `/produto/<slug-antigo>` E existe registro em `product_redirects`
// THEN SHALL redirecionar para o slug atual do produto."
//
// `useProduct` devolve o produto com o slug ATUAL; a página compara com o slug da URL e navega.
// Por isso o teste da página mede a URL final — é ela que a cliente vê e compartilha.

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
      <Routes>
        <Route
          path="/produto/:slug"
          element={
            <>
              <UrlProbe />
              <ProductPage />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  useProductMock.mockReset()
})

describe('ProductPage — redirect de slug antigo (PST-07)', () => {
  it('slug antigo com registro em product_redirects vai para o slug atual', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produto/sailor-moon-antigo')

    expect(screen.getByText('url:/produto/botton-sailor-moon')).toBeInTheDocument()
  })

  it('depois de redirecionar, a página RENDERIZA o produto — sem segundo salto', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produto/sailor-moon-antigo')

    // O slug da URL agora casa com o do produto, então a condição de redirect é falsa e a página
    // monta. Se houvesse loop, `galeria` nunca apareceria.
    expect(screen.getByText('galeria')).toBeInTheDocument()
    expect(screen.getByText('url:/produto/botton-sailor-moon')).toBeInTheDocument()
  })

  it('slug atual não redireciona — a URL fica onde está', () => {
    useProductMock.mockReturnValue({ data: product('botton-sailor-moon'), isFetching: false })

    renderAt('/produto/botton-sailor-moon')

    expect(screen.getByText('url:/produto/botton-sailor-moon')).toBeInTheDocument()
    expect(screen.getByText('galeria')).toBeInTheDocument()
  })

  it('slug inexistente e sem redirect mantém o 404, na mesma URL', () => {
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produto/nao-existe')

    expect(screen.getByText('Produto não encontrado')).toBeInTheDocument()
    expect(screen.getByText('url:/produto/nao-existe')).toBeInTheDocument()
  })

  it('redirect que aponta para produto deletado cai no 404, sem loop', () => {
    // `useProduct` devolve `null` quando o alvo do redirect já não existe.
    useProductMock.mockReturnValue({ data: null, isFetching: false })

    renderAt('/produto/slug-de-produto-apagado')

    expect(screen.getByText('Produto não encontrado')).toBeInTheDocument()
    expect(screen.getByText('url:/produto/slug-de-produto-apagado')).toBeInTheDocument()
  })

  it('enquanto a consulta corre, o 404 NÃO pisca', () => {
    useProductMock.mockReturnValue({ data: undefined, isFetching: true })

    renderAt('/produto/botton-sailor-moon')

    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument()
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
    renderAt('/produto/botton-sailor-moon')

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
    renderAt('/produto/botton-sailor-moon')

    expect(screen.queryByRole('heading', { name: 'Avaliações' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Compra verificada/)).not.toBeInTheDocument()
    expect(screen.queryByText(/avaliaç(ão|ões)/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /de 5 estrelas/ })).not.toBeInTheDocument()
  })
})
