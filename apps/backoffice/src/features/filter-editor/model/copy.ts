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

/**
 * A contagem da linha de um VALOR em `/admin/filtros` — feature 67 (D2 da prova em navegador).
 *
 * A linha dizia "Chaveiro · 0 peças marcadas" com 145 marcações por opção: o número ignorava a forma
 * nova, e aprovar uma sugestão por opção não mudava nada na tela (`VFL-24` pela metade).
 *
 * As duas formas vêm em UNIDADES diferentes, e a frase não as soma: `marked_count` conta PEÇAS (a
 * chave de `product_filter_values` é peça × valor), `option_marked_count` conta MARCAÇÕES (uma peça
 * pode ter o valor em duas opções — "Chaveiro" e "Chaveiro Inox"). Peças distintas com o valor
 * exigiriam trazer cada marcação ao navegador; somar diria "peças" contando a mesma peça duas vezes
 * (a que tem as duas formas, ou duas opções). Sem marcação por opção, a frase é a da 66, intacta.
 */
export const contagemDoValor = (naPeca: number, porOpcao = 0): string => {
  if (porOpcao === 0) return pecasMarcadasLabel(naPeca)
  const opcoes = `${marcacoesLabel(porOpcao)} por opção`
  if (naPeca === 0) return opcoes
  return `${naPeca === 1 ? '1 peça' : `${naPeca} peças`} na peça toda · ${opcoes}`
}

/**
 * O cabeçalho da marcação em massa de UM valor — feature 67 (D2). Ali as duas formas chegam POR PEÇA
 * (os ids da peça toda e o mapa peça → opções), então as peças distintas SÃO deriváveis: a união.
 * A peça com as duas formas conta uma vez no total, e aparece nas duas parcelas.
 */
export const pecasDoValor = (naPeca: ReadonlySet<string>, porOpcao: Iterable<string>): string => {
  const opcao = new Set(porOpcao)
  if (opcao.size === 0) return pecasMarcadasLabel(naPeca.size)
  const total = new Set([...naPeca, ...opcao]).size
  if (naPeca.size === 0) return `${pecasMarcadasLabel(total)} por opção`
  return `${pecasMarcadasLabel(total)} · ${naPeca.size} na peça toda · ${opcao.size} por opção`
}

/**
 * A frase da confirmação de remover um VALOR com peças marcadas (`FLT-07`).
 *
 * Desde a feature 67 o valor também pode estar marcado POR OPÇÃO, e a cascata leva essas junto: a
 * frase soma as duas (edge case da spec da 67). Sem marcação por opção, a frase é a da 66, intacta.
 */
export const perdaDoValor = (n: number, porOpcao = 0): string => {
  if (porOpcao === 0)
    return `${n === 1 ? '1 peça perde' : `${n} peças perdem`} esta marcação. As peças continuam no catálogo.`
  const opcoes = porOpcao === 1 ? '1 marcação por opção' : `${porOpcao} marcações por opção`
  if (n === 0) return `Saem junto ${opcoes}. As peças continuam no catálogo.`
  return `${n === 1 ? '1 peça perde' : `${n} peças perdem`} esta marcação, e saem junto ${opcoes}. As peças continuam no catálogo.`
}

/** A frase da confirmação de remover um GRUPO (`FLT-08`). */
export const perdaDoGrupo = (valores: number, marcacoes: number): string =>
  `Saem junto ${valoresLabel(valores)} e ${marcacoesLabel(marcacoes)}. As peças continuam no catálogo.`
