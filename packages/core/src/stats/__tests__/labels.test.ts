/**
 * Feature `73` · task 04 — as palavras da Início (`MAI-03`, `MAI-04`, `MAI-10`, `MAI-11`, `MAI-13`,
 * `MAI-14`), e o dia que nunca é recalculado pelo aparelho (`AD-055`).
 *
 * O arquivo roda num `describe.each` de fusos de PROCESSO, inclusive dois negativos (o de São Paulo e
 * o de Los Angeles): é num fuso negativo que `new Date('2026-10-22')` vira 21/10 — o mutante que o
 * dia lido "como data" produz. O módulo é **reimportado em cada ramo** depois da troca de `TZ`,
 * porque o formatador da hora é montado no carregamento (o sensor de que a troca pegou está no fim).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

type Modulo = typeof import('../labels.ts')

const FUSOS = ['UTC', 'America/Sao_Paulo', 'America/Los_Angeles', 'Asia/Tokyo'] as const
const TZ_ORIGINAL = process.env.TZ
const deslocamentos: Record<string, number> = {}

/** A escrita ERRADA do dia da semana, lendo o texto como data — o mutante que o fuso negativo pega. */
const isoWeekdayMutante = (dia: string): number => {
  const d = new Date(dia).getDay()
  return d === 0 ? 7 : d
}

