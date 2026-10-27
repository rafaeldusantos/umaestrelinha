// Feature 71 · `VIS-38`, `VIS-39`, `VIS-44` — as três notas do contador, com UM dono (feature `83`,
// `LAV-54`, `LAV-75`). Subiram BYTE A BYTE de `apps/backoffice/src/widgets/store-movement/model/
// labels.ts`: o painel e a Loja ao vivo do app do ateliê escrevem as mesmas três frases, e duas
// escritas da mesma regra divergem sem nada quebrar (o defeito 01). O painel as REEXPORTA
// (`notasDoContadorNoCore.test.ts`, `toBe`).
//
// **Nenhum dia é decidido aqui.** O banco devolve `hoje`, `ontem`, `inicio_semana` e os `*_dia` como
// texto `AAAA-MM-DD`; este arquivo só os ESCREVE (`formatDayMonth`, por corte de texto) e compara
// texto com texto — `'2026-10-19' <= '2026-10-21'` vale como data porque o formato é fixo. A hora de
// um instante sai de `formatStoreHour`, no fuso da loja. O relógio do aparelho não entra.
//
// O número é de NAVEGADORES, nunca de "pessoas" (`VIS-41`): `semPessoas.test.ts` (painel) varre este
// arquivo.

import { formatDayMonth, formatStoreHour } from '../time/format.ts'
import type { MovementPeriodKey, StoreMovement } from './movement.ts'

/** O primeiro dia de cada período, como o banco o devolveu. */
const inicioDo = (aba: MovementPeriodKey, m: StoreMovement): string =>
  aba === 'hoje' ? m.hoje : aba === 'ontem' ? m.ontem : m.inicio_semana

/** O último dia de cada período. Esta semana termina hoje. */
const fimDo = (aba: MovementPeriodKey, m: StoreMovement): string => (aba === 'ontem' ? m.ontem : m.hoje)

/**
 * `VIS-38` — o subtítulo de Visitas únicas quando o período começa ANTES da contagem.
 *
 * O período começa às 00:00 do primeiro dia; ele é anterior a `contagem_desde` sempre que o primeiro
 * dia não passa do dia da contagem (texto contra texto).
 */
export const countingSinceLine = (aba: MovementPeriodKey, m: StoreMovement): string | null => {
  if (m.contagem_desde === null || m.contagem_desde_dia === null) return null
  if (inicioDo(aba, m) > m.contagem_desde_dia) return null
  return `Contando desde ${formatDayMonth(m.contagem_desde_dia)} às ${formatStoreHour(m.contagem_desde)}`
}

/** `VIS-39` — por que Visitas está em `0`. O host é o que o BANCO usa, nunca o do hook de configurações. */
export const emptyCounterLine = (m: StoreMovement): string | null => {
  if (m.contagem_desde !== null) return null
  const host = m.production_host.trim()
  if (host === '') return 'O contador está parado: falta configurar o endereço de produção da loja.'
  return `Nenhuma visita registrada ainda. O contador só conta na loja em ${host}.`
}

/**
 * `VIS-44` — o teto diário atingido num dia DENTRO do período aberto.
 *
 * SPEC_DEVIATION (da `71`): o design (C13) escreve `cappedLine(m)`; a assinatura recebe também a aba.
 * Reason: a spec manda a linha aparecer só quando o dia está no período aberto (fixture: aparece em
 * Hoje e Esta semana, some em Ontem), e o período é a aba.
 */
export const cappedLine = (aba: MovementPeriodKey, m: StoreMovement): string | null => {
  if (m.teto_dia === null) return null
  if (m.teto_dia < inicioDo(aba, m) || m.teto_dia > fimDo(aba, m)) return null
  return `Em ${formatDayMonth(m.teto_dia)} o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.`
}
