// Order bump: a oferta marcável entre o bloco Pagamento e o CTA (BMP-02, BMP-03, BMP-05).
//
// BMP-03: o preço exibido sai de `applyOrderBump` — a **mesma** função que a edge function usa no
// recálculo server-side. Por isso "exibido == cobrado" é construção, não disciplina.
// ⚠️ `applyOrderBump` recebe o item com **preço cheio** e o objeto `bump`; passar item já
// descontado aplicaria o desconto duas vezes (carry-forward #1).
//
// Superfície tinta: manteiga só no badge (permitido sobre tinta), glacê no preço, véus de branco
// no resto. Nada de geleia — a única pílula geleia da tela é o CTA.
import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { applyOrderBump } from '@estrelinha/core/payment/pricing'
import { useCheckoutSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useCartStore } from '@/entities/cart'
import { useProductById } from '@/entities/product'
import { NanitaMonogram } from '@/shared/ui/brand'
import { useCheckoutStore } from '../model/checkoutStore'

const OrderBump = () => {
  const settings = useCheckoutSettings()
  const productId = settings.order_bump_enabled ? settings.order_bump_product_id : null
  const query = useProductById(productId)
  const product = query.data

  const items = useCartStore((s) => s.items)
  const bumpChecked = useCheckoutStore((s) => s.bumpChecked)
  const toggleBump = useCheckoutStore((s) => s.toggleBump)

  const inCart = items.some((item) => item.product.id === productId)

  // BMP-02: as quatro condições de exibição.
  const eligible =
    settings.order_bump_enabled && !!productId && !!product && product.stock_total > 0 && !inCart

  // BMP-05: oferta que deixa de ser exibida não pode continuar marcada — senão o pedido levaria
  // um item que a cliente não vê (e o produto no carrinho ganharia um segundo item).
  const settled = !productId || product !== undefined || query.isError
  useEffect(() => {
    if (!settled || eligible) return
    if (useCheckoutStore.getState().bumpChecked) toggleBump(false)
  }, [settled, eligible, toggleBump])

  if (!eligible || !product) return null

  // Preço com desconto vindo do domínio compartilhado — nunca calculado aqui.
  const [discounted] = applyOrderBump(
    [{ product_id: product.id, unit_price: product.price, quantity: 1 }],
    {
      enabled: settings.order_bump_enabled,
      product_id: settings.order_bump_product_id,
      discount_percent: settings.order_bump_discount_percent,
    },
  )

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={bumpChecked}
      onClick={() => toggleBump()}
      className="relative flex w-full items-center gap-5 overflow-hidden rounded-lg bg-nanita-ink px-4 py-[22px] text-left"
    >
      <span
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-sm border-2 ${
          bumpChecked ? 'border-nanita-glaze bg-nanita-glaze' : 'border-white/35'
        }`}
      >
        {bumpChecked && <Check className="h-4 w-4 text-nanita-ink" aria-hidden />}
      </span>

      <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-nanita-glaze">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <NanitaMonogram height={30} tone="ink" />
        )}
      </span>

      <span className="flex min-w-0 grow flex-col gap-1">
        <span className="flex flex-wrap items-center gap-[9px]">
          <span className="shrink-0 rounded-pill bg-nanita-butter px-[10px] py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-nanita-ink">
            Só aqui
          </span>
          <span className="text-[13px] font-medium text-white/70">
            Leva junto com {settings.order_bump_discount_percent}% de desconto?
          </span>
        </span>
        <span className="truncate font-heading text-[19px] font-semibold tracking-[-0.02em] text-white">
          {product.name}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-[2px]">
        <span className="font-heading text-[22px] font-semibold text-nanita-glaze">
          {formatPrice(discounted.unit_price)}
        </span>
        <span className="text-[13px] text-white/55 line-through">
          {formatPrice(product.price)}
        </span>
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute -top-[38px] right-[-30px] opacity-10"
      >
        <NanitaMonogram height={150} tone="brand" />
      </span>
    </button>
  )
}

export default OrderBump
