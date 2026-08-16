// Feature 30 · GSH-04 — quem entra no feed, e por que quem não entra ficou de fora.
//
// ---------------------------------------------------------------------------------------------
// POR QUE O MOTIVO, E NÃO UM BOOLEANO
// ---------------------------------------------------------------------------------------------
// A tela `/admin/google-shopping` precisa dizer "3.233 publicadas, 12 fora: 8 de produto desativado,
// 3 de variação desativada, 1 sem preço" (GSH-22). Com um predicado booleano, a tela teria de
// reimplementar a mesma regra para descobrir a causa — e seria a segunda escrita, que é justamente o
// que esta feature existe para não ter. Devolvendo o motivo, o feed usa `=== null` e a tela agrupa
// pelo valor: **uma regra, dois usos**.
//
// ---------------------------------------------------------------------------------------------
// A ORDEM DE PRECEDÊNCIA É DECISÃO, E ELA É ACIONÁVEL
// ---------------------------------------------------------------------------------------------
// Uma variação pode reprovar por mais de um motivo ao mesmo tempo. A spec não fixou qual vence, e a
// escolha aqui é **do mais externo para o mais interno**:
//
//     produto_inativo  >  variacao_inativa  >  sem_preco
//
// O critério é o que a dona faria a seguir. Se o produto inteiro está fora do ar, dizer "esta linha
// está sem preço" manda consertar a coisa errada — reativar o produto é o único passo que muda
// alguma coisa. Registrado como assunção na spec.
//
// ---------------------------------------------------------------------------------------------
// A REGRA FOI MEDIDA, NÃO SUPOSTA
// ---------------------------------------------------------------------------------------------
// Banco local em 2026-08-16: 3.245 variações, **3.233** ativas de produto ativo e com preço. O
// Merchant Center tem **3.237** (3.235 aprovadas + 2 recusadas). Diferença de 4 — a reconciliar item
// a item, não estimada.

import type { OfferProductEligibility, OfferVariantEligibility } from './types.ts'

/** Por que esta variação não vira oferta. Ordem do array = precedência. */
export const FEED_EXCLUSIONS = ['produto_inativo', 'variacao_inativa', 'sem_preco'] as const

export type FeedExclusion = (typeof FEED_EXCLUSIONS)[number]

/**
 * `null` = entra no feed. Caso contrário, o motivo de maior precedência.
 *
 * Ninguém compara as colunas cruas: este é o leitor único, do jeito que `resolveProductFaqs` é o
 * leitor único do vínculo de pergunta (`28`) e `requiresMaterial()` o da coluna de material (`22`).
 */
export const feedExclusion = (
  product: OfferProductEligibility,
  variant: OfferVariantEligibility,
): FeedExclusion | null => {
  if (!product.is_active) return 'produto_inativo'
  if (!variant.is_active) return 'variacao_inativa'
  if (variant.price == null) return 'sem_preco'
  return null
}
