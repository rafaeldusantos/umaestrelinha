import type { VariantRow } from './variant.ts'

export interface SkuDiscard {
  sku: string
  product_slug: string
  variant_nuvemshop_id: number
  /** `lote` = outra variação do próprio import já usou; `banco` = uma linha que o import não escreve. */
  motivo: 'lote' | 'banco'
}

export interface SkuResolution {
  variants: VariantRow[]
  discarded: SkuDiscard[]
}

/**
 * Decide, para o lote inteiro, qual SKU sobrevive — e nulifica o resto.
 *
 * ## Por que isto existe
 *
 * `product_variants.sku` é `UNIQUE` **global** desde a migration inicial (`20260414121021:53`), e o
 * catálogo real desta loja tem **1.466 SKUs duplicados** entre os 2.405 preenchidos: 654 dentro do
 * próprio produto e 812 entre produtos diferentes. O campeão, `BA-002`, aparece **316 vezes em 68
 * produtos**. Nesta loja o SKU é um código de material, não um identificador de linha vendável.
 *
 * Gravar como vem aborta o insert. Então a escolha é entre perder o SKU e perder a variação — e o
 * projeto já a fez uma vez, no backfill de variações
 * (`20260801120100_02-backfill-variants.sql:76-90`): *perder o sku (recuperável na tela) em vez de
 * perder a variação (não recuperável)*. Esta função é aquela regra, em código.
 *
 * ## Determinismo
 *
 * Vence a **primeira ocorrência na ordem recebida**, que é a ordem da API (produtos na ordem das
 * páginas, variações na ordem de `position`). Rodar duas vezes com a mesma entrada preserva os
 * mesmos SKUs — sem isso, a re-execução ficaria trocando qual variação fica com o código.
 *
 * @param taken SKUs já ocupados por linhas que **este import não escreve** (variação criada à mão
 *   no admin). Não inclua as linhas do próprio lote: a variação que já tem o SKU no banco é a mesma
 *   que está sendo atualizada, e nulificar por "já existe" a faria perder o próprio código.
 */
export const dedupeSkus = (
  variants: readonly VariantRow[],
  slugByProduct: ReadonlyMap<number, string>,
  taken: ReadonlySet<string> = new Set(),
): SkuResolution => {
  const usados = new Set(taken)
  const discarded: SkuDiscard[] = []

  const resolved = variants.map(variant => {
    if (variant.sku === null) return variant

    if (usados.has(variant.sku)) {
      discarded.push({
        sku: variant.sku,
        product_slug: slugByProduct.get(variant.product_nuvemshop_id) ?? '',
        variant_nuvemshop_id: variant.nuvemshop_id,
        motivo: taken.has(variant.sku) ? 'banco' : 'lote',
      })
      return { ...variant, sku: null }
    }

    usados.add(variant.sku)
    return variant
  })

  return { variants: resolved, discarded }
}
