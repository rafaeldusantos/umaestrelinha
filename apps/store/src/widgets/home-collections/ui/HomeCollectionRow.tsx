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
 *
 * **Mas some só depois de RESPONDER** (`PRF-17`). Até a feature 40 os dois estados desenhavam
 * `null`: a coleção vazia e a coleção que ainda não voltou. As quatro fileiras da home nasciam com
 * altura zero e estouravam para ~600px cada quando os produtos chegavam — o rodapé, que ficava
 * visível enquanto a página era curta, era empurrado para baixo, e o Lighthouse de 2026-09-06 mediu
 * **CLS 0,244 num deslocamento só**, o total inteiro da página. Passar `loading` é o que separa
 * "não tem" de "ainda não sei".
 *
 * `skeletonCount` é `vagas`, não `CARDS`: com banner a fileira tem três vagas de produto, e quatro
 * esqueletos ao lado do banner reservariam uma linha maior que a que vai aparecer.
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

  const { data: products, isLoading } = useProducts(collection.slug, { limit: vagas })

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
      loading={isLoading}
      skeletonCount={vagas}
    />
  )
}

export default HomeCollectionRow
