// Feature 25 — o modo prévia do renderizador (`PRV-06`, e a contrapartida de `HOME-04`).
//
// A asserção que mais vale aqui é a **negativa**: sem a prop `preview`, o DOM da Home não ganha um nó
// sequer. É o que separa esta feature de uma que muda a loja para servir ao painel — e é a mesma
// razão de `homeComposition.test.tsx` existir.

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  DEFAULT_HOME_COMPOSITION,
  PREVIEW_SECTION_ATTR,
  type HomeSection,
} from '@estrelinha/core/home'
import HomeRenderer from '../HomeRenderer'

/* eslint-disable @typescript-eslint/no-explicit-any */
const { categorias, produtos } = vi.hoisted(() => ({
  categorias: { data: [] as any[] },
  produtos: { data: [] as any[] },
}))

vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, max_installments: 6 }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))

const categoria = (slug: string, name: string, sort_order: number) => ({
  id: slug,
  name,
  slug,
  description: null,
  parent_id: null,
  sort_order,
  active: true,
  show_in_menu: false,
  banner_url: null,
})

categorias.data = [1, 2, 3].map(n => categoria(`colecao-${n}`, `Coleção ${n}`, n))
produtos.data = [{ id: 'p1', name: 'Peça 1' }]

const secao = (type: string, over: Partial<HomeSection> = {}): HomeSection => {
  const semeada = DEFAULT_HOME_COMPOSITION.find(s => s.type === type)!
  return { ...semeada, ...over } as HomeSection
}

const renderHome = (sections: HomeSection[], preview?: { highlightId: string | null }) =>
  render(
    <MemoryRouter>
      <HomeRenderer sections={sections} preview={preview} />
    </MemoryRouter>,
  )

const marcadores = (container: HTMLElement) =>
  Array.from(container.querySelectorAll(`[${PREVIEW_SECTION_ATTR}]`))

describe('sem a prop `preview` o DOM da loja não muda — a contrapartida de HOME-04', () => {
  it('nenhum invólucro é emitido', () => {
    const { container } = renderHome([secao('hero'), secao('newsletter')])
    expect(marcadores(container)).toHaveLength(0)
  })

  // Diferencial, e não duas chamadas iguais comparadas entre si: comparar `render(x)` com
  // `render(x, undefined)` é tautologia — passa mesmo se o invólucro for emitido nas DUAS. O que
  // prende a regra é a diferença entre os dois modos, medida nos dois sentidos.
  it('o modo normal não tem NENHUM traço da prévia; o modo prévia tem os dois', () => {
    const normal = renderHome([secao('hero'), secao('trust_bar')]).container.innerHTML
    const previa = renderHome([secao('hero'), secao('trust_bar')], { highlightId: null }).container
      .innerHTML

    expect(normal).not.toContain(PREVIEW_SECTION_ATTR)
    expect(normal).not.toContain('previa-secao-')
    expect(previa).toContain(PREVIEW_SECTION_ATTR)
    expect(previa).toContain('previa-secao-')
  })

  it('o conteúdo desenhado é o MESMO nos dois modos — a prévia envolve, não redesenha', () => {
    const normal = renderHome([secao('hero')]).container.textContent
    const previa = renderHome([secao('hero')], { highlightId: null }).container.textContent

    expect(previa).toBe(normal)
  })
})

describe('com a prop `preview` cada seção ganha o próprio alvo', () => {
  it('um invólucro por seção RENDERIZADA, carimbado com o id dela', () => {
    const { container } = renderHome(
      [secao('hero', { id: 'sec-hero' }), secao('newsletter', { id: 'sec-news' })],
      { highlightId: null },
    )

    expect(marcadores(container).map(n => n.getAttribute(PREVIEW_SECTION_ATTR))).toEqual([
      'sec-hero',
      'sec-news',
    ])
  })

  it('seção que NÃO renderiza não ganha invólucro — a prévia honesta simplesmente não a desenha', () => {
    const { container } = renderHome(
      [secao('hero', { id: 'sec-hero' }), secao('newsletter', { id: 'sec-off', active: false })],
      { highlightId: null },
    )

    expect(marcadores(container).map(n => n.getAttribute(PREVIEW_SECTION_ATTR))).toEqual([
      'sec-hero',
    ])
  })

  it('a faixa aninhada ganha invólucro PRÓPRIO, dentro do da hospedeira', () => {
    const { container } = renderHome(
      [
        secao('collection_rows', { id: 'sec-fileiras', position: 0 }),
        secao('brand_statement', {
          id: 'sec-faixa',
          position: 1,
          config: { ...secao('brand_statement').config, interlude_after: 0 },
        }),
      ],
      { highlightId: null },
    )

    const faixa = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-faixa"]`)
    const fileiras = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-fileiras"]`)

    expect(faixa).not.toBeNull()
    // Mais interno que a hospedeira: é o que faz `closest()` achar a faixa antes das fileiras, e o
    // clique nela abrir o editor DELA.
    expect(fileiras?.contains(faixa!)).toBe(true)
  })
})

describe('PRV-06 — o contorno acompanha o que o painel manda', () => {
  it('só a seção apontada fica contornada, e a etiqueta traz o nome dela', () => {
    const { container } = renderHome(
      [secao('hero', { id: 'sec-hero' }), secao('newsletter', { id: 'sec-news' })],
      { highlightId: 'sec-news' },
    )

    const hero = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-hero"]`) as HTMLElement
    const news = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-news"]`) as HTMLElement

    expect(news.style.outline).toContain('2px solid')
    expect(hero.style.outline).toBe('')
    expect(screen.getByText('Newsletter')).toBeInTheDocument()
  })

  it('`highlightId: null` não contorna nada e não emite etiqueta', () => {
    const { container } = renderHome([secao('hero', { id: 'sec-hero' })], { highlightId: null })

    const hero = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-hero"]`) as HTMLElement
    expect(hero.style.outline).toBe('')
    expect(screen.queryByText('Chamada principal')).not.toBeInTheDocument()
  })

  it('o contorno é `outline`, e não `border` — borda empurraria o layout que a prévia mede', () => {
    const { container } = renderHome([secao('hero', { id: 'sec-hero' })], {
      highlightId: 'sec-hero',
    })

    const hero = container.querySelector(`[${PREVIEW_SECTION_ATTR}="sec-hero"]`) as HTMLElement
    expect(hero.style.outline).toContain('2px solid')
    expect(hero.style.border).toBe('')
    expect(hero.style.outlineOffset).toBe('-2px')
  })
})
