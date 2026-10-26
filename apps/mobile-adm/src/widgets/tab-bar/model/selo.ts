/**
 * O selo de contagem de uma aba (feature `74`, `MAP-31`..`MAP-33`, A24) — só a FORMA do número.
 *
 * O número em si vem de fora (`fila.precisa_acao` de `store_overview`, pela MESMA chave de cache da
 * Início): esta regra não conta nada, só diz como um número se escreve no selo e no nome acessível.
 */

/** O teto do que o selo escreve por extenso. */
export const SELO_MAXIMO = 99

/** O texto do selo: `null` (sem selo) em zero ou sem leitura; "99+" acima de 99. */
export const textoDoSelo = (n: number | null | undefined): string | null => {
  if (n === null || n === undefined || !Number.isFinite(n) || n <= 0) return null
  return n > SELO_MAXIMO ? `${SELO_MAXIMO}+` : String(Math.floor(n))
}

/**
 * O nome acessível da aba com o selo (`MAP-33`): "Pedidos, 1 precisa de você" · "Pedidos, 5 precisam
 * de você". Sem selo, o rótulo da aba sozinho. O número dito é o mesmo do selo ("99+" acima de 99).
 */
export const nomeDaAbaComSelo = (rotulo: string, n: number | null | undefined): string => {
  const texto = textoDoSelo(n)
  if (!texto) return rotulo
  return `${rotulo}, ${texto} ${n === 1 ? 'precisa' : 'precisam'} de você`
}
