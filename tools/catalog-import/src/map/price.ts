import type { RawVariant } from '../nuvemshop/types.ts'

/**
 * O preço que a loja de fato cobra por uma variação.
 *
 * A Nuvemshop entrega TRÊS campos de dinheiro por variação, todos como **string decimal**, e a
 * relação entre eles não é óbvia:
 *
 *  - `price` — o preço de tabela;
 *  - `promotional_price` — quando existe, é o que o cliente paga (medido em 94 variações,
 *    ex.: `price: "380.00"` com `promotional_price: "299.00"`);
 *  - `compare_at_price` — o "de" riscado. **Medido igual ao preço em 3.346 das 3.357 variações**,
 *    o que o torna inútil como "de" na esmagadora maioria dos casos.
 *
 * Devolve `null` quando não há preço utilizável — 11 variações medidas. `null` não é erro: é
 * "não vendável", e quem decide o que fazer com isso é o chamador.
 */
export const effectivePrice = (variant: RawVariant): number | null => {
  const raw = variant.promotional_price ?? variant.price
  if (raw === null || raw === undefined || String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/**
 * O "de" riscado — **só quando é maior que o preço cobrado**.
 *
 * Esta guarda é a diferença entre um catálogo correto e 3.346 produtos exibindo um preço riscado
 * idêntico ao preço cobrado. Nenhum gate do projeto pegaria isso: build, `tsc` e teste de
 * componente passam com o dado errado; quem descobre é a cliente.
 */
export const comparePrice = (variant: RawVariant): number | null => {
  const price = effectivePrice(variant)
  if (price === null) return null
  const raw = variant.compare_at_price
  if (raw === null || raw === undefined || String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > price ? value : null
}

/** Decimal em string (`"0.030"`) para número, com `null` no que não for utilizável. */
export const decimal = (raw: string | null | undefined): number | null => {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}
