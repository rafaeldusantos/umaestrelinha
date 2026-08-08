// PFM-17 — a prévia da vitrine no inspetor.
//
// Renderiza o card como a loja mostraria, a partir do ESTADO do formulário: reflete a edição antes
// de salvar, que é o ponto (ver o preço mudar é o que evita publicar e conferir depois).
//
// O `ProductCard` da loja é referência **visual**, não import: são apps distintos, com temas
// distintos (`estrelinha-*` lá, `estrelinha-admin-*` aqui — ver `DESIGN.md`). Importar entre apps traria o tema
// errado junto.

import { ImageOff } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { priceRange } from '@estrelinha/core/pricing'
import type { ProductImage, ProductVariant } from '@estrelinha/supabase/types'

interface Props {
  name: string
  images: ProductImage[]
  /** O preço padrão do produto — o que vale quando não há grade vendável. */
  price: number
  variants: ProductVariant[]
}

const StorefrontPreview = ({ name, images, price, variants }: Props) => {
  const primary = images[0] ?? null
  // A faixa conta só variação ativa COM preço — a mesma regra da vitrine, para a prévia não
  // anunciar um valor que a loja não mostraria.
  const range = priceRange(variants)

  return (
    <div className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {primary ? (
          <img
            src={primary.url}
            alt={primary.alt ?? name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium text-foreground">
          {name.trim() || 'Produto sem nome'}
        </p>
        {range ? (
          <p className="text-sm font-semibold text-foreground">
            a partir de {formatPrice(range.min)}
          </p>
        ) : (
          <p className="text-sm font-semibold text-foreground">{formatPrice(price)}</p>
        )}
      </div>
    </div>
  )
}

export default StorefrontPreview
