import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'

/**
 * O gatilho do header — `5N2-0`: ícone de contorno em `on-primary` com o
 * contador em `accent`.
 *
 * **Era um disco `ink` sólido, e ele desapareceu quando o header ficou escuro**
 * (`IDN-09`): #23303A sobre #283A4A mede 1,08:1. O board não desenha disco
 * nenhum aqui — os quatro alvos da direita são todos contorno, e o que os
 * separa é o contador, não uma moldura.
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
      className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
      aria-label={count > 0 ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Carrinho'}
    >
      <ShoppingCart className="h-[22px] w-[22px] text-estrelinha-on-primary" strokeWidth={1.6} />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-[18px] w-[18px] animate-bounce-cart items-center justify-center rounded-full bg-estrelinha-accent text-[11px] font-bold text-estrelinha-ink">
          {count}
        </span>
      )}
    </button>
  )
}

export default CartButton
