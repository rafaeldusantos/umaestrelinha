import { Fragment, type ComponentType, type ReactNode } from 'react'
import type { HomeSection, HomeSectionType, ResolvedItem, ResolvedSection } from '@estrelinha/core/home'
import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import TrustBar from '@/widgets/home-sections/ui/TrustBar'
import BrandStatement from '@/widgets/home-sections/ui/BrandStatement'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import { HomeBannerGrid } from '@/widgets/home-banners'
import { HomeCollections } from '@/widgets/home-collections'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'
import { useResolvedHome } from '../model/useResolvedHome'

/**
 * O renderizador da Home — **a página deixa de conhecer seção nenhuma**.
 *
 * Um registro `tipo → componente` e uma caminhada pela lista resolvida. É o que torna a composição
 * um dado de verdade: acrescentar um bloco passa a ser uma linha aqui e uma linha no catálogo, não
 * uma edição na `HomePage`.
 */

interface SectionRenderProps {
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

const desenha = (resolvida: ResolvedSection, extras: Partial<SectionRenderProps> = {}) => {
  const Renderer = HOME_SECTION_RENDERERS[resolvida.section.type]
  if (!Renderer) return null
  return <Renderer section={resolvida.section} items={resolvida.items} {...extras} />
}

interface Props {
  sections: readonly HomeSection[]
}

const HomeRenderer = ({ sections }: Props) => {
  const resolvidas = useResolvedHome(sections)

  /**
   * As faixas que pendem de uma seção de fileiras, pelo id da hospedeira.
   *
   * O aninhamento é declarado pela **própria faixa** (`config.interlude_after`), e quem o resolve é
   * `resolveHomeSections`: sem uma seção de fileiras renderizada logo antes, `nestedUnder` vem
   * `null` e a faixa desenha **sozinha, no próprio lugar**. Uma Home reordenada nunca engole
   * conteúdo em silêncio.
   */
  const aninhadas = new Map<string, ResolvedSection>()
  for (const r of resolvidas) {
    if (r.renders && r.nestedUnder) aninhadas.set(r.nestedUnder.sectionId, r)
  }

  return (
    <div>
      {resolvidas.map(resolvida => {
        // Seção que não renderiza não produz NADA — nem moldura, nem espaçamento, nem título
        // (`HOME-03`). Quem precisa das que não renderizam é o painel, para dizer o motivo.
        if (!resolvida.renders) return null
        // A faixa aninhada sai dentro da hospedeira, e não no próprio lugar.
        if (resolvida.nestedUnder) return null

        const faixa = aninhadas.get(resolvida.section.id)

        // `Fragment` e não `<div>`: um invólucro por seção mudaria a árvore da página sem mudar uma
        // linha de estilo, e `HOME-04` mede o DOM renderizado.
        return (
          <Fragment key={resolvida.section.id}>
            {desenha(resolvida, {
              interlude: faixa ? desenha(faixa) : undefined,
              interludeAfter: faixa?.nestedUnder?.afterRow,
            })}
          </Fragment>
        )
      })}
    </div>
  )
}

export default HomeRenderer
