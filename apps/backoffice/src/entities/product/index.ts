export * from './api/useAdminProducts'

// A busca de produto do painel (feature 51). As cinco superfícies importam **daqui**, e não de
// caminho profundo: é o que faz `BUS-07` ser verificável por varredura — um arquivo que monte lista
// própria não tem como se esconder atrás de um import diferente.
export * from './api/useProductPool'
export * from './api/useProductsByIds'
// Feature 66: o catálogo com tags e categorias, para a marcação em massa dos filtros.
export * from './api/useProductMarkingPool'
export * from './lib/buscarProdutos'
export { default as ProductSearchField } from './ui/ProductSearchField'
export type { ProductSearchFieldProps } from './ui/ProductSearchField'
