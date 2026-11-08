// A régua da busca de produto. O dono é `@estrelinha/core/product-search`, lido também pelo app do
// ateliê; daqui ela é só reexportada, por referência — `ProductSearchField` e os cinco consumidores
// continuam importando do slice.
export {
  buscarProdutos,
  RESULTADOS_VISIVEIS,
  type OpcoesDaBusca,
  type ProdutoDoPool,
  type ResultadoDaBusca,
} from '@estrelinha/core/product-search'
