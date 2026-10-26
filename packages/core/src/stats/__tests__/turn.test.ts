/**
 * Feature `73` · task 04 — `turnDelayMs`, movido do painel (feature `71`, `VIS-10 c`).
 *
 * Na `71` a conta só era provada pelo hook (`useStoreMovement.test.ts`, que vai a `core` na T05 sem
 * perda de caso). Aqui ela é provada pura, ramo a ramo: duração do servidor (nunca o relógio do
 * aparelho), o tempo já passado desde a chegada, o piso de 1 s, o teto do `setTimeout` e o `null`.
 */
import { describe, expect, it } from 'vitest'

import { turnDelayMs } from '../turn.ts'

const H = 3_600_000

describe('turnDelayMs', () => {
  const resposta = { lido_em: '2026-10-21T18:00:00.000Z', expira_em: '2026-10-22T03:00:00.000Z' }

  it('é a duração do servidor (expira_em − lido_em), contada da chegada', () => {
    expect(turnDelayMs(resposta, 1_000, 1_000)).toBe(9 * H)
  })

  it('não lê o relógio do aparelho: o mesmo par dá a mesma espera com `agora` em qualquer época', () => {
    expect(turnDelayMs(resposta, Date.UTC(2030, 0, 1), Date.UTC(2030, 0, 1))).toBe(9 * H)
  })

  it('desconta o tempo passado desde a chegada', () => {
    expect(turnDelayMs(resposta, 0, 2 * H)).toBe(7 * H)
  })

  it('piso de 1 s — nunca um disparo imediato em laço', () => {
    expect(turnDelayMs({ lido_em: resposta.lido_em, expira_em: '2026-10-21T17:59:55.000Z' }, 0, 0)).toBe(1_000)
    expect(turnDelayMs(resposta, 0, 10 * H)).toBe(1_000)
  })

  it('teto de 2^31 − 1 ms (acima disso o navegador dispara na hora)', () => {
    expect(turnDelayMs({ lido_em: resposta.lido_em, expira_em: '2027-10-21T18:00:00.000Z' }, 0, 0)).toBe(2 ** 31 - 1)
  })

  it('instante ilegível ⇒ `null` (não agenda nada)', () => {
    expect(turnDelayMs({ lido_em: resposta.lido_em, expira_em: 'não é data' }, 0, 0)).toBeNull()
    expect(turnDelayMs({ lido_em: 'x', expira_em: resposta.expira_em }, 0, 0)).toBeNull()
  })
})
