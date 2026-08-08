/**
 * Itens de página a exibir: primeira, última e a janela ±1 ao redor da página atual,
 * com 'ellipsis' onde houver salto. Função pura (extraída do AdminProductsPage).
 */
export const getPageItems = (page: number, totalPages: number): (number | 'ellipsis')[] =>
  Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, n, i, arr) => {
      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('ellipsis')
      acc.push(n)
      return acc
    }, [])
