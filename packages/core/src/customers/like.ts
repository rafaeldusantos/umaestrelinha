// Feature `76` · `MAC-06`, `MAC-25`, `AD-061`, `A14` — o escape do LIKE e do valor do PostgREST, com
// UM dono. Antes, a busca do painel só tirava `( ) ,` do termo (`escapeSearchTerm`): `%`, `_` e `\`
// eram curinga ou perdiam o sentido, e a ficha de uma pessoa podia puxar o pedido de outra
// (`VROSA_RJ` × `VROSAXRJ`). O app do ateliê manda o valor SEMPRE entre aspas, com o escape certo.
//
// A ordem importa e é testada: o LIKE escapa primeiro (`\ % _`), o PostgREST escapa o resultado
// (`\ "`) — porque o `\` do LIKE também é um `\` para o parser do filtro.
//
// O `*` (medido pelo probe da T02, `probes/01-banco.saida.txt`): o PostgREST o troca por `%` em
// `like`/`ilike` MESMO escapado (`\*` vira `\%`, que não casa nada), então não há como pedir o `*`
// literal. Ele vira `_` (curinga de UM caractere): acha a pessoa cujo nome tem `*` e, no máximo, um
// vizinho de um caractere — falso positivo inofensivo, nunca falso negativo (um espaço a perderia).
//
// Sem import nenhum: alcançável pelo Deno e por Node por construção.

/** Só o escape de LIKE (`\` `%` `_`), mais o `*`, que o PostgREST não deixa chegar literal. */
export const escapeLike = (valor: string): string => valor.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_')

/** O valor de um filtro do PostgREST entre aspas: `\` e `"` escapados. Dentro delas `( ) , .` são texto. */
const quote = (valor: string): string => `"${valor.replace(/[\\"]/g, '\\$&')}"`

/** `"%termo%"`, o termo como literal. */
export const ilikeContains = (valor: string): string => quote(`%${escapeLike(valor)}%`)

/** `"termo"` sem `%`: a comparação exata, sem caixa (o banco liga por `lower(email)`). */
export const ilikeExact = (valor: string): string => quote(escapeLike(valor))
