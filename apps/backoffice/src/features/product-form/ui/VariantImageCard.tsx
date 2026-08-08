// PMD-06 — imagem por variação.
//
// Aponta cada linha da grade para uma imagem **já existente** na galeria. Não envia foto nova de
// propósito: um segundo caminho de upload teria a própria validação, o próprio progresso e a
// própria chance de divergir do que a aba Mídia faz.

import { variantLabel } from '@nanapin/core/pricing'
import type { ProductImage, ProductOption, ProductVariant } from '@nanapin/supabase/types'

interface Props {
  variants: ProductVariant[]
  options: ProductOption[]
  images: ProductImage[]
  onChange: (next: ProductVariant[]) => void
}

const VariantImageCard = ({ variants, options, images, onChange }: Props) => {
  if (variants.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem variações para vincular.</p>
  }

  if (images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Envie imagens na aba Mídia para poder vincular uma a cada variação.
      </p>
    )
  }

  const setImage = (variantId: string, url: string | null) =>
    onChange(variants.map(v => (v.id === variantId ? { ...v, image_url: url } : v)))

  return (
    <ul className="space-y-2">
      {variants.map(variant => {
        const label = variantLabel(options, variant.option_values) || variant.name || 'Variação'
        return (
          <li key={variant.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</span>
            {!variant.image_url && (
              <span className="shrink-0 text-[11px] text-muted-foreground">usa a principal</span>
            )}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`${label}: usar a principal`}
                aria-pressed={!variant.image_url}
                onClick={() => setImage(variant.id, null)}
                className={`h-10 rounded-lg border-2 px-2 text-[11px] ${
                  variant.image_url ? 'border-border text-muted-foreground' : 'border-primary text-foreground'
                }`}
              >
                Principal
              </button>
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  aria-label={`${label}: usar imagem ${index + 1}`}
                  aria-pressed={variant.image_url === image.url}
                  onClick={() => setImage(variant.id, image.url)}
                  className={`h-10 w-10 overflow-hidden rounded-lg border-2 ${
                    variant.image_url === image.url ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default VariantImageCard
