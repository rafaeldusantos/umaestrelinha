// O texto do estoque de uma variação na montagem da proposta (feature 89, `MON-05`). Fora do
// componente para o `react-refresh` e para o teste lerem a mesma frase que a tela escreve.

// `entities/product/lib` é puro (`buscarProdutos.test.ts` recusa import de pacote do Supabase): a
// política é escrita aqui com os três valores da coluna, e a linha vem descrita pelo que se lê dela.
type Politica = 'track' | 'backorder' | 'none'

/** O texto do estoque de uma linha. Exportado para o teste ler a mesma frase que a tela escreve. */
export const textoDoEstoque = (v: { estoque: number; disponivel: boolean }, politica: Politica): string => {
  if (politica !== 'track') return 'Estoque livre'
  if (!v.disponivel) return 'Sem estoque'
  return v.estoque === 1 ? '1 em estoque' : `${v.estoque} em estoque`
}
