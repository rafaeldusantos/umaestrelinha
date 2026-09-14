// O modo de uma leitura de lista do painel (feature 50, `VIV-01`/`VIV-02`/`VIV-11`).
//
// Os hooks de lista do painel (`useAdminHomeSections`, `useAdminCategories`) eram ao mesmo tempo
// "carregar" e "revalidar", e a tela só sabia ler a primeira: toda gravação chamava a mesma função,
// que ligava `loading`, e as duas páginas trocavam a árvore inteira por `<TableSkeleton/>`. Isso
// **desmontava o `<iframe>` da prévia**, que remontava recarregando a loja. O que piscava não era o
// navegador: era o React.
//
// A distinção mora AQUI, num lugar só, e não em cada hook: dois nomes diferentes para o mesmo modo
// seriam o "defeito 01" no tamanho de um tipo — e o terceiro hook nasceria com um terceiro nome.
//
// - `'inicial'`  — a primeira carga. Liga `loading` e, em falha, esvazia a lista (não há o que
//                  preservar, e uma lista vazia com faixa de erro é a superfície de hoje).
// - `'revalidar'` — a releitura que segue uma gravação. **Não** liga `loading` e, em falha, grava
//                  `error` **mantendo** as linhas que já estavam na tela (`VIV-07`).
export type FetchMode = 'inicial' | 'revalidar'
