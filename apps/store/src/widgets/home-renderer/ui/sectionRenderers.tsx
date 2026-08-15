import type { ComponentType, ReactNode } from 'react'
import type { HomeSection, HomeSectionType, ResolvedItem } from '@estrelinha/core/home'
import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import TrustBar from '@/widgets/home-sections/ui/TrustBar'
import BrandStatement from '@/widgets/home-sections/ui/BrandStatement'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import { HomeBannerGrid } from '@/widgets/home-banners'
import { HomeCollections } from '@/widgets/home-collections'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'

/**
 * O registro `tipo → componente` da Home.
 *
 * Em arquivo próprio, e não junto do `HomeRenderer`, por uma razão de ferramenta: um módulo que
 * exporta um componente **e** uma constante quebra o fast refresh do Vite, e o lint avisa. A
 * separação também deixa o registro ser lido por quem não monta a página.
 */

export interface SectionRenderProps {
  section: HomeSection
  items: ResolvedItem[]
  /** Só as fileiras de coleção usam: a faixa institucional que pende delas. */
  interlude?: ReactNode
  interludeAfter?: number
}

/**
 * **Tipo sem renderer é `null`, e ser pulado é o comportamento certo.**
 *
 * Os dois de P3 (`product_carousel`, `category_grid`) entram no catálogo sem desenho, e o
 * `collection_feature` chega na T32. Uma linha gravada com um deles — ou com um tipo de uma versão
 * mais nova — **não pode derrubar a Home**: a página inteira sumiria por causa de um bloco.
 */
export const HOME_SECTION_RENDERERS: Record<
  HomeSectionType,
  ComponentType<SectionRenderProps> | null
> = {
  hero: ({ section }) => <HeroBanner content={section.config} />,
  trust_bar: () => <TrustBar />,
  banner_grid: ({ section, items }) => (
    <HomeBannerGrid banners={items} layout={section.config?.layout} />
  ),
  collection_rows: ({ items, interlude, interludeAfter }) => (
    <HomeCollections
      // Coleção sem slug não tem página, e `useProducts(null)` baixaria o catálogo inteiro — o
      // defeito que a feature 23 fechou. Filtrar aqui é mais barato que um guarda na fileira.
      collections={items.filter(i => !!i.slug).map(i => ({ ...i, slug: i.slug! }))}
      interlude={interlude}
      interludeAfter={interludeAfter}
    />
  ),
  brand_statement: ({ section }) => <BrandStatement content={section.config} />,
  trending_tags: ({ section }) => <TrendingTags content={section.config} />,
  newsletter: ({ section }) => <NewsletterBanner content={section.config} />,
  collection_feature: null,
  product_carousel: null,
  category_grid: null,
}
