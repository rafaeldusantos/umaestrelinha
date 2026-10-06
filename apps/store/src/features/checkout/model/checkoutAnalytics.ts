import { useEffect, useRef } from 'react'
import {
  addPaymentInfoEvent,
  addShippingInfoEvent,
  beginCheckoutEvent,
  type AnalyticsPaymentMethod,
} from '@estrelinha/core/analytics'
import { useCartStore, type CartItem } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { cartLineItem, track } from '@/shared/lib/analytics'

/**
 * Feature 61 · EVT-10..12 — as três etapas do checkout, num dono só.
 *
 * Os três eventos levam os MESMOS itens (as linhas da sacola) e o mesmo cupom; escritos em três
 * blocos, bastaria um esquecer o cupom para o funil do GA4 mostrar um desconto que some no meio do
 * caminho. O bump não entra: é oferta da página, não item que a cliente pôs na sacola.
 */
const itens = (items: readonly CartItem[]) => items.map(i => cartLineItem(i))
const cupomAtual = () => useCouponStore.getState().applied?.code ?? null

/**
 * `EVT-10` — UM `begin_checkout` por entrada na página, com itens. F5 é nova entrada (o GA4 mede
 * assim). Sacola vazia não emite: a página nem fica de pé, redireciona.
 */
export function useBeginCheckout(items: readonly CartItem[]): void {
  const emitiu = useRef(false)
  useEffect(() => {
    if (emitiu.current || items.length === 0) return
    emitiu.current = true
    track(beginCheckoutEvent({ items: itens(items), coupon: cupomAtual() }))
    // Só a montagem conta: mexer na sacola depois não é começar de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0])
}

/** `EVT-11` — o frete que a cliente TOCOU. A pré-seleção automática não é escolha (como em `EVT-12`). */
export function trackShippingInfo(shippingTier: string): void {
  const items = useCartStore.getState().items
  if (items.length === 0 || !shippingTier) return
  track(addShippingInfoEvent({ items: itens(items), shippingTier, coupon: cupomAtual() }))
}

/** `EVT-12` — PIX ou cartão, tocado pela cliente. A pré-seleção do bloco não emite. */
export function trackPaymentInfo(paymentType: AnalyticsPaymentMethod): void {
  const items = useCartStore.getState().items
  if (items.length === 0) return
  track(addPaymentInfoEvent({ items: itens(items), paymentType, coupon: cupomAtual() }))
}
