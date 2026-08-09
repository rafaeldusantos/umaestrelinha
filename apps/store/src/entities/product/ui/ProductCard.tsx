import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Plus } from 'lucide-react'
import type { Product } from '@estrelinha/supabase/types'
import { useCategories } from '@/entities/category/api/useCategories'
import { formatPrice } from '@estrelinha/core/formatters'
import { productPath } from '@estrelinha/core/routes'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { variantLabel } from '@estrelinha/core/pricing'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import { Skeleton } from '@estrelinha/ui/skeleton'
import { useIsMobile } from '@estrelinha/ui/hooks/use-mobile'
import { toast } from 'sonner'
import {
  CARD_MAX_AXES,
  canAddSelection,
  findVariant,
  hasSellableGrid,
  initialSelection,
  needsProductPage,
} from '../lib/variantSelection'
import { displayCategory } from '../lib/displayCategory'
import QuickAddDrawer from './QuickAddDrawer'
import VariantSheet from './VariantSheet'

/**
 * Selo do card.
 *
 * Só o desconto ganha geleia — é a informação que muda a decisão de compra.
 * Todo o resto é tinta, para a listagem não virar um mostruário de etiquetas
 * coloridas competindo entre si (era o problema da versão anterior).
 */
const CardBadge = ({ tone, children }: { tone: 'jam' | 'ink'; children: React.ReactNode }) => (
  <span
    className={`estrelinha-eyebrow absolute left-3.5 top-3.5 z-10 rounded-pill px-2.5 py-1 text-[11px] font-bold text-white ${
      tone === 'jam' ? 'bg-estrelinha-primary' : 'bg-estrelinha-ink'
    }`}
  >
    {children}
  </span>
)

