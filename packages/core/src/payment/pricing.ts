// Pricing de pagamento — domínio puro (roda em Node, Deno e browser).
// PAY-03: total cobrado é recalculado server-side a partir do pedido persistido.
// PAY-14: desconto PIX = pix_discount_percent% sobre (subtotal − cupom); frete fora da base.

export interface PricingItem {
  unit_price: number
  quantity: number
  /** Opcional: só o order bump precisa casar item por produto (BMP-04). */
  product_id?: string
}

/** Oferta do order bump, lida de `store_settings.checkout` (BMP-01). */
export interface OrderBumpConfig {
  enabled: boolean
  product_id: string | null
  discount_percent: number
}

export interface CalculateOrderTotalsInput {
  items: PricingItem[]
  shipping: number
  couponDiscount: number
  pixDiscountPercent: number
  method: 'pix' | 'card'
  /** Opcional: presente => `calculateOrderTotals` aplica o desconto do bump antes de somar. */
  bump?: OrderBumpConfig
  /**
   * Opcional: presente => aplica a melhor faixa de cada promoção antes de somar.
   *
   * **Ausente ou vazio deixa o resultado idêntico ao de antes da feature 17** — é o que preserva o
   * comportamento de todo chamador que já existia. Há teste afirmando isso por valor.
   *
   * `AD-015`: bump e faixa saem os DOIS do preço cheio e por item vence o menor; nunca compõem.
   */
  promotions?: readonly ProgressivePromotion[]
}

export interface OrderTotals {
  subtotal: number
  couponDiscount: number
  pixDiscount: number
  shipping: number
  total: number
}

/** Cupom aplicável ao pedido, na forma mínima que a regra de desconto precisa conhecer. */
export interface CouponRule {
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number
}

export const MIN_ORDER_TOTAL = 0.01

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * BMP-04: a **única** definição do desconto do cupom — a loja (`useCheckoutTotals`) e a edge
 * function (`supabase/functions/mercado-pago/index.ts`) chamam esta função, nunca uma conta
 * inline. `calculateOrderTotals` recebe o `couponDiscount` já resolvido, então enquanto essa
 * resolução viver em dois lugares ela volta a divergir: foi exatamente o defeito de 1 centavo
 * (`3 × 29,90 + cupom 15%` exibia 72,43 e cobrava 72,44), porque um lado arredondava a base
 * antes de aplicar o percentual e o outro somava float cru.
 *
 * `subtotal` é o subtotal **já com o order bump** — é o pedido realmente cobrado, e é o que
 * impede um cupom `fixed` de descontar mais do que existe.
 */
export function resolveCouponDiscount(
  subtotal: number,
  coupon: CouponRule | null | undefined,
): number {
  if (!coupon) return 0

  // Arredondar a base ANTES de aplicar o percentual é o que torna a regra determinística: sem
  // isso, `29.90 * 3 === 89.69999999999999` faz o percentual pousar do outro lado do meio centavo.
  const base = round2(subtotal)

  if (coupon.type === 'percent') return round2((base * coupon.value) / 100)
  if (coupon.type === 'fixed') return Math.min(coupon.value, base)
  return 0
}

/**
 * BMP-03/BMP-04: aplica `discount_percent` ao **primeiro** item cujo `product_id` casa com a
 * oferta, e apenas quando esse item tem `quantity === 1`. Devolve a lista intacta em qualquer
 * outro caso (sem bump, desabilitado, sem produto configurado, nenhum item casa, quantidade > 1).
 *
 * Função pura: não muta `items`. Chamá-la duas vezes sobre o **mesmo** input dá o mesmo
 * resultado (BMP-05). Ela não é idempotente por composição — o chamador passa sempre os itens
 * com o preço cheio e deixa o desconto por conta desta função (é o que `calculateOrderTotals`
 * faz), nunca uma lista já descontada.
 */
