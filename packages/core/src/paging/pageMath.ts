/**
 * A aritmética de página de uma listagem paginada no servidor, e o escape do termo de busca.
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE MORA AQUI
 * ---------------------------------------------------------------------------------------------
 * Nasceu em `apps/backoffice/src/entities/product/api/productQuery.ts` na feature "listagem de
 * produtos", com um consumidor só. A feature 34 traz o segundo — a listagem de pedidos e a de
 * clientes fazem exatamente a mesma conta —, e pela consequência 1 do defeito 01 do repositório
 * isso basta para a regra ter dono único.
 *
 * Fica em `core/paging` e não num módulo novo porque é a **mesma família**: aquele arquivo já é o
 * dono de "o PostgREST tem teto e não avisa quando trunca". Página e teto são a mesma pergunta.
 *
 * `productQuery.ts` reexporta daqui: `AdminProductsPage` e os testes da listagem de produtos não
 * mudaram uma linha.
 *
 * **Sem dependência nenhuma, de propósito** — roda em vitest, em Deno e em Node.
 */

/**
 * `(inicio, fim)` do `.range()` do PostgREST — 1-indexed na tela, 0-indexed no servidor.
 *
 * O `Math.max(1, …)` não é zelo: página 0 produziria `range(-25, -1)`, que o PostgREST aceita e
 * responde com a lista vazia. Uma listagem vazia por erro de aritmética é indistinguível de um
 * filtro que não casou nada.
 */
export const pageRange = (page: number, pageSize: number): [number, number] => {
  const safePage = Math.max(1, Math.floor(page))
  const from = (safePage - 1) * pageSize
  return [from, from + pageSize - 1]
}

/**
 * O `X–Y de N` do rodapé.
 *
 * `total` vem do `count` do servidor, **nunca** do tamanho do array. Escrever `rows.length` é o
 * defeito que a tela de Clientes tinha: com a leitura truncada em 1.000 pelo PostgREST, o rodapé
 * exibia com toda a confiança o número errado.
 */
export const rangeLabel = (page: number, pageSize: number, total: number): string => {
  if (total === 0) return '0 de 0'
  const [from] = pageRange(page, pageSize)
  return `${from + 1}–${Math.min(from + pageSize, total)} de ${total}`
}

/**
 * O termo de busca escapado para o `or=(…)` do PostgREST.
 *
 * Vírgula e parêntese fecham a lista de condições: sem escapar, buscar por `Naruto, o filme`
 * viraria três condições quebradas em vez de um termo.
 */
export const escapeSearchTerm = (term: string): string => term.replace(/[(),]/g, ' ').trim()
