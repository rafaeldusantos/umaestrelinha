/**
 * Feature 71 · task 01 — o dono do fuso em TypeScript e a hora escrita pelo bloco.
 *
 * `VIS-34`: o fuso é cópia deliberada entre SQL (`store_time_zone()`) e TypeScript, e do lado do
 * TypeScript ele mora UMA vez, em `time/zone.ts`. `VIS-10`/`VIS-38`/`VIS-40`: a hora escrita pelo
 * bloco é `HHhMM`, sempre no fuso da loja. `VIS-09`: o dia que o banco devolve como texto
 * (`'AAAA-MM-DD'`) é escrito por CORTE de texto — passar por `new Date` o leria como meia-noite UTC,
 * que em Porto Alegre ainda é o dia anterior.
 *
 * O arquivo roda num `describe.each` de fusos porque a máquina local está em São Paulo e o CI em
 * UTC: num fuso só, cada mutante morreria numa máquina e sobreviveria na outra.
 *
 * O módulo é **reimportado em cada ramo**, depois da troca de `TZ`. O formatador da hora é montado
 * no carregamento do módulo, e um `Intl.DateTimeFormat` sem `timeZone` congela o fuso do processo
 * NAQUELE instante: importado uma vez só, no topo, ele nascia sempre no fuso da máquina e o mutante
 * "sem `timeZone`" sobrevivia aos três ramos (medido pelo sensor de mutação desta task).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { STORE_TIME_ZONE } from '../index.ts'

type Modulo = typeof import('../index.ts')

const FUSOS = ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo'] as const
const TZ_ORIGINAL = process.env.TZ

/** O deslocamento medido em cada ramo — o sensor de que a troca de `TZ` pegou. */
const deslocamentos: Record<string, number> = {}

/** A escrita ERRADA do dia, passando por `new Date` — o mutante que o fuso negativo tem de pegar. */
const formatDayMonthMutante = (dia: string): string => {
  const d = new Date(dia)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

describe.each(FUSOS)('no fuso de processo %s', (fuso) => {
  let formatStoreHour: Modulo['formatStoreHour']
  let formatDayMonth: Modulo['formatDayMonth']

  beforeAll(async () => {
    process.env.TZ = fuso
    deslocamentos[fuso] = new Date(0).getTimezoneOffset()
    vi.resetModules()
    ;({ formatStoreHour, formatDayMonth } = await import('../index.ts'))
  })

  it('formatStoreHour escreve a hora de Brasília em HHhMM', () => {
    expect(formatStoreHour('2026-10-21T18:32:00Z')).toBe('15h32')
  })

  it('formatStoreHour usa ciclo de 23 horas — meia-noite é 00, nunca 24', () => {
    expect(formatStoreHour('2026-10-21T03:05:00Z')).toBe('00h05')
  })

  it('formatStoreHour atravessa a virada do dia pelo fuso da loja, não pelo do processo', () => {
    // 02:59 UTC de 21/10 é 23:59 de 20/10 em Brasília.
    expect(formatStoreHour('2026-10-21T02:59:00Z')).toBe('23h59')
  })

  it('formatDayMonth escreve DD/MM por corte de texto', () => {
    expect(formatDayMonth('2026-10-21')).toBe('21/10')
    expect(formatDayMonth('2026-01-05')).toBe('05/01')
  })

  if (fuso === 'America/Sao_Paulo') {
    it('sensor — a escrita por `new Date` REPROVA no fuso negativo (seria 20/10)', () => {
      expect(formatDayMonthMutante('2026-10-21')).toBe('20/10')
      expect(formatDayMonthMutante('2026-10-21')).not.toBe(formatDayMonth('2026-10-21'))
    })
  }
})

describe('o sensor da troca de fuso', () => {
  afterAll(() => {
    if (TZ_ORIGINAL === undefined) delete process.env.TZ
    else process.env.TZ = TZ_ORIGINAL
  })

  it('os três ramos rodaram com deslocamentos DIFERENTES (a troca de TZ pegou)', () => {
    const valores = FUSOS.map((f) => deslocamentos[f])
    expect(valores.every((v) => typeof v === 'number')).toBe(true)
    expect(new Set(valores).size).toBe(3)
  })
})

describe('o dono do fuso', () => {
  it('STORE_TIME_ZONE é America/Sao_Paulo', () => {
    expect(STORE_TIME_ZONE).toBe('America/Sao_Paulo')
  })
})