export function applyOrderBump(
  items: PricingItem[],
  bump: OrderBumpConfig | null | undefined,
): PricingItem[] {
  if (!bump || !bump.enabled || !bump.product_id) return items

  const index = items.findIndex((item) => item.product_id === bump.product_id)
  if (index === -1) return items

  const item = items[index]
  if (item.quantity !== 1) return items

  const next = items.slice()
  next[index] = {
    ...item,
    unit_price: round2(item.unit_price * (1 - bump.discount_percent / 100)),
  }
  return next
}

// =====================================================================
// Desconto progressivo por quantidade (feature 17)
// =====================================================================
//
// Mora NESTE arquivo, ao lado de `applyOrderBump`, e não num módulo novo. Dois motivos:
//
//   1. `pricing.ts` já está no grafo de import do Deno (a `mercado-pago/handlers.ts` o importa por
//      caminho relativo). Arquivo novo significa mais um bind mount no edge runtime local e a
//      armadilha da extensão `.ts` obrigatória, que `packages/core/src/pricing/index.ts:228` já
//      documenta — errar isso mata o `supabase start`.
//   2. Ela é vizinha natural do order bump: mesma forma (itens com preço cheio + config ⇒ itens com
//      `unit_price` alterado), mesmo ponto do fluxo, mesmo contrato de pureza.
//
// Por isso também este arquivo NÃO importa de `@estrelinha/supabase`: `PromotionDiscountKind` abaixo é
// uma redeclaração deliberada do tipo que vive em `@estrelinha/supabase/types/promotion`. Um import de
// pacote (bare specifier) não resolve no Deno sem import map. As duas declarações são idênticas de
// propósito; a do pacote descreve a COLUNA, esta descreve o ARGUMENTO.

/** Espelho local de `promotions.discount_kind`. Ver a nota acima sobre por que não é importado. */
export type PromotionDiscountKind = 'unit_price' | 'percent'

/** Uma faixa: "a partir de `min_qty` unidades, `value`". `value` é lido conforme `discount_kind`. */
export interface ProgressiveTier {
  min_qty: number
  value: number
}

export interface ProgressivePromotion {
  id: string
  discount_kind: PromotionDiscountKind
  /** Ordem NÃO é contrato: as funções abaixo ordenam por `min_qty`. */
  tiers: ProgressiveTier[]
  scope: 'all' | 'categories'
  /**
   * Ignorado quando `scope === 'all'`. Resolvido pela view `promotion_eligible_products`, **nunca**
   * por `Product.category_links`: aquele campo vem do snapshot do carrinho, que é persistido em
   * `localStorage` e pode ter dias — elegibilidade com dias de idade divergiria da do servidor e
   * geraria 422 no pagamento, que é a falha exata que esta feature existe para impedir.
   */
  eligibleProductIds: readonly string[]
  stacks_with_coupon: boolean
  /** Desempate de sobreposição (D6/PRM-14): mais antiga vence. ISO. */
  created_at: string
}

/** Um item é elegível quando o escopo é `all` ou quando seu `product_id` está na lista da view. */
function isEligible(item: PricingItem, promo: ProgressivePromotion): boolean {
  if (promo.scope === 'all') return true
  if (!item.product_id) return false
  return promo.eligibleProductIds.indexOf(item.product_id) !== -1
}

/**
 * A7: soma de `quantity` dos itens elegíveis — **unidades**, não produtos distintos. 5 unidades do
 * mesmo botton é um kit de 5, exatamente como o desenho da cartela assumiu ("dois Narutos ocupam
 * dois slots").
 */
export function countEligibleUnits(
  items: PricingItem[],
  promo: ProgressivePromotion,
): number {
  return items.reduce(
    (units, item) => (isEligible(item, promo) ? units + item.quantity : units),
    0,
  )
}

/**
 * PRM-08: a **maior** faixa com `min_qty ≤ n`, ou `null` quando nenhuma é alcançada.
 *
 * Não ordena a lista recebida — escolhe por redução, então não muta a entrada e a ordem de
 * inserção das faixas no banco deixa de ser contrato (edge case explícito da spec).
 */
export function resolveProgressiveTier(
  items: PricingItem[],
  promo: ProgressivePromotion,
): ProgressiveTier | null {
  const units = countEligibleUnits(items, promo)

  return promo.tiers.reduce<ProgressiveTier | null>((best, tier) => {
    if (tier.min_qty > units) return best
    if (best && best.min_qty >= tier.min_qty) return best
    return tier
  }, null)
}

