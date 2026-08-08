// "Na loja vai aparecer" (feature 18 / T6, DSC-04 AC 3).
//
// O repetidor de faixas já responde "quanto a cliente paga por 5". Este card responde a outra
// pergunta, que só a tela inteira teve espaço para fazer: **o que está escrito na vitrine**. São
// coisas diferentes — uma é a conta, a outra é a frase — e é a frase que a dona da loja compara com o
// que ela postaria no Instagram.
//
// A faixa exibida é a de MAIOR quantidade entre as válidas, não a última linha: é a maior promessa da
// regra, e o repetidor não obriga a preencher em ordem.

import { formatPrice } from '@estrelinha/core/formatters'
import type { PromotionDiscountKind } from '@estrelinha/supabase/types/promotion'
import { tierPreview } from '../model/tierPreview'

interface Props {
  tiers: { min_qty: number | string; value: number | string }[]
  kind: PromotionDiscountKind
  /** A mediana do `base_price` dos elegíveis; `null` enquanto não há escopo. */
  referencePrice: number | null
}

/** A faixa de maior `min_qty` que rende uma prévia — as inválidas e as vazias não contam. */
const headlineTier = (props: Props) => {
  const candidates = props.tiers
    .map(tier => ({ tier, preview: tierPreview(tier, props.kind, props.referencePrice) }))
    .filter(candidate => candidate.preview.total !== null)
    .sort((a, b) => Number(b.tier.min_qty) - Number(a.tier.min_qty))
  return candidates[0] ?? null
}

const PromotionShowcaseCard = (props: Props) => {
  const headline = headlineTier(props)

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Na loja vai aparecer
      </p>

      {headline === null ? (
        // Sem número inventado: qual das duas coisas falta é informação útil, e um preço chutado aqui
        // seria uma frase que a loja não vai mostrar.
        <p className="mt-2 text-sm text-muted-foreground" data-testid="vitrine-pendente">
          {props.referencePrice === null
            ? 'Escolha o escopo para ver a frase que a loja mostra.'
            : 'Preencha uma faixa para ver a frase que a loja mostra.'}
        </p>
      ) : (
        <>
          <p className="font-heading mt-2 text-lg font-bold text-foreground" data-testid="vitrine-frase">
            “Escolha {Number(headline.tier.min_qty)}, pague{' '}
            {formatPrice(headline.preview.total as number)}”
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="vitrine-detalhe">
            Cada item a {formatPrice(headline.preview.unitPrice as number)} · a cliente economiza{' '}
            {formatPrice(
              (props.referencePrice as number) * Number(headline.tier.min_qty) -
                (headline.preview.total as number),
            )}
          </p>
        </>
      )}
    </div>
  )
}

export default PromotionShowcaseCard
