// Os limites da proposta (feature 89). A function `order-proposals` e a `checkout` a leem por caminho
// relativo no Deno, e o guarda da migration compara os números com os `check`s. O único import é a
// folha `checkout/guestAccess.ts` (sem import nenhum), dona do prazo de 7 dias.

import { GUEST_ACCESS_DAYS } from '../checkout/guestAccess.ts'

/** Linhas por proposta. */
export const PROPOSAL_MAX_LINES = 30
/** Quantidade por linha (1..99, o `check` da coluna). */
export const PROPOSAL_MAX_QTY = 99
/** Motivo do desconto avulso, interno (MON-08). */
export const MANUAL_REASON_MAX = 120
/** Os itens, depois de todos os descontos, somam pelo menos isto (A-12). */
export const PROPOSAL_MIN_ITEMS_TOTAL = 1
/** O percentual do desconto avulso vai de 0,01 a 99,99 (A-12). */
export const MANUAL_PERCENT_MIN = 0.01
export const MANUAL_PERCENT_MAX = 99.99
/**
 * Dias de validade do link — o MESMO prazo do acesso da convidada (A-03). Derivado, não repetido: o
 * dono é `GUEST_ACCESS_DAYS` (fecho da rodada 1 do Verifier).
 */
export const PROPOSAL_LINK_DAYS = GUEST_ACCESS_DAYS
