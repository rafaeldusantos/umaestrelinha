import { useState } from 'react'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import { useParams, Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, Heart } from 'lucide-react'
import type { Category, Product } from '@estrelinha/supabase/types'
import { legacyRedirectTo, productPath } from '@estrelinha/core/routes'
import { categoryHref } from '@estrelinha/core/menu'
import { useCanonical } from '@/shared/lib/useCanonical'
import NotFound from '@/pages/NotFound'
import { useProduct } from '@/entities/product/api/useProduct'
import { useProductFaqs } from '@/entities/product/api/useProductFaqs'
import { useProducts } from '@/entities/product/api/useProducts'
import { useCategories } from '@/entities/category/api/useCategories'
import { displayCategory } from '@/entities/product/lib/displayCategory'
import { findVariantByPublicId } from '@/entities/product/lib/variantSelection'
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
interface ProductPageProps {
  /**
   * Rota legada `/produto/:slug` (singular): navega para o destino de `LEGACY_REDIRECTS` em vez de
   * renderizar. Espelho do 301 do edge para `pnpm dev` e para o vitest — o singular **nunca foi
   * canônico**, nem na loja em produção, que já respondia 301 para o plural.
   */
  legacy?: boolean
}

/** Quantas peças a faixa de relacionados desenha. É também o teto da consulta, mais um. */
const RELATED_CARDS = 4

const ProductPage = ({ legacy = false }: ProductPageProps) => {
  const { slug } = useParams<{ slug: string }>()
  const { pathname } = useLocation()
  const { data: product, isFetching } = useProduct(slug || '')
  // PMD-06 AC 3: o seletor vive no `ProductInfo` e a galeria é irmã dele — o estado da linha
  // escolhida precisa estar no pai comum para a imagem em destaque acompanhar a escolha.
  const [variantImage, setVariantImage] = useState<string | null>(null)

  // PST-06 AC 3: breadcrumb usa a MESMA categoria de exibição que o selo do card — menor
  // `sort_order`, desempate por `position`. Com N:N, `category_slug` guardava só uma das N.
  const { data: categories } = useCategories()
  const category = product ? displayCategory(product, categories) : null
  /*
   * Os relacionados (`PRF-09`): quatro cards, e a consulta pede **cinco**.
   *
   * O quinto é a folga para o próprio produto, que é filtrado logo abaixo — pedir quatro devolveria
   * três sempre que a peça aberta estivesse entre os quatro primeiros da categoria. Antes daqui a
   * chamada era a mesma da página da categoria e rebaixava a árvore inteira: 505 produtos para
   * desenhar quatro.
   */
  const { data: categoryProducts } = useProducts(category?.slug, { limit: RELATED_CARDS + 1 })

  // `URL-01`: a canônica do produto é `/produtos/<slug>` — o formato que a loja em produção publica
  // e que o Google indexou. Sai do `<head>` quando a página desmonta.
  useCanonical(product ? productPath(product.slug) : null)

  if (legacy) return <Navigate to={legacyRedirectTo(pathname) ?? '/'} replace />

  // PST-07: a URL antiga chega aqui, `useProduct` resolve por `product_redirects`, e o slug que
  // volta é o ATUAL. Trocar a URL preserva o link que a cliente salvou e evita que a página fique
  // sob um endereço que já não é o do produto. `replace` para o botão "voltar" não reentrar na
  // URL morta. Sem redirect os dois slugs coincidem — nunca há um segundo salto.
  if (product && slug && product.slug !== slug) {
    return <Navigate to={productPath(product.slug)} replace />
  }

  if (!product) {
    // Enquanto a consulta corre, `data` é `undefined`: mostrar "não encontrado" aqui piscaria o 404
    // em toda abertura de página, inclusive na do produto que existe.
    if (isFetching) return <div className="container py-20" aria-busy="true" />
    // `URL-04`: a 404 é a **própria** da loja. Dois blocos avulsos com textos diferentes para a
    // mesma situação era a divergência que esta feature existe para fechar.
    return <NotFound />
  }

  return (
    <ProductPageBody
      key={product.id}
      product={product}
      category={category}
      categories={categories ?? []}
      related={(categoryProducts ?? []).filter(p => p.id !== product.id).slice(0, RELATED_CARDS)}
      variantImage={variantImage}
      onVariantImage={setVariantImage}
    />
  )
}

