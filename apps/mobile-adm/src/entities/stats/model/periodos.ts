import type { MovementPeriodKey } from '@estrelinha/core/stats'

/**
 * Os três períodos do movimento — o ÚNICO dono do vocabulário de período no app (feature `83`,
 * `LAV-50`, `AD-033`: dois widgets do mesmo app ⇒ `entities/`). Morava em
 * `widgets/movement-hero/model/numeros.ts` (feature `73`), que agora o reexporta por referência; a
 * faixa do Início, o cartão "Visitas hoje" e a seção Acessos leem daqui.
 * `periodosComDonoUnico.test.ts` recusa uma segunda lista no app.
 */
export const PERIODOS: readonly { id: MovementPeriodKey; rotulo: string; falado: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', falado: 'hoje' },
  { id: 'ontem', rotulo: 'Ontem', falado: 'ontem' },
  { id: 'semana', rotulo: 'Semana', falado: 'esta semana' },
]

/** O valor é um período do vocabulário? Qualquer outra coisa (`'mes'`, `3`, `null`) não é. */
export const ehPeriodo = (v: unknown): v is MovementPeriodKey => PERIODOS.some((p) => p.id === v)