/**
 * O preço unitário que a faixa produz para um item — ou o preço cheio, quando a faixa seria pior.
 *
 * A10 é invariante DESTA FUNÇÃO, não do dado: `Math.min` garante que a faixa nunca aumente preço,
 * mesmo recebendo um valor que o banco recusaria. Um botton de R$ 3,90 numa faixa de R$ 4,60
 * continua R$ 3,90 — entrar em promoção não pode encarecer nada.
 *
 * O arredondamento é **por item**, antes de qualquer soma: é a mesma disciplina que o defeito de 1
 * centavo do cupom ensinou (`resolveCouponDiscount` acima). Arredondar o total em vez do item dá
 * outro número — 3 × R$ 29,90 com 15% sai 76,26 por item e 76,24 pelo total.
 */
export function tierUnitPrice(
  fullPrice: number,
  kind: PromotionDiscountKind,
  value: number,
): number {
  const discounted = kind === 'percent' ? fullPrice * (1 - value / 100) : value
  return round2(Math.min(fullPrice, discounted))
}

/** Uma promoção que de fato alterou preço, e por qual faixa. Vira log e vira linha de resumo. */
export interface AppliedProgressive {
  promotion_id: string
  tier_min_qty: number
}

/**
 * PRM-09 / PRM-14: aplica a **melhor faixa de cada** promoção elegível e, por item, deixa vencer o
 * **menor** `unit_price`.
 *
 * Sobreposição não é caso raro: um botton em `Bottons` e em `Kawaii` casa com duas regras. A
 * desambiguação é determinística e sem coluna de prioridade para a lojista manter (D6) —
 * menor preço, e no empate a promoção com `created_at` mais antigo. O `id` é o terceiro critério:
 * duas promoções criadas no mesmo segundo empatariam em `created_at`, e sem um desempate final o
 * resultado passaria a depender da ORDEM DO ARRAY de entrada. É a mesma armadilha que fez
 * `bySortOrder` (feature 16) desempatar por nome — sem isso "a barra muda entre dois carregamentos".
 *
 * Função pura: não muta `items`. Não é idempotente por composição — o chamador passa sempre os itens
 * com o preço **cheio**, exatamente como `applyOrderBump` exige.
 *
 * Uma promoção só entra em `applied` quando **baixou** algum preço. Faixa alcançada que não melhora
 * nada (botton de R$ 3,90 numa faixa de R$ 4,60) não é desconto aplicado, e anunciá-la no resumo
 * seria uma linha de "−R$ 0,00".
 */
export function applyProgressiveDiscount(
  items: PricingItem[],
  promotions: readonly ProgressivePromotion[],
): { items: PricingItem[]; applied: AppliedProgressive[] } {
  const candidates: Array<{ promo: ProgressivePromotion; tier: ProgressiveTier }> = []

  for (const promo of promotions) {
    const tier = resolveProgressiveTier(items, promo)
    if (tier) candidates.push({ promo, tier })
  }

  if (candidates.length === 0) return { items, applied: [] }

  /** `promotion_id` ⇒ `tier_min_qty`, na ordem em que cada promoção venceu seu primeiro item. */
  const winners = new Map<string, number>()

  const next = items.map((item) => {
    let bestPrice = item.unit_price
    let winner: { promo: ProgressivePromotion; tier: ProgressiveTier } | null = null

    for (const candidate of candidates) {
      if (!isEligible(item, candidate.promo)) continue

      const price = tierUnitPrice(item.unit_price, candidate.promo.discount_kind, candidate.tier.value)
      if (price >= item.unit_price) continue

      const isBetter =
        price < bestPrice ||
        (price === bestPrice && winner !== null && isOlder(candidate.promo, winner.promo))

      if (isBetter) {
        bestPrice = price
        winner = candidate
      }
    }

    if (!winner) return item

    if (!winners.has(winner.promo.id)) winners.set(winner.promo.id, winner.tier.min_qty)
    return { ...item, unit_price: bestPrice }
  })

  if (winners.size === 0) return { items, applied: [] }

  const applied: AppliedProgressive[] = []
  winners.forEach((tier_min_qty, promotion_id) => {
    applied.push({ promotion_id, tier_min_qty })
  })

  return { items: next, applied }
}

