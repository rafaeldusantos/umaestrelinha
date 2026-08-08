// Os contadores de `Categorias` e `Tags` da aba Geral.
//
// Eles moram no `model/` e não no componente porque quem os **renderiza** é o cabeçalho do card
// (artboard `Produto — aba Geral`), não o campo: o artboard põe `3 selecionadas` e `6 de 15` no canto
// direito do título, ao lado de `Categorias` e `Tags`. O texto é regra de domínio (plural, teto), o
// lugar é decisão de layout — separá-los é o que permite ao card exibir a contagem sem duplicar a
// que o componente mostrava por dentro.

/** Teto de PFM-06 AC 10. Acima disso a tag deixa de classificar e vira ruído de busca. */
export const MAX_TAGS = 15

/** `3 selecionadas` · `1 selecionada` (PFM-05 AC 1). */
export const selectionLabel = (count: number): string =>
  `${count} selecionada${count === 1 ? '' : 's'}`

/** `6 de 15` (PFM-06 AC 10) — a contagem contra o teto, não contra o que já foi digitado. */
export const tagCounterLabel = (count: number): string => `${count} de ${MAX_TAGS}`
