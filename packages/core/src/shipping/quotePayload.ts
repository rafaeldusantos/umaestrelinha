// O corpo de `melhor-envio?action=quote` — domínio puro (roda em Node, Deno e browser).
//
// Este arquivo é o **dono único** da pergunta:
//
//   > O que exatamente vai para a API do Melhor Envio quando alguém pede uma cotação?
//
// Antes dele a resposta existia **duas vezes**: `apps/store/src/entities/cart/lib/toQuotePayload.ts`
// (o carrinho da cliente) e um `items.map(...)` inline em
// `apps/backoffice/.../MelhorEnvioTab.tsx` (a cotação da dona, na tela do pedido). As duas cópias
// concordavam em dimensão e peso — e **discordavam no seguro**:
//
//   loja       → insurance_value: preço unitário
//   backoffice → insurance_value: preço unitário × quantidade
//
// Medido contra a API em 2026-09-05: ela **já multiplica** `insurance_value` por `quantity`
// (qty 1 → PAC R$ 23,28 · qty 2 → R$ 28,94 · qty 4 → R$ 34,47). Logo o campo é **por unidade**, a
// loja estava certa, e o backoffice segurava a carga pelo **quadrado** da quantidade — num pedido de
// 4 itens, seguro 4× inflado e cotação acima da que a cliente pagou.
//
// É o "defeito 01" do `CLAUDE.md` na forma canônica: nada quebrou. Build, `tsc` e teste de
// componente passaram com as duas cópias divergindo por meses, porque cada uma estava internamente
// coerente. Quem descobriria seria a Adri, comparando dois números que deveriam ser o mesmo.
//
// Nada aqui importa React, Supabase ou Deno, e a entrada é **estrutural** de propósito: o carrinho
// (`CartItem`, com `product` aninhado) e o pedido (`DbOrderItem` + um mapa de dimensões) chegam por
// formatos diferentes, e um tipo nominal obrigaria um adaptador por chamador — que seria a terceira
// chance de escrever a regra de um jeito diferente.

/**
 * As medidas de um produto, como o banco as guarda. Todos opcionais: `products` aceita `null` nos
 * quatro, e um produto recém-importado costuma ter pelo menos um vazio.
 */
export interface QuoteDimensions {
  width_cm?: number | null
  height_cm?: number | null
  length_cm?: number | null
  weight_kg?: number | null
}

/** Uma linha a cotar, já normalizada pelo chamador. */
export interface QuoteLine {
  /** Identificador do produto. Só volta no eco da API; não afeta preço. */
  id: string
  /**
   * O preço **daquela linha**, por unidade — `CartItem.unitPrice` na loja,
   * `order_items.unit_price` no painel. **Não** `product.price`: com grade os dois divergem, e o
   * `cartStore` já avisa isso no comentário do `subtotal()`.
   */
  unitPrice: number
  quantity: number
  /** `null`/ausente = produto sem medidas cadastradas ⇒ o fallback abaixo entra inteiro. */
  dimensions?: QuoteDimensions | null
}

/** O que a API recebe, um objeto por linha. */
export interface QuoteProductPayload {
  id: string
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
  quantity: number
}

/**
 * Medidas padrão de uma peça pequena, aplicadas **por campo e por item** — não em bloco. Um produto
 * com peso cadastrado e largura vazia mantém o peso real e recebe só a largura padrão.
 *
 * Herdados do `shipping-calc` original. **Medido em 2026-09-05: dimensão não move o preço** nessa
 * faixa — 6×6×6, 15×6×15 e 11×2×16 com o mesmo peso cotam idêntico, porque o peso cúbico não chega
 * perto do peso real. Quem move o preço é `weight` (em faixas: 0,1 kg e 0,3 kg custam o mesmo, 0,5 kg
 * é +R$ 2,45 no PAC) e `insurance_value` (~1% do valor). Ou seja: **errar a dimensão é barato, errar
 * o peso não é** — vale saber antes de gastar curadoria no campo errado.
 */
export const QUOTE_FALLBACK = {
  width: 11,
  height: 2,
  length: 16,
  weight: 0.1,
} as const

/** `0` e `null` caem no padrão; qualquer número positivo é respeitado. */
const medida = (valor: number | null | undefined, padrao: number): number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : padrao

/**
 * As linhas a cotar → o array `products` do corpo da requisição.
 *
 * **`insurance_value` é POR UNIDADE.** A API multiplica por `quantity` sozinha; multiplicar aqui
 * também segura a carga pelo quadrado da quantidade. É a divergência que originou este arquivo, e
 * `quotePayload.test.ts` carrega um sensor que reprova a fórmula antiga.
 */
export const toQuoteProducts = (linhas: QuoteLine[]): QuoteProductPayload[] =>
  (linhas ?? []).map((linha) => ({
    id: linha.id,
    width: medida(linha.dimensions?.width_cm, QUOTE_FALLBACK.width),
    height: medida(linha.dimensions?.height_cm, QUOTE_FALLBACK.height),
    length: medida(linha.dimensions?.length_cm, QUOTE_FALLBACK.length),
    weight: medida(linha.dimensions?.weight_kg, QUOTE_FALLBACK.weight),
    insurance_value: linha.unitPrice,
    quantity: linha.quantity,
  }))