/** Empate de preço: a mais antiga vence; `id` fecha o empate de `created_at` (ver acima). */
function isOlder(a: ProgressivePromotion, b: ProgressivePromotion): boolean {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at
  return a.id < b.id
}

/**
 * `AD-015`: **desconto por item nunca soma.** Índice a índice, vence o menor `unit_price`.
 *
 * As duas listas têm de ser o **mesmo** carrinho com o preço cheio, cada uma passada por uma regra
 * diferente (`applyOrderBump` numa, `applyProgressiveDiscount` na outra). Nunca uma lista já
 * descontada passada pela segunda regra: aí os descontos comporiam, e 5 bottons a R$ 4,60 com cupom
 * de 15% sairiam a R$ 19,55 — margem que ninguém autorizou.
 *
 * Consequência boa de "o menor vence": o resultado fica **independente da ordem** em que as regras
 * são aplicadas, o que é propriedade testável em vez de comentário.
 */
export function perItemMin(a: PricingItem[], b: PricingItem[]): PricingItem[] {
  return a.map((item, index) => {
    const other = b[index]
    if (!other) return item
    return other.unit_price < item.unit_price ? other : item
  })
}

/**
 * Os itens realmente cobrados: preço cheio, passado pelas duas regras de desconto por item, com o
 * menor vencendo em cada índice (`AD-015`).
 *
 * As duas regras recebem `input.items` — o preço **cheio** — e não uma a saída da outra. Encadeá-las
 * fá-las compor, e composição de desconto por item é justamente o que a `AD-015` proíbe.
 */
function resolveChargedItems(input: CalculateOrderTotalsInput): PricingItem[] {
  const bumped = applyOrderBump(input.items, input.bump)
  if (!input.promotions || input.promotions.length === 0) return bumped

  const progressive = applyProgressiveDiscount(input.items, input.promotions).items
  return perItemMin(bumped, progressive)
}

const sumItems = (items: PricingItem[]) =>
  round2(items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0))

export function calculateOrderTotals(input: CalculateOrderTotalsInput): OrderTotals {
  const items = resolveChargedItems(input)
  const subtotal = sumItems(items)
  const couponDiscount = round2(input.couponDiscount)
  const pixDiscount =
    input.method === 'pix' && input.pixDiscountPercent > 0
      ? round2((subtotal - couponDiscount) * (input.pixDiscountPercent / 100))
      : 0
  const shipping = round2(input.shipping)
  const total = round2(subtotal - couponDiscount - pixDiscount + shipping)

  if (total < MIN_ORDER_TOTAL) {
    throw new Error('Total do pedido inválido: menor que R$ 0,01')
  }

  return { subtotal, couponDiscount, pixDiscount, shipping, total }
}

// =====================================================================
// resolveOrderPricing — o ponto ÚNICO que decide o total do pedido
// =====================================================================
//
// A loja (`useCheckoutTotals`) e a edge function (`mercado-pago/handlers.ts`) chamam esta função, e
// não montam a decisão cada uma por si. Isso não é preferência de estilo: o topo de
// `useCheckoutTotals.ts` avisa "não mudar um lado sem o outro" porque ele espelha o servidor PASSO A
// PASSO, à mão — e foi um passo espelhado torto que produziu o defeito de 1 centavo do cupom. Com um
// terceiro desconto entrando, a superfície espelhada tinha de ENCOLHER, não crescer.

export interface OrderPricingInput extends Omit<CalculateOrderTotalsInput, 'couponDiscount'> {
  coupon: CouponRule | null
  promotions: readonly ProgressivePromotion[]
}

