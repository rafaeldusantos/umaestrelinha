// Feature 30 · GSH-01, GSH-02 — a identidade pública de produto e variação.
//
// ---------------------------------------------------------------------------------------------
// UM NÚMERO, UM SIGNIFICADO
// ---------------------------------------------------------------------------------------------
// O valor devolvido por `publicVariantId` é usado em TRÊS lugares, e é o mesmo valor nos três:
//
//   1. `<g:id>` no feed          — o que o Merchant Center já indexou
//   2. `?variant=` no `<g:link>` — o que a loja lê para abrir a variação certa
//   3. o `?variant=` que a cliente recebe ao clicar no anúncio
//
// Fossem dois valores diferentes, o anúncio apontaria para uma página que não sabe qual linha ele
// anunciou — e o preço da página divergiria do preço do feed, que é o que reprova o item.
//
// ---------------------------------------------------------------------------------------------
// POR QUE `nuvemshop_id` E NÃO O UUID
// ---------------------------------------------------------------------------------------------
// Porque **já está indexado**. Medido em 2026-08-16 na conta `685367464`: a oferta viva
// `offerId=1259936246` é a linha `product_variants.nuvemshop_id = 1259936246`, do produto
// `nuvemshop_id = 281745761`, slug `pulseira-7-nos-ajustavel-protecao-kabbalah`. Trocar o id no
// cutover não quebra nada visível — o Google simplesmente trata 3.233 ofertas como novas, com
// re-revisão e histórico zerado.
//
// O UUID é o recuo, não a preferência: hoje **zero** linhas têm `nuvemshop_id` nulo (medido em
// `products` e em `product_variants`), mas a primeira peça cadastrada à mão precisa de um id estável,
// e UUID nunca colide com bigint da Nuvemshop.

import type { OfferProductIdentity, OfferVariantIdentity } from './types.ts'

/**
 * Converte o id da origem para a forma que o feed publica: **decimal, sem prefixo, sem expoente**.
 *
 * `String(n)` de um número grande o bastante vira notação científica (`1e+21`), e um `<g:id>` assim
 * não casa com nada do lado do Google. Os ids medidos hoje estão na casa de 1,2×10⁹ — bem abaixo do
 * limiar —, mas a origem não garante faixa nenhuma, e o modo de falhar seria uma oferta órfã sem
 * erro em lugar nenhum.
 */
const decimal = (n: number): string => BigInt(Math.trunc(n)).toString(10)

/**
 * O `<g:id>` desta variação — e o valor do `?variant=` que abre a página nela.
 *
 * `nuvemshop_id` quando existe; o UUID local quando não.
 */
export const publicVariantId = (variant: OfferVariantIdentity): string =>
  variant.nuvemshop_id != null ? decimal(variant.nuvemshop_id) : variant.id

/**
 * O `<g:item_group_id>` deste produto — o que agrupa as variações numa peça só no Shopping.
 *
 * Mesma regra da variação, sobre `products`.
 */
export const publicProductId = (product: OfferProductIdentity): string =>
  product.nuvemshop_id != null ? decimal(product.nuvemshop_id) : product.id
