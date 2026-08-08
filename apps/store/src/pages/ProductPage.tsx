import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Heart } from 'lucide-react'
import type { Category, Product } from '@estrelinha/supabase/types'
import { useProduct } from '@/entities/product/api/useProduct'
import { useProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { displayCategory } from '@/entities/product/lib/displayCategory'
import { useProductPurchase } from '@/entities/product/model/useProductPurchase'
import ProductGallery from '@/entities/product/ui/ProductGallery'
import ProductInfo from '@/entities/product/ui/ProductInfo'
import ProductDetailsAccordion from '@/entities/product/ui/ProductDetailsAccordion'
import { useWishlistStore } from '@/entities/wishlist/model/wishlistStore'
import ShippingCalc from '@/features/shipping-calc/ui/ShippingCalc'
import RelatedProducts from '@/widgets/related-products/ui/RelatedProducts'
import { ProductBuyBar } from '@/widgets/product-buy-bar'

/**
 * Página do produto — boards "Desktop Product Detail - v3" e "Mobile Product Detail - v3".
 *
 * Desktop: galeria e informação lado a lado, depois uma faixa com o cálculo de frete à esquerda e o
 * acordeão à direita, e então avaliações e relacionados. Mobile: tudo empilhado na ordem do board,
 * com o **CTA na barra fixa** do rodapé — a coluna de informação esconde o dela abaixo de `md`.
 *
 * O estado de compra é montado aqui, uma vez, e desce para as duas superfícies (`ProductInfo` e
 * `ProductBuyBar`): duas cópias dariam duas quantidades e dois preços na mesma tela.
 */
const ProductPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isFetching } = useProduct(slug || '')
  // PMD-06 AC 3: o seletor vive no `ProductInfo` e a galeria é irmã dele — o estado da linha
  // escolhida precisa estar no pai comum para a imagem em destaque acompanhar a escolha.
  const [variantImage, setVariantImage] = useState<string | null>(null)

  // PST-06 AC 3: breadcrumb usa a MESMA categoria de exibição que o selo do card — menor
  // `sort_order`, desempate por `position`. Com N:N, `category_slug` guardava só uma das N.
  const { data: categories } = useCategories()
  const category = product ? displayCategory(product, categories) : null
  const { data: categoryProducts } = useProducts(category?.slug)

  // PST-07: a URL antiga chega aqui, `useProduct` resolve por `product_redirects`, e o slug que
  // volta é o ATUAL. Trocar a URL preserva o link que a cliente salvou e evita que a página fique
  // sob um endereço que já não é o do produto. `replace` para o botão "voltar" não reentrar na
  // URL morta. Sem redirect os dois slugs coincidem — nunca há um segundo salto.
  if (product && slug && product.slug !== slug) {
    return <Navigate to={`/produto/${product.slug}`} replace />
  }

  if (!product) {
    // Enquanto a consulta corre, `data` é `undefined`: mostrar "não encontrado" aqui piscaria o 404
    // em toda abertura de página, inclusive na do produto que existe.
    if (isFetching) return <div className="container py-20" aria-busy="true" />
    return (
      <div className="container py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-estrelinha-ink">Produto não encontrado</h1>
        <Link to="/" className="text-estrelinha-primary hover:underline mt-4 inline-block">Voltar ao início</Link>
      </div>
    )
  }

  return (
    <ProductPageBody
      key={product.id}
      product={product}
      category={category}
      related={(categoryProducts ?? []).filter(p => p.id !== product.id).slice(0, 4)}
      variantImage={variantImage}
      onVariantImage={setVariantImage}
    />
  )
}

interface BodyProps {
  product: Product
  category: Category | null
  related: Product[]
  variantImage: string | null
  onVariantImage: (url: string | null) => void
}

/**
 * O corpo da página, separado só para poder chamar hooks depois das guardas de 404/redirect —
 * `useProductPurchase` precisa do produto carregado, e hook não pode viver atrás de um `return`.
 *
 * O `key={product.id}` no chamador é o que reseta quantidade e variação ao trocar de produto: sem
 * ele, navegar de um botton para outro carregaria a quantidade 3 escolhida no anterior.
 */
const ProductPageBody = ({
  product,
  category,
  related,
  variantImage,
  onVariantImage,
}: BodyProps) => {
  const purchase = useProductPurchase(product, v => onVariantImage(v?.image_url ?? null))
  const toggleWishlist = useWishlistStore(s => s.toggleItem)
  const isWishlisted = useWishlistStore(s => s.hasItem(product.id))

  const galleryBadges = (
    <>
      {purchase.savings && (
        <span className="rounded-pill bg-estrelinha-primary px-2.5 py-1 text-[11px] font-bold leading-3 text-white">
          -{purchase.savings.percent}%
        </span>
      )}
      {product.is_new && (
        <span className="rounded-pill bg-estrelinha-ink px-2.5 py-1 text-[11px] font-bold leading-3 text-white">
          Novo
        </span>
      )}
    </>
  )

  return (
    <div className="container flex flex-col pb-16">
      <nav
        aria-label="Você está em"
        className="flex flex-wrap items-center gap-1 py-4 text-[13px] text-estrelinha-ink-soft md:py-5"
      >
        <Link to="/" className="transition-colors hover:text-estrelinha-ink">Início</Link>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        {category && (
          <>
            <Link to={`/colecao/${category.slug}`} className="transition-colors hover:text-estrelinha-ink">
              {category.name}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          </>
        )}
        <span className="font-medium text-estrelinha-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-[minmax(0,600px)_minmax(0,1fr)] md:items-start md:gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ProductGallery
            images={product.images}
            name={product.name}
            focusUrl={variantImage}
            badges={galleryBadges}
            action={
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={isWishlisted ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                /* 44px: o board desenha 32, que fica abaixo do alvo de toque mínimo. */
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 backdrop-blur"
              >
                <Heart
                  className={`h-4 w-4 ${isWishlisted ? 'fill-estrelinha-primary text-estrelinha-primary' : 'text-estrelinha-ink-soft'}`}
                  strokeWidth={1.8}
                />
              </button>
            }
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <ProductInfo
            product={product}
            categoryName={category?.name}
            purchase={purchase}
          />
        </motion.div>
      </div>

      <div className="grid gap-6 pt-8 md:grid-cols-[minmax(0,600px)_minmax(0,1fr)] md:items-start md:gap-8 md:pt-10">
        <ShippingCalc product={product} />
        <ProductDetailsAccordion product={product} />
      </div>

      <RelatedProducts products={related} categorySlug={category?.slug} />

      {/* A folga do rodapé fixo é do `StoreLayout`, depois do `Footer` — que é o fim real do
          documento. Um espaçador aqui reservaria espaço antes do rodapé, não depois dele. */}
      <ProductBuyBar product={product} purchase={purchase} />
    </div>
  )
}

export default ProductPage
