import { Link } from 'react-router-dom'
import { Heart, Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@nanapin/core/formatters'
import { useCartStore, type CartItem } from '@/entities/cart/model/cartStore'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { lowStockLabel, variantChips } from '../model/drawerFacts'

/**
 * Uma linha da gaveta. Não é card: no board as linhas são de borda a borda, separadas só por um
 * filete — o carrinho é uma lista, e caixa dentro de caixa dentro da gaveta vira ruído.
 *
 * `-inset-2` nos alvos de toque: o desenho pede botões de 28px, e a premissa mobile do projeto pede
 * 44px de alvo. O pseudo-elemento estica a área clicável sem mexer no layout.
 */
const TAP = 'relative after:absolute after:-inset-2 after:content-[""]'

interface Props {
  item: CartItem
  onNavigate: () => void
}

const CartDrawerRow = ({ item, onNavigate }: Props) => {
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const wishlisted = useWishlistStore((s) => s.items.includes(item.product.id))

  const { product, size, finish, variantId, quantity } = item
  const scarcity = lowStockLabel(item)
  const chips = variantChips(item)

  // O `variantId` faz parte da identidade da linha (`cartStore.itemKey`). Omiti-lo — como as duas
  // telas antigas faziam — monta a chave legada `p:id-size-finish` e a remoção não casa com nada:
  // o item de grade era imexível.
  const setQty = (qty: number) => updateQuantity(product.id, size, finish, qty, variantId)

  return (
    <li className="flex gap-3 border-b border-nanita-border px-5 py-3.5 md:gap-3.5 md:px-6 md:py-4">
      <Link
        to={`/produto/${product.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden
        className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-nanita-sugar md:h-20 md:w-20 md:rounded-2xl"
      >
        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        {scarcity && (
          <span className="absolute -right-0.5 -top-0.5 rounded-md bg-nanita-butter px-1.5 py-0.5 text-[9px] font-bold leading-[14px] text-nanita-ink">
            {scarcity}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/produto/${product.slug}`}
            onClick={onNavigate}
            className="line-clamp-2 text-sm font-semibold leading-5 text-nanita-ink transition-colors hover:text-nanita-jam"
          >
            {product.name}
          </Link>
          <span className="shrink-0 text-sm font-bold leading-5 text-nanita-jam">
            {formatPrice(item.unitPrice * quantity)}
          </span>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-nanita-sugar px-2 py-0.5 text-[11px] font-medium leading-4 text-nanita-jam"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setQty(quantity - 1)}
              aria-label={quantity === 1 ? `Remover ${product.name}` : `Diminuir ${product.name}`}
              className={`${TAP} flex h-7 w-7 items-center justify-center rounded-lg bg-nanita-sugar text-nanita-ink transition-colors hover:bg-nanita-border`}
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <span className="w-8 text-center text-sm font-bold text-nanita-ink" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQty(quantity + 1)}
              aria-label={`Aumentar ${product.name}`}
              className={`${TAP} flex h-7 w-7 items-center justify-center rounded-lg bg-nanita-sugar text-nanita-ink transition-colors hover:bg-nanita-border`}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={wishlisted ? `Remover ${product.name} dos favoritos` : `Favoritar ${product.name}`}
              aria-pressed={wishlisted}
              className={`${TAP} text-nanita-raspberry transition-transform hover:scale-110`}
            >
              <Heart className="h-4 w-4" strokeWidth={2} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => removeItem(product.id, size, finish, variantId)}
              aria-label={`Remover ${product.name} do carrinho`}
              className={`${TAP} text-nanita-ink transition-colors hover:text-nanita-jam`}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

export default CartDrawerRow
