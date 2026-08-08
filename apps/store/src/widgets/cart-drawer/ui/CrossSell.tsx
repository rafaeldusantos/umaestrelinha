import { Link } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { hasSellableGrid } from '@/entities/product/lib/variantSelection'

interface Props {
  products: Product[]
  onNavigate: () => void
}

/**
 * "Complete o frete grátis" — a faixa de sugestões no fim da lista.
 *
 * O botão só adiciona direto quando o produto **não** tem grade vendável. Com grade, adicionar sem
 * `variant_id` monta um pedido que o servidor recusa a pagar (PST-01 AC 9) — então a sugestão vira
 * um atalho para a página, que é onde a escolha existe.
 */
const CrossSell = ({ products, onNavigate }: Props) => {
  const addItem = useCartStore((s) => s.addItem)
  if (products.length === 0) return null

  const cheapest = Math.min(...products.map((p) => p.price))

  return (
    <section className="border-b border-estrelinha-line bg-estrelinha-ground-deep/40 px-5 py-3.5 md:px-6 md:py-4">
      <div className="mb-2.5 flex items-center justify-between gap-3 md:mb-3">
        <h3 className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-estrelinha-primary md:text-xs">
          Complete o frete grátis
        </h3>
        <span className="hidden shrink-0 text-xs font-medium text-estrelinha-ink-soft md:inline">
          A partir de {formatPrice(cheapest)}
        </span>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {products.map((product, index) => {
          const needsChoice = hasSellableGrid(product)
          return (
            <li
              key={product.id}
              /* O board mostra uma sugestão no mobile e duas no desktop: numa gaveta de 390px, o
                 segundo card empurra o rodapé para fora do primeiro scroll. */
              className={`${index > 0 ? 'hidden md:flex' : 'flex'} items-center gap-2.5 rounded-xl border border-estrelinha-line bg-white p-2.5`}
            >
              <Link
                to={`/produto/${product.slug}`}
                onClick={onNavigate}
                tabIndex={-1}
                aria-hidden
                className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-estrelinha-ground-deep"
              >
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/produto/${product.slug}`}
                  onClick={onNavigate}
                  /* Duas linhas, como no board: num card de ~190px o nome de um botton quase sempre
                     quebra, e cortar em uma linha vira "Botton I…" — o que não identifica nada. */
                  className="line-clamp-2 text-xs font-semibold leading-4 text-estrelinha-ink transition-colors hover:text-estrelinha-primary"
                >
                  {product.name}
                </Link>
                <p className="text-xs font-bold leading-4 text-estrelinha-primary">{formatPrice(product.price)}</p>
              </div>
              {needsChoice ? (
                <Link
                  to={`/produto/${product.slug}`}
                  onClick={onNavigate}
                  aria-label={`Escolher variação de ${product.name}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-estrelinha-primary text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => addItem(product)}
                  aria-label={`Adicionar ${product.name} ao carrinho`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-estrelinha-primary text-white transition-transform hover:scale-105 active:scale-95"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default CrossSell
