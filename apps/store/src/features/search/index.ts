export { default as SearchDropdown } from './ui/SearchDropdown'
export { default as SearchOverlay } from './ui/SearchOverlay'
export { useSearchUiStore } from './model/searchUiStore'
export { MIN_QUERY_LENGTH, normalizeTerm, searchProducts, type SearchHit } from './lib/searchProducts'
// `pickTrendingCategories` mora em `@estrelinha/core/home` desde a T35 da feature 24.
export { trackSearch } from './model/trackSearch'
export { clearRecentSearches, pushRecentSearch, readRecentSearches } from './model/recentSearches'
