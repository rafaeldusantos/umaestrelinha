// "A cliente vê" (feature 18, board `Cupom — tela interna`).
//
// O par do `PromotionShowcaseCard`: a frase que aparece no CHECKOUT quando o código é aceito. Existe
// pelo mesmo motivo — a dona da loja compara o que ela vai postar com o que a loja vai escrever.
//
// O aviso de concorrência mora aqui e não numa nota de rodapé porque é onde a decisão acontece: a
// `AD-015` diz que cupom e promoção nunca somam no mesmo item, e essa é exatamente a surpresa que
// apareceria depois, no relatório, se a tela não avisasse antes.

import { formatPrice } from '@nanapin/core/formatters'
import type { CouponFormValues } from '../model/schema'

interface Props {
  values: CouponFormValues
}

/**
 * `Cupom NANA10 aplicado — 10% off`.
 *
 * Não exportada: um arquivo de componente que exporta função quebra o hot reload do Vite
 * (`react-refresh/only-export-components`), e esta frase não tem outro consumidor — ela é provada
 * pela tela, em `AdminCouponFormPage.test.tsx`.
 */
const checkoutLine = (values: CouponFormValues): string => {
  const code = (values.code || '').trim().toUpperCase() || 'SEU CÓDIGO'
  const value = Number(values.value)
  const effect =
    values.type === 'free_shipping'
      ? 'frete grátis'
      : values.type === 'percent'
        ? `${Number.isFinite(value) ? value : 0}% off`
        : `− ${formatPrice(Number.isFinite(value) ? value : 0)}`
  return `Cupom ${code} aplicado — ${effect}`
}

const CouponPreviewCard = ({ values }: Props) => {
  const minOrder = Number(values.min_order || 0)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        No checkout vai aparecer
      </p>
      <p className="font-heading mt-2 text-lg font-bold text-foreground" data-testid="checkout-linha">
        “{checkoutLine(values)}”
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {minOrder > 0
          ? `Só a partir de ${formatPrice(minOrder)} em produtos.`
          : 'Vale em qualquer valor de pedido.'}
      </p>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        Se o item já estiver em promoção, vale o que descontar mais — cupom ou promoção, nunca os dois.
      </p>
    </div>
  )
}

export default CouponPreviewCard
