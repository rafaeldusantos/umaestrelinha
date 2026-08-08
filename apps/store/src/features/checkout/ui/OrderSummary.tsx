// Resumo persistente do pedido (CHK-05) — é ele que substitui o passo "Revisão".
//
// `variant='sidebar'` é a coluna fixa de ≥1024px (board `04`, nó *Resumo Card*); `variant='bar'` é
// a barra colapsável do topo no mobile (board `07`, *Resumo Bar*). As duas mostram a **mesma**
// informação: itens com quantidade, frete selecionado, cupom, desconto PIX e total.
//
// RSM-01 … RSM-07: as medidas aqui saíram do board por `get_jsx`, não de screenshot — 24px de
// respiro horizontal em TODAS as faixas, itens com 16px entre linhas, miniatura 56×56 raio 12,
// total em 32px e a faixa própria do cupom aplicado.
//
// O total sai de `useCheckoutTotals` → `calculateOrderTotals`, a mesma função do servidor.
// Nunca há soma local aqui.
//
// Paleta: o cart drawer usa manteiga sobre branco; aqui **não** — pó de açúcar na faixa e
// geleia só no texto (nenhuma pílula geleia: a única da tela é o CTA, CHK-04).
import { useState } from 'react'
import { Check, ChevronDown, ShoppingBag, Tag, X } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import {
  usePaymentSettings,
  useShippingSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import CouponInput from '@/features/apply-coupon/ui/CouponInput'
import { useCouponStore } from '@/entities/coupon'
import { NanitaMonogram } from '@/shared/ui/brand'
import { useCheckoutStore } from '../model/checkoutStore'
import { useCheckoutTotals } from '../model/useCheckoutTotals'
import { resolveInstallments } from '@estrelinha/core/payment/installments'

interface Props {
  variant: 'sidebar' | 'bar'
}

const OrderSummary = ({ variant }: Props) => {
  const {
    items,
    bumpProduct,
    cartSubtotal,
    subtotalBeforePromotion,
    pixDiscountPercent,
    promotionDiscount,
    promotionName,
    discarded,
    totals,
    cardTotal,
  } = useCheckoutTotals()
  const shipping = useCheckoutStore((s) => s.shipping)
  const contactEmail = useCheckoutStore((s) => s.contact.email)
  const coupon = useCouponStore((s) => s.applied)
  const clearCoupon = useCouponStore((s) => s.clearCoupon)
  const { free_shipping_threshold } = useShippingSettings()
  const { card_enabled, max_installments, min_installment_value } = usePaymentSettings()
  const [expanded, setExpanded] = useState(false)

  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0) + (bumpProduct ? 1 : 0)
  const freeShippingReached = cartSubtotal >= free_shipping_threshold
  const missingForFreeShipping = Math.max(0, free_shipping_threshold - cartSubtotal)

  /**
   * RSM-06: a parcela sai do **total do cartão**, não do total exibido. Com PIX selecionado os
   * dois divergem, e uma parcela derivada do total-com-desconto anunciaria um preço que o cartão
   * não pratica. `1x de R$ X` não é informação — a linha só aparece a partir de 2x.
   */
  const cardInstallments = resolveInstallments(cardTotal, max_installments, min_installment_value)
  const showInstallments = card_enabled && !!cardInstallments && cardInstallments.count >= 2

  const freeShippingBand = (
    <div className="flex items-center gap-[9px] bg-estrelinha-ground-deep px-6 py-3">
      {freeShippingReached ? (
        <>
          <Check className="h-4 w-4 shrink-0 text-estrelinha-primary" aria-hidden />
          <span className="text-sm font-semibold leading-[18px] text-estrelinha-primary">
            Frete grátis liberado
          </span>
        </>
      ) : (
        <span className="text-sm leading-[18px] text-estrelinha-ink">
          Faltam {formatPrice(missingForFreeShipping)} para o frete grátis
        </span>
      )}
    </div>
  )

  const itemLines = (
    <div className="flex flex-col gap-4 px-6 py-5">
      {items.map((item) => (
        <div
          key={`${item.product.id}-${item.size}-${item.finish}`}
          className="flex items-center gap-[14px]"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-estrelinha-ground-deep">
            {item.product.image_url ? (
              <img src={item.product.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <NanitaMonogram height={26} tone="brand" />
            )}
            <span className="absolute -right-[6px] -top-[6px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-estrelinha-ink text-xs font-bold text-white">
              {item.quantity}
            </span>
          </span>
          <span className="flex min-w-0 grow flex-col gap-[3px]">
            <span className="truncate text-sm font-semibold leading-[18px] text-estrelinha-ink">
              {item.product.name}
            </span>
            {(item.size || item.finish) && (
              <span className="truncate text-[13px] leading-4 text-estrelinha-ink-soft">
                {[item.size, item.finish].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
          {/* `item.unitPrice`, não `product.price` — o mesmo que `CartDrawerRow` mostra: com grade os
              dois divergem, e o base faria as linhas de item não somarem o subtotal exibido. */}
          <span className="shrink-0 font-heading text-base font-semibold leading-5 text-estrelinha-ink">
            {formatPrice(item.unitPrice * item.quantity)}
          </span>
        </div>
      ))}
    </div>
  )

  /**
   * RSM-02: o cupom aplicado é uma faixa do resumo, com régua em cima e embaixo — não o cartão
   * genérico de `apply-coupon`. Sem cupom, o campo de digitar segue como hoje (RSM-03): ele é a
   * única entrada de cupom do checkout, e `CouponInput` também serve o carrinho.
   */
  const couponBand = coupon ? (
    <div className="flex items-center gap-[10px] border-y border-estrelinha-line px-6 py-[14px]">
      <Tag className="h-4 w-4 shrink-0 text-estrelinha-primary" aria-hidden />
      <span className="min-w-0 grow truncate text-sm font-semibold leading-[18px] text-estrelinha-ink">
        {coupon.code} aplicado
      </span>
      <span className="shrink-0 text-sm font-semibold leading-[18px] text-estrelinha-primary">
        {/* Cupom de frete grátis não tem valor de desconto: escrever "−R$ 0,00" mentiria. O mesmo
            vale para o cupom que PERDEU da promoção (PRM-17) — o desconto dele é zero, e a frase
            logo abaixo diz por quê. */}
        {discarded === 'coupon'
          ? 'Não aplicado'
          : coupon.freeShipping
            ? 'Frete grátis'
            : `−${formatPrice(totals.couponDiscount)}`}
      </span>
      {/* Alvo de toque de 44px sem engordar a faixa: as margens negativas devolvem os 46px do
          board, e a área clicável avança sobre o respiro vertical. */}
      <button
        type="button"
        onClick={clearCoupon}
        aria-label="Remover cupom"
        className="-my-[13px] -mr-[14px] flex h-11 w-11 shrink-0 items-center justify-center text-estrelinha-ink-soft hover:text-estrelinha-primary"
      >
        <X className="h-[15px] w-[15px]" aria-hidden />
      </button>
    </div>
  ) : (
    <div className="px-6">
      <CouponInput
        subtotal={totals.subtotal}
        shippingCost={totals.shipping}
        customerEmail={contactEmail}
      />
    </div>
  )

  const totalLines = (
    <div className="flex flex-col gap-[11px] px-6 pb-1 pt-5">
      {/* PRM-15: subtotal **cheio**, com o desconto de faixa na linha própria logo abaixo — a mesma
          forma da gaveta. `totals.subtotal` (já líquido) exibido ao lado de `Desconto progressivo`
          contava o desconto duas vezes para quem lê; a redação da AC foi corrigida na validação. */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] leading-[18px] text-estrelinha-ink-soft">Subtotal</span>
        <span
          data-testid="summary-subtotal"
          className="text-[15px] font-medium leading-[18px] text-estrelinha-ink"
        >
          {formatPrice(subtotalBeforePromotion)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[15px] leading-[18px] text-estrelinha-ink-soft">
          {shipping ? `Frete · ${shipping.carrier} ${shipping.serviceName}` : 'Frete'}
        </span>
        {shipping && totals.shipping === 0 ? (
          <span className="text-[15px] font-semibold leading-[18px] text-estrelinha-primary">Grátis</span>
        ) : (
          <span className="text-[15px] font-medium leading-[18px] text-estrelinha-ink">
            {shipping ? formatPrice(totals.shipping) : 'a calcular'}
          </span>
        )}
      </div>
      {/* PRM-15: mesma linha da gaveta, mesmo valor. Sem faixa alcançada a linha não existe — o
          resumo não anuncia "−R$ 0,00". Com `stacks_with_coupon`, ela e a do cupom aparecem juntas
          (PRM-18); sem ele, só uma das duas, porque os dois não compõem (`AD-015`). */}
      {promotionDiscount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[15px] leading-[18px] text-estrelinha-ink-soft">Desconto progressivo</span>
          <span
            data-testid="summary-promotion"
            className="text-[15px] font-medium leading-[18px] text-estrelinha-ink"
          >
            −{formatPrice(promotionDiscount)}
          </span>
        </div>
      )}
      {totals.couponDiscount > 0 && (
        <div className="flex items-center justify-between">
          {/* RSM-04: a linha diz QUAL cupom desconta — só "Cupom" não fecha a conferência. */}
          <span className="text-[15px] leading-[18px] text-estrelinha-ink-soft">
            {coupon ? `Cupom ${coupon.code}` : 'Cupom'}
          </span>
          <span className="text-[15px] font-medium leading-[18px] text-estrelinha-ink">
            −{formatPrice(totals.couponDiscount)}
          </span>
        </div>
      )}
      {totals.pixDiscount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[15px] leading-[18px] text-estrelinha-ink-soft">
            Desconto PIX ({pixDiscountPercent}%)
          </span>
          <span className="text-[15px] font-medium leading-[18px] text-estrelinha-ink">
            −{formatPrice(totals.pixDiscount)}
          </span>
        </div>
      )}
    </div>
  )

  const totalRow = (
    <div className="flex flex-col gap-1 px-6 pb-6 pt-[18px]">
      <div className="flex items-end justify-between border-t-2 border-estrelinha-ink pt-4">
        <span className="font-heading text-[20px] font-semibold leading-6 tracking-[-0.02em] text-estrelinha-ink">
          Total
        </span>
        {/* RSM-05: 32px é a única coisa maior que o título do card — é o número da decisão. */}
        <span
          data-testid="summary-total"
          className="font-heading text-[32px] font-semibold leading-[34px] tracking-[-0.03em] text-estrelinha-ink"
        >
          {formatPrice(totals.total)}
        </span>
      </div>
      {showInstallments && (
        <p className="text-right text-[13px] leading-4 text-estrelinha-ink-soft">
          no cartão: {cardInstallments.count}x de {formatPrice(cardInstallments.value)} sem juros
        </p>
      )}
    </div>
  )

  /**
   * PRM-17: promoção e cupom **não somam** — vale o de menor total final (D2). Quando um dos dois é
   * descartado, o resumo nomeia o descartado e diz quem venceu.
   *
   * Sem esta frase, a cliente que digitou um código vê o desconto dele sumir da conta sem explicação
   * — e a conclusão razoável é que o cupom não funcionou, não que ela já está pagando menos.
   */
  const discardedNote =
    discarded && coupon && promotionName ? (
      <p
        data-testid="summary-discarded"
        className="px-6 pt-[14px] text-[13px] leading-[18px] text-estrelinha-ink-soft"
      >
        {discarded === 'coupon'
          ? `Cupom ${coupon.code} não foi aplicado — a promoção ${promotionName} desconta mais`
          : `A promoção ${promotionName} não foi aplicada — o cupom ${coupon.code} desconta mais`}
      </p>
    ) : null

  const details = (
    <>
      {freeShippingBand}
      {itemLines}
      {couponBand}
      {discardedNote}
      {totalLines}
      {totalRow}
    </>
  )

  if (variant === 'bar') {
    return (
      <section
        aria-label="Resumo do pedido"
        className="overflow-hidden rounded-lg border border-estrelinha-line bg-white"
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-[10px] bg-estrelinha-ground-deep px-4 py-[14px] text-left"
        >
          <ShoppingBag className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
          {/* RSM-07: em 390px a linha inteira cabe; `truncate` garante que uma contagem maior
              encolha em vez de embrulhar em duas linhas. */}
          <span className="min-w-0 grow truncate text-sm font-semibold leading-[18px] text-estrelinha-ink">
            Resumo · {unitCount} {unitCount === 1 ? 'item' : 'itens'}
            {freeShippingReached ? ' · frete grátis' : ''}
          </span>
          <span className="shrink-0 font-heading text-[17px] font-semibold leading-[22px] text-estrelinha-ink">
            {formatPrice(totals.total)}
          </span>
          <ChevronDown
            className={`h-[17px] w-[17px] shrink-0 text-estrelinha-ink-soft transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>
        {expanded && details}
      </section>
    )
  }

  return (
    <section
      aria-label="Resumo do pedido"
      className="sticky top-24 overflow-hidden rounded-lg border border-estrelinha-line bg-white"
    >
      <header className="flex items-center gap-[10px] px-6 pb-[18px] pt-[22px]">
        <h2 className="grow font-heading text-[20px] font-semibold leading-6 tracking-[-0.02em] text-estrelinha-ink">
          Seu pedido
        </h2>
        <span className="shrink-0 rounded-pill bg-estrelinha-ground-deep px-3 py-[5px] text-xs font-semibold uppercase leading-4 tracking-[0.04em] text-estrelinha-primary">
          {unitCount} {unitCount === 1 ? 'item' : 'itens'}
        </span>
      </header>
      {details}
    </section>
  )
}

export default OrderSummary
