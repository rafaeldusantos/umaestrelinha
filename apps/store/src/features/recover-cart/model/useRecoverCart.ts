import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@estrelinha/supabase/client'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { validateCoupon } from '@estrelinha/core/hooks/useCoupons'
// T18: era uma quarta cópia do mapper, e a única que já não trazia as dimensões de SHP-02 — um
// carrinho recuperado cotava frete pelos fallbacks. Com a grade entrando no `Product`, a cópia
// também deixaria o produto recuperado sem variação.
import { mapDbToProduct, PRODUCT_SELECT } from '@/entities/product/lib/mapProduct'
import type { DbAbandonedCart } from '@estrelinha/supabase/types/abandonedCart'
import type { Product } from '@estrelinha/supabase/types'

/** O recorte que `get_abandoned_cart` devolve — não a linha inteira. */
type RecoverableCart = Pick<
  DbAbandonedCart,
  'id' | 'customer_email' | 'items' | 'coupon_code' | 'status'
>

/**
 * Restaura um carrinho abandonado a partir de /carrinho?recover=<id>.
 * - Busca o registro em abandoned_carts
 * - Hidrata os produtos atuais do Supabase (preços/imagens podem ter mudado)
 * - Substitui o conteúdo do cartStore
 * - Reaplica cupom se houver
 * - Limpa o param da URL
 */
export function useRecoverCart() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const recoverId = params.get('recover')
  const [recovering, setRecovering] = useState(false)
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!recoverId) return
    if (handledRef.current === recoverId) return
    handledRef.current = recoverId

    const run = async () => {
      setRecovering(true)
      try {
        // Por RPC, não pela tabela: a leitura de `abandoned_carts` é só de admin, então quem
        // clica no lembrete não enxerga o próprio carrinho. `get_abandoned_cart` abre a porta
        // pelo id (uuid não enumerável) devolvendo só o que a recuperação usa.
        const { data, error } = await supabase
          .rpc('get_abandoned_cart', { p_id: recoverId })
          .maybeSingle<RecoverableCart>()

        const cart = data

        if (error || !cart) {
          toast.error('Carrinho não encontrado ou expirado')
          return
        }

        if (cart.status === 'recovered') {
          toast.info('Este carrinho já foi finalizado')
          return
        }

        if (!cart.items || cart.items.length === 0) {
          toast.error('Este carrinho está vazio')
          return
        }

        // Hidrata produtos atuais
        const ids = Array.from(new Set(cart.items.map((i) => i.product_id)))
        const { data: products } = await supabase
          .from('products')
          .select(PRODUCT_SELECT)
          .in('id', ids)

        const productMap = new Map<string, Product>()
        ;(products ?? []).forEach((p: { id: string }) => productMap.set(p.id, mapDbToProduct(p)))

        // Reconstrói o carrinho preservando size/finish/quantity
        const cartState = useCartStore.getState()
        cartState.clearCart()

        let restored = 0
        let missing = 0
        cart.items.forEach((item) => {
          const product = productMap.get(item.product_id)
          if (!product) {
            missing++
            return
          }
          for (let i = 0; i < item.quantity; i++) {
            cartState.addItem(product, item.size, item.finish)
          }
          restored++
        })

        // Reaplica cupom (revalidando contra o subtotal atual)
        if (cart.coupon_code) {
          try {
            const newSubtotal = useCartStore.getState().subtotal()
            const newShipping = useCartStore.getState().shippingCost()
            const res = await validateCoupon({
              code: cart.coupon_code,
              subtotal: newSubtotal,
              shippingCost: newShipping,
              customerEmail: cart.customer_email,
            })
            if (res.ok && res.coupon) {
              useCouponStore.getState().setCoupon(res.coupon)
            }
          } catch {
            // silencioso — usuário pode reaplicar manualmente
          }
        }

        if (restored === 0) {
          toast.error('Os produtos deste carrinho não estão mais disponíveis')
        } else if (missing > 0) {
          toast.success(`Carrinho recuperado! ${missing} item(ns) indisponível(is) foi(ram) removido(s)`)
        } else {
          toast.success('Carrinho recuperado com sucesso!')
        }

        // Limpa o param sem disparar nova navegação
        const next = new URLSearchParams(params)
        next.delete('recover')
        setParams(next, { replace: true })
      } catch {
        toast.error('Não foi possível recuperar seu carrinho')
      } finally {
        setRecovering(false)
      }
    }

    run()
  }, [recoverId, params, setParams, navigate])

  return { recovering, isRecovering: !!recoverId }
}
