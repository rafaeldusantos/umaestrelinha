// Campanhas de desconto — "quanto custa esta peça agora?".
//
// O DONO do preço de campanha. O cartão, a página do produto, a sacola, o checkout, as functions e
// o feed chamam esta função: uma tela calculando à parte daria um preço exibido e outro cobrado.
//
// - A conta é em CENTAVOS INTEIROS, por unidade, com meio centavo para cima, e só depois quem chama
//   multiplica pela quantidade. 15% sobre R$ 199,90 = R$ 169,915 ⇒ R$ 169,92.
// - O desconto da campanha vale sobre o preço CHEIO: o `compare_price` quando ele é maior que o preço
//   de hoje, senão o próprio preço.
// - Desconto não soma com o "de/por": o cobrado é o MENOR entre o preço de hoje e o cheio com
//   o desconto, comparado em centavos. Nunca os dois descontos multiplicados.
// - Percentual ausente ⇒ o preço de sempre, sem desconto de campanha.
//
// Folha: sem import nenhum.

/** Reais ⇒ centavos inteiros (o preço do banco tem duas casas). */
export const toCents = (reais: number): number => Math.round(Number(reais) * 100)

/** Centavos ⇒ reais. */
export const fromCents = (centavos: number): number => centavos / 100

/** O desconto percentual sobre centavos, meio centavo para cima. */
export const percentOffCents = (centavos: number, percent: number): number =>
  Math.floor((centavos * (100 - percent) + 50) / 100)

export interface CampaignPrice {
  /** O que se cobra por unidade, em reais. */
  charged: number
  /** O preço cheio por unidade ("de"), em reais. */
  full: number
  /** `true` quando a campanha baixou o preço de hoje. */
  discounted: boolean
}

/**
 * O preço de UMA unidade com a campanha.
 *
 * @param price o preço de hoje (`base_price` do produto ou `price` da variação)
 * @param comparePrice o "de" (`original_price` ou `compare_price`), quando existe
 * @param percent o percentual marcado na peça para a campanha em vigência, ou `null`
 */
export function campaignUnitPrice(
  price: number,
  comparePrice: number | null | undefined,
  percent: number | null | undefined,
): CampaignPrice {
  const hoje = toCents(price)
  const de = comparePrice !== null && comparePrice !== undefined ? toCents(comparePrice) : 0
  const cheio = de > hoje ? de : hoje
  if (percent === null || percent === undefined) {
    return { charged: fromCents(hoje), full: fromCents(cheio), discounted: false }
  }
  const comCampanha = percentOffCents(cheio, percent)
  const cobrado = comCampanha < hoje ? comCampanha : hoje
  return { charged: fromCents(cobrado), full: fromCents(cheio), discounted: cobrado < hoje }
}
