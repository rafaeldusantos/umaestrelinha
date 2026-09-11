// Feature 22 / T8 — `MAT-03` nas peças de `entities/product`.
//
// **Este arquivo já foi `MaterialSurfaces.test.tsx`, e cobria também o `MAT-02`.** O aviso de
// material afetivo saiu da página do produto — as duas superfícies dele, o card da coluna de
// informação e a linha da barra fixa do celular —, porque `material_kinds` diz menos que a descrição
// (`BL-015`): há peça com `{cinzas}` gravado cuja descrição enumera cinco materiais, e anunciar um
// só é dizer errado à cliente. O que restou aqui é a gravação, que é outro dado.
//
// Quem guarda a ausência é `semMaterialNaPaginaDoProduto.test.ts`, ao lado.

import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { useProductPurchase } from '../../model/useProductPurchase'
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

  it('a gravação NÃO exige material — os dois dados nunca se confundiram', () => {
    // Sensor da remoção do `MAT-02`: um produto que exige material não ganha nada de material aqui,
    // e um que não exige continua com o campo de gravação inteiro. Quem some é o aviso, não a peça.
    const { result } = renderHook(() =>
      useProductPurchase(comEixoDeGravacao({ requires_material: true, material_kinds: ['cinzas'] })),
    )
    act(() => result.current.select({ 'Com gravação': 'Sim' }))
    render(<EngravingField purchase={result.current} />)

    expect(screen.getByLabelText(/o que gravar/i)).toBeInTheDocument()
    expect(screen.queryByText(/cinzas/i)).not.toBeInTheDocument()
  })
})