interface BodyProps {
  product: Product
  category: Category | null
  /** A árvore: a canônica da categoria depende do pai, que só sai dela (`AD-018`). */
  categories: readonly Category[]
  related: Product[]
  variantImage: string | null
  onVariantImage: (url: string | null) => void
}

/**
 * O corpo da página, separado só para poder chamar hooks depois das guardas de 404/redirect —
 * `useProductPurchase` precisa do produto carregado, e hook não pode viver atrás de um `return`.
 *
 * O `key={product.id}` no chamador é o que reseta quantidade e variação ao trocar de produto: sem
 * ele, navegar de uma joia para outra carregaria a quantidade 3 escolhida na anterior.
 */
const ProductPageBody = ({
  product,
  category,
  categories,
  related,
  variantImage,
  onVariantImage,
}: BodyProps) => {
  /**
   * `GSH-10` — a variação anunciada na Google Shopping.
   *
   * O `?variant=` do link do feed carrega o **mesmo número** que o `<g:id>` da oferta. Ignorá-lo faz
   * a cliente clicar num preço no anúncio e chegar noutro na página; do lado do Google, faz o
   * Merchant Center medir a landing page contra o feed e reprovar o item por incompatibilidade.
   *
   * Lido uma vez, na montagem: é semente, não estado sincronizado. Trocar de eixo depois disso é
   * escolha da cliente e não tem por que mexer na URL.
   */
  const [searchParams] = useSearchParams()
  const [variantFromUrl] = useState(() =>
    findVariantByPublicId(product, searchParams.get('variant')),
  )

  const purchase = useProductPurchase(
    product,
    v => onVariantImage(v?.image_url ?? null),
    variantFromUrl,
  )
  /**
   * `FAQ-01`/`FAQ-09` — as perguntas do produto, lidas AQUI e passadas por prop.
   *
   * O hook não mora dentro do `ProductDetailsAccordion` de propósito: um `useQuery` num componente
   * que outras telas montam obrigaria todas elas a ter `QueryClientProvider` — foi o que derrubou 17
   * testes da confirmação de pedido na feature 22.
   */
  const { data: faqs } = useProductFaqs(product.id)
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
        <Link to="/" className={`${TAP_ROW} transition-colors hover:text-estrelinha-ink`}>Início</Link>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        {category && (
          <>
            <Link to={categoryHref(categories, category.id)} className={`${TAP_ROW} transition-colors hover:text-estrelinha-ink`}>
              {category.name}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
          </>
        )}
        <span className="font-medium text-estrelinha-ink">{product.name}</span>
      </nav>

      {/*
        `grid-cols-[minmax(0,1fr)]` também no MOBILE, e não só a partir de `md`.

        Sem ele a coluna implícita é `auto`, cujo mínimo automático é o min-content do item — e o
        item é a galeria, cuja fita de miniaturas soma a largura de todas as fotos. Medido em
        2026-08-15, num iPhone de 390px: a trilha do grid media 358px e o item, **614**. O `body`
        inteiro rolava na horizontal (`scrollWidth` 634), em TODA página de produto, numa loja em que
        ~90% dos acessos vêm de celular — o primeiro item da lista de "o que quebra primeiro no
        mobile" do `CLAUDE.md`.

        O `minmax(0, …)` é o que permite a trilha encolher abaixo do min-content, e daí o
        `overflow-x-auto` da fita finalmente rolar dentro do próprio container em vez de empurrar a
        página. É o mesmo recurso que o `md:` abaixo já usava — faltava no tamanho que importa.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,600px)_minmax(0,1fr)] md:items-start md:gap-8">
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

      {/* Mesma trilha da grade de cima, pelo mesmo motivo: aqui mora a descrição, que é HTML de
          origem externa e pode trazer um `<li>` longo sem espaço. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pt-8 md:grid-cols-[minmax(0,600px)_minmax(0,1fr)] md:items-start md:gap-8 md:pt-10">
        <ShippingCalc product={product} />
        <ProductDetailsAccordion product={product} faqs={faqs ?? []} />
      </div>

      <RelatedProducts products={related} category={category} categories={categories} />

      {/* A folga do rodapé fixo é do `StoreLayout`, depois do `Footer` — que é o fim real do
          documento. Um espaçador aqui reservaria espaço antes do rodapé, não depois dele. */}
      <ProductBuyBar product={product} purchase={purchase} />
    </div>
  )
}

export default ProductPage
