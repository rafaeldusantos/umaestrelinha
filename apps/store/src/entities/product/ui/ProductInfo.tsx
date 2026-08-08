import { useLocation } from 'react-router-dom'
import { Heart, Minus, MessageCircle, Plus, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { resolveInstallments } from '@estrelinha/core/payment/installments'
import {
  useGeneralSettings,
  usePaymentSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import type { Product } from '@estrelinha/supabase/types'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import ShareButtons from '@/features/share-product/ui/ShareButtons'
import RatingStars from '@/entities/review/ui/RatingStars'
import { PAGE_MAX_AXES } from '../lib/variantSelection'
import type { ProductPurchase } from '../model/useProductPurchase'
import ProductTrustBadges from './ProductTrustBadges'
import VariantPicker from './VariantPicker'

interface Props {
  product: Product
  categoryName?: string
  /** O estado de compra, montado pela página e dividido com a barra fixa do mobile. */
  purchase: ProductPurchase
  /** Resumo das avaliações — `null` quando o produto ainda não tem nenhuma. */
  rating?: { average: number; count: number } | null
}

/**
 * Cor da linha de estoque. Verde só no "em estoque" — é semântica de estado, o mesmo verde do
 * "Compra verificada" da avaliação, e não faz parte da paleta de marca (DESIGN.md §7).
 * A escassez fala em geleia, e o esgotado em ameixa: nenhum dos dois é alarme.
 */
const STOCK_TONE = {
  in: { dot: 'bg-[hsl(142_71%_45%)]', text: 'text-[hsl(142_71%_30%)]' },
  low: { dot: 'bg-nanita-raspberry', text: 'text-nanita-jam' },
  out: { dot: 'bg-nanita-plum', text: 'text-nanita-plum' },
} as const

/**
 * A coluna de informação da página do produto — boards "Desktop Product Detail - v3" e
 * "Mobile Product Detail - v3".
 *
 * A ordem é a do board e é uma escada de decisão: **o que é** (selos, nome, nota) → **quanto custa**
 * (preço, economia, parcela) → **qual** (acabamento, tamanho) → **tem?** (estoque) → **levar**
 * (quantidade + CTA). O que não decide compra — compartilhar e garantias — vem depois do CTA.
 *
 * Não guarda estado de compra: quem guarda é `useProductPurchase`, na página, porque a mesma escolha
 * alimenta a barra fixa do rodapé mobile.
 */
const ProductInfo = ({ product, categoryName, purchase, rating = null }: Props) => {
  const { qty, setQty, selected, select, sellableGrid, price, savings, stock, canAdd, add } =
    purchase
  const toggleWishlist = useWishlistStore(s => s.toggleItem)
  const isWishlisted = useWishlistStore(s => s.hasItem(product.id))
  const location = useLocation()
  const { whatsapp, store_name } = useGeneralSettings()
  const { max_installments, min_installment_value } = usePaymentSettings()

  const currentUrl = `${window.location.origin}${location.pathname}`
  const installments = resolveInstallments(price, max_installments, min_installment_value)

  const phone = whatsapp?.replace(/\D/g, '') || ''
  const hasWhatsApp = phone.length >= 10
  const waMessage = `Olá! Tenho interesse no botton "${product.name}" (${formatPrice(price)}) da ${store_name || 'Nanita'}. Pode me ajudar?\n\n${currentUrl}`
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="flex flex-col">
      {(categoryName || product.is_new) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {categoryName && (
            <span className="rounded-pill border border-nanita-jam/25 bg-nanita-jam/[0.08] px-2.5 py-1 text-[12px] font-semibold leading-3 text-nanita-jam">
              {categoryName}
            </span>
          )}
          {product.is_new && (
            <span className="rounded-pill bg-nanita-ink px-2.5 py-1 text-[12px] font-semibold leading-3 text-white">
              Novo
            </span>
          )}
        </div>
      )}

      <h1 className="font-display text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-nanita-ink md:text-[36px] md:leading-[42px]">
        {product.name}
      </h1>

      {rating && (
        <div className="mt-3 flex items-center gap-2">
          <RatingStars value={rating.average} size={16} />
          <span className="text-[13px] font-semibold leading-4 text-nanita-ink">
            {rating.average.toFixed(1)}
          </span>
          <span className="text-[13px] leading-4 text-nanita-plum">
            ({rating.count} {rating.count === 1 ? 'avaliação' : 'avaliações'})
          </span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[32px] font-semibold leading-[38px] text-nanita-jam">
          {formatPrice(price)}
        </span>
        {savings && (
          <>
            <span className="text-[16px] leading-5 text-nanita-plum line-through">
              {formatPrice(savings.compareAt)}
            </span>
            <span className="rounded-sm bg-nanita-jam/[0.09] px-2 py-0.5 text-[12px] font-bold leading-4 text-nanita-jam">
              Economize {formatPrice(savings.saved)}
            </span>
          </>
        )}
      </div>

      {installments && installments.count > 1 && (
        <p className="mt-1 text-[13px] leading-4 text-nanita-plum">
          ou {installments.count}x de {formatPrice(installments.value)} sem juros
        </p>
      )}

      {product.description && (
        <p className="mt-5 max-w-[520px] text-[15px] leading-[24px] text-nanita-plum">
          {product.description}
        </p>
      )}

      {sellableGrid && (
        <>
          <hr className="mt-5 border-nanita-border" />
          <div className="mt-4 flex flex-col">
            <VariantPicker
              product={product}
              max={PAGE_MAX_AXES}
              surface="page"
              selected={selected}
              onChange={select}
            />
            {!canAdd && (
              <p className="mt-3 text-[13px] font-medium text-nanita-jam">
                Essa combinação está indisponível no momento.
              </p>
            )}
          </div>
        </>
      )}

      <hr className="mt-5 border-nanita-border" />

      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] leading-4">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${STOCK_TONE[stock.tone].dot}`}
        />
        <span className={`font-medium ${STOCK_TONE[stock.tone].text}`}>{stock.label}</span>
        {stock.note && <span className="text-[12px] text-nanita-plum">{stock.note}</span>}
      </p>

      {/* O CTA da coluna é escondido no mobile: lá quem compra é a barra fixa do rodapé, e dois
          "Adicionar ao Carrinho" na mesma tela é duas ações primárias (DESIGN.md §8). */}
      <div className="mt-3 hidden items-center gap-3 md:flex">
        <div className="flex items-center rounded-md bg-nanita-sugar p-1">
          <button
            type="button"
            onClick={() => setQty(qty - 1)}
            disabled={qty <= 1}
            aria-label="Diminuir quantidade"
            className="flex h-10 w-10 items-center justify-center rounded-sm transition-colors hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Minus className="h-4 w-4 text-nanita-ink" />
          </button>
          <span
            aria-live="polite"
            className="w-9 text-center font-display text-[15px] font-semibold text-nanita-ink"
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            aria-label="Aumentar quantidade"
            className="flex h-10 w-10 items-center justify-center rounded-sm transition-colors hover:bg-white"
          >
            <Plus className="h-4 w-4 text-nanita-ink" />
          </button>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-button bg-nanita-jam font-display text-[15px] font-semibold text-white transition-transform hover:scale-[1.01] disabled:scale-100 disabled:opacity-50"
        >
          <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          {canAdd ? 'Adicionar ao Carrinho' : 'Indisponível'}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            isWishlisted
              ? 'border-nanita-jam bg-nanita-jam/[0.06]'
              : 'border-nanita-border hover:border-nanita-jam/50'
          }`}
        >
          <Heart
            className={`h-5 w-5 ${isWishlisted ? 'fill-nanita-jam text-nanita-jam' : 'text-nanita-plum'}`}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <div className="mt-3">
        <ShareButtons name={product.name} url={currentUrl} />
      </div>

      <div className="mt-5">
        <ProductTrustBadges />
      </div>

      {hasWhatsApp && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          /* Link, e não o botão verde de antes: o board não tem segunda ação, e um bloco cheio de
             cor ao lado do CTA em geleia disputava a ação primária. */
          className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-nanita-jam hover:underline"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Tirar uma dúvida sobre este botton no WhatsApp
        </a>
      )}
    </div>
  )
}

export default ProductInfo
