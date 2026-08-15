// Feature 22 / T8 — `MAT-02` e `MAT-03` nas peças de `entities/product`.
//
// Prova as **três situações distintas** do modelo (não exige · exige e diz quais · exige sem dizer
// qual) e o campo de gravação. A prova de que a **barra fixa do mobile** reflete o mesmo estado mora
// em `widgets/product-buy-bar/ui/__tests__/ProductBuyBarMaterial.test.tsx`: `entities` não importa de
// `widgets` (fronteira FSD), e um teste que o fizesse já seria a violação que a regra existe para
// impedir.

import { act, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useProductPurchase } from '../../model/useProductPurchase'
import MaterialNotice from '../MaterialNotice'
import EngravingField from '../EngravingField'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), custom: vi.fn() } }))

const base = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1', name: 'Pingente', slug: 'pingente', price: 100, compare_price: null,
    category_id: 'c1', category_slug: 'joias', description: '', image_url: '', images: [],
    stock_total: 10, low_stock_threshold: 5, is_new: false, is_featured: false, tags: [],
    stock_policy: 'track', category_links: [], options: [], variants: [],
    ...over,
  }) as Product

const comEixoDeGravacao = (over: Partial<Product> = {}): Product =>
  base({
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
  })

const abrirAviso = (product: Product, variant: 'page' | 'bar' = 'page') =>
  render(
    <MemoryRouter>
      <MaterialNotice product={product} variant={variant} />
    </MemoryRouter>,
  )

beforeEach(() => {
  useCartStore.setState({ items: [] })
  localStorage.clear()
})

describe('MaterialNotice — as três situações (MAT-02)', () => {
  it('produto que NÃO exige material: nenhum aviso no DOM', () => {
    // AC 3: a compra segue o fluxo atual, sem passo extra e sem ruído.
    const { container } = abrirAviso(base({ requires_material: false }))
    expect(container).toBeEmptyDOMElement()
  })

  it('`requires_material: null` (nunca decidido) também não mostra nada', () => {
    const { container } = abrirAviso(base({ requires_material: null }))
    expect(container).toBeEmptyDOMElement()
  })

  it('exige e DIZ QUAIS: declara os materiais', () => {
    abrirAviso(base({ requires_material: true, material_kinds: ['cabelo', 'coto_umbilical'] }))

    expect(screen.getByText(/feita com material seu/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mecha de cabelo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Coto umbilical' })).toBeInTheDocument()
  })

  it('cada material leva à FICHA correspondente, não ao topo da página', () => {
    // Preparar leite materno não é preparar cinzas: cair no topo obrigaria a cliente a procurar.
    abrirAviso(base({ requires_material: true, material_kinds: ['leite_materno'] }))

    expect(screen.getByRole('link', { name: 'Leite materno' })).toHaveAttribute(
      'href',
      '/como-enviar-o-material#leite-materno',
    )
  })

  it('exige SEM dizer qual: diz que é combinado, e NUNCA pede que a cliente escolha', () => {
    abrirAviso(base({ requires_material: true, material_kinds: [] }))

    expect(screen.getByText(/combinado com a gente/i)).toBeInTheDocument()
    // Nenhum controle de escolha: nem select, nem rádio, nem checkbox.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('material desconhecido gravado no banco é filtrado, não vira pílula em branco', () => {
    abrirAviso(base({ requires_material: true, material_kinds: ['sangue', 'cinzas'] }))

    expect(screen.getByRole('link', { name: 'Cinzas' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'sangue' })).not.toBeInTheDocument()
  })
})

describe('MaterialNotice — variante da barra fixa (MAT-02, superfície 2)', () => {
  it('a barra declara os materiais em UMA linha', () => {
    const { container } = abrirAviso(
      base({ requires_material: true, material_kinds: ['cinzas'] }),
      'bar',
    )

    expect(screen.getByText(/você envia: cinzas/i)).toBeInTheDocument()
    // `truncate`: texto que embrulha em duas linhas dentro da barra empurra o CTA para fora — é o
    // primeiro item da lista do que quebra no celular.
    expect(container.querySelector('.truncate')).not.toBeNull()
  })

  it('a barra também diz quando o material é a combinar', () => {
    abrirAviso(base({ requires_material: true, material_kinds: [] }), 'bar')
    expect(screen.getByText(/combinado com a gente/i)).toBeInTheDocument()
  })
})

describe('EngravingField — só com `Com gravação: Sim` (MAT-03)', () => {
  const montarCampo = (escolha: string) => {
    const { result } = renderHook(() => useProductPurchase(comEixoDeGravacao()))
    act(() => result.current.select({ 'Com gravação': escolha }))
    render(<EngravingField purchase={result.current} />)
    return result
  }

  it('variação `Não`: o campo não existe no DOM', () => {
    montarCampo('Não')
    expect(screen.queryByLabelText(/o que gravar/i)).not.toBeInTheDocument()
  })

  it('variação `Sim`: o campo existe, com contador', () => {
    montarCampo('Sim')
    expect(screen.getByLabelText(/o que gravar/i)).toBeInTheDocument()
    expect(screen.getByText('0 / 20')).toBeInTheDocument()
  })

  it('a borda é `field`, nunca `line` — WCAG 1.4.11 pede 3:1 de contorno de controle', () => {
    // `line` mede 1,25:1 e é divisor, não contorno. `fieldBorder.test.ts` varre isto no repo todo.
    montarCampo('Sim')
    expect(screen.getByLabelText(/o que gravar/i).className).toContain('border-estrelinha-field')
  })

  it('não trunca em silêncio: sem `maxLength`, o contador mostra o excesso', () => {
    // Cortar sozinho faria a cliente achar que gravou o nome inteiro.
    montarCampo('Sim')
    expect(screen.getByLabelText(/o que gravar/i)).not.toHaveAttribute('maxLength')
  })
})

