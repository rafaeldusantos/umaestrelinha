/**
 * Guarda de PST-03 AC 5: nenhum pedido é criado com item que EXIGE variação e não traz uma.
 *
 * Por que a checagem existe aqui e não só no servidor: a rejeição do `create-payment` é a última
 * linha de defesa, não a primeira. Um pedido gravado que nunca poderá ser pago é um beco sem
 * saída — a cliente vê "pedido criado", vai pagar, e leva 422 sem entender por quê, com o carrinho
 * já consumido.
 *
 * Por que a consulta é necessária: até a T18 (Fase 4) a loja não carrega a grade junto do produto.
 * O tipo `Product` do front não tem `variants`, então "este produto exige variação?" não é
 * respondível a partir do item do carrinho — precisa de uma leitura.
 */

export interface VariantGuardItem {
  productId: string
  productName: string
  variantId: string | null
}

/**
 * Devolve os NOMES dos produtos que exigem variação e estão sem ela. Lista vazia = pode seguir.
 *
 * Só conta como "exige variação" o produto com pelo menos uma variação **ativa e com preço** —
 * é a mesma condição de `priceRange` e de `resolveItemPrice`. Uma grade só de linhas pausadas ou
 * sem preço não é vendável por variação, e o produto cai em `base_price` (PST-10).
 */
export const findItemsMissingVariant = (
  items: readonly VariantGuardItem[],
  productIdsRequiringVariant: ReadonlySet<string>,
): string[] => {
  const missing: string[] = []
  for (const item of items) {
    if (item.variantId) continue
    if (!productIdsRequiringVariant.has(item.productId)) continue
    if (!missing.includes(item.productName)) missing.push(item.productName)
  }
  return missing
}

/** Mensagem que a cliente lê. Nomeia os produtos — "algo deu errado" não é acionável. */
export const missingVariantMessage = (names: readonly string[]): string =>
  names.length === 1
    ? `Escolha o tamanho e o acabamento de "${names[0]}" antes de finalizar.`
    : `Escolha o tamanho e o acabamento destes produtos antes de finalizar: ${names.join(', ')}.`
