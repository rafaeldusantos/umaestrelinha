import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import MarqueeBar from '@/widgets/home-sections/ui/MarqueeBar'
import DropCountdown from '@/widgets/home-sections/ui/DropCountdown'
import CategoryGrid from '@/widgets/category-grid/ui/CategoryGrid'
import ProductCarousel from '@/widgets/product-carousel/ui/ProductCarousel'
import MonteSeuKit from '@/features/custom-pin/ui/MonteSeuKit'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import SocialProof from '@/widgets/home-sections/ui/SocialProof'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'
import { useFeaturedProducts, useAllProducts } from '@/entities/product/api/useProducts'

const HomePage = () => {
  const { data: featured } = useFeaturedProducts()
  const { data: allProducts } = useAllProducts()
  const trending = allProducts?.slice(0, 8) ?? []

  return (
    <div>
      {/* Hero */}
      <HeroBanner />

      {/* Marquee trust bar */}
      <MarqueeBar />

      {/* Drop countdown + Categories — side by side on desktop */}
      <section className="py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-[460px] shrink-0">
              <DropCountdown />
            </div>
            <div className="flex-1 min-w-0">
              <CategoryGrid />
            </div>
          </div>
        </div>
      </section>

      {/* Trending products */}
      <ProductCarousel
        title="Tá bombando"
        subtitle="O que saiu mais essa semana"
        products={trending}
        badgeLabel="Hot"
        linkHref="/busca"
        linkText="Ver tudo"
      />

      {/* Monte seu Kit */}
      <MonteSeuKit />

      {/* Fan picks */}
      <ProductCarousel
        title="A galera ama"
        subtitle="As mais bem avaliadas da loja"
        products={(featured ?? []).slice(0, 8)}
        linkHref="/busca"
        linkText="Ver todos"
      />

      {/* Tags + Social Proof — side by side on desktop */}
      <section className="py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              <TrendingTags />
            </div>
            <div className="w-full md:w-[480px] shrink-0">
              <SocialProof />
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterBanner />
    </div>
  )
}

export default HomePage
