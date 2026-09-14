import { featuredDisplay, type HomeSection, type ResolvedItem } from '@estrelinha/core/home'
import { useProductsByIds } from '@/entities/product/api/useProductsByIds'
import ProductCarousel from '@/widgets/product-carousel/ui/ProductCarousel'

/**
 * O bloco **Produtos em destaque** (feature 50).
 *
 * É a única seção da Home que fala de **peça**, e não de coleção: a dona escolhe estas doze, nesta
 * ordem, e diz se elas saem em fita ou em grade. Tudo o que este arquivo faz é ler a curadoria,
 * buscar os produtos e delegar — o desenho é do `ProductCarousel`, que já é o dono das vagas e do
 * esqueleto.
 *
 * **A ordem é a da DONA, nunca a da resposta** (`DST-22`). `.in()` não garante ordem e o PostgREST
 * não expõe `array_position`: quem devolve a lista na ordem certa é este `map` sobre os ids, e ele é
 * a diferença entre a vitrine que ela montou e uma lista arbitrária que muda de posição a cada
 * recarga.
 *
 * **Consulta em erro devolve `null`** (`DST-17`): o bloco some, a Home fica. Um bloco que derrubasse
 * a página seria uma seção de campanha custando o catálogo inteiro.
 */

interface Props {
  section: HomeSection
  items: ResolvedItem[]
}

const FeaturedProducts = ({ section, items }: Props) => {
  /*
   * Item órfão não pede produto nenhum. O `on delete set null` da FK produz esse estado quando a
   * peça é apagada do catálogo — a loja **pula**, e quem nomeia o que se perdeu é o painel, pelo
   * `label_snapshot`.
   */
  const ids = items.map(i => i.productId).filter((id): id is string => !!id)

  const { data, isLoading, isError } = useProductsByIds(ids)

  if (isError) return null

  const porId = new Map((data ?? []).map(p => [p.id, p]))
  const escolhidos = ids.map(id => porId.get(id)).filter(p => !!p)

  return (
    <ProductCarousel
      title={section.config?.title ?? ''}
      subtitle={section.config?.subtitle}
      products={escolhidos}
      layout={featuredDisplay(section.config?.display)}
      loading={isLoading}
      /*
       * As vagas reservadas são **quantas ela escolheu**, não um número fixo — `PRF-17`. Reservar
       * quatro para desenhar doze devolveria o deslocamento que a feature 40 mediu, e reservar doze
       * para desenhar três abriria um buraco.
       */
      skeletonCount={ids.length}
    />
  )
}

export default FeaturedProducts
