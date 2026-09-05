import { useLocation } from 'react-router-dom'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Heart, Minus, MessageCircle, Plus, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { resolveInstallments } from '@estrelinha/core/payment/installments'
import { pixPrice } from '@estrelinha/core/payment/pix'
import {
  useGeneralSettings,
  usePaymentSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import type { Product } from '@estrelinha/supabase/types'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import ShareButtons from '@/features/share-product/ui/ShareButtons'
import { PAGE_MAX_AXES } from '../lib/variantSelection'
import type { ProductPurchase } from '../model/useProductPurchase'
import EngravingField from './EngravingField'
import MaterialNotice from './MaterialNotice'
import ProductTrustBadges from './ProductTrustBadges'
import VariantPicker from './VariantPicker'
import { PixIcon } from '@estrelinha/ui/icons'

interface Props {
  product: Product
  categoryName?: string
  /** O estado de compra, montado pela página e dividido com a barra fixa do mobile. */
  purchase: ProductPurchase
}

/**
 * Cor da linha de estoque. Verde só no "em estoque" — é semântica de estado e não faz parte da
 * paleta de marca (DESIGN.md §7).
 * A escassez fala em geleia, e o esgotado em ameixa: nenhum dos dois é alarme.
 */
const STOCK_TONE = {
  in: { dot: 'bg-[hsl(142_71%_45%)]', text: 'text-[hsl(142_71%_30%)]' },
  low: { dot: 'bg-estrelinha-accent-strong', text: 'text-estrelinha-primary' },
  out: { dot: 'bg-estrelinha-ink-soft', text: 'text-estrelinha-ink-soft' },
} as const

/**
 * A coluna de informação da página do produto — boards "Desktop Product Detail - v3" e
 * "Mobile Product Detail - v3".
 *
 * A ordem é a do board e é uma escada de decisão: **o que é** (selos, nome) → **quanto custa**
 * (preço, economia, parcela) → **qual** (acabamento, tamanho) → **tem?** (estoque) → **levar**
 * (quantidade + CTA). O que não decide compra — compartilhar e garantias — vem depois do CTA.
 *
 * Não guarda estado de compra: quem guarda é `useProductPurchase`, na página, porque a mesma escolha
 * alimenta a barra fixa do rodapé mobile.
 */
const ProductInfo = ({ product, categoryName, purchase }: Props) => {
  const { qty, setQty, selected, select, sellableGrid, price, savings, stock, canAdd, add } =
    purchase
  const toggleWishlist = useWishlistStore(s => s.toggleItem)
  const isWishlisted = useWishlistStore(s => s.hasItem(product.id))
  const location = useLocation()
  const { whatsapp, store_name } = useGeneralSettings()
  const { max_installments, min_installment_value, pix_enabled, pix_discount_percent } =
    usePaymentSettings()

  const currentUrl = `${window.location.origin}${location.pathname}`
  const installments = resolveInstallments(price, max_installments, min_installment_value)
  // `price` é o da variação escolhida (`purchase.price`), nunca `product.price` — com grade, o
  // preço muda com a variação em 7 de cada 10 produtos com eixo de cor (`COR-12`).
  const pix = pix_enabled ? pixPrice(price, pix_discount_percent) : null

  const phone = whatsapp?.replace(/\D/g, '') || ''
  const hasWhatsApp = phone.length >= 10
  const waMessage = `Olá! Tenho interesse na joia "${product.name}" (${formatPrice(price)}) da ${store_name || 'Uma Estrelinha'}. Pode me ajudar?\n\n${currentUrl}`
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`

  return (
    <div className="flex flex-col">
      {(categoryName || product.is_new) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {categoryName && (
            <span className="rounded-pill border border-estrelinha-primary/25 bg-estrelinha-primary/[0.08] px-2.5 py-1 text-[12px] font-semibold leading-3 text-estrelinha-primary">
              {categoryName}
            </span>
          )}
          {product.is_new && (
            <span className="rounded-pill bg-estrelinha-ink px-2.5 py-1 text-[12px] font-semibold leading-3 text-white">
              Novo
            </span>
          )}
        </div>
      )}

      <h1 className="font-display text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-estrelinha-ink md:text-[36px] md:leading-[42px]">
        {product.name}
      </h1>

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[32px] font-semibold leading-[38px] text-estrelinha-primary">
          {formatPrice(price)}
        </span>
        {savings && (
          <>
            <span className="text-[16px] leading-5 text-estrelinha-ink-soft line-through">
              {formatPrice(savings.compareAt)}
            </span>
            <span className="rounded-sm bg-estrelinha-primary/[0.09] px-2 py-0.5 text-[12px] font-bold leading-4 text-estrelinha-primary">
              Economize {formatPrice(savings.saved)}
            </span>
          </>
        )}
      </div>

      {/* PDP-11: o desconto do Pix chega à tela onde a compra se decide. A vitrine já mostrava o
          número em cada card; a página do produto, não — e é aqui que a cliente escolhe.
          O valor sai de `pixPrice`, a MESMA função que o card chama e que casa com o total que
          `resolveOrderPricing` cobra (`displayedEqualsCharged.test.ts`). */}
      {pix !== null && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[15px] leading-5">
          <PixIcon className="h-[15px] w-[15px] shrink-0 text-estrelinha-primary" aria-hidden />
          <span className="font-semibold text-estrelinha-ink">{formatPrice(pix)}</span>
          <span className="text-estrelinha-ink-soft">com Pix</span>
        </p>
      )}

      {installments && installments.count > 1 && (
        <p className="mt-1 text-[13px] leading-4 text-estrelinha-ink-soft">
          ou {installments.count}x de {formatPrice(installments.value)} sem juros
        </p>
      )}

      {/* A descrição NÃO mora aqui desde a feature 27 — ela é o corpo da seção "Detalhes do
          Produto" (`ProductDetailsAccordion`), abaixo da dobra. Duas razões medidas: 100% das
          descrições do catálogo são HTML, que este `<p>` imprimia como texto cru na tela; e a
          mediana de 2.271 caracteres empurrava o seletor de variação e o CTA para fora da primeira
          tela do celular, que é de onde vêm ~90% dos acessos. */}

      {sellableGrid && (
        <>
          <hr className="mt-5 border-estrelinha-line" />
          <div className="mt-4 flex flex-col">
            <VariantPicker
              product={product}
              max={PAGE_MAX_AXES}
              surface="page"
              selected={selected}
              onChange={select}
            />
            {!canAdd && (
              <p className="mt-3 text-[13px] font-medium text-estrelinha-primary">
                Essa combinação está indisponível no momento.
              </p>
            )}
          </div>
        </>
      )}

      {/* MAT-02/MAT-03 — o que a cliente precisa enviar, e o que vai gravado. Vêm ANTES do CTA de
          propósito: a escada de decisão da coluna é "o que é → quanto custa → qual → tem? → levar",
          e descobrir depois de comprar que faltava enviar algo é o defeito que esta feature fecha.
          Os dois lêem o MESMO `purchase` que a barra fixa do mobile — nunca um segundo estado. */}
      <MaterialNotice product={product} />
      <EngravingField purchase={purchase} />

      <hr className="mt-5 border-estrelinha-line" />

      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] leading-4">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${STOCK_TONE[stock.tone].dot}`}
        />
        <span className={`font-medium ${STOCK_TONE[stock.tone].text}`}>{stock.label}</span>
        {stock.note && <span className="text-[12px] text-estrelinha-ink-soft">{stock.note}</span>}
      </p>

      {/* O CTA da coluna é escondido no mobile: lá quem compra é a barra fixa do rodapé, e dois
          "Adicionar ao carrinho" na mesma tela é duas ações primárias (DESIGN.md §8). */}
      <div className="mt-3 hidden items-center gap-3 md:flex">
        <div className="flex items-center rounded-md bg-estrelinha-ground-deep p-1">
          <button
            type="button"
            onClick={() => setQty(qty - 1)}
            disabled={qty <= 1}
            aria-label="Diminuir quantidade"
            className={`${TAP_44} flex h-10 w-10 items-center justify-center rounded-sm transition-colors hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            <Minus className="h-4 w-4 text-estrelinha-ink" />
          </button>
          <span
            aria-live="polite"
            className="w-9 text-center font-display text-[15px] font-semibold text-estrelinha-ink"
          >
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            aria-label="Aumentar quantidade"
            className={`${TAP_44} flex h-10 w-10 items-center justify-center rounded-sm transition-colors hover:bg-white`}
          >
            <Plus className="h-4 w-4 text-estrelinha-ink" />
          </button>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-sm bg-estrelinha-primary font-display text-[15px] font-semibold text-white transition-transform hover:scale-[1.01] disabled:scale-100 disabled:opacity-50"
        >
          <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
          {canAdd ? 'Adicionar ao carrinho' : 'Indisponível'}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            isWishlisted
              ? 'border-estrelinha-primary bg-estrelinha-primary/[0.06]'
              : 'border-estrelinha-line hover:border-estrelinha-primary/50'
          }`}
        >
          <Heart
            className={`h-5 w-5 ${isWishlisted ? 'fill-estrelinha-primary text-estrelinha-primary' : 'text-estrelinha-ink-soft'}`}
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
          className="mt-4 inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-estrelinha-primary hover:underline"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          Tirar uma dúvida sobre esta joia no WhatsApp
        </a>
      )}
    </div>
  )
}

export default ProductInfo
