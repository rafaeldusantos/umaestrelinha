import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import MarqueeBar from '@/widgets/home-sections/ui/MarqueeBar'
import CategoryGrid from '@/widgets/category-grid/ui/CategoryGrid'
import ProductCarousel from '@/widgets/product-carousel/ui/ProductCarousel'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'
import { useFeaturedProducts, useAllProducts } from '@/entities/product/api/useProducts'

/**
 * A home — `IDN-04` / `IDN-09`.
 *
 * O board `516-0` ("Home Loja — re-skin") está **vazio**, e o `design.md`
 * declara a home fora do redesenho: ela recebe paleta e chrome, não desenho
 * novo. O passe da Fase 5 é sobre o que **não podia ficar**, e duas seções
 * inteiras saíram por não terem re-skin possível:
 *
 * - **`DropCountdown`** — contagem regressiva para a "sexta do drop", com o
 *   título "Novos pins chegando!". "Drop" não é vocabulário desta loja (a T16
 *   já tinha recusado semear a tabela `drops` pelo mesmo motivo), e a data era
 *   calculada no próprio componente: um prazo que não existe, prometido na
 *   primeira dobra.
 * - **`SocialProof`** — dois depoimentos **inventados**, com nome e cidade
 *   inventados. É a mesma decisão que a `PIN-07` tomou para as avaliações de
 *   demonstração, e aqui ela pesa mais: um elogio fabricado a uma homenagem
 *   fúnebre não é um enfeite de vitrine.
 *
 * Com as duas fora, a grade de coleções recupera a largura inteira — ela estava
 * dividindo a linha com o contador.
 */
const HomePage = () => {
  const { data: featured } = useFeaturedProducts()
  const { data: allProducts } = useAllProducts()
  const novidades = allProducts?.slice(0, 8) ?? []

  return (
    <div>
      <HeroBanner />

      <MarqueeBar />

      <section className="py-12">
        <div className="container">
          <CategoryGrid />
        </div>
      </section>

      <ProductCarousel
        title="Novidades"
        subtitle="As últimas peças que saíram do ateliê"
        products={novidades}
        linkHref="/busca"
        linkText="Ver tudo"
      />

      <ProductCarousel
        title="Em destaque"
        subtitle="As escolhas da Adri"
        products={(featured ?? []).slice(0, 8)}
        linkHref="/busca"
        linkText="Ver todos"
      />

      <section className="py-12">
        <div className="container">
          <TrendingTags />
        </div>
      </section>

      <NewsletterBanner />
    </div>
  )
}

export default HomePage
