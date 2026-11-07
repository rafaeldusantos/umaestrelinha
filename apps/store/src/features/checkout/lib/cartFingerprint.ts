// "O pedido em curso é desta sacola?" — a impressão da sacola no instante em que o pedido nasceu.
//
// O rascunho do checkout (`CheckoutDraft`) não carrega as peças: elas moram no `cartStore`. Por
// isso `isOrderStale` não enxerga a cliente que, com um PIX pendente na aba, troca as peças e volta
// ao checkout — e o CTA reabria o pedido anterior, com outras peças e outro valor. A impressão é
// gravada com o pedido (`setOrder`) e comparada quando o checkout monta.
//
// Não é a identidade da linha (`itemKey`, no `cartStore`): é tudo o que muda o que o pedido
// cobra — a peça, a variação, a gravação, a quantidade, o preço congelado, a marca do Compre Junto
// e o cupom. Duas sacolas com a mesma impressão gravam o mesmo pedido; a ordem das linhas não conta.
import type { CartItem } from '@/entities/cart'

export function cartFingerprint(items: CartItem[], couponCode: string | null): string {
  const lines = items
    .map((i) =>
      JSON.stringify([
        i.product.id,
        i.variantId ?? null,
        i.size ?? '',
        i.finish ?? '',
        i.engravingText ?? null,
        i.quantity,
        i.unitPrice,
        (i.accompanies ?? []).map((m) => `${m.mainProductId}/${m.listId ?? ''}`).sort(),
      ]),
    )
    .sort()
  return JSON.stringify({ lines, coupon: couponCode ?? null })
}
