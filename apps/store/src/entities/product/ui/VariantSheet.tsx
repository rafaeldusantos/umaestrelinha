import { ShoppingBag, X } from 'lucide-react'
import { TAP_44 } from '@/shared/lib/touchTarget'
import type { Product, OptionValues } from '@estrelinha/supabase/types'
import { formatPrice } from '@estrelinha/core/formatters'
import { renditionUrl } from '@estrelinha/core/media'
import { Sheet, SheetContent, SheetTitle } from '@estrelinha/ui/sheet'
import { CARD_MAX_AXES, canAddSelection } from '../lib/variantSelection'
import VariantPicker from './VariantPicker'

interface Props {
  product: Product
  categoryName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  selected: OptionValues
  onChange: (values: OptionValues) => void
  onConfirm: () => void
  /** Preço da linha escolhida — cai no `price` da vitrine quando a combinação não existe. */
  price: number
}

/**
 * Quick add de variações em **bottom sheet de largura total**, no mobile (board "Mobile Category —
 * Quick add: bottom sheet").
 *
 * É a superfície escolhida para o celular porque a tile de 167px do grid não comporta dois eixos e
 * um CTA sem cair para alvos de 30px — e 90% do tráfego da loja é mobile. Aqui pílula tem 48px,
 * o CTA 54px e o fechar 40px.
 *
 * Herda a linguagem do sheet de Filtros que a categoria já usa (véu tinta, canto 24px, puxador),
 * e traz miniatura + nome + preço no topo porque o sheet cobre o grid: sem isso o cliente perde de
 * vista qual produto está escolhendo.
 */
const VariantSheet = ({
  product,
  categoryName,
  open,
  onOpenChange,
  selected,
  onChange,
  onConfirm,
  price,
}: Props) => {
  const canAdd = canAddSelection(product, selected)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="gap-0 rounded-t-lg border-0 bg-white p-0 px-5 pb-7 pt-3 shadow-estrelinha-lift"
      >
        <span aria-hidden className="mx-auto mb-[18px] h-1 w-10 shrink-0 rounded-pill bg-estrelinha-line" />

        <div className="flex items-center gap-3.5">
          {/* Vaga de 64px. */}
          <img
            src={renditionUrl(product.image_url, 160)}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md bg-estrelinha-ground-deep object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {categoryName && (
              <span className="truncate text-[12px] font-medium leading-4 text-estrelinha-ink-soft">
                {categoryName}
              </span>
            )}
            <SheetTitle className="truncate font-display text-[17px] font-semibold leading-[22px] tracking-[-0.01em] text-estrelinha-ink">
              {product.name}
            </SheetTitle>
            <span className="font-display text-[15px] font-semibold leading-5 text-estrelinha-primary">
              {formatPrice(price)}
            </span>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
            className={`${TAP_44} flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground-deep text-estrelinha-ink`}
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex flex-col pt-6">
          <VariantPicker
            product={product}
            max={CARD_MAX_AXES}
            selected={selected}
            onChange={onChange}
            surface="sheet"
          />
        </div>

        <button
          type="button"
          disabled={!canAdd}
          onClick={onConfirm}
          // `w-full` é obrigatório: `<button>` faz shrink-to-fit com `width:auto` mesmo sendo
          // block-level por causa do `display:flex`. O pai aqui é bloco, então sem isto o CTA
          // encolhe até o texto.
          className="mt-7 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-sm bg-estrelinha-primary font-display text-[17px] font-semibold tracking-[-0.01em] text-white transition-colors hover:bg-estrelinha-primary/90 disabled:bg-estrelinha-ink-soft/40"
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
          {canAdd ? `Adicionar à sacola · ${formatPrice(price)}` : 'Indisponível'}
        </button>
      </SheetContent>
    </Sheet>
  )
}

export default VariantSheet
