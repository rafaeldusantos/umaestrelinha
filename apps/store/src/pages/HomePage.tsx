import HeroBanner from '@/widgets/hero-banner/ui/HeroBanner'
import TrustBar from '@/widgets/home-sections/ui/TrustBar'
import { HomeBannerGrid } from '@/widgets/home-banners'
import { HomeCollections, pickHomeCollections } from '@/widgets/home-collections'
import BrandStatement from '@/widgets/home-sections/ui/BrandStatement'
import TrendingTags from '@/widgets/home-sections/ui/TrendingTags'
import NewsletterBanner from '@/features/newsletter/ui/NewsletterBanner'
import { useCategories } from '@/entities/category'

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

  return (
    <div>
      <HeroBanner />

      <TrustBar />

      <HomeBannerGrid exclude={emFileira} />

      <HomeCollections interlude={<BrandStatement />} />

      <section className="bg-estrelinha-surface py-12 md:py-16">
        <div className="container">
          <TrendingTags />
        </div>
      </section>

      <NewsletterBanner />
    </div>
  )
}

export default HomePage
