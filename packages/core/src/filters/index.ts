// `@estrelinha/core/filters` — os filtros de produto (feature 66), e as variações (feature 67).
//
// `.ts` explícito em todo especificador, `export type` incluso: este módulo nasce alcançável fora do
// Vite (ver `__tests__/purity.test.ts`).
export type {
  FilterCatalog,
  FilterGroup,
  FilterSelection,
  FilterValue,
  FilterableProduct,
  FilterableVariant,
  OptionMark,
} from './types.ts'
export * from './rules.ts'
export * from './match.ts'
export * from './facets.ts'
export * from './suggest.ts'
export * from './url.ts'
