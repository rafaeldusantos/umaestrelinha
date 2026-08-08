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
