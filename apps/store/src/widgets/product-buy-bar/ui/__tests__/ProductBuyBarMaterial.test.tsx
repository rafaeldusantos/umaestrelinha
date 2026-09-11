// Feature 22 / T9 — a **segunda** superfície de compra: a barra fixa do mobile.
//
// O `MAT-02` saiu daqui: o aviso de material afetivo não existe mais em superfície nenhuma da página
// do produto, porque `material_kinds` diz menos que a descrição (`BL-015`). O que este arquivo ainda
// prova é o que continua valendo — a barra e a coluna de informação leem o **mesmo** `purchase`.
// Duas cópias de estado dariam duas verdades na mesma tela, que é o defeito que `useProductPurchase`
// existe para impedir.
//
// Este arquivo mora em `widgets/` e não em `entities/` porque `entities` não importa de `widgets`
// (fronteira FSD): um teste que cruzasse a camada já seria a violação que a regra impede.

import { act, render, renderHook, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useProductPurchase } from '@/entities/product/model/useProductPurchase'
import ProductBuyBar from '../ProductBuyBar'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), custom: vi.fn() } }))

const comEixoDeGravacao = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1', name: 'Pingente', slug: 'pingente', price: 100, compare_price: null,
    category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
    stock_policy: 'track', category_links: [],
    options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
    variants: [
      {
        id: 'v-sim', product_id: 'p1', option_values: { 'Com gravação': 'Sim' }, name: null,
        sku: null, price: 142, compare_price: null, stock: 5, weight_kg: null, image_url: null,
        is_active: true, position: 0,
      } as ProductVariant,
      {
        id: 'v-nao', product_id: 'p1', option_values: { 'Com gravação': 'Não' }, name: null,
        sku: null, price: 100, compare_price: null, stock: 5, weight_kg: null, image_url: null,
        is_active: true, position: 1,
      } as ProductVariant,
    ],
    ...over,
  }) as Product

const montarBarra = (produto: Product, preparar?: (p: ReturnType<typeof useProductPurchase>) => void) => {
  const { result } = renderHook(() => useProductPurchase(produto))
  if (preparar) act(() => preparar(result.current))
  return render(
    <MemoryRouter>
      <ProductBuyBar product={produto} purchase={result.current} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
  localStorage.clear()
})

describe('ProductBuyBar — gravação, e a ausência do material (MAT-03)', () => {
  it('a barra reflete o bloqueio de gravação vindo do `purchase`', () => {
    montarBarra(comEixoDeGravacao(), p => {
      p.select({ 'Com gravação': 'Sim' })
      p.setEngraving('a'.repeat(40))
    })

    const cta = screen.getByRole('button', { name: /revisar a gravação/i })
    expect(cta).toHaveAttribute('aria-disabled', 'true')
    // NÃO `disabled`: um botão desabilitado não recebe toque, e a cliente ficaria sem o caminho até
    // o campo que a bloqueia — que está a uma tela de distância, na coluna de informação.
    expect(cta).not.toBeDisabled()
  })

  it('a barra mostra o preço da variação escolhida, não o base', () => {
    montarBarra(comEixoDeGravacao(), p => p.select({ 'Com gravação': 'Sim' }))
    expect(screen.getByText('R$ 142,00')).toBeInTheDocument()
  })

  it('a barra NÃO fala de material afetivo, nem quando o produto exige', () => {
    // A linha "Você envia: cinzas" saiu junto com o card da coluna de informação:
    // `material_kinds` diz menos que a descrição (`BL-015`), e a barra é a superfície onde a
    // cliente TOCA em comprar. Quem guarda a ausência das duas é `semMaterialNaPaginaDoProduto`.
    const { container } = montarBarra(
      comEixoDeGravacao({ requires_material: true, material_kinds: ['cinzas'] }),
    )

    expect(within(container).queryByText(/você envia/i)).not.toBeInTheDocument()
    expect(within(container).queryByText(/cinzas/i)).not.toBeInTheDocument()
    expect(within(container).queryByText(/combinado com a gente/i)).not.toBeInTheDocument()
  })

  it('produto que não exige material também não ganha linha nenhuma', () => {
    montarBarra(comEixoDeGravacao({ requires_material: false }))
    expect(screen.queryByText(/você envia/i)).not.toBeInTheDocument()
  })

  it('a altura da barra continua sendo a do rodapé — exija material ou não', () => {
    // É isso que deixa a reserva de espaço do `StoreLayout` ser incondicional: ela não sabe qual
    // barra está montada. Crescer aqui esconderia a última faixa do rodapé.
    const semMaterial = montarBarra(comEixoDeGravacao({ requires_material: false }))
    const alturaSem = semMaterial.container.querySelector<HTMLElement>('[style*="height"]')?.style.height
    semMaterial.unmount()

    const comMaterial = montarBarra(
      comEixoDeGravacao({ requires_material: true, material_kinds: ['cinzas'] }),
    )
    const alturaCom = comMaterial.container.querySelector<HTMLElement>('[style*="height"]')?.style.height

    expect(alturaSem).toBe('4rem')
    expect(alturaCom).toBe(alturaSem)
  })
})
