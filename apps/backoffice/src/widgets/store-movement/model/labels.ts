// Feature 71 · `VIS-07`, `VIS-08`, `VIS-09`, `VIS-10`, `VIS-38`, `VIS-39`, `VIS-40`, `VIS-44` — os
// textos do bloco "Movimento da loja", puros e testáveis sem DOM.
//
// **Nenhum dia é decidido aqui.** O banco devolve `hoje`, `ontem`, `inicio_semana` e os `*_dia` como
// texto `AAAA-MM-DD`; este arquivo só os ESCREVE (`formatDayMonth`, por corte de texto) e compara
// texto com texto — `'2026-10-19' <= '2026-10-21'` vale como data porque o formato é fixo. A hora de
// um instante sai de `formatStoreHour`, no fuso da loja. O relógio do navegador da dona não entra.
//
// O número é de NAVEGADORES, nunca de "pessoas" (`VIS-41`): `semPessoas.test.ts` varre este arquivo.
//
// Feature `83` (`LAV-75`): as três notas do contador (`countingSinceLine`, `emptyCounterLine`,
// `cappedLine`) e o inteiro pt-BR (`formatCount`) subiram para `@estrelinha/core/stats`, que a Loja ao
// vivo do app do ateliê também lê. Este arquivo os REEXPORTA por referência
// (`app/__tests__/notasDoContadorNoCore.test.ts`, `toBe`): os chamadores do painel não mudam.

import { formatPrice } from '@estrelinha/core/formatters'
import { formatCount } from '@estrelinha/core/stats'
import { formatDayMonth, formatStoreHour } from '@estrelinha/core/time'
import type { MovementPeriodKey, StoreMovement } from '@/entities/stats'

export { cappedLine, countingSinceLine, emptyCounterLine, formatCount } from '@estrelinha/core/stats'

/** `VIS-08` — o texto do ⓘ de Visitas únicas. Constante única do painel. */
export const VISIT_INFO_TEXT =
  'Cada navegador conta uma vez no período: uma vez por dia em Hoje e em Ontem, e uma vez na ' +
  'semana em Esta semana. Celular e computador contam como dois. Abrir a loja pelo Instagram e ' +
  'depois pelo navegador do celular também conta como dois, e cada janela anônima conta como um ' +
  'navegador novo. Quem recusa as estatísticas no aviso de cookies não é contado. As suas próprias ' +
  'visitas à loja também contam.'

/** `VIS-09` — a linha abaixo das abas. */
export const periodLine = (aba: MovementPeriodKey, m: StoreMovement): string => {
  if (aba === 'hoje') return `Hoje, ${formatDayMonth(m.hoje)}`
  if (aba === 'ontem') return `Ontem, ${formatDayMonth(m.ontem)}`
  if (m.inicio_semana === m.hoje) return `Semana iniciada hoje, ${formatDayMonth(m.hoje)}`
  return `De ${formatDayMonth(m.inicio_semana)} a ${formatDayMonth(m.hoje)}`
}

export interface PeriodValues {
  visitas: string
  vendas: string
  faturamento: string
  ticket: string
}

/**
 * `VIS-07` — os quatro valores do período, escritos.
 *
 * O ticket é o valor que o BANCO arredondou (`round(soma / n, 2)`); `formatPrice` só formata.
 * Recalcular aqui seria uma segunda régua de arredondamento. Card sem valor mostra ZERO, nunca `—`
 * (decisão do usuário, 2026-10-22): ticket sem venda é `R$ 0,00`, e Visitas com o contador nunca
 * usado é `0` — quem explica por quê é `emptyCounterLine` (`VIS-39`), logo abaixo do número.
 */
export const periodValues = (aba: MovementPeriodKey, m: StoreMovement): PeriodValues => {
  const p = m.periodos[aba]
  return {
    visitas: formatCount(p.visitas),
    vendas: formatCount(p.vendas),
    faturamento: formatPrice(p.faturamento),
    ticket: formatPrice(p.ticket ?? 0),
  }
}

/** `VIS-10` — "Atualizado às 15h32", da última leitura boa. */
export const updatedAtLine = (m: StoreMovement): string => `Atualizado às ${formatStoreHour(m.lido_em)}`

/** `VIS-40` — a última visita registrada, comparada com o `hoje` e o `ontem` do banco. */
export const lastVisitLine = (m: StoreMovement): string | null => {
  if (m.ultima_visita === null || m.ultima_visita_dia === null) return null
  const hora = formatStoreHour(m.ultima_visita)
  const quando =
    m.ultima_visita_dia === m.hoje
      ? `hoje às ${hora}`
      : m.ultima_visita_dia === m.ontem
        ? `ontem às ${hora}`
        : `em ${formatDayMonth(m.ultima_visita_dia)} às ${hora}`
  return `Última visita registrada: ${quando}`
}
