/** A altura da barra mais alta e o piso (o protótipo: 84 e 4 px, numa área de 120). */
export const ALTURA_MAXIMA = 84
export const ALTURA_MINIMA = 4

/**
 * A altura de uma barra da seção Acessos (feature `83`, `LAV-52`): `max(4, round(v ÷ máx × 84))`.
 * Sem valor (`null`: faixa futura ou anterior à contagem) ou com o máximo em zero (todos os valores
 * `0`), o piso. Molde de `week-chart/model/barras.ts`.
 */
export const alturaDaBarra = (v: number | null, max: number): number =>
  v === null || max <= 0 ? ALTURA_MINIMA : Math.max(ALTURA_MINIMA, Math.round((v / max) * ALTURA_MAXIMA))
