import { Link } from 'react-router-dom'
import { DEFAULT_BANNER_LAYOUT, layoutSlots, type HomeBannerLayout } from '@estrelinha/core/home'

/**
 * A grade de banners logo abaixo da faixa de vantagens — board `7CF-0`.
 *
 * **Um grande à esquerda, dois empilhados à direita** é o arranjo `hero_pair`, que é o da loja de
 * hoje e o padrão. No celular vira uma coluna só, na mesma ordem: o grande é a chamada da vez e os
 * dois menores são as linhas de apoio, e inverter isso no mobile — onde estão ~90% dos acessos —
 * entregaria o apoio antes da chamada.
 *
 * Some inteira quando não há banner nenhum, como a `ProductCarousel` some sem produto: enquanto não
 * houver arte, a home não mostra moldura vazia.
 *
 * **A lista chega resolvida** (feature 24). A grade não escolhe mais o que mostrar: quem decide é
 * `resolveHomeSections` — a curadoria da dona quando ela escolheu a dedo, ou a derivação de sempre
 * (`pickHomeBanners`, por `categories.banner_url`) quando não. É o que faz `HOME-25` continuar
 * valendo sem a grade conhecer categoria nenhuma.
 */

/**
 * A classe de proporção de cada vaga, por arranjo.
 *
 * **A medida é de `core/home` (`layoutRatios`); o que mora aqui é a classe que a desenha.** As duas
 * precisam concordar, e `HomeBannerGrid.test.tsx` compara razão a razão — porque o Tailwind compila
 * classe estática: montar `aspect-[${w}/${h}]` a partir da medida não geraria CSS nenhum, e a vaga
 * viria com altura zero.
 */
const RATIOS: Record<HomeBannerLayout, string[]> = {
  /** 1176 × 1020 no desenho. */
  single: ['aspect-[588/510]'],
  pair: ['aspect-[588/510]', 'aspect-[588/510]'],
  /** A grade de hoje: a grande (588 × 510) e duas faixas de metade da altura, menos a calha. */
  hero_pair: ['aspect-[588/510]', 'aspect-[588/243]', 'aspect-[588/243]'],
  quad: ['aspect-[588/510]', 'aspect-[588/510]', 'aspect-[588/510]', 'aspect-[588/510]'],
}

/** O que a grade precisa de um item resolvido — `ResolvedItem` satisfaz. */
export interface HomeBannerItem {
  id: string
  href: string
  label: string
  imageUrl: string | null
}

const BannerLink = ({
  href,
  src,
  alt,
  ratio,
}: {
  href: string
  src: string
  alt: string
  ratio: string
}) => (
  /* A proporção e o chão vivem no LINK, não na imagem: é o que faz `HOME-29` valer — imagem que não
     carrega deixa um retângulo `ground-deep` do tamanho certo, e nada abaixo se desloca. */
  <Link
    to={href}
    className={`group relative block w-full overflow-hidden rounded-lg bg-estrelinha-ground-deep ${ratio}`}
  >
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  </Link>
)

interface Props {
  /** Os banners já resolvidos, na ordem em que devem aparecer. */
  banners: readonly HomeBannerItem[]
  /** O arranjo da grade. Ausente cai em `hero_pair`, que é a grade de hoje. */
  layout?: HomeBannerLayout
}

const HomeBannerGrid = ({ banners, layout }: Props) => {
  // Arranjo desconhecido (config gravado por uma versão mais nova) cai no padrão nas DUAS medidas —
  // a de `core` e a daqui —, e por isso o nome é resolvido uma vez só.
  const arranjo: HomeBannerLayout = RATIOS[layout] ? layout : DEFAULT_BANNER_LAYOUT
  const vagas = layoutSlots(arranjo)
  const ratios = RATIOS[arranjo]

  // Banner órfão não é desenhado: sem arte não há o que mostrar, e sem destino o clique cairia em
  // lugar nenhum. Quem some da vitrine por destino apagado já saiu em `resolveHomeSections`; este
  // filtro é o que impede a arte sem link de virar imagem morta.
  const visiveis = banners.filter(b => !!b.imageUrl && !!b.href).slice(0, vagas)

  if (visiveis.length === 0) return null

  const [principal, ...apoio] = visiveis

  // `hero_pair` é a única de duas colunas com pesos diferentes: a grande ocupa uma coluna inteira e
  // as outras duas empilham na outra. Os demais arranjos são uma lista de vagas iguais.
  const heroPair = arranjo === 'hero_pair'

  return (
    <section className="bg-estrelinha-surface">
      {heroPair ? (
        <div className="container flex flex-col gap-4 py-10 md:flex-row md:gap-6 md:py-20">
          <div className="md:flex-1">
            <BannerLink
              href={principal.href}
              src={principal.imageUrl!}
              alt={principal.label}
              ratio={ratios[0]}
            />
          </div>

          {apoio.length > 0 && (
            <div className="flex flex-col gap-4 md:flex-1 md:gap-6">
              {apoio.map((banner, i) => (
                <BannerLink
                  key={banner.id}
                  href={banner.href}
                  src={banner.imageUrl!}
                  alt={banner.label}
                  ratio={ratios[i + 1]}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Em 390px **todo** arranjo é uma coluna de largura cheia, na ordem da fileira (`HOME-26`):
           `quad` proporcional daria 82px por célula num contêiner de 358px, e a arte desta loja tem
           texto embutido. O mosaico só existe do `md` para cima. */
        <div
          className={`container flex flex-col gap-4 py-10 md:gap-6 md:py-20 ${
            visiveis.length > 1 ? 'md:grid md:grid-cols-2' : ''
          }`}
        >
          {visiveis.map((banner, i) => (
            <BannerLink
              key={banner.id}
              href={banner.href}
              src={banner.imageUrl!}
              alt={banner.label}
              ratio={ratios[i]}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default HomeBannerGrid
