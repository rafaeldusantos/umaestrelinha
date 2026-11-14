import { useEffect, useMemo, useRef, useState } from 'react'
import { viewCartEvent } from '@estrelinha/core/analytics'
import { cartLineItem, track } from '@/shared/lib/analytics'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'
import { SacolaIcon } from '@estrelinha/ui/icons'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@estrelinha/ui/sheet'
import { Button } from '@estrelinha/ui/button'
import { formatPrice } from '@estrelinha/core/formatters'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartPromotion } from '@/entities/cart/model/useCartPromotion'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { buyTogetherLineFacts } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { useAllProducts } from '@/entities/product/api/useProducts'
import CouponInput from '@/features/apply-coupon/ui/CouponInput'
import { pickCrossSell } from '../model/drawerFacts'
import CartDrawerRow from './CartDrawerRow'
import { useCartShipping } from '../model/useCartShipping'
import CartShipping from './CartShipping'
import CrossSell from './CrossSell'
import FreeShippingBand from './FreeShippingBand'

/**
 * A gaveta é a **única** superfície de carrinho da loja (boards "Desktop/Mobile Cart Drawer - v3").
 * Todo caminho que levava a `/carrinho` abre isto; a rota sobrevive só como atalho direto.
 *
 * Ela é montada uma vez por layout (`StoreLayout` e `CheckoutPage`) e comandada pelo `cartUiStore` —
 * não tem gatilho embutido, porque quem abre está em quatro lugares diferentes.
 */
/**
 * A sacola com peças: a faixa do frete grátis, a lista e o rodapé fixo. Só é montada com a gaveta
 * aberta — o `SheetContent` sai do DOM ao fechar —, e é por isso que as consultas do frete (cotação,
 * busca do CEP) moram aqui e não no `CartDrawer`, que vive montado em toda rota da loja.
 */
