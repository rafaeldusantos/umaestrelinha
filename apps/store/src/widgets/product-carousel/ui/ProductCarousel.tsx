import { useRef } from 'react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/entities/product/ui/ProductCard'
import SectionHeading from '@/shared/ui/SectionHeading'
import type { Product } from '@estrelinha/supabase/types'

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
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = dir === 'left' ? -280 : 280
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  if (products.length === 0) return null

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
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible"
          style={{ scrollbarWidth: 'none' }}
        >
          {banner && (
            <Link
              to={banner.href}
              className="group min-w-[220px] max-w-[220px] snap-start overflow-hidden rounded-lg bg-estrelinha-ground-deep md:min-w-0 md:max-w-none"
            >
              <img
                src={banner.imageUrl}
                alt={banner.alt}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </Link>
          )}
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-[220px] max-w-[220px] snap-start md:min-w-0 md:max-w-none"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ProductCarousel
