import { Link } from 'react-router-dom'
import { Heart, Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { useCartStore, type CartItem } from '@/entities/cart/model/cartStore'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { lowStockLabel, variantChips } from '../model/drawerFacts'

/**
 * Uma linha da gaveta. Não é card: no board as linhas são de borda a borda, separadas só por um
 * filete — o carrinho é uma lista, e caixa dentro de caixa dentro da gaveta vira ruído.
 *
 * O alvo de toque vem de `TAP_44`: o desenho pede botões de 16 e 28px, e a premissa mobile do
 * projeto pede 44. O `-inset-2` que estava aqui dava 44 para o botão de 28 e apenas 32 para o de
 * 16 — um alvo derivado do tamanho do desenho não converge para uma medida, e era o coração e a
 * lixeira que ficavam de fora.
 */

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
    <li className="flex gap-3 border-b border-estrelinha-line px-5 py-3.5 md:gap-3.5 md:px-6 md:py-4">
      <Link
        to={`/produto/${product.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden
        className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-estrelinha-ground-deep md:h-20 md:w-20 md:rounded-2xl"
      >
        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        {scarcity && (
          <span className="absolute -right-0.5 -top-0.5 rounded-md bg-estrelinha-accent px-1.5 py-0.5 text-[9px] font-bold leading-[14px] text-estrelinha-ink">
            {scarcity}
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/produto/${product.slug}`}
            onClick={onNavigate}
            className="line-clamp-2 text-sm font-semibold leading-5 text-estrelinha-ink transition-colors hover:text-estrelinha-primary"
          >
            {product.name}
          </Link>
          <span className="shrink-0 text-sm font-bold leading-5 text-estrelinha-primary">
            {formatPrice(item.unitPrice * quantity)}
          </span>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-estrelinha-ground-deep px-2 py-0.5 text-[11px] font-medium leading-4 text-estrelinha-primary"
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
              className={`${TAP_44} flex h-7 w-7 items-center justify-center rounded-lg bg-estrelinha-ground-deep text-estrelinha-ink transition-colors hover:bg-estrelinha-line`}
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <span className="w-8 text-center text-sm font-bold text-estrelinha-ink" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQty(quantity + 1)}
              aria-label={`Aumentar ${product.name}`}
              className={`${TAP_44} flex h-7 w-7 items-center justify-center rounded-lg bg-estrelinha-ground-deep text-estrelinha-ink transition-colors hover:bg-estrelinha-line`}
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
              /* **A cor é o ESTADO, não o enfeite.** O coração saía sempre em
                 ouro, favoritado ou não — ao lado de uma lixeira `ink`, isso
                 lia como "este item já está nos favoritos". Desligado ele vai
                 de `ink-soft` (6,00:1) e só o ligado recebe `accent-strong`
                 (3,85:1 sobre branco, acima dos 3:1 de objeto gráfico). O
                 `fill` continua sendo a segunda pista, para a diferença não
                 depender só de cor. */
              className={`${TAP_44} transition-transform hover:scale-110 ${
                wishlisted ? 'text-estrelinha-accent-strong' : 'text-estrelinha-ink-soft'
              }`}
            >
              <Heart className="h-4 w-4" strokeWidth={2} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => removeItem(product.id, size, finish, variantId)}
              aria-label={`Remover ${product.name} do carrinho`}
              className={`${TAP_44} text-estrelinha-ink transition-colors hover:text-estrelinha-primary`}
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
