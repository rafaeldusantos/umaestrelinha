// As frases contadas da tela de filtros (feature 66) — num lugar só, para a lista, o editor e as
// confirmações dizerem o mesmo número do mesmo jeito.

export const valoresLabel = (n: number): string => (n === 1 ? '1 valor' : `${n} valores`)

export const pecasMarcadasLabel = (n: number): string => (n === 1 ? '1 peça marcada' : `${n} peças marcadas`)

/**
 * "Marcações", e não "peças", no total do GRUPO: uma peça pode ter dois valores do mesmo grupo, e a
 * soma das contagens dos valores conta essa peça duas vezes. O número exato de peças distintas por
 * grupo exigiria trazer cada marcação para o navegador; a palavra certa custa nada.
 *
 * SPEC_DEVIATION: FLT-01 pede "quantidade de produtos marcados" na linha do grupo.
 * Reason: a soma por valor conta duas vezes a peça com dois valores do mesmo grupo — "produtos"
 * seria um número falso. A spec foi emendada (FLT-01) para "marcações".
 */
export const marcacoesLabel = (n: number): string => (n === 1 ? '1 marcação' : `${n} marcações`)

/** A frase da confirmação de remover um VALOR com peças marcadas (`FLT-07`). */
export const perdaDoValor = (n: number): string =>
  `${n === 1 ? '1 peça perde' : `${n} peças perdem`} esta marcação. As peças continuam no catálogo.`

/** A frase da confirmação de remover um GRUPO (`FLT-08`). */
export const perdaDoGrupo = (valores: number, marcacoes: number): string =>
  `Saem junto ${valoresLabel(valores)} e ${marcacoesLabel(marcacoes)}. As peças continuam no catálogo.`