const FilledCart = ({
  panel,
  onNavigate,
  onCheckout,
}: {
  /** O painel da gaveta: o balão do ⓘ da faixa não passa da largura dele. */
  panel: HTMLElement | null
  onNavigate: () => void
  onCheckout: () => void
}) => {
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const applied = useCouponStore((s) => s.applied)
  const { default_shipping_cost } = useShippingSettings()
  const [couponOpen, setCouponOpen] = useState(false)

  /**
   * O frete da gaveta: o CEP, as opções reais e a escolha, gravados no rascunho do checkout.
   *
   * O estado do frete grátis sai dele — `useFreeShipping(subtotal, cep)`, dono único em
   * `@estrelinha/core/shipping` —, com o CEP que a gaveta cotou. É o mesmo veredito que zera a opção
   * mais barata e que a faixa anuncia, então "liberado" e "Grátis" nunca discordam.
   */
  const shipping = useCartShipping({ subtotal, couponFreeShipping: !!applied?.freeShipping })
  const progress = shipping.freeShipping
  const charge = shipping.charge

  /**
   * PRM-15: os dois descontos por item saem de `resolveOrderPricing` — a mesma função que o
   * `create-payment` chama — e não de contas separadas aqui. O frete escolhido entra na MESMA
   * função, que é quem o zera para o cupom de frete grátis: o Total da gaveta é o do resumo do
   * checkout com a mesma opção, cupom e promoção. Sem escolha, o Total é o dos produtos.
   */
  const {
    promotionDiscount,
    totals,
    discarded,
    nextTier,
    buyTogetherDiscount,
    buyTogetherLines,
    buyTogether,
    orderLines,
    couponEligibleSubtotal,
    campaignName,
  } = useCartPromotion(charge?.cost ?? 0)

  // O catálogo só é buscado faltando frete: a faixa de sugestões existe para "completar o frete
  // grátis". Com o frete grátis desligado, ou com o CEP fora das regiões que ele vale, ela não é
  // renderizada — e a busca não acontece. A chave é a mesma de `useAllProducts` em outras telas.
  const crossSellVisible =
    progress.active && !progress.reached && progress.destination !== 'outside'
  const { data: catalog } = useAllProducts({ enabled: items.length > 0 && crossSellVisible })
  const suggestions = useMemo(() => pickCrossSell(catalog, items), [catalog, items])

  const units = items.reduce((sum, i) => sum + i.quantity, 0)
  const discount = totals.couponDiscount
  const total = totals.total

  return (
    <>
      {/* A faixa do frete grátis, entre o cabeçalho e a lista. Some inteira com o interruptor
          desligado e com cupom de frete grátis — quem decide é ela, pelo estado que recebe. */}
      <FreeShippingBand
        state={progress}
        subtotal={subtotal}
        cep={shipping.cep}
        place={shipping.place}
        freeShippingCoupon={!!applied?.freeShipping}
        collisionBoundary={panel}
      />

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
                <CartDrawerRow
                  item={item}
                  onNavigate={onNavigate}
                  buyTogether={buyTogetherLineFacts(
                    index,
                    items,
                    buyTogetherLines,
                    orderLines,
                    buyTogether.config,
                    buyTogether.mainNames,
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </ul>
        {crossSellVisible && <CrossSell products={suggestions} onNavigate={onNavigate} />}
      </div>

      {/* O rodapé fixo: no máximo 72% da gaveta, e rola por dentro quando a fonte cresce. */}
      <div
        data-testid="drawer-footer"
        className="max-h-[72%] shrink-0 overflow-y-auto border-t border-estrelinha-line pb-[env(safe-area-inset-bottom)]"
      >
        {/**
         * PRM-23 — o convite da próxima faixa. `missing` e `unitPrice` saem de `useCartPromotion`,
         * que os tira das mesmas funções puras do desconto. Some sozinho na última faixa.
         */}
        {nextTier && (
          <p className="border-b border-estrelinha-line bg-estrelinha-ground-deep px-5 py-2.5 text-xs font-semibold text-estrelinha-primary md:px-6 md:text-[13px]">
            {nextTier.missing === 1 ? 'Falta 1' : `Faltam ${nextTier.missing}`} para cada peça
            sair a {formatPrice(nextTier.unitPrice)}
          </p>
        )}

        <CartShipping state={shipping} />

        {/* O cupom recolhido numa linha de 44px; aberto e aplicado, o componente de sempre. A
            variante `drawer` traz o próprio padding, porque a linha aplicada é de borda a borda. */}
        <div className="border-b border-estrelinha-line">
          {applied || couponOpen ? (
            <CouponInput
              variant="drawer"
              subtotal={subtotal}
              shippingCost={charge ? charge.cost : progress.granted ? 0 : default_shipping_cost}
              discount={discount}
              notApplied={discarded === 'coupon'}
              eligibleSubtotal={couponEligibleSubtotal}
              campaignName={campaignName}
            />
          ) : (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setCouponOpen(true)}
              className="flex min-h-11 w-full items-center justify-between gap-3 px-5 text-left text-[13.5px] font-medium text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep/50 motion-reduce:transition-none"
            >
              Tem um cupom?
              <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-estrelinha-ink-soft" />
            </button>
          )}
        </div>

        <dl className="flex flex-col gap-[3px] px-5 pt-[10px] text-[12.5px] leading-[18px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-estrelinha-ink-soft">
              Subtotal ({units} {units === 1 ? 'item' : 'itens'})
            </dt>
            <dd className="font-semibold text-estrelinha-ink">{formatPrice(subtotal)}</dd>
          </div>
          {/* O desconto do Compre Junto: o MESMO valor que o resumo do checkout mostra, porque os
              dois saem de `resolveOrderPricing` com a mesma entrada. Sem desconto, sem linha. */}
          {(buyTogetherDiscount ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-estrelinha-ink-soft">Desconto do Compre Junto</dt>
              <dd
                data-testid="drawer-buy-together"
                className="shrink-0 font-semibold text-estrelinha-primary"
              >
                −{formatPrice(buyTogetherDiscount)}
              </dd>
            </div>
          )}
          {/* Sem faixa alcançada a linha simplesmente não existe: a gaveta não anuncia
              "−R$ 0,00", que é anúncio de desconto nenhum. */}
          {promotionDiscount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-estrelinha-ink-soft">Desconto progressivo</dt>
              <dd className="font-semibold text-estrelinha-primary">
                −{formatPrice(promotionDiscount)}
              </dd>
            </div>
          )}
          {discount > 0 && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-estrelinha-ink-soft">Cupom {applied?.code}</dt>
              <dd className="font-semibold text-estrelinha-primary">−{formatPrice(discount)}</dd>
            </div>
          )}
          {/* O frete só com uma escolha na gaveta. O valor é o que `resolveOrderPricing` cobra —
              zero com o cupom de frete grátis —, e zero se lê "Grátis". */}
          {charge && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-estrelinha-ink-soft">{charge.label}</dt>
              <dd
                data-testid="drawer-shipping"
                className={`font-semibold ${
                  totals.shipping === 0 ? 'text-estrelinha-primary' : 'text-estrelinha-ink'
                }`}
              >
                {totals.shipping === 0 ? 'Grátis' : formatPrice(totals.shipping)}
              </dd>
            </div>
          )}
          <div className="mt-[5px] flex items-center justify-between gap-3 border-t border-estrelinha-line pt-[7px]">
            <dt className="font-heading text-base font-bold text-estrelinha-ink">Total</dt>
            <dd className="font-heading text-lg font-bold text-estrelinha-ink">
              {formatPrice(total)}
            </dd>
          </div>
        </dl>

        {/* Nenhuma nota abaixo do Total, com ou sem frete escolhido. */}
        <div className="px-5 pb-[14px] pt-[10px] md:pb-5">
          <Button
            onClick={onCheckout}
            className="h-12 w-full gap-2.5 rounded-md border-0 bg-estrelinha-primary font-display text-[15px] font-bold text-white transition-colors hover:bg-estrelinha-primary-strong motion-reduce:transition-none"
          >
            <SacolaIcon className="h-5 w-5" aria-hidden />
            Finalizar Pedido
          </Button>
        </div>
      </div>
    </>
  )
}