const ProductCard = ({ product }: { product: Product }) => {
  const addItem = useCartStore((s) => s.addItem)
  const toggleWishlist = useWishlistStore((s) => s.toggleItem)
  const isWishlisted = useWishlistStore((s) => s.hasItem(product.id))
  const navigate = useNavigate()
  // Uma escolha, duas superfícies: drawer sobre a imagem no desktop, bottom sheet no mobile.
  // O sheet do Radix portala para o body, então não dá para alternar só com `md:hidden`.
  const isMobile = useIsMobile()
  const [showVariants, setShowVariants] = useState(false)
  // PST-05: a escolha é um mapa de eixo → valor, não mais duas strings fixas. Começa na primeira
  // combinação disponível, para o "+" não abrir num tamanho esgotado.
  const [selected, setSelected] = useState(() => initialSelection(product, CARD_MAX_AXES))
  const [imgLoaded, setImgLoaded] = useState(false)
  const { data: categories } = useCategories()

  // PST-10: variação ativa com `options` vazio é grade meio-cadastrada — o produto vale como
  // simples, precificado por `base_price` e com saldo em `stock_total`.
  const sellableGrid = hasSellableGrid(product)
  // PST-08 / AC 6-7: com `stock_policy` diferente de `track` a loja nunca marca esgotado. Com
  // grade, o saldo que vale é o da linha, não o `stock_total` do produto.
  const isOutOfStock = sellableGrid
    ? !product.variants.some((v) => v.is_active && v.price !== null)
    : product.stock_policy === 'track' && product.stock_total === 0
  const isLowStock =
    !sellableGrid &&
    product.stock_policy === 'track' &&
    product.stock_total > 0 &&
    product.stock_total <= product.low_stock_threshold
  const hasDiscount = product.compare_price && product.compare_price > product.price

  // PST-06 AC 3: o selo é a categoria de menor `sort_order` entre as do produto, com desempate por
  // `position` do vínculo. `category_slug` (a coluna legada) guardava só uma das N.
  const category = displayCategory(product, categories)

  // A7: o card mostra no máximo 2 eixos. Com 3 não há como fechar a escolha aqui sem escolher o
  // terceiro pelo cliente — então o "+" leva para a página do produto (PST-05 AC 2).
  const goToPage = sellableGrid && needsProductPage(product.options)

  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.compare_price!) * 100)
    : 0

  // O CTA do drawer/sheet mostra o preço da LINHA escolhida, não o `price` da vitrine — é o valor
  // que vai ser cobrado, e é ele que muda quando o cliente troca de tamanho.
  const selectedVariant = sellableGrid ? findVariant(product.variants, selected) : null
  const selectedPrice = selectedVariant?.price ?? product.price

  const addSelectionToCart = () => {
    if (sellableGrid) {
      if (!selectedVariant || !canAddSelection(product, selected)) {
        toast.error('Essa combinação está indisponível. Escolha outra.')
        return
      }
      addItem(product, '', '', {
        variantId: selectedVariant.id,
        variantLabel: variantLabel(product.options, selectedVariant.option_values),
        optionValues: selectedVariant.option_values,
        unitPrice: selectedVariant.price!,
      })
    } else {
      addItem(product)
    }
    setShowVariants(false)
    notifyAdded()
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return

    if (goToPage) {
      navigate(productPath(product.slug))
      return
    }

    // Com grade vendável o "+" não adiciona: ele ABRE a escolha (drawer no desktop, sheet no
    // mobile). Sem grade, adiciona direto — não há o que escolher.
    if (sellableGrid) {
      setShowVariants(true)
      return
    }
    addSelectionToCart()
  }

  const notifyAdded = () =>
    toast.custom(() => (
      <div className="flex items-center gap-3 rounded-md border border-estrelinha-line bg-white p-3 shadow-estrelinha-soft">
        <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded-sm object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-estrelinha-ink">{product.name}</p>
          <p className="text-xs text-estrelinha-ink-soft">Adicionado ao carrinho</p>
        </div>
        <button
          type="button"
          onClick={() => useCartUiStore.getState().openCart()}
          className="whitespace-nowrap text-xs font-semibold text-estrelinha-primary hover:underline"
        >
          Ver carrinho
        </button>
      </div>
    ))

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
      className="group cursor-pointer"
    >
      <Link to={productPath(product.slug)} className="block">
        {/* Palco do produto: quadrado em pó de açúcar. A foto é a única cor. */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-estrelinha-ground-deep">
          {!imgLoaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}
          <img
            src={product.image_url}
            alt={product.name}
            className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.04] ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />

          {hasDiscount ? (
            <CardBadge tone="jam">-{discountPercent}%</CardBadge>
          ) : product.is_new ? (
            <CardBadge tone="ink">Novo</CardBadge>
          ) : isLowStock ? (
            <CardBadge tone="ink">Últimas</CardBadge>
          ) : product.is_featured ? (
            <CardBadge tone="ink">Destaque</CardBadge>
          ) : null}

          <button
            onClick={handleWishlist}
            className={`${TAP_44} absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white transition-transform hover:scale-110`}
            aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isWishlisted ? 'fill-estrelinha-primary text-estrelinha-primary' : 'text-estrelinha-ink'
              }`}
              strokeWidth={1.8}
            />
          </button>

          {!isOutOfStock && (
            <button
              onClick={handleAddToCart}
              className={`${TAP_44} absolute bottom-3.5 right-3.5 z-10 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-estrelinha-ink transition-transform hover:scale-110 active:scale-95`}
              aria-label="Adicionar ao carrinho"
            >
              <Plus className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </button>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <span className="estrelinha-eyebrow rounded-pill bg-estrelinha-ink px-3 py-1.5 text-[11px] text-white">
                Esgotado
              </span>
            </div>
          )}

          {showVariants && !isMobile && (
            <QuickAddDrawer
              product={product}
              selected={selected}
              onChange={setSelected}
              onConfirm={addSelectionToCart}
              onDismiss={() => setShowVariants(false)}
              price={selectedPrice}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-[5px]">
          {category && <p className="estrelinha-eyebrow text-estrelinha-ink-soft">{category.name}</p>}
          <h3 className="line-clamp-1 font-display text-[18px] font-medium leading-[1.39] text-estrelinha-ink transition-colors group-hover:text-estrelinha-primary">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[20px] font-semibold leading-[1.2] text-estrelinha-primary">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[14px] font-medium text-estrelinha-ink-soft line-through">
                {formatPrice(product.compare_price!)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {isMobile && (
        <VariantSheet
          product={product}
          categoryName={category?.name}
          open={showVariants}
          onOpenChange={setShowVariants}
          selected={selected}
          onChange={setSelected}
          onConfirm={addSelectionToCart}
          price={selectedPrice}
        />
      )}
    </motion.div>
  )
}

export default ProductCard