export interface OrderPricingOutcome {
  totals: OrderTotals
  /** Desconto vindo das faixas, já embutido em `totals.subtotal`. Zero quando a promoção perdeu. */
  promotionDiscount: number
  applied: AppliedProgressive[]
  /** Qual caminho venceu — vira a frase do resumo (PRM-17). */
  winner: 'promotion' | 'coupon' | 'both' | 'none'
  /** Nome do descartado, quando houve escolha. `null` quando não houve. */
  discarded: 'promotion' | 'coupon' | null
}

/**
 * Um dos dois caminhos possíveis, calculado por inteiro.
 *
 * `shipping` de ENTRADA é o frete **cotado**; quem zera para o cupom `free_shipping` é esta função.
 * Antes da 17 isso era responsabilidade dos dois chamadores (cada um com o seu `if`), e não podia
 * continuar sendo: sem zerar aqui, comparar os dois caminhos pelo total final — que é a decisão
 * inteira de D2 — daria a resposta errada para todo cupom de frete.
 */
function priceOnePath(
  input: OrderPricingInput,
  promotions: readonly ProgressivePromotion[],
  coupon: CouponRule | null,
): OrderPricingOutcome {
  const applied = applyProgressiveDiscount(input.items, promotions).applied

  const withoutPromotion = sumItems(applyOrderBump(input.items, input.bump))
  const chargedSubtotal = sumItems(
    resolveChargedItems({ ...input, couponDiscount: 0, promotions }),
  )

  const totals = calculateOrderTotals({
    ...input,
    promotions,
    // O cupom incide sobre o subtotal REALMENTE cobrado. Com `promotions` vazio isso é o subtotal
    // com bump — idêntico ao que os dois chamadores já faziam.
    couponDiscount: resolveCouponDiscount(chargedSubtotal, coupon),
    shipping: coupon && coupon.type === 'free_shipping' ? 0 : input.shipping,
  })

  return {
    totals,
    promotionDiscount: round2(withoutPromotion - chargedSubtotal),
    applied,
    winner: 'none',
    discarded: null,
  }
}

/**
 * PRM-16/PRM-17/PRM-18 e `AD-015`: calcula o pedido nos dois caminhos — (a) com promoção e sem
 * cupom, (b) com cupom e sem promoção — e devolve o de **menor `totals.total`**.
 *
 * Compara o TOTAL FINAL, não o desconto (D2). Cupom `free_shipping` mexe no frete e não no subtotal:
 * comparar descontos faria um cupom que zera R$ 24,80 de frete perder de uma promoção que desconta
 * R$ 6,50 — e a cliente pagaria mais caro por causa da nossa aritmética.
 *
 * Empate ⇒ **promoção**, porque ela não exige código digitado: a cliente que não tem cupom na mão
 * recebe o mesmo preço, e quem tem pode guardá-lo para outra compra.
 *
 * Quando **todas** as promoções que de fato aplicaram têm `stacks_with_coupon`, não há escolha a
 * fazer: um cálculo só, com os dois, e `winner = 'both'`.
 */
export function resolveOrderPricing(input: OrderPricingInput): OrderPricingOutcome {
  const promotions = input.promotions || []
  const withPromotion = priceOnePath(input, promotions, null)
  const promotionApplies = withPromotion.applied.length > 0

  if (!input.coupon) {
    return { ...withPromotion, winner: promotionApplies ? 'promotion' : 'none' }
  }

  const appliedIds = withPromotion.applied.map((entry) => entry.promotion_id)
  const stacks =
    promotionApplies &&
    promotions.every(
      (promo) => appliedIds.indexOf(promo.id) === -1 || promo.stacks_with_coupon,
    )

  if (stacks) {
    return { ...priceOnePath(input, promotions, input.coupon), winner: 'both' }
  }

  const withCoupon = priceOnePath(input, [], input.coupon)

  if (!promotionApplies) {
    return { ...withCoupon, winner: 'coupon' }
  }

  // Empate cai aqui: `<=` dá a vitória à promoção.
  return withPromotion.totals.total <= withCoupon.totals.total
    ? { ...withPromotion, winner: 'promotion', discarded: 'coupon' }
    : { ...withCoupon, winner: 'coupon', discarded: 'promotion' }
}
