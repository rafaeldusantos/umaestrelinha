// Preço com desconto do PIX exibido na loja — regra pura, sem React e sem Supabase.
//
// Nasceu inline dentro de `entities/product/ui/ProductCard.tsx` (feature 26), e ganhou um dono na 27
// quando a página do produto passou a mostrar o mesmo número. Mesmo caminho de
// `resolveInstallments`, e pelo mesmo motivo: dois lugares declarando a mesma conta é como um deles
// fica para trás.

/** Mesma forma de `pricing.ts:54`. Repetida, e não importada, para o módulo de dinheiro do checkout
 *  não precisar exportar nada novo — este arquivo é de EXIBIÇÃO e não entra no caminho da cobrança. */
const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * O preço de uma unidade pagando no PIX, ou `null` quando não há desconto a mostrar.
 *
 * **A forma da conta não é escolha de estilo — é a do caixa.** `resolveOrderPricing` cobra
 * `subtotal − round2(subtotal × pct/100)`: ele arredonda o DESCONTO e subtrai. A versão anterior,
 * inline no card, arredondava o preço final (`round2(a × (1 − pct/100))`), o que **não dá o mesmo
 * número**: medido no catálogo real com o `pix_discount_percent = 5` de hoje, **81 dos 259 preços
 * distintos (31%) divergiam em 1 centavo** — a vitrine prometia R$ 7,51 onde o caixa cobra R$ 7,50.
 *
 * A direção era a favor da cliente, e por isso ninguém reclamou. Mas é a mesma classe de defeito que
 * `displayedEqualsCharged.test.ts` foi criado para travar (lá, 1 centavo na base do cupom, contra a
 * cliente) — e é lá que a igualdade com o total cobrado está asseverada por valor.
 *
 * `null` em vez de `amount` nos casos degenerados: quem chama esconde a linha inteira, e devolver o
 * preço cheio faria a loja anunciar "R$ 289,90 com Pix" como se fosse desconto.
 *
 * - `percent >= 100` zeraria ou inverteria o preço na tela. Não é desconto; é ausência.
 * - `NaN` cai nos dois guardas por comparação (`!(NaN > 0)` é `true`).
 */
export function pixPrice(amount: number, percent: number): number | null {
  if (!(amount > 0)) return null
  if (!(percent > 0) || percent >= 100) return null
  return round2(amount - round2((amount * percent) / 100))
}
