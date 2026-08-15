import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import TrustBar from '@/widgets/home-sections/ui/TrustBar'
import { HomeBannerGrid, pickHomeBanners } from '@/widgets/home-banners'
import { HomeCollections, pickHomeCollections } from '@/widgets/home-collections'
import BrandStatement from '@/widgets/home-sections/ui/BrandStatement'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'
import { useCategories } from '@/entities/category'
import { DEFAULT_HOME_COMPOSITION, layoutSlots } from '@estrelinha/core/home'

/**
 * Provisório da feature 24: o conteúdo das seções já vem de `DEFAULT_HOME_COMPOSITION`, mas ainda é
 * lido daqui e não do banco. A T18 troca a página inteira por hook → resolve → render, e estas
 * constantes somem junto com o resto da composição escrita em JSX.
 */
const conteudo = (type: string) => DEFAULT_HOME_COMPOSITION.find((s) => s.type === type)!.config

/**
 * A home — board `7CF-0` ("Loja — Home (Desktop)"), que reconstruiu a página da loja em produção
 * com os tokens da Uma Estrelinha.
 *
 * A ordem é a da loja atual: hero → vantagens → banners → coleções, com a faixa institucional entre
 * a primeira coleção e as demais. As decisões que o board carrega:
 *
 * - **`TrustBar` no lugar da `MarqueeBar`.** A faixa rolante trazia quatro números **cravados no
 *   JSX** ("Pix com 5% OFF", "Parcele em 12×", "Frete grátis acima de R$150") e três já não batiam
 *   com as settings. Aqui todo valor sai da mesma fonte que o caixa cobra.
 * - **`HomeBannerGrid`** — um grande e dois empilhados, curados pelo `banner_url` da categoria.
 * - **`HomeCollections`** — as fileiras de coleção, com chão alternado e o banner da categoria
 *   abrindo a fileira quando ela tem um (a seção "Decorativos Afetivos" do board).
 * - **`BrandStatement`** — a faixa escura onde a loja para de vender e diz quem faz.
 *
 * **Nenhuma coleção é escolhida em código.** As fileiras saem de `categories`, raízes ativas na
 * ordem da `sort_order` que a dona já arrasta em `/admin/categorias` — a mesma fonte do menu e da
 * grade. Cravar quatro slugs aqui seria pôr curadoria em código, que é o que a feature 16 tirou do
 * `Header`; reordenar a home é reordenar categoria.
 *
 * **A grade de banners e as fileiras não repetem arte.** Categoria que virou fileira sai da grade
 * (`exclude`), porque conteúdo tem prioridade sobre campanha.
 *
 * Duas seções saíram na Fase 5 da feature 20 e não voltam: `DropCountdown` (contagem regressiva para
 * uma "sexta do drop" que não existe) e `SocialProof` (dois depoimentos inventados — a mesma régua
 * que tirou as avaliações de demonstração).
 */
const HomePage = () => {
  const { data: categories } = useCategories()
  // A mesma regra que a `HomeCollections` aplica, e por isso o `exclude` bate: uma segunda regra
  // aqui divergiria da primeira no dia em que uma das duas mudasse.
  const emFileira = pickHomeCollections(categories).map((c) => c.id)

  // Provisório da feature 24, junto com `conteudo`: a T18 troca isto pelo `derive` do
  // `resolveHomeSections`, que é quem passará a montar a lista das duas seções que têm uma.
  const layout = conteudo('banner_grid').layout
  const banners = pickHomeBanners(categories, {
    exclude: emFileira,
    limit: layoutSlots(layout),
  }).map((b) => ({ id: b.id, href: b.href, label: b.name, imageUrl: b.bannerUrl }))

  return (
    <div>
      <HeroBanner content={conteudo('hero')} />

      <TrustBar />

      <HomeBannerGrid banners={banners} layout={layout} />

      <HomeCollections interlude={<BrandStatement content={conteudo('brand_statement')} />} />

      <TrendingTags content={conteudo('trending_tags')} />

      <NewsletterBanner content={conteudo('newsletter')} />
    </div>
  )
}

export default HomePage
