import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Truck, X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@nanapin/ui/sheet'
import { Button } from '@nanapin/ui/button'
import { formatPrice } from '@nanapin/core/formatters'
import { useShippingSettings } from '@nanapin/core/hooks/useStoreSettings'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartPromotion } from '@/entities/cart/model/useCartPromotion'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { useAllProducts } from '@/entities/product/api/useProducts'
import CouponInput from '@/features/apply-coupon/ui/CouponInput'
import { freeShippingProgress, pickCrossSell } from '../model/drawerFacts'
import CartDrawerRow from './CartDrawerRow'
import CrossSell from './CrossSell'

/**
 * A gaveta é a **única** superfície de carrinho da loja (boards "Desktop/Mobile Cart Drawer - v3").
 * Todo caminho que levava a `/carrinho` abre isto; a rota sobrevive só como atalho direto.
 *
 * Ela é montada uma vez por layout (`StoreLayout` e `CheckoutPage`) e comandada pelo `cartUiStore` —
 * não tem gatilho embutido, porque quem abre está em quatro lugares diferentes.
 */
const CartDrawer = () => {
  const navigate = useNavigate()
  const open = useCartUiStore((s) => s.open)
  const setCartOpen = useCartUiStore((s) => s.setCartOpen)
  const closeCart = useCartUiStore((s) => s.closeCart)

  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const count = useCartStore((s) => s.uniqueItemsCount())
  const applied = useCouponStore((s) => s.applied)
  const { free_shipping_threshold, default_shipping_cost } = useShippingSettings()
  const { promotionDiscount, totals, nextTier } = useCartPromotion()

  const progress = freeShippingProgress(subtotal, free_shipping_threshold)

  // O catálogo só é buscado com a gaveta aberta e faltando frete — a gaveta vive montada em toda
  // rota, e uma query de catálogo inteiro na montagem seria trabalho que ninguém pediu. A chave é a
  // mesma de `useAllProducts` em outras telas, então quando já há cache não há requisição nova.
  const { data: catalog } = useAllProducts({
    enabled: open && items.length > 0 && !progress.reached,
  })
  const suggestions = useMemo(() => pickCrossSell(catalog, items), [catalog, items])

  const units = items.reduce((sum, i) => sum + i.quantity, 0)
  const freeShipping = progress.reached || !!applied?.freeShipping
  const shipping = freeShipping ? 0 : default_shipping_cost
  /**
   * PRM-15: os dois descontos por item saem de `resolveOrderPricing` — a mesma função que o
   * `create-payment` chama — e não de contas separadas aqui.
   *
   * É isso que impede a gaveta de anunciar promoção **e** cupom quando o servidor vai aplicar só um
   * (`AD-015`: os dois não compõem, vale o de menor total). Somando os dois aqui, o total da gaveta
   * ficaria mais baixo que o do checkout — desconto exibido e não cobrado, a falha exata que esta
   * feature existe para matar.
   */
  const discount = totals.couponDiscount
  const total = totals.total + shipping

  const goTo = (path: string) => {
    closeCart()
    navigate(path)
  }

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        /* `[&>button]:hidden` apaga o X padrão do `SheetContent`: o board põe o fechar dentro do
           cabeçalho, alinhado ao título, e não solto sobre o conteúdo. O nosso `SheetClose` abaixo
           mantém a mesma acessibilidade. */
        /* `border-l` só a partir de `sm`: em tela cheia (mobile) ele vira um filete rosa solto na
           beirada esquerda, sem nada do outro lado para separar. */
        className="flex w-full flex-col gap-0 border-l-0 bg-white p-0 sm:max-w-[440px] sm:border-l sm:border-nanita-border [&>button]:hidden"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-nanita-border px-5 py-4 text-left md:px-6 md:py-5">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="font-heading text-[17px] font-bold leading-6 text-nanita-ink md:text-lg">
              Seu Carrinho
            </SheetTitle>
            {count > 0 && (
              <span className="rounded-pill bg-nanita-jam px-2 py-0.5 text-xs font-bold leading-[18px] text-white md:px-2.5">
                {count}
                <span className="hidden md:inline"> {count === 1 ? 'item' : 'itens'}</span>
              </span>
            )}
          </div>
          <SheetDescription className="sr-only">
            Itens adicionados à sacola, com o resumo do pedido e o acesso ao checkout.
          </SheetDescription>
          <SheetClose
            aria-label="Fechar carrinho"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-sugar text-nanita-ink transition-colors hover:bg-nanita-border"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </SheetClose>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-nanita-sugar">
              <ShoppingBag className="h-8 w-8 text-nanita-jam" strokeWidth={1.6} />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-nanita-ink">
                Sua sacola está vazia
              </p>
              <p className="mt-1 text-sm text-nanita-plum">
                Escolhe uns bottons — a gente embala com carinho.
              </p>
            </div>
            <Button
              onClick={() => goTo('/')}
              className="rounded-button border-0 bg-nanita-jam px-6 font-display font-semibold text-white hover:bg-nanita-jam hover:opacity-95"
            >
              Explorar bottons
            </Button>
          </div>
        ) : (
          <>
            {/* Faixa do frete grátis — o único bloco em açúcar acima da dobra. */}
            <div className="flex shrink-0 flex-col gap-1.5 bg-nanita-sugar px-5 py-3 md:gap-2 md:px-6 md:py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-nanita-jam md:text-[13px]">
                  {progress.reached ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" aria-hidden /> Frete grátis liberado! 🎉
                    </span>
                  ) : (
                    <>Faltam {formatPrice(progress.remaining)} para frete grátis!</>
                  )}
                </p>
                <span className="shrink-0 text-[11px] font-medium text-nanita-plum">
                  {formatPrice(subtotal)} / {formatPrice(free_shipping_threshold)}
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-white"
                role="progressbar"
                aria-valuenow={Math.round(progress.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso para o frete grátis"
              >
                <motion.div
                  className="h-full rounded-full bg-nanita-jam"
                  initial={false}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Lista + sugestões rolam juntas; o rodapé fica fixo. */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <ul>
                <AnimatePresence initial={false}>
                  {items.map((item, index) => (
                    <motion.div
                      key={`${item.product.id}-${item.variantId ?? `${item.size}-${item.finish}`}`}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24, height: 0, overflow: 'hidden' }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.04, 0.2) }}
                    >
                      <CartDrawerRow item={item} onNavigate={closeCart} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </ul>
              {!progress.reached && <CrossSell products={suggestions} onNavigate={closeCart} />}
            </div>

            <div className="shrink-0 border-t border-nanita-border pb-[env(safe-area-inset-bottom)]">
              {/**
               * PRM-23 — o convite da próxima faixa.
               *
               * `missing` e `unitPrice` saem de `useCartPromotion`, que os tira de `countEligibleUnits`
               * e `tierUnitPrice` — as mesmas funções puras do desconto. Uma conta aqui (subtrair
               * quantidades, aplicar a porcentagem) faria a gaveta prometer um preço que o servidor não
               * cobraria, que é a falha exata que esta feature existe para matar.
               *
               * Fica no rodapé fixo, junto do total, e não dentro da lista: a lista rola, e um convite
               * fora da tela não convida ninguém. Some sozinho na última faixa — `nextTier` é `null`
               * quando não há faixa acima da atual.
               */}
              {nextTier && (
                <p className="border-b border-nanita-border bg-nanita-sugar px-5 py-2.5 text-xs font-semibold text-nanita-jam md:px-6 md:text-[13px]">
                  {nextTier.missing === 1 ? 'Falta 1' : `Faltam ${nextTier.missing}`} para cada botton
                  sair a {formatPrice(nextTier.unitPrice)}
                </p>
              )}

              {/* Sem padding aqui: a variante `drawer` do cupom traz a própria, porque a linha de
                  cupom aplicado é de borda a borda (board do checkout, grupo "Cupom Aplicado"). */}
              <div className="border-b border-nanita-border">
                <CouponInput
                  variant="drawer"
                  subtotal={subtotal}
                  shippingCost={progress.reached ? 0 : default_shipping_cost}
                />
              </div>

              <dl className="flex flex-col gap-2 px-5 pt-3.5 md:px-6 md:pt-4">
                <div className="flex items-center justify-between text-[13px]">
                  <dt className="font-medium text-nanita-plum">
                    Subtotal ({units} {units === 1 ? 'item' : 'itens'})
                  </dt>
                  <dd className="font-semibold text-nanita-ink">{formatPrice(subtotal)}</dd>
                </div>
                {/* Sem faixa alcançada a linha simplesmente não existe: a gaveta não anuncia
                    "−R$ 0,00", que é anúncio de desconto nenhum. */}
                {promotionDiscount > 0 && (
                  <div className="flex items-center justify-between text-[13px]">
                    <dt className="font-medium text-nanita-plum">Desconto progressivo</dt>
                    <dd className="font-semibold text-nanita-jam">
                      −{formatPrice(promotionDiscount)}
                    </dd>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex items-center justify-between text-[13px]">
                    <dt className="font-medium text-nanita-plum">Cupom {applied?.code}</dt>
                    <dd className="font-semibold text-nanita-jam">−{formatPrice(discount)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between text-[13px]">
                  <dt className="font-medium text-nanita-plum">Frete estimado</dt>
                  {/* Estimativa da faixa padrão: o valor real sai da cotação por CEP, no checkout. */}
                  <dd className={freeShipping ? 'font-bold text-nanita-jam' : 'font-semibold text-nanita-ink'}>
                    {freeShipping ? 'Grátis' : formatPrice(shipping)}
                  </dd>
                </div>
                <div className="h-px w-full bg-nanita-border" />
                <div className="flex items-center justify-between">
                  <dt className="font-heading text-base font-bold text-nanita-ink">Total</dt>
                  <dd className="font-heading text-lg font-extrabold text-nanita-ink">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>

              <div className="px-5 pb-5 pt-3.5 md:px-6 md:pb-6 md:pt-4">
                <Button
                  onClick={() => goTo('/checkout')}
                  className="h-[52px] w-full gap-2.5 rounded-2xl border-0 bg-nanita-jam font-display text-[15px] font-bold text-white transition-transform hover:bg-nanita-jam hover:opacity-95 active:scale-[0.99]"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default CartDrawer
