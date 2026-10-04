import { SacolaIcon } from '@estrelinha/ui/icons'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'

/**
 * O gatilho do header — `5N2-0`: a sacola de contorno em `on-primary` (alça no ouro do conjunto)
 * com o contador em `accent`.
 *
 * **Era um disco `ink` sólido, e ele desapareceu quando o header ficou escuro**
 * (`IDN-09`): #23303A sobre #283A4A mede 1,08:1. O board não desenha disco
 * nenhum aqui — os quatro alvos da direita são todos contorno, e o que os
 * separa é o contador, não uma moldura.
 *
 * O disco mede 38px, e o alvo de 44 vem do `before:` — o mesmo recurso do `ICON_BUTTON` do header.
 * Ele passou a importar quando o botão apareceu no CELULAR, na página do produto.
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
      className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full transition-colors before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-white/10"
      aria-label={count > 0 ? `Sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Sacola'}
    >
      <SacolaIcon className="h-6 w-6 text-estrelinha-on-primary" aria-hidden />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-[18px] w-[18px] animate-bounce-cart items-center justify-center rounded-full bg-estrelinha-accent text-[11px] font-bold text-estrelinha-ink">
          {count}
        </span>
      )}
    </button>
  )
}

export default CartButton
