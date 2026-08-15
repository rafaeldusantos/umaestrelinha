import { Link } from 'react-router-dom'
import { useCategories } from '@/entities/category'
import { pickHomeBanners } from '../model/pickHomeBanners'

/**
 * A grade de banners logo abaixo da faixa de vantagens — board `7CF-0`.
 *
 * **Um grande à esquerda, dois empilhados à direita.** No celular vira uma coluna só, na mesma
 * ordem: o grande é a chamada da vez e os dois menores são as linhas de apoio, e inverter isso no
 * mobile — onde estão ~90% dos acessos — entregaria o apoio antes da chamada.
 *
 * Some inteira quando nenhuma categoria tem banner, como a `ProductCarousel` some sem produto:
 * enquanto a Adri não subir imagem em `/admin/categorias`, a home não mostra moldura vazia.
 */
const RATIOS = {
  /** 588 × 510 no board. */
  grande: 'aspect-[588/510]',
  /** 588 × 243 no board — metade da altura do grande, menos a calha. */
  faixa: 'aspect-[588/243]',
} as const

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
  /** IDs que já aparecem como fileira de coleção — não repetem banner aqui. */
  exclude?: readonly string[]
}

const HomeBannerGrid = ({ exclude }: Props) => {
  const { data: categories } = useCategories()
  const banners = pickHomeBanners(categories, { exclude })

  if (banners.length === 0) return null

  const [principal, ...apoio] = banners

  return (
    <section className="bg-estrelinha-surface">
      <div className="container flex flex-col gap-4 py-10 md:flex-row md:gap-6 md:py-20">
        <div className="md:flex-1">
          <BannerLink
            href={principal.href}
            src={principal.bannerUrl}
            alt={principal.name}
            ratio={RATIOS.grande}
          />
        </div>

        {apoio.length > 0 && (
          <div className="flex flex-col gap-4 md:flex-1 md:gap-6">
            {apoio.map((banner) => (
              <BannerLink
                key={banner.id}
                href={banner.href}
                src={banner.bannerUrl}
                alt={banner.name}
                ratio={RATIOS.faixa}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeBannerGrid
