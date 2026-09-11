import type { RefObject } from 'react'
import { Heart, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { pixPrice } from '@estrelinha/core/payment/pix'
import type { Product } from '@estrelinha/supabase/types'
import { PixIcon } from '@estrelinha/ui/icons'
import type { ProductPurchase } from '@/entities/product'
import { ENGRAVING_FIELD_ID } from '@/entities/product/ui/EngravingField'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { BUY_BAR_H } from '@/shared/lib/storeChrome'
import { useScrolledPast } from '@/shared/lib/useScrolledPast'

interface Props {
  product: Product
  purchase: ProductPurchase
  /**
   * A foto principal. A barra fica fora da tela enquanto ela estiver visível e entra quando a
   * cliente rola além dela.
   *
   * É `RefObject` e não um booleano pronto porque quem sabe **onde** a foto está é o DOM, não a
   * página: passar um booleano obrigaria a `ProductPage` a montar o observer e a barra a confiar
   * num estado que ela não pode conferir — dois donos de "já dá para mostrar?".
   *
   * Omitir a prop mantém a barra sempre visível, que é o padrão de falha certo (ver
   * `useScrolledPast`).
   */
  revealAfter?: RefObject<Element | null>
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
 * **Ela ENTRA depois da foto principal, e não se recolhe depois disso.** É o que Amazon e ASOS
 * fazem: a barra de compra *atrasa*, nenhum dos dois a retrai por direção de rolagem. Enquanto a
 * cliente olha a joia — que é o argumento de venda — os 88px do rodapé são da foto; passada ela, o
 * CTA fica e não sai mais, porque é a finalidade da página. Quem responde "já passou?" é
 * `useScrolledPast`, com o mesmo par `transition-transform` + `translate` do header e o mesmo
 * `focus-within` que impede foco em controle fora da tela.
 *
 * **A reserva do fim do documento segue incondicional** mesmo com a barra escondida: quem chegou ao
 * rodapé passou da foto por definição, então lá ela está sempre visível. Condicioná-la ao estado de
 * rolagem faria o rodapé saltar 88px no meio do gesto.
 *
 * **São DUAS faixas, e a razão é medida, não estética.** Em uma faixa só, com 390px de viewport,
 * sobravam 178px para um rótulo que mede ~196 — e como o botão é `grow` com `whitespace-nowrap` e
 * **sem `min-w-0`**, ele não encolhe abaixo do próprio texto: a fileira estourava e o **coração saía
 * da tela**. Separar informar de agir dá a largura inteira ao CTA e deixa o rótulo com ~113px de
 * folga, o que o faz caber até em 320px.
 *
 * Altura vem de `BUY_BAR_H`, e a reserva do fim do documento sai do MESMO `ownsBottomBar` que
 * escolhe qual barra monta (`bottomBarReserve`). Medir a reserva por fora daqui seria a segunda
 * cópia da regra, e uma discordância entre as duas esconde a última faixa do rodapé atrás da barra.
 */
const ProductBuyBar = ({ product, purchase, revealAfter }: Props) => {
  const { price, savings, canAdd, add, engravingRefusal } = purchase
  const toggleWishlist = useWishlistStore(s => s.toggleItem)
  const isWishlisted = useWishlistStore(s => s.hasItem(product.id))
  const { pix_enabled, pix_discount_percent } = usePaymentSettings()
  const visivel = useScrolledPast(revealAfter)

  /**
   * O valor no Pix na superfície onde a compra se DECIDE.
   *
   * A loja anuncia o desconto no card da vitrine e na coluna de informação, e o escondia justamente
   * aqui — na única superfície de compra do celular, de onde vêm ~90% dos acessos. O número sai de
   * `pixPrice`, a mesma função que as outras duas chamam e que casa centavo a centavo com o que
   * `resolveOrderPricing` cobra; recalcular a conta aqui seria o terceiro dono dela.
   *
   * `price` é o da variação escolhida (`purchase.price`), nunca `product.price`.
   */
  const pix = pix_enabled ? pixPrice(price, pix_discount_percent) : null

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
      data-testid="product-buy-bar"
      data-revealed={visivel ? 'true' : 'false'}
      /* `z-50` como o `MobileNav` que ela substitui: são a mesma camada de moldura, e as duas nunca
         coexistem. Os overlays (gaveta, busca, auth, menu) são portais do Radix no fim do `body`,
         que ganham no empate de `z-index` pela ordem do DOM. */
      /* `translate` e não desmontar nem `hidden`: o mesmo par do header, e pelo mesmo motivo
         prático — animar transform é trabalho de composição, enquanto montar/desmontar refaz a
         árvore e perde o estado de foco. Aqui ela já é `fixed`, então nem há fluxo para perturbar.

         `focus-within:translate-y-0` não é preciosismo: traduzida para fora da tela a barra mantém
         o CTA e o favoritar focáveis, e sem isso o `Tab` levaria o foco para controles invisíveis.

         `motion-reduce:transition-none` respeita quem pediu menos movimento — a barra troca de
         posição na hora, sem deslizar. */
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-estrelinha-line bg-white pb-[env(safe-area-inset-bottom)] transition-transform duration-200 focus-within:translate-y-0 motion-reduce:transition-none md:hidden ${
        visivel ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/*
        **A altura total é exatamente `BUY_BAR_H`**, e isso não é detalhe de estilo: é o que o
        `StoreLayout` reserva no fim do documento para esta rota. As duas faixas somam 74px (22 do
        preço + 8 de respiro + 44 da ação) e o `justify-center` reparte os 14 que sobram.
      */}
      <div className="flex flex-col justify-center gap-2 px-4" style={{ height: BUY_BAR_H }}>
        {/* Faixa 1 — informa. `items-baseline` porque o preço é serifado e o riscado não: alinhados
            pelo topo, os dois flutuariam um em relação ao outro. */}
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-display text-[19px] font-semibold leading-[22px] tracking-[-0.02em] text-estrelinha-primary">
            {formatPrice(price)}
          </span>
          {savings && (
            <span className="shrink-0 text-[13px] leading-4 text-estrelinha-ink-soft line-through">
              {formatPrice(savings.compareAt)}
            </span>
          )}
          <span className="grow" aria-hidden />
          {pix !== null && (
            <span className="flex shrink-0 items-center gap-1.5">
              <PixIcon className="h-[14px] w-[14px] shrink-0 text-estrelinha-primary" aria-hidden />
              <span className="text-[13px] font-semibold leading-4 text-estrelinha-ink">
                {formatPrice(pix)}
              </span>
              <span className="text-[13px] leading-4 text-estrelinha-ink-soft">no Pix</span>
            </span>
          )}
        </div>

        {/* Faixa 2 — age. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={aoTocar}
            /* NÃO `disabled` quando o bloqueio é a gravação: um botão desabilitado não recebe toque,
               e a cliente ficaria sem o caminho até o campo que a está bloqueando. Ele muda de cara
               e leva ao campo. Esgotado continua sendo `disabled` — ali não há o que fazer na
               página. */
            disabled={!canAdd && engravingRefusal === null}
            aria-disabled={!canAdd}
            /* `min-w-0` é o conserto do defeito, e não enfeite: sem ele um item `grow` não encolhe
               abaixo do próprio min-content, e com `whitespace-nowrap` isso fazia a fileira estourar
               a viewport levando o favoritar junto. Com a faixa inteira sobram ~306px para um rótulo
               de ~193 no corpo — que é ~18% mais estreito que a display, a fonte que estava aqui
               antes justamente no lugar mais apertado da tela. */
            className={`flex h-11 min-w-0 grow items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 text-[16px] font-semibold leading-5 tracking-[-0.01em] transition-transform active:scale-[0.99] disabled:active:scale-100 ${
              canAdd
                ? 'bg-estrelinha-primary text-estrelinha-on-primary'
                : engravingRefusal
                  ? 'border-[1.5px] border-estrelinha-primary bg-white text-estrelinha-primary'
                  : /* O desabilitado deixou de ser `opacity-50` sobre a geleia: o rótulo
                       `on-primary` sobre primary a 50% fica perto de ilegível. Virou superfície e
                       texto de token — `ink-soft` sobre `ground-deep` dá 5,5:1, passa na
                       `contrast.test.ts` e continua lendo como "não dá para tocar". */
                    'bg-estrelinha-ground-deep text-estrelinha-ink-soft'
            }`}
          >
            {canAdd && (
              <ShoppingCart className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9} aria-hidden />
            )}
            {canAdd ? 'Adicionar ao carrinho' : engravingRefusal ? 'Revisar a gravação' : 'Esgotado'}
          </button>

          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            /* Ficha em vez de caixa com borda de 2px: ao lado de um CTA sólido de largura inteira, a
               borda competia por atenção sem ser a ação principal. */
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm transition-colors ${
              isWishlisted ? 'bg-estrelinha-primary' : 'bg-estrelinha-ground-deep'
            }`}
          >
            <Heart
              className={`h-[19px] w-[19px] ${
                isWishlisted
                  ? 'fill-estrelinha-on-primary text-estrelinha-on-primary'
                  : 'text-estrelinha-primary'
              }`}
              strokeWidth={1.7}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductBuyBar
