// Feature 71 · `VIS-07`, `VIS-08`, `VIS-09`, `VIS-10`, `VIS-38`, `VIS-39`, `VIS-40`, `VIS-44` — os
// textos do bloco "Movimento da loja", puros e testáveis sem DOM.
//
// **Nenhum dia é decidido aqui.** O banco devolve `hoje`, `ontem`, `inicio_semana` e os `*_dia` como
// texto `AAAA-MM-DD`; este arquivo só os ESCREVE (`formatDayMonth`, por corte de texto) e compara
// texto com texto — `'2026-10-19' <= '2026-10-21'` vale como data porque o formato é fixo. A hora de
// um instante sai de `formatStoreHour`, no fuso da loja. O relógio do navegador da dona não entra.
//
// O número é de NAVEGADORES, nunca de "pessoas" (`VIS-41`): `semPessoas.test.ts` varre este arquivo.

import { formatPrice } from '@estrelinha/core/formatters'
import { formatDayMonth, formatStoreHour } from '@estrelinha/core/time'
import type { MovementPeriodKey, StoreMovement } from '@/entities/stats'

/** `VIS-08` — o texto do ⓘ de Visitas únicas. Constante única do painel. */
export const VISIT_INFO_TEXT =
  'Cada navegador conta uma vez no período: uma vez por dia em Hoje e em Ontem, e uma vez na ' +
  'semana em Esta semana. Celular e computador contam como dois. Abrir a loja pelo Instagram e ' +
  'depois pelo navegador do celular também conta como dois, e cada janela anônima conta como um ' +
  'navegador novo. Quem recusa as estatísticas no aviso de cookies não é contado. As suas próprias ' +
  'visitas à loja também contam.'

const INTEIRO = new Intl.NumberFormat('pt-BR')

/** `VIS-07` — inteiro com separador de milhar pt-BR: `1.234`. */
export const formatCount = (n: number): string => INTEIRO.format(n)

/** O primeiro dia de cada período, como o banco o devolveu. */
const inicioDo = (aba: MovementPeriodKey, m: StoreMovement): string =>
  aba === 'hoje' ? m.hoje : aba === 'ontem' ? m.ontem : m.inicio_semana

/** O último dia de cada período. Esta semana termina hoje. */
const fimDo = (aba: MovementPeriodKey, m: StoreMovement): string => (aba === 'ontem' ? m.ontem : m.hoje)

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

/**
 * `VIS-44` — o teto diário atingido num dia DENTRO do período aberto.
 *
 * SPEC_DEVIATION: o design (C13) escreve `cappedLine(m)`; a assinatura recebe também a aba.
 * Reason: a spec manda a linha aparecer só quando o dia está no período aberto (fixture: aparece em
 * Hoje e Esta semana, some em Ontem), e o período é a aba.
 */
export const cappedLine = (aba: MovementPeriodKey, m: StoreMovement): string | null => {
  if (m.teto_dia === null) return null
  if (m.teto_dia < inicioDo(aba, m) || m.teto_dia > fimDo(aba, m)) return null
  return `Em ${formatDayMonth(m.teto_dia)} o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.`
}
