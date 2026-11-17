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

/** A linha de variação como o "de" da peça a lê (do banco ou já mapeada). */
export interface VariantListPrice {
  price?: number | string | null
  compare_price?: number | string | null
}

const reaisOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * O "de" da PEÇA — a linha comprada sem variação escolhida (a peça sem grade).
 *
 * O "de/por" do catálogo mora na VARIAÇÃO: o import grava o `compare_at_price` nela, e nenhum
 * `products.original_price` do banco é maior que o preço. A peça sem grade tem uma variação só,
 * com o mesmo preço da peça — e o "de" dela é o "de" da peça, o mesmo que o feed anuncia. Sem isso,
 * a campanha descontaria sobre o "por" e somaria os dois descontos.
 *
 * Vale o maior entre o "de" da peça e o da variação única, só quando ela tem o MESMO preço da peça
 * (em centavos). Com grade (mais de uma variação), ou variação de outro preço, fica o da peça.
 * Quem lê: o mapeador da loja, o cartão da campanha no painel e as functions que cobram.
 */
export function pieceComparePrice(
  price: number,
  comparePrice: number | null | undefined,
  variants: readonly VariantListPrice[] | null | undefined,
): number | null {
  const daPeca = reaisOuNulo(comparePrice)
  if (!variants || variants.length !== 1) return daPeca
  const preco = reaisOuNulo(variants[0].price)
  const deVariacao = reaisOuNulo(variants[0].compare_price)
  if (preco === null || deVariacao === null || toCents(preco) !== toCents(price)) return daPeca
  return daPeca === null || toCents(deVariacao) > toCents(daPeca) ? deVariacao : daPeca
}

/**
 * A campanha baixa o preço desta peça? — o dono da pergunta.
 *
 * Baixa quando o preço da peça (com o "de" de `pieceComparePrice`) cai, ou quando ao menos uma
 * variação com preço próprio cai. Peça marcada cujo "de/por" já vence a campanha não baixa: não tem
 * selo nem desconto para mostrar, e some da vitrine e do bloco "Joias em oferta" da Home. O mapeador
 * da loja decide por esta função; uma segunda escrita faria o bloco mostrar a peça que a vitrine
 * esconde.
 *
 * @param price o preço de hoje da peça
 * @param comparePrice o "de" da peça, quando existe
 * @param variants as variações (preço e "de" de cada uma; preço `null` = sem preço próprio)
 * @param percent o percentual marcado na peça para a campanha, ou `null`
 */
export function campaignLowersPrice(
  price: number,
  comparePrice: number | null | undefined,
  variants: readonly VariantListPrice[] | null | undefined,
  percent: number | null | undefined,
): boolean {
  if (percent === null || percent === undefined) return false
  const de = pieceComparePrice(price, comparePrice, variants)
  if (campaignUnitPrice(price, de, percent).discounted) return true
  for (const v of variants ?? []) {
    const preco = reaisOuNulo(v.price)
    if (preco === null) continue
    if (campaignUnitPrice(preco, reaisOuNulo(v.compare_price), percent).discounted) return true
  }
  return false
}
