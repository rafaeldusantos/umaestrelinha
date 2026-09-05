import { useProducts } from '@/entities/product/api/useProducts'
import ProductCarousel, { type CarouselTone } from '@/widgets/product-carousel/ui/ProductCarousel'
import type { HomeCollection } from '@estrelinha/core/home'

/** Quantas peças a fileira mostra. Com banner, o card dele ocupa a primeira das quatro vagas. */
const CARDS = 4

/**
 * Uma fileira de coleção da home — board `7CF-0`.
 *
 * Componente separado porque `useProducts(slug)` é um hook: chamá-lo dentro do `.map()` da home
 * seria uma chamada por iteração, que o React proíbe. É a mesma razão da `TrendingLane` do mega
 * menu.
 *
 * **A fileira pede ao SERVIDOR só o que desenha (`PRF-09`).** Antes ela reusava a consulta da página
 * da categoria — mesma chave de React Query, cache compartilhado — e o preço disso era a home
 * baixando a árvore inteira de cada coleção: `joias-afetivas` trazia 505 produtos e 1,10 MB
 * comprimidos para mostrar **quatro** cards, e a home fazia isso quatro vezes. Com o teto na
 * consulta, a chave passa a carregar o limite e as duas telas deixam de compartilhar o cache — que é
 * exatamente o que se quer: a categoria continua recebendo a lista inteira, porque é ela que filtra
 * e ordena no cliente (`LST-*`).
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
  const banner = collection.bannerUrl
    ? { href: collection.href, imageUrl: collection.bannerUrl, alt: collection.name }
    : undefined

  // Com banner, três produtos: o card dele ocupa a primeira vaga da linha de quatro. O mesmo número
  // vira o teto da consulta — pedir quatro e desenhar três seria baixar um card de graça.
  const vagas = banner ? CARDS - 1 : CARDS

  const { data: products } = useProducts(collection.slug, { limit: vagas })

  // O `.slice` continua como rede de segurança: o teto é do servidor, e um cache antigo (ou um
  // PostgREST que ignore o limite) não pode fazer a fileira desenhar cinco.
  const visible = (products ?? []).slice(0, vagas)

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
