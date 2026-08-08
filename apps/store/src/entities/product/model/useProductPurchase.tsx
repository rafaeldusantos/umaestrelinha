import { useState } from 'react'
import { toast } from 'sonner'
import { variantLabel } from '@nanapin/core/pricing'
import type { OptionValues, Product, ProductVariant } from '@nanapin/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import {
  PAGE_MAX_AXES,
  canAddSelection,
  findVariant,
  hasSellableGrid,
  initialSelection,
} from '../lib/variantSelection'
import { savingsOf, stockLineOf, type StockLine } from '../lib/productFacts'

export interface ProductPurchase {
  qty: number
  setQty: (qty: number) => void
  selected: OptionValues
  select: (values: OptionValues) => void
  /** A linha escolhida, ou `null` em produto simples / combinação inexistente. */
  variant: ProductVariant | null
  sellableGrid: boolean
  /** O que vai ser cobrado por unidade — preço da LINHA, nunca o `base_price` da vitrine. */
  price: number
  savings: ReturnType<typeof savingsOf>
  stock: StockLine
  canAdd: boolean
  add: () => void
}

/**
 * O estado de compra da página do produto: quantidade, variação escolhida, preço e o "adicionar".
 *
 * Existe porque os boards de Produto puseram **duas** superfícies para a mesma compra: a coluna de
 * informação e a barra fixa do rodapé mobile. Duplicar o estado significaria duas quantidades e dois
 * preços na mesma tela — e foi exatamente esse tipo de duplicação que quebrou a remoção de item com
 * variação quando existiam duas telas de carrinho. A página monta o hook uma vez e passa para as
 * duas.
 *
 * A escolha da variação também é o que a galeria observa (PMD-06 AC 3), então o `onSelect` da página
 * recebe a linha resolvida — não os valores crus.
 */
export const useProductPurchase = (
  product: Product,
  onVariantChange?: (variant: ProductVariant | null) => void,
): ProductPurchase => {
  const [qty, setQty] = useState(1)
  // PST-05 AC 1: até 3 seletores, gerados de `products.options` na ordem de `position`.
  const [selected, setSelected] = useState(() => initialSelection(product, PAGE_MAX_AXES))
  const addItem = useCartStore(s => s.addItem)

  // PST-10: grade sem eixo ou sem linha vendável = produto simples, por `base_price`.
  const sellableGrid = hasSellableGrid(product)
  const variant = sellableGrid ? findVariant(product.variants, selected) : null
  // O preço exibido é o da LINHA escolhida. `base_price` só serve ao "a partir de" da vitrine
  // (A14) — mostrá-lo aqui seria anunciar um valor que o caixa não vai cobrar.
  const price = variant?.price ?? product.price
  // PST-08 / AC 6-7: `none` e `backorder` nunca esgotam. Sem grade, o saldo é o `stock_total`.
  const canAdd = sellableGrid
    ? canAddSelection(product, selected)
    : product.stock_policy !== 'track' || product.stock_total > 0

  const select = (values: OptionValues) => {
    setSelected(values)
    onVariantChange?.(findVariant(product.variants, values))
  }

  const add = () => {
    if (!canAdd) {
      toast.error(
        sellableGrid
          ? 'Essa combinação está indisponível. Escolha outra.'
          : 'Este botton está esgotado.',
      )
      return
    }
    const input =
      sellableGrid && variant
        ? {
            variantId: variant.id,
            variantLabel: variantLabel(product.options, variant.option_values),
            optionValues: variant.option_values,
            unitPrice: variant.price!,
          }
        : undefined
    for (let i = 0; i < qty; i++) addItem(product, '', '', input)

    toast.custom(() => (
      <div className="flex items-center gap-3 rounded-md border border-nanita-border bg-white p-3 shadow-nanita-soft">
        <img
          src={product.image_url}
          alt={product.name}
          className="h-12 w-12 rounded-sm object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-nanita-ink">{product.name}</p>
          <p className="text-xs text-nanita-plum">
            {qty}x adicionado ao carrinho
          </p>
        </div>
        <button
          type="button"
          onClick={() => useCartUiStore.getState().openCart()}
          className="whitespace-nowrap text-xs font-semibold text-nanita-jam hover:underline"
        >
          Ver carrinho
        </button>
      </div>
    ))
  }

  return {
    qty,
    setQty: next => setQty(Math.max(1, next)),
    selected,
    select,
    variant,
    sellableGrid,
    price,
    savings: savingsOf(product, price),
    stock: stockLineOf(product, variant),
    canAdd,
    add,
  }
}
