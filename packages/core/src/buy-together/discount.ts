// Compre Junto — o preço da peça que vai junto com a joia, com o desconto que a dona deu ao adicional.
//
// Folha: sem import nenhum, para a function `checkout` e a `mercado-pago` alcançarem pelo Deno por
// caminho relativo. É o dono ÚNICO da conta: a prévia do painel, o bloco da loja, a sacola e o
// servidor chamam esta função — escrita duas vezes, a tela mostraria um centavo que o servidor não
// cobra.
//
// A conta é por UNIDADE e arredonda o preço a centavo: `round(preço × (100 − p)) / 100`. Percentual
// ausente quer dizer sem desconto: o preço volta igual.

export const buyTogetherDiscountedPrice = (
  unitPrice: number,
  percent: number | null | undefined,
): number => {
  if (percent === null || percent === undefined) return unitPrice
  return Math.round(unitPrice * (100 - percent)) / 100
}
