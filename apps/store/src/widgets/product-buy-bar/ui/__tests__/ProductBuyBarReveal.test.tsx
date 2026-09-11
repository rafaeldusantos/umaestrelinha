// A barra de compra ENTRA depois da foto principal — e o que ela usa para saber disso é um
// `IntersectionObserver`, que **jsdom não implementa**.
//
// Por isso este arquivo traz um dublê controlável: ele guarda o callback que a barra registrou e
// deixa o teste entregar uma entrada de cruzamento à mão. Sem ele não haveria como provar nenhum dos
// dois estados — e a alternativa (medir posição de verdade) não existe em jsdom, que devolve 0 para
// toda medida de layout.
//
// O que NÃO se prova aqui é o deslize: `transition-transform` é do compositor do navegador. O que se
// prova é a forma que o produz, e a prova de que ela chega na tela é a auditoria em 390×844.

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), custom: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))

import { useProductPurchase } from '@/entities/product/model/useProductPurchase'
import ProductBuyBar from '../ProductBuyBar'

/** O dublê do observer: guarda o callback e deixa o teste disparar o cruzamento. */
let emitir: ((rect: { bottom: number }, intersecting: boolean) => void) | null = null
let desconectado = 0
let observados: Element[] = []

class ObserverFalso {
  constructor(private cb: IntersectionObserverCallback) {
    emitir = (rect, intersecting) =>
      this.cb(
        [
          {
            isIntersecting: intersecting,
            boundingClientRect: rect as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        this as unknown as IntersectionObserver,
      )
  }
  observe(el: Element) {
    observados.push(el)
  }
  disconnect() {
    desconectado += 1
  }
  unobserve() {}
  takeRecords() {
    return []
  }
}

const produto = (): Product =>
  ({
    id: 'p1', name: 'Pingente', slug: 'pingente', price: 100, compare_price: null,
    category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
    stock_policy: 'track', category_links: [], options: [], variants: [],
  }) as Product

const Cena = ({ ancora }: { ancora?: React.RefObject<HTMLDivElement> }) => {
  const purchase = useProductPurchase(produto())
  return (
    <MemoryRouter>
      <div ref={ancora} data-testid="foto" />
      <ProductBuyBar product={produto()} purchase={purchase} revealAfter={ancora} />
    </MemoryRouter>
  )
}

const barra = () => screen.getByTestId('product-buy-bar')

/**
 * A classe está presente como TOKEN, e não como pedaço de outra.
 *
 * `className.includes('translate-y-0')` é `true` dentro de `focus-within:translate-y-0` — e é
 * `focus-within:` que está ali justamente para quando a barra está escondida. Uma régua por
 * substring inverteria o veredito do estado que mais importa. Mesma lição de `cardSkeletonBox`.
 */
const temClasse = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![-\\w])`).test(el.className)

// `src/test/setup.ts` já instala um `IntersectionObserver` inerte para o `whileInView` do
// framer-motion, e o instala com `Object.defineProperty(..., { writable: true })` — sem
// `configurable`. Por isso a troca é por **atribuição** e não por `vi.stubGlobal`, que redefine a
// propriedade e morre em "Cannot redefine property".
const original = globalThis.IntersectionObserver

beforeEach(() => {
  useCartStore.setState({ items: [] })
  emitir = null
  desconectado = 0
  observados = []
  globalThis.IntersectionObserver = ObserverFalso as unknown as typeof IntersectionObserver
})

afterEach(() => {
  globalThis.IntersectionObserver = original
})

describe('ProductBuyBar — a barra entra depois da foto principal', () => {
  it('nasce fora da tela enquanto a foto ainda está visível', () => {
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    // Sem cruzamento nenhum, o estado inicial vale: escondida.
    expect(barra()).toHaveAttribute('data-revealed', 'false')
    expect(temClasse(barra(), 'translate-y-full')).toBe(true)
    // Token exato: `focus-within:translate-y-0` contem a substring e inverteria este veredito.
    expect(temClasse(barra(), 'translate-y-0')).toBe(false)
  })

  it('entra quando a foto sai por CIMA da tela', () => {
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    act(() => emitir!({ bottom: -12 }, false))

    expect(barra()).toHaveAttribute('data-revealed', 'true')
    expect(temClasse(barra(), 'translate-y-0')).toBe(true)
    expect(temClasse(barra(), 'translate-y-full')).toBe(false)
  })

  it('NÃO entra quando a foto ainda está abaixo da tela', () => {
    // `isIntersecting` é `false` nos dois lados. Sem o recorte de `bottom <= 0` a barra apareceria
    // no primeiro quadro de uma página que ainda não pintou a foto — que é exatamente quando ela não
    // deve aparecer.
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    act(() => emitir!({ bottom: 900 }, false))

    expect(barra()).toHaveAttribute('data-revealed', 'false')
  })

  it('volta a sair quando a cliente rola de volta para a foto', () => {
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    act(() => emitir!({ bottom: -12 }, false))
    expect(barra()).toHaveAttribute('data-revealed', 'true')

    act(() => emitir!({ bottom: 400 }, true))
    expect(barra()).toHaveAttribute('data-revealed', 'false')
  })

  it('observa a âncora recebida, e desliga o observer ao desmontar', () => {
    const ancora = createRef<HTMLDivElement>()
    const { unmount } = render(<Cena ancora={ancora} />)

    expect(observados).toEqual([screen.getByTestId('foto')])

    unmount()
    expect(desconectado).toBe(1)
  })

  it('a animação é a MESMA do header: transform, com respeito a quem pediu menos movimento', () => {
    // `translate` e não montar/desmontar: animar transform é trabalho de composição, e desmontar
    // perderia o foco de dentro da barra. `focus-within` traz a barra de volta quando o `Tab` chega
    // num controle que está fora da tela.
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    const classes = barra().className
    expect(classes).toContain('transition-transform')
    expect(classes).toContain('duration-200')
    expect(classes).toContain('focus-within:translate-y-0')
    expect(classes).toContain('motion-reduce:transition-none')
  })
})

describe('ProductBuyBar — o padrão de falha é MOSTRAR', () => {
  it('sem âncora nenhuma, a barra fica visível', () => {
    // Esta é a **única** superfície de compra do celular. Escondê-la por falta de referência
    // tiraria a loja do ar em silêncio.
    const purchase = renderSemAncora()
    expect(purchase).toHaveAttribute('data-revealed', 'true')
  })

  it('sem IntersectionObserver no ambiente, a barra fica visível', () => {
    globalThis.IntersectionObserver = undefined as unknown as typeof IntersectionObserver
    const ancora = createRef<HTMLDivElement>()
    render(<Cena ancora={ancora} />)

    expect(barra()).toHaveAttribute('data-revealed', 'true')
    expect(temClasse(barra(), 'translate-y-0')).toBe(true)
  })
})

/** Monta a cena sem passar `revealAfter` e devolve a barra. */
function renderSemAncora() {
  render(<Cena />)
  return barra()
}
