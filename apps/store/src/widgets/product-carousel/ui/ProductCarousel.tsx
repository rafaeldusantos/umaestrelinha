import { useRef } from 'react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/entities/product/ui/ProductCard'
import ProductCardSkeleton from '@/entities/product/ui/ProductCardSkeleton'
import SectionHeading from '@/shared/ui/SectionHeading'
import type { Product } from '@estrelinha/supabase/types'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'

/**
 * O chão da seção — board `7CF-0`.
 *
 * A home alterna Papel e branco de uma seção para a outra, e é a alternância que dá ritmo a uma
 * página longa de coleções. `ground-deep` mede 1,12:1 sobre `ground`: pouco de propósito, é o mínimo
 * que separa duas superfícies claras sem virar faixa colorida.
 */
const TONES = {
  ground: 'bg-estrelinha-ground',
  surface: 'bg-estrelinha-surface',
  'ground-deep': 'bg-estrelinha-ground-deep',
} as const

export type CarouselTone = keyof typeof TONES

interface Props {
  title: string
  products: Product[]
  subtitle?: string
  badgeLabel?: string
  linkHref?: string
  linkText?: string
  tone?: CarouselTone
  /**
   * O card de banner que abre a fileira — board `7CF-0`, seção "Decorativos Afetivos".
   *
   * Ocupa a **primeira** vaga da linha e o `md:grid-cols-4` continua valendo, então a fileira mostra
   * três produtos em vez de quatro. Quem corta para três é a `HomeCollectionRow`, não este widget:
   * cortar aqui esconderia um produto que quem chamou achou que estava mostrando.
   */
  banner?: { href: string; imageUrl: string; alt: string }
  /**
   * A consulta ainda não respondeu — `PRF-17`.
   *
   * **Sem isto a fileira nascia com altura zero.** `products` chega `undefined` enquanto carrega, o
   * `products.length === 0` abaixo devolvia `null`, e as quatro fileiras da home não desenhavam
   * nada — até os produtos chegarem e cada uma estourar para ~600px de uma vez.
   *
   * O preço, medido no Lighthouse de 2026-09-06: o rodapé, que ficava visível enquanto a página era
   * curta, era empurrado para baixo — **CLS 0,244, o total inteiro da página**, num único
   * deslocamento. A distância que ele percorria é o que dominava o cálculo.
   *
   * `isLoading`, **nunca** `isPending`: com o interruptor de `URL-04` desligado a consulta fica
   * pendente para sempre, e o esqueleto pulsaria embaixo de uma 404. É a mesma lição que a
   * `CategoryPage` já tinha aprendido.
   */
  loading?: boolean
  /** Quantos esqueletos desenhar enquanto carrega. Deve ser o número de vagas da fileira. */
  skeletonCount?: number
}

const ProductCarousel = ({
  title,
  products,
  subtitle,
  badgeLabel,
  linkHref,
  linkText,
  tone = 'ground',
  banner,
  loading = false,
  skeletonCount = 4,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = dir === 'left' ? -280 : 280
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  /*
   * **Vazio RESOLVIDO some; vazio CARREGANDO reserva a altura** — `PRF-17`.
   *
   * A guarda de saída continua valendo para a coleção que respondeu sem produto: uma categoria
   * recém-criada apareceria como um título com quatro buracos embaixo, e sumir é o certo. O que
   * mudou é que "ainda não sei" deixou de ser tratado como "não tem" — os dois desenhavam `null`, e
   * era isso que fazia a home saltar.
   */
  if (products.length === 0 && !loading) return null

  return (
    <section className={`py-12 md:py-20 ${TONES[tone]}`}>
      <div className="container">
        <SectionHeading
          className="mb-6"
          title={title}
          subtitle={subtitle}
          badge={badgeLabel}
          action={
            <div className="flex shrink-0 items-center gap-3 pb-1">
              {linkHref && linkText && (
                <Link
                  to={linkHref}
                  className="hidden text-[15px] font-semibold text-estrelinha-primary transition-opacity hover:opacity-70 md:inline"
                >
                  {linkText}
                </Link>
              )}
              {/* Par assimétrico: "voltar" é contorno, "avançar" é sólido. */}
              <button
                onClick={() => scroll('left')}
                className={`${TAP_44} flex h-10 w-10 items-center justify-center rounded-full border border-estrelinha-line transition-colors hover:bg-estrelinha-ground-deep`}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-estrelinha-ink" strokeWidth={2.2} />
              </button>
              <button
                onClick={() => scroll('right')}
                className={`${TAP_44} flex h-10 w-10 items-center justify-center rounded-full bg-estrelinha-ink transition-transform hover:scale-105`}
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4 text-white" strokeWidth={2.2} />
              </button>
            </div>
          }
        />
        <div
          ref={scrollRef}
          aria-busy={loading}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible"
          style={{ scrollbarWidth: 'none' }}
        >
          {banner && (
            <Link
              to={banner.href}
              className="group min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-lg bg-estrelinha-ground-deep md:min-w-0 md:max-w-none"
            >
              {/* A vaga mede 220px no celular e um quarto da linha a partir do `md`. Banner de
                  campanha em host externo volta inalterado e sem `srcset` — reescrever a URL de
                  terceiro seria inventar um endpoint que não existe. */}
              <img
                src={renditionUrl(banner.imageUrl, 480)}
                srcSet={renditionSrcSet(banner.imageUrl) || undefined}
                sizes="(min-width: 768px) 25vw, 220px"
                alt={banner.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
          )}
          {/* O índice conta o BANNER: com ele a fileira começa na segunda vaga, e passar `i`
              cru faria o segundo card se achar o primeiro da tela (`PRF-03`). */}
          {products.map((product, i) => (
            <div
              key={product.id}
              className="min-w-[220px] max-w-[220px] snap-start md:min-w-0 md:max-w-none"
            >
              <ProductCard product={product} index={banner ? i + 1 : i} />
            </div>
          ))}
          {/*
            As vagas reservadas. Mesma classe de vaga dos cards — é ela que faz o esqueleto ocupar
            exatamente a largura que o produto vai ocupar, na fita do celular e na grade do `md`.
            Quem anuncia o carregamento é o `aria-busy` da grade, então cada esqueleto é
            `aria-hidden` por dentro.
          */}
          {loading &&
            Array.from({ length: skeletonCount }, (_, i) => (
              <div
                key={`vaga-${i}`}
                className="min-w-[220px] max-w-[220px] snap-start md:min-w-0 md:max-w-none"
              >
                <ProductCardSkeleton />
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}

export default ProductCarousel