describe.each(FUSOS)('no fuso de processo %s', (fuso) => {
  let m: Modulo

  beforeAll(async () => {
    process.env.TZ = fuso
    deslocamentos[fuso] = new Date(Date.UTC(2026, 9, 22)).getTimezoneOffset()
    vi.resetModules()
    m = await import('../labels.ts')
  })

  describe('a saudação, pela hora de Brasília do instante do banco (MAI-04)', () => {
    it.each([
      [4, 'Boa noite'],
      [5, 'Bom dia'],
      [11, 'Bom dia'],
      [12, 'Boa tarde'],
      [17, 'Boa tarde'],
      [18, 'Boa noite'],
      [23, 'Boa noite'],
      [0, 'Boa noite'],
    ])('%i h ⇒ %s', (h, esperado) => {
      expect(m.greetingFor(h)).toBe(esperado)
    })

    it.each([
      // As seis bordas do design em instantes UTC (Brasília = UTC−3).
      ['2026-10-22T07:59:00Z', 4, 'Boa noite'], // 04:59
      ['2026-10-22T08:00:00Z', 5, 'Bom dia'], // 05:00
      ['2026-10-22T14:59:00Z', 11, 'Bom dia'], // 11:59
      ['2026-10-22T15:00:00Z', 12, 'Boa tarde'], // 12:00
      ['2026-10-22T20:59:00Z', 17, 'Boa tarde'], // 17:59
      ['2026-10-22T21:00:00Z', 18, 'Boa noite'], // 18:00
    ])('%s ⇒ %i h ⇒ %s', (iso, hora, saudacao) => {
      expect(m.storeHour(iso)).toBe(hora)
      expect(m.greetingFor(m.storeHour(iso))).toBe(saudacao)
    })

    it('instante ilegível ⇒ hora NaN', () => {
      expect(m.storeHour('não é data')).toBeNaN()
    })
  })

  describe('o dia, por texto (MAI-04, MAI-10)', () => {
    it('22/10/2026 é quinta-feira (ISO 4)', () => {
      expect(m.isoWeekday('2026-10-22')).toBe(4)
      expect(m.longDateLine('2026-10-22')).toBe('quinta-feira, 22 de outubro')
    })

    it('segunda é 1 e domingo é 7', () => {
      expect(m.isoWeekday('2026-10-19')).toBe(1)
      expect(m.isoWeekday('2026-10-25')).toBe(7)
    })

    it('o dia 1 do mês e o fim do ano', () => {
      expect(m.longDateLine('2026-11-01')).toBe('domingo, 1 de novembro')
      expect(m.longDateLine('2026-12-31')).toBe('quinta-feira, 31 de dezembro')
    })

    it.each([
      [1, 'seg'], [2, 'ter'], [3, 'qua'], [4, 'qui'], [5, 'sex'], [6, 'sáb'], [7, 'dom'],
    ])('dia ISO %i ⇒ %s', (n, nome) => {
      expect(m.weekdayShort(n)).toBe(nome)
    })

    it('dia da semana fora de 1..7 lança', () => {
      expect(() => m.weekdayShort(0)).toThrow('dia da semana inválido: 0')
      expect(() => m.weekdayShort(8)).toThrow()
    })

    it('dia ilegível lança — nunca um dia inventado', () => {
      expect(() => m.isoWeekday('22/10/2026')).toThrow('dia ilegível')
    })
  })

  describe('o mês (MAI-11)', () => {
    it.each([
      ['2026-01', 'janeiro'], ['2026-03', 'março'], ['2026-10', 'outubro'], ['2026-12', 'dezembro'],
      ['2026-10-01', 'outubro'],
    ])('%s ⇒ %s', (mes, nome) => {
      expect(m.monthName(mes)).toBe(nome)
    })

    it('mês ilegível lança', () => {
      expect(() => m.monthName('2026-13')).toThrow('mês ilegível')
      expect(() => m.monthName('outubro')).toThrow()
    })
  })

  describe('os plurais (MAI-11, MAI-13)', () => {
    it.each([
      [0, '0 peças', '0 pedidos pagos'],
      [1, '1 peça', '1 pedido pago'],
      [2, '2 peças', '2 pedidos pagos'],
      [38, '38 peças', '38 pedidos pagos'],
    ])('%i ⇒ %s · %s', (n, pecas, pedidos) => {
      expect(m.piecesLabel(n)).toBe(pecas)
      expect(m.paidOrdersLabel(n)).toBe(pedidos)
    })
  })

  describe('a barra do gráfico em R$ mil (MAI-10)', () => {
    it.each([
      [0, '—'],
      [612, '0,6'],
      [1077, '1,1'],
      [1298, '1,3'],
      [12480, '12,5'],
      [2000, '2'],
      // "com ATÉ uma casa" (`maximumFractionDigits: 1`, o protótipo): o milhar exato não ganha ",0".
      [1000, '1'],
      [1500, '1,5'],
      [289, '0,3'],
    ])('%i ⇒ %s', (v, esperado) => {
      expect(m.thousandsLabel(v)).toBe(esperado)
    })
  })

  describe('há quanto tempo — duração entre dois instantes do servidor (MAI-14)', () => {
    const agora = '2026-10-22T15:00:00.000Z'
    it.each([
      ['2026-10-22T15:00:00.000Z', 'agora'],
      ['2026-10-22T14:59:01.000Z', 'agora'],
      ['2026-10-22T14:59:00.000Z', 'há 1 min'],
      ['2026-10-22T14:48:00.000Z', 'há 12 min'],
      ['2026-10-22T14:00:01.000Z', 'há 59 min'],
      ['2026-10-22T14:00:00.000Z', 'há 1 h'],
      ['2026-10-22T12:00:00.000Z', 'há 3 h'],
      ['2026-10-21T15:00:01.000Z', 'há 23 h'],
      ['2026-10-21T15:00:00.000Z', 'há 1 dia'],
      ['2026-10-20T14:00:00.000Z', 'há 2 dias'],
      // O instante do servidor, e não o calendário: 23h antes, num outro dia de Brasília, é "há 23 h".
      ['2026-10-21T16:00:00.000Z', 'há 23 h'],
    ])('%s ⇒ %s', (desde, esperado) => {
      expect(m.relativeAge(desde, agora)).toBe(esperado)
    })

    it('piso 0: o pedido "no futuro" (relógio do servidor adiantado no insert) é "agora"', () => {
      expect(m.relativeAge('2026-10-22T16:00:00.000Z', agora)).toBe('agora')
    })

    it('instante ilegível ⇒ vazio, nunca "NaN"', () => {
      expect(m.relativeAge('x', agora)).toBe('')
    })
  })
})

describe('sensor — a troca de fuso pegou, e o mutante do dia lido como data morre no fuso negativo', () => {
  afterAll(() => {
    if (TZ_ORIGINAL === undefined) delete process.env.TZ
    else process.env.TZ = TZ_ORIGINAL
  })

  it('os quatro ramos mediram deslocamentos diferentes de zero onde deviam', () => {
    expect(deslocamentos['UTC']).toBe(0)
    expect(deslocamentos['America/Sao_Paulo']).toBe(180)
    expect(deslocamentos['America/Los_Angeles']).toBeGreaterThan(0)
    expect(deslocamentos['Asia/Tokyo']).toBe(-540)
  })

  it('no fuso de São Paulo, ler o dia como data dá o dia ANTERIOR — e a régua acima o recusaria', () => {
    process.env.TZ = 'America/Sao_Paulo'
    expect(isoWeekdayMutante('2026-10-22')).toBe(3)
  })
})
