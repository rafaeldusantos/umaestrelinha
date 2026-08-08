import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/entities/product/ui/ProductCard'
import SectionHeading from '@/shared/ui/SectionHeading'
import type { Product } from '@nanapin/supabase/types'

interface Props {
  title: string
  products: Product[]
  subtitle?: string
  badgeLabel?: string
  linkHref?: string
  linkText?: string
}

const ProductCarousel = ({ title, products, subtitle, badgeLabel, linkHref, linkText }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = dir === 'left' ? -280 : 280
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className="py-10 md:py-14">
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
                  className="hidden text-[15px] font-semibold text-nanita-jam transition-opacity hover:opacity-70 md:inline"
                >
                  {linkText}
                </Link>
              )}
              {/* Par assimétrico: "voltar" é contorno, "avançar" é sólido. */}
              <button
                onClick={() => scroll('left')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-nanita-border transition-colors hover:bg-nanita-sugar"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4 text-nanita-ink" strokeWidth={2.2} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-nanita-ink transition-transform hover:scale-105"
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
