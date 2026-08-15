import { useProducts } from '@/entities/product/api/useProducts'
import ProductCarousel, { type CarouselTone } from '@/widgets/product-carousel/ui/ProductCarousel'
import type { HomeCollection } from '../model/pickHomeCollections'

/** Quantas peças a fileira mostra. Com banner, o card dele ocupa a primeira das quatro vagas. */
const CARDS = 4

/**
 * Uma fileira de coleção da home — board `7CF-0`.
 *
 * Componente separado porque `useProducts(slug)` é um hook: chamá-lo dentro do `.map()` da home
 * seria uma chamada por iteração, que o React proíbe. É a mesma razão da `TrendingLane` do mega
 * menu. O React Query dá cache por slug, então a fileira e a página da categoria compartilham a
 * consulta.
 *
 * **A fileira some quando a coleção não tem produto.** Uma categoria recém-criada apareceria como
 * um título com quatro buracos embaixo — e é justamente o que a `ProductCarousel` já evita ao
 * devolver `null` com a lista vazia.
 */
const HomeCollectionRow = ({
  collection,
  tone,
}: {
  collection: HomeCollection
  tone: CarouselTone
}) => {
  const { data: products } = useProducts(collection.slug)

  const banner = collection.bannerUrl
    ? { href: collection.href, imageUrl: collection.bannerUrl, alt: collection.name }
    : undefined

  // Com banner, três produtos: o card dele ocupa a primeira vaga da linha de quatro. Cortar aqui e
  // não dentro do carrossel é o que impede a fileira de prometer quatro e desenhar três.
  const visible = (products ?? []).slice(0, banner ? CARDS - 1 : CARDS)

  return (
    <ProductCarousel
      title={collection.name}
      subtitle={collection.description ?? undefined}
      products={visible}
      linkHref={collection.href}
      linkText="Ver todos"
      tone={tone}
      banner={banner}
    />
  )
}

export default HomeCollectionRow
