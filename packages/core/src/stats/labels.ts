// Feature `73` · `MAI-03`, `MAI-04`, `MAI-10`, `MAI-11`, `MAI-13`, `MAI-14` — as palavras da Início.
//
// **Nenhum dia é decidido aqui** (`AD-055`). O banco devolve o dia (`'AAAA-MM-DD'`), o mês
// (`'AAAA-MM'`) e o instante da leitura; este arquivo só os ESCREVE. O dia vira palavra por
// aritmética sobre o TEXTO — nunca por `new Date` sobre a data nua, que a leria como meia-noite UTC
// (em Porto Alegre, ainda o dia anterior). A hora da saudação é a de Brasília do instante que o
// banco devolveu, escrita com `STORE_TIME_ZONE`, nunca a do relógio do aparelho.
//
// "Há quanto tempo" (`relativeAge`) é DURAÇÃO entre dois instantes do servidor, nunca calendário.

import { STORE_TIME_ZONE } from '../time/zone.ts'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

/** Índice ISO (segunda = 1 … domingo = 7). */
const DIAS_CURTOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'] as const
const DIAS_LONGOS = [
  'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
] as const

const DIA_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MES_RE = /^(\d{4})-(\d{2})$/

/** `'AAAA-MM-DD'` ⇒ as três partes, ou lança. */
const partesDoDia = (dia: string): [number, number, number] => {
  const m = DIA_RE.exec(dia)
  if (!m) throw new Error(`dia ilegível: ${dia}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/**
 * O dia da semana ISO de um dia de CALENDÁRIO (`'AAAA-MM-DD'`). `Date.UTC` é aritmética pura sobre
 * as três partes — o resultado não depende do fuso do processo.
 */
export const isoWeekday = (dia: string): number => {
  const [a, m, d] = partesDoDia(dia)
  const dom0 = new Date(Date.UTC(a, m - 1, d)).getUTCDay() // 0 = domingo
  return dom0 === 0 ? 7 : dom0
}

/** `1..7` ⇒ `'seg'..'dom'`. */
export const weekdayShort = (isodow: number): string => {
  const nome = DIAS_CURTOS[isodow - 1]
  if (!nome) throw new Error(`dia da semana inválido: ${isodow}`)
  return nome
}

/** `'2026-10'` (ou `'2026-10-22'`) ⇒ `'outubro'`, por corte de texto. */
export const monthName = (mes: string): string => {
  const m = MES_RE.exec(mes.slice(0, 7))
  const nome = m ? MESES[Number(m[2]) - 1] : undefined
  if (!nome) throw new Error(`mês ilegível: ${mes}`)
  return nome
}

/** `'2026-10-22'` ⇒ `'quinta-feira, 22 de outubro'`. */
export const longDateLine = (dia: string): string => {
  const [, , d] = partesDoDia(dia)
  return `${DIAS_LONGOS[isoWeekday(dia) - 1]}, ${d} de ${monthName(dia)}`
}

const HORA = new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' })

/** A hora (0..23) de Brasília de um instante ISO. `NaN` para instante ilegível. */
export const storeHour = (iso: string): number => {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return Number.NaN
  const h = HORA.formatToParts(new Date(t)).find((p) => p.type === 'hour')?.value
  return Number(h)
}

/** 05:00–11:59 ⇒ "Bom dia"; 12:00–17:59 ⇒ "Boa tarde"; 18:00–04:59 ⇒ "Boa noite". */
export const greetingFor = (hora: number): string => {
  if (hora >= 5 && hora < 12) return 'Bom dia'
  if (hora >= 12 && hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`

/** `1 peça` · `2 peças` · `0 peças`. */
export const piecesLabel = (n: number): string => plural(n, 'peça', 'peças')

/** `1 pedido pago` · `38 pedidos pagos`. */
export const paidOrdersLabel = (n: number): string => plural(n, 'pedido pago', 'pedidos pagos')

/** O valor de uma barra do gráfico, em R$ mil com ATÉ uma casa (`1,3`, `1`, `0,3`); `—` sem venda. */
export const thousandsLabel = (valor: number): string =>
  valor > 0 ? (valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'

const MINUTO = 60_000
const HORA_MS = 60 * MINUTO
const DIA_MS = 24 * HORA_MS

/**
 * Há quanto tempo, por DURAÇÃO entre dois instantes do servidor: `agora` · `há 12 min` · `há 3 h` ·
 * `há 1 dia` · `há 2 dias`. Piso 0: data no futuro conta como agora. `''` para instante ilegível.
 */
export const relativeAge = (desde: string, agora: string): string => {
  const d = Date.parse(agora) - Date.parse(desde)
  if (!Number.isFinite(d)) return ''
  const ms = Math.max(0, d)
  if (ms < MINUTO) return 'agora'
  if (ms < HORA_MS) return `há ${Math.floor(ms / MINUTO)} min`
  if (ms < DIA_MS) return `há ${Math.floor(ms / HORA_MS)} h`
  const dias = Math.floor(ms / DIA_MS)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
