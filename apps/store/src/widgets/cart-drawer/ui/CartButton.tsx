import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'

/**
 * O gatilho do header: único botão sólido da barra — disco de tinta com contador em glacê.
 *
 * Separado do `CartDrawer` porque o painel é montado uma vez por layout, enquanto o gatilho é só
 * mais um ícone do header.
 */
const CartButton = () => {
  const count = useCartStore((s) => s.uniqueItemsCount())
  const openCart = useCartUiStore((s) => s.openCart)

  return (
    <button
      type="button"
      onClick={openCart}
      className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full bg-estrelinha-ink transition-transform hover:scale-105 active:scale-95"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'}
    >
      <ShoppingCart className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] w-[18px] animate-bounce-cart items-center justify-center rounded-full bg-estrelinha-accent text-[11px] font-bold text-estrelinha-ink">
          {count}
        </span>
      )}
    </button>
  )
}

export default CartButton
