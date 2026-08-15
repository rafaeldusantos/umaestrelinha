import { Heart, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { requiresMaterial } from '@estrelinha/core/material'
import type { Product } from '@estrelinha/supabase/types'
import type { ProductPurchase } from '@/entities/product'
import { ENGRAVING_FIELD_ID } from '@/entities/product/ui/EngravingField'
import MaterialNotice from '@/entities/product/ui/MaterialNotice'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { BOTTOM_BAR_H } from '@/shared/lib/storeChrome'

interface Props {
  product: Product
  purchase: ProductPurchase
}

/**
 * A barra de compra fixa do celular — board "Mobile Product Detail - v3".
 *
 * ~90% dos acessos vêm de mobile, e a página do produto tem 2000px de rolagem: sem esta barra o
 * "Adicionar ao carrinho" fica a uma tela e meia de distância a partir do momento em que a cliente
 * lê as avaliações. Por isso ela é a **única** superfície de compra no mobile — o CTA da coluna de
 * informação some abaixo de `md`.
 *
 * **Ela ocupa o lugar do `MobileNav`, não empilha sobre ele** — quem decide é
 * `storeChrome.ownsBottomBar`, lido pelo `StoreLayout`. Empilhadas, as duas somavam 133px de rodapé:
 * com o header, 30% de um iPhone SE, sobrando pouco para a foto, que é o argumento de venda. É o que
 * Nike, Zara, Farfetch e o app da Amazon fazem na página de produto, e a mesma decisão que já tirou
 * o checkout do `StoreLayout`.
 *
 * **Ela nunca se esconde no scroll.** O header se recolhe; esta não. O CTA é a finalidade da página
 * — Amazon e ASOS *atrasam* a barra de compra, nenhum dos dois a retrai.
 *
 * Altura vem de `BOTTOM_BAR_H`: é a mesma do `MobileNav`, e é isso que deixa a reserva de espaço no
 * fim do documento ser incondicional.
 */
const ProductBuyBar = ({ product, purchase }: Props) => {
  const { price, savings, canAdd, add, engravingRefusal } = purchase
  const toggleWishlist = useWishlistStore(s => s.toggleItem)
  const isWishlisted = useWishlistStore(s => s.hasItem(product.id))
  const exigeMaterial = requiresMaterial(product)

  /**
   * MAT-03: com a gravação inválida, o CTA está bloqueado — e o campo que a bloqueia está a uma tela
   * de distância, na coluna de informação. Dizer só "não dá" mandaria a cliente procurar sozinha.
   */
  const aoTocar = () => {
    if (engravingRefusal) {
      const campo = document.getElementById(ENGRAVING_FIELD_ID)
      campo?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      campo?.focus()
    }
    add()
  }

  return (
    <div
      /* `z-50` como o `MobileNav` que ela substitui: são a mesma camada de moldura, e as duas nunca
         coexistem. Os overlays (gaveta, busca, auth, menu) são portais do Radix no fim do `body`,
         que ganham no empate de `z-index` pela ordem do DOM. */
      className="fixed inset-x-0 bottom-0 z-50 border-t border-estrelinha-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/*
        **A altura total continua sendo exatamente `BOTTOM_BAR_H`**, com ou sem o aviso de material —
        e isso não é detalhe de estilo: é o que deixa a reserva de espaço do `StoreLayout` ser
        incondicional (ela não sabe qual barra está montada). Cabe porque a linha do aviso tem 14px e
        a fileira de controles tem 44px: 14 + 4 de respiro + 44 = 62, dentro dos 64.
      */}
      <div
        className="flex flex-col justify-center gap-1 px-5"
        style={{ height: BOTTOM_BAR_H }}
      >
        {exigeMaterial && <MaterialNotice product={product} variant="bar" />}

        <div className="flex items-center gap-2.5">
        <div className="flex shrink-0 flex-col">
          {savings && (
            <span className="text-[11px] leading-[14px] text-estrelinha-ink-soft line-through">
              {formatPrice(savings.compareAt)}
            </span>
          )}
          <span className="font-display text-[22px] font-semibold leading-7 text-estrelinha-primary">
            {formatPrice(price)}
          </span>
        </div>

        <button
          type="button"
          onClick={aoTocar}
          /* NÃO `disabled` quando o bloqueio é a gravação: um botão desabilitado não recebe toque, e
             a cliente ficaria sem o caminho até o campo que a está bloqueando. Ele fica com cara de
             desabilitado e leva ao campo. Esgotado continua sendo `disabled` — ali não há o que
             fazer na página. */
          disabled={!canAdd && engravingRefusal === null}
          aria-disabled={!canAdd}
          /* `whitespace-nowrap` e 14px: em 390px sobram ~180px para este botão
             (o preço come 110 e o coração 44), e "Adicionar ao carrinho" em
             15px mede mais que isso — o rótulo quebrava em DUAS LINHAS dentro
             de um botão de altura fixa, transbordando por cima da borda. O
             ícone some abaixo de 360px, que é onde nem 14px cabe. */
          className={`flex h-11 grow items-center justify-center gap-1.5 whitespace-nowrap rounded-sm bg-estrelinha-primary font-display text-[14px] font-semibold text-estrelinha-on-primary transition-transform active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100 ${
            !canAdd ? 'opacity-50' : ''
          }`}
        >
          <ShoppingCart className="hidden h-4 w-4 shrink-0 min-[360px]:block" strokeWidth={2} aria-hidden />
          {canAdd ? 'Adicionar ao carrinho' : engravingRefusal ? 'Revisar a gravação' : 'Indisponível'}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            isWishlisted ? 'border-estrelinha-primary bg-estrelinha-primary/[0.06]' : 'border-estrelinha-line'
          }`}
        >
          <Heart
            className={`h-[18px] w-[18px] ${isWishlisted ? 'fill-estrelinha-primary text-estrelinha-primary' : 'text-estrelinha-ink-soft'}`}
            strokeWidth={1.8}
          />
        </button>
        </div>
      </div>
    </div>
  )
}

export default ProductBuyBar
