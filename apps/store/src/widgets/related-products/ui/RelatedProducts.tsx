import { Link } from 'react-router-dom'
import { TAP_ROW } from '@/shared/lib/touchTarget'
import ProductCard from '@/entities/product/ui/ProductCard'
import type { Product } from '@estrelinha/supabase/types'

interface Props {
  products: Product[]
  /** Coleção para onde o "Ver todos" leva. Sem ela o link não aparece — não se cria link morto. */
  categorySlug?: string
}

/**
 * "Você também vai curtir" — boards de Produto: 4 colunas no desktop, 2 no mobile, com o link da
 * coleção à direita do título.
 */
const RelatedProducts = ({ products, categorySlug }: Props) => {
  if (products.length === 0) return null

  return (
    <section className="flex flex-col gap-4 pt-10 md:pt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-[24px] font-semibold leading-[30px] tracking-[-0.02em] text-estrelinha-ink md:text-[30px]">
          Você também vai curtir
        </h2>
        {categorySlug && (
          <Link
            to={`/colecao/${categorySlug}`}
            /* `-my-2 py-2` dá 37px de alvo sem mexer no baseline que alinha o link ao título. */
            className={`${TAP_ROW} shrink-0 text-[14px] font-semibold text-estrelinha-primary hover:underline`}
          >
            Ver todos →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {products.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

export default RelatedProducts
