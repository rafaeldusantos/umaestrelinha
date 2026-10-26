// Feature 71 · `VIS-10 (c)` — quanto falta para a virada do dia de Brasília. Movido do painel na
// feature `73`: as duas leituras do ateliê (`store_movement` e `store_overview`) e o bloco do painel
// agendam a releitura pela MESMA conta. Sem import nenhum.
//
// **O prazo é DURAÇÃO do servidor** (`expira_em − lido_em`), contada a partir da chegada da resposta
// (`recebidoEm`, relógio local). Contra o relógio do aparelho (`expira_em − Date.now()`), um aparelho
// adiantado chamaria antes da meia-noite do servidor, receberia o mesmo dia de volta, agendaria zero
// e entraria em laço até a meia-noite de verdade. O piso de 1 s segura o caso degenerado (resposta
// com `expira_em` antes de `lido_em`); `NaN` não agenda nada.

/** Piso do timer da virada: nunca um disparo imediato em laço. */
const PISO_MS = 1_000
/** Teto do `setTimeout` (acima disso o navegador dispara na hora). */
const TETO_MS = 2 ** 31 - 1

/** Os dois instantes que toda leitura com virada de dia devolve. */
export interface ServerClock {
  expira_em: string
  lido_em: string
}

/**
 * Quanto falta para a virada, medido como duração do servidor a partir de `recebidoEm` (relógio
 * local da chegada). `null` quando a resposta não permite saber — e aí não se agenda nada.
 */
export const turnDelayMs = (m: ServerClock, recebidoEm: number, agora: number): number | null => {
  const duracao = Date.parse(m.expira_em) - Date.parse(m.lido_em)
  if (!Number.isFinite(duracao)) return null
  const restante = duracao - (agora - recebidoEm)
  return Math.min(Math.max(restante, PISO_MS), TETO_MS)
}
