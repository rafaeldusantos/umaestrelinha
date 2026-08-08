import { useEffect, useRef } from 'react'
import { supabase } from '@nanapin/supabase/client'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { useAuthContext } from '@nanapin/auth'
import { primaryImage } from '@nanapin/core/media'
import type { AbandonedCartItem } from '@nanapin/supabase/types/abandonedCart'

const STORAGE_KEY = 'nanapin-guest-email'

/**
 * O botton personalizado é um produto sintético: a "imagem" dele é o PNG do canvas em
 * base64, com centenas de KB. Mandar isso para dentro do jsonb a cada snapshot inchava a
 * linha (e a requisição) sem servir para nada — o produto não existe em `products`, então
 * a recuperação já o descarta. Guardamos o item (o admin precisa ver o que havia no
 * carrinho) e jogamos fora só a imagem embutida.
 */
function externalImageUrl(url: string | null | undefined): string | null {
  if (!url || url.startsWith('data:')) return null
  return url
}

/**
 * Captura o carrinho ativo na tabela abandoned_carts.
 * Dispara em duas situações:
 *  - usuário logado tem itens no carrinho
 *  - visitante já preencheu email no checkout (salvo em sessionStorage)
 *
 * Faz upsert com debounce de 3s, via RPC. O upsert é do banco, não do client: o visitante
 * não tem (nem precisa de) permissão de leitura na tabela para saber se já existe carrinho
 * ativo do e-mail dele — `track_abandoned_cart` resolve isso numa statement só. Marca como
 * 'recovered' quando o carrinho é esvaziado após criar um pedido (controlado pela CheckoutPage).
 */
export function useAbandonedCartTracker() {
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const { applied: coupon } = useCouponStore()
  const { user, customer } = useAuthContext()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPayloadRef = useRef<string>('')

  useEffect(() => {
    // Determina email + consentimento
    const guestEmail = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
    const guestConsentRaw = typeof window !== 'undefined' ? sessionStorage.getItem('nanapin-guest-consent') : null

    const email = customer?.email || user?.email || guestEmail || ''
    const name = customer?.name || null
    const consent = customer ? true : guestConsentRaw === 'true'

    // Sem email → não rastreia
    if (!email || items.length === 0) return

    // Snapshot do carrinho
    const snapshot: AbandonedCartItem[] = items.map((i) => ({
      product_id: i.product.id,
      product_name: i.product.name,
      product_image: externalImageUrl(primaryImage(i.product.images)?.url),
      product_slug: i.product.slug,
      size: i.size,
      finish: i.finish,
      quantity: i.quantity,
      // `i.unitPrice`, não `i.product.price`: com grade, o preço da linha é o da variação, e
      // `product.price` é o base. O snapshot tem de contar o mesmo que a tela contou.
      unit_price: i.unitPrice,
    }))

    // `customer_id` não vai no payload de propósito: quem preenche é o `auth.uid()` dentro
    // da RPC. Mandar o id pelo corpo deixava o cliente atribuir o carrinho a outra pessoa.
    const payload = {
      p_email: email.toLowerCase().trim(),
      p_name: name,
      p_items: snapshot,
      p_subtotal: subtotal,
      p_coupon_code: coupon?.code ?? null,
      p_marketing_consent: consent,
    }

    const payloadHash = JSON.stringify(payload)
    if (payloadHash === lastPayloadRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      lastPayloadRef.current = payloadHash
      try {
        await supabase.rpc('track_abandoned_cart', payload)
      } catch {
        // silencioso — não atrapalhar UX
      }
    }, 3000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [items, subtotal, coupon, user, customer])
}

/**
 * Marca o carrinho ativo como 'recovered' depois de criar pedido com sucesso.
 */
export async function markCartRecovered(email: string, orderId: string) {
  if (!email) return
  try {
    await supabase.rpc('mark_cart_recovered', {
      p_email: email.toLowerCase().trim(),
      p_order_id: orderId,
    })
  } catch {
    // silencioso
  }
}

/**
 * Salva email do guest em sessionStorage para o tracker capturar.
 */
export function setGuestEmail(email: string, consent: boolean) {
  if (typeof window === 'undefined') return
  if (email) {
    sessionStorage.setItem(STORAGE_KEY, email.toLowerCase().trim())
    sessionStorage.setItem('nanapin-guest-consent', consent ? 'true' : 'false')
  }
}

export function clearGuestEmail() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem('nanapin-guest-consent')
}
