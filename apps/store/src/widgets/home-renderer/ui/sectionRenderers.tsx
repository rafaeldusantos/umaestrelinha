import type { ComponentType, ReactNode } from 'react'
import type { HomeSection, HomeSectionType, ResolvedItem } from '@estrelinha/core/home'
import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import TrustBar from '@/widgets/home-sections/ui/TrustBar'
import BrandStatement from '@/widgets/home-sections/ui/BrandStatement'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import { HomeBannerGrid } from '@/widgets/home-banners'
import { HeroCarousel } from '@/widgets/hero-carousel'
import { FeaturedProducts } from '@/widgets/featured-products'
import { HomeCollections } from '@/widgets/home-collections'
import { CollectionFeature } from '@/widgets/collection-feature'
import { CategoryList } from '@/widgets/category-list'
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
 * **Tipo sem renderer é pulado, e esse é o comportamento certo.**
 *
 * Desde a feature 64 **todo tipo do catálogo tem desenho** — `category_grid` foi o último, e ganhou a
 * Lista de categorias. O que sobra para este caminho é a linha gravada com um tipo de uma versão
 * mais nova, que não está no registro: ela **não pode derrubar a Home**, e o `HomeRenderer` a pula
 * (a página inteira sumiria por causa de um bloco). O `| null` do tipo continua sendo a porta para
 * um tipo novo entrar no catálogo antes de ganhar tela.
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
  // A coleção escolhida chega já resolvida, e **só chega quando está no ar**: coleção despublicada
  // ou apagada devolve `null` em `resolveItem`, a seção fica sem item e `resolveHomeSections` a
  // esconde com motivo (`HOME-39`). O guarda aqui é para o caso de a lista chegar vazia por outro
  // caminho — desenhar uma faixa sem destino seria um CTA para lugar nenhum.
  collection_feature: ({ section, items }) =>
    items[0] ? <CollectionFeature content={section.config} collection={items[0]} /> : null,
  // As peças escolhidas a dedo (feature 50). Sem item a seção nem chega aqui — `resolveHomeSections`
  // já a escondeu com motivo (`DST-20`) —, e o guarda existe pela mesma razão do `hero_carousel`
  // logo abaixo: desenhar um bloco sem peça seria um título com um vão embaixo.
  product_carousel: ({ section, items }) =>
    items.length ? <FeaturedProducts section={section} items={items} /> : null,
  // A fileira de círculos (feature 64). Item cuja coleção saiu do ar, ou com destino que não é
  // coleção, já foi tirado por `resolveHomeSections` → `categoryListItem`; sem nenhum, a seção nem
  // chega aqui (`LCT-11`) — o guarda é o mesmo dos vizinhos.
  category_grid: ({ section, items }) =>
    items.length ? <CategoryList section={section} items={items} /> : null,
  // Sem slide não há carrossel, e quem já decidiu isso é `resolveHomeSections` — a seção nem chega
  // aqui. O guarda existe pelo mesmo motivo do `collection_feature` logo acima: desenhar uma faixa
  // com trilho vazio seria uma vaga de altura reservada mostrando nada.
  hero_carousel: ({ section, items }) =>
    items.length ? <HeroCarousel section={section} items={items} /> : null,
}
