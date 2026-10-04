// Parcelamento exibido na loja — regra pura, sem React e sem Supabase.
//
// Nasceu em `features/checkout/model/installments.ts` (feature 15) porque só o checkout mostrava
// parcela. A página do produto passou a mostrar a mesma linha ("ou 3x de R$ 2,97 sem juros", board
// "Desktop Product Detail - v3"), e ela vive em `entities/product` — camada que **não pode**
// importar de `features/`. Promover é o que mantém um número só: se a vitrine dissesse 6x e o
// checkout 3x, a cliente descobriria a diferença com o cartão na mão.

/**
 * Divergência do board `04`/`07`, achada na validação de UI: o card de cartão dizia só
 * "Até 6x sem juros". O board mostra **o valor da parcela** — que é o número pelo qual quem
 * parcela decide. O teto real de parcelas respeita `min_installment_value` das settings, o mesmo
 * limite que o Brick recebe, para a loja não prometer uma parcela que o Mercado Pago não oferece.
 */
export function resolveInstallments(
  amount: number,
  maxInstallments: number,
  minInstallmentValue: number,
): { count: number; value: number } | null {
  if (!(amount > 0) || !(maxInstallments >= 1)) return null
  const affordable =
    minInstallmentValue > 0 ? Math.floor(amount / minInstallmentValue) : maxInstallments
  const count = Math.max(1, Math.min(maxInstallments, affordable))
  return { count, value: Math.round((amount / count) * 100) / 100 }
}

/**
 * Teto de parcelas que o caixa oferece no cartão, com ou sem juros (pedido da dona, 2026-10-04:
 * "podemos mostrar os produtos em até 10x"). O Mercado Pago chega a oferecer 18x; acima de 10 a
 * parcela de uma joia vira centavos e o custo total passa de 30% — não ajuda ninguém a decidir.
 */
export const CARD_INSTALLMENTS_CEILING = 10

/** O pedaço de `payer_costs` (Mercado Pago, `GET /v1/payment_methods/installments`) que a loja lê. */
export interface PayerCostLike {
  installments: number
  installment_rate: number
  installment_amount: number
  total_amount: number
}

export interface CardInstallmentOption {
  count: number
  /** Valor de cada parcela, como o Mercado Pago vai cobrar. */
  value: number
  /** Total pago nesta opção — igual ao valor do pedido quando é sem juros. */
  total: number
  interestFree: boolean
}

const cents = (n: number) => Math.round(n * 100) / 100

/**
 * As opções de parcela que o caixa mostra, a partir da tabela REAL que o Mercado Pago devolveu
 * para aquele cartão e aquele valor.
 *
 * **"Sem juros" é o que o Mercado Pago diz, nunca o que a loja gostaria** (`installment_rate`
 * igual a zero). Quem decide se uma parcela tem juros é a conta do Mercado Pago — o painel dele,
 * em "Oferecer parcelamento sem juros" —, e a cobrança segue a tabela dele, não a da loja. Rotular
 * pela configuração do painel da loja seria mostrar um preço e cobrar outro: medido em
 * 2026-10-04, a conta não tinha nenhuma parcela sem juros e a loja anunciava "até 4x sem juros".
 *
 * A parcela mínima (`min_installment_value`) vale para todas as opções, pelo mesmo corte de
 * `resolveInstallments`: a vitrine e o caixa não podem discordar sobre quantas vezes cabem.
 * `1x` existe sempre — é o pagamento à vista, e o Mercado Pago sempre o oferece.
 */
export function cardInstallmentOptions(
  amount: number,
  payerCosts: readonly PayerCostLike[],
  minInstallmentValue: number,
  ceiling: number = CARD_INSTALLMENTS_CEILING,
): CardInstallmentOption[] {
  if (!(amount > 0)) return []
  const affordable =
    minInstallmentValue > 0 ? Math.max(1, Math.floor(amount / minInstallmentValue)) : ceiling
  const limit = Math.max(1, Math.min(ceiling, affordable))

  const options = payerCosts
    .filter((c) => c.installments >= 1 && c.installments <= limit)
    .map((c) => ({
      count: c.installments,
      value: cents(c.installment_amount),
      total: cents(c.total_amount),
      interestFree: c.installment_rate === 0,
    }))
    .sort((a, b) => a.count - b.count)
    // Uma linha por quantidade de parcelas, mesmo que a resposta repita.
    .filter((o, i, all) => i === 0 || all[i - 1].count !== o.count)

  if (!options.some((o) => o.count === 1)) {
    options.unshift({ count: 1, value: cents(amount), total: cents(amount), interestFree: true })
  }
  return options
}