const CartDrawer = () => {
  const navigate = useNavigate()
  const open = useCartUiStore((s) => s.open)
  const setCartOpen = useCartUiStore((s) => s.setCartOpen)
  const closeCart = useCartUiStore((s) => s.closeCart)

  const items = useCartStore((s) => s.items)
  const count = useCartStore((s) => s.uniqueItemsCount())
  // O painel da gaveta, para o balão do ⓘ da faixa não passar da largura dele.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)

  /*
   * Feature 61 · EVT-07 — `view_cart` na TRANSIÇÃO fechado → aberto, com itens. A gaveta vive
   * montada; o efeito olha a borda de subida do `open`, não o valor, e mexer na quantidade com a
   * gaveta aberta não é ver a sacola de novo.
   */
  const estavaAberta = useRef(false)
  useEffect(() => {
    if (open && !estavaAberta.current && items.length > 0) {
      track(viewCartEvent({ items: items.map(i => cartLineItem(i)) }))
    }
    estavaAberta.current = open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const goTo = (path: string) => {
    closeCart()
    navigate(path)
  }

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent
        ref={setPanel}
        side="right"
        /* `[&>button]:hidden` apaga o X padrão do `SheetContent`: o board põe o fechar dentro do
           cabeçalho, alinhado ao título, e não solto sobre o conteúdo. O nosso `SheetClose` abaixo
           mantém a mesma acessibilidade. */
        /* `border-l` só a partir de `sm`: em tela cheia (mobile) ele vira um filete rosa solto na
           beirada esquerda, sem nada do outro lado para separar. */
        className="flex w-full flex-col gap-0 border-l-0 bg-white p-0 sm:max-w-[440px] sm:border-l sm:border-estrelinha-line [&>button]:hidden"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between space-y-0 border-b border-estrelinha-line px-5 py-4 text-left md:px-6 md:py-5">
          <div className="flex items-center gap-2.5">
            <SheetTitle className="font-heading text-[17px] font-bold leading-6 text-estrelinha-ink md:text-lg">
              Sua sacola
            </SheetTitle>
            {count > 0 && (
              <span className="rounded-pill bg-estrelinha-primary px-2 py-0.5 text-xs font-bold leading-[18px] text-white md:px-2.5">
                {count}
                <span className="hidden md:inline"> {count === 1 ? 'item' : 'itens'}</span>
              </span>
            )}
          </div>
          <SheetDescription className="sr-only">
            Itens adicionados à sacola, com o resumo do pedido e o acesso ao checkout.
          </SheetDescription>
          <SheetClose
            aria-label="Fechar sacola"
            className={`${TAP_44} flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep text-estrelinha-ink transition-colors hover:bg-estrelinha-line`}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </SheetClose>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-estrelinha-ground-deep">
              <SacolaIcon className="h-8 w-8 text-estrelinha-primary" aria-hidden />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-estrelinha-ink">
                Sua sacola está vazia
              </p>
              <p className="mt-1 text-sm text-estrelinha-ink-soft">
                Escolha uma peça — eu embalo com carinho.
              </p>
            </div>
            <Button
              onClick={() => goTo('/')}
              className="rounded-sm border-0 bg-estrelinha-primary px-6 font-display font-semibold text-white hover:bg-estrelinha-primary hover:opacity-95"
            >
              Explorar joias
            </Button>
          </div>
        ) : (
          <FilledCart panel={panel} onNavigate={closeCart} onCheckout={() => goTo('/checkout')} />
        )}
      </SheetContent>
    </Sheet>
  )
}

export default CartDrawer
