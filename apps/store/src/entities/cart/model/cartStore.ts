import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OptionValues, Product } from '@nanapin/supabase/types'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_COST } from '@nanapin/core/constants'

/** O que a página do produto passa quando o cliente escolheu uma variação. */
export interface CartVariantInput {
  variantId: string
  /** Rótulo legível, de `variantLabel`: `4,5 cm · Fosco`. */
  variantLabel: string
  optionValues: OptionValues
  /** O preço DAQUELA linha. É ele que vai para o pedido, não `product.price`. */
  unitPrice: number
}

export interface CartItem {
  product: Product
  /** @deprecated Eixo fixo do modelo antigo. T18 substitui por `optionValues`. */
  size: string
  /** @deprecated Eixo fixo do modelo antigo. T18 substitui por `optionValues`. */
  finish: string
  /** `null` quando o produto não tem grade — o item é precificado por `base_price`. */
  variantId: string | null
  variantLabel: string
  optionValues: OptionValues
  /**
   * Preço **congelado no momento em que o item entrou no carrinho**.
   *
   * O snapshot do `Product` dentro do item já era o padrão; congelar o preço explicitamente torna
   * visível o que era implícito. O servidor recalcula de qualquer forma no `create-payment` — este
   * valor é o que a tela mostra, não o que a loja cobra.
   */
  unitPrice: number
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, size?: string, finish?: string, variant?: CartVariantInput) => void
  removeItem: (productId: string, size?: string, finish?: string, variantId?: string | null) => void
  updateQuantity: (
    productId: string, size: string, finish: string, quantity: number, variantId?: string | null,
  ) => void
  clearCart: () => void
  uniqueItemsCount: () => number
  subtotal: () => number
  shippingCost: () => number
  total: () => number
}

/**
 * Identidade da linha do carrinho.
 *
 * Com variação, o `variantId` **é** a identidade — é o que o pedido grava e o que o servidor
 * reprecifica.
 *
 * Sem variação, cai em `produto + size + finish`, e não só no `productId` como o esboço do design
 * sugeria. O motivo é a janela entre esta task e a T18 (Fase 4), que é quem faz a loja passar
 * `variantId`: até lá, `ProductCard` adiciona com `size`/`finish` e sem variação, e chavear só pelo
 * produto colapsaria dois tamanhos numa linha só — uma regressão do comportamento de hoje.
 * Depois da T18, o ramo com `variantId` é o que roda para todo produto com grade.
 */
const itemKey = (
  productId: string, size: string, finish: string, variantId?: string | null,
) => (variantId ? `v:${variantId}` : `p:${productId}-${size}-${finish}`)

const keyOf = (i: CartItem) => itemKey(i.product.id, i.size, i.finish, i.variantId)

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, size = '', finish = '', variant) =>
        set((state) => {
          const key = itemKey(product.id, size, finish, variant?.variantId)
          const existing = state.items.find((i) => keyOf(i) === key)
          if (existing) {
            return {
              items: state.items.map((i) =>
                keyOf(i) === key ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            }
          }
          return {
            items: [
              ...state.items,
              {
                product,
                size,
                finish,
                quantity: 1,
                variantId: variant?.variantId ?? null,
                // Sem variação, o rótulo cai nos eixos antigos, para o carrinho e o e-mail não
                // ficarem sem descrição na janela até a T18.
                variantLabel:
                  variant?.variantLabel ?? [size, finish].filter(Boolean).join(' · '),
                optionValues: variant?.optionValues ?? {},
                unitPrice: variant?.unitPrice ?? product.price,
              },
            ],
          }
        }),
      removeItem: (productId, size = '', finish = '', variantId = null) =>
        set((state) => ({
          items: state.items.filter(
            (i) => keyOf(i) !== itemKey(productId, size, finish, variantId),
          ),
        })),
      updateQuantity: (productId, size, finish, quantity, variantId = null) =>
        set((state) => {
          const key = itemKey(productId, size, finish, variantId)
          return {
            items:
              quantity <= 0
                ? state.items.filter((i) => keyOf(i) !== key)
                : state.items.map((i) => (keyOf(i) === key ? { ...i, quantity } : i)),
          }
        }),
      clearCart: () => set({ items: [] }),
      uniqueItemsCount: () => get().items.length,
      // Soma `unitPrice`, não `product.price`: com grade, os dois DIVERGEM, e usar o segundo é
      // mostrar na tela um total diferente do que o servidor vai cobrar.
      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      shippingCost: () => {
        const sub = get().subtotal()
        return sub >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
      },
      total: () => get().subtotal() + get().shippingCost(),
    }),
    {
      name: 'nanapin-cart',
      version: 2,
      /**
       * O storage v1 é **descartado**, não convertido.
       *
       * Um item v1 não tem `variantId` nem `unitPrice`. Dá para inventar `unitPrice` a partir de
       * `product.price`, mas não dá para inventar a variação — e um carrinho antigo entrando no
       * checkout sem `variant_id` produziria um pedido que o servidor recusa a pagar (PST-01 AC 9).
       * Sacola vazia é um aborrecimento; pedido impagável é um beco sem saída.
       */
      migrate: (persisted, version) => {
        if (version < 2) return { items: [] }
        return persisted as { items: CartItem[] }
      },
    },
  ),
)
