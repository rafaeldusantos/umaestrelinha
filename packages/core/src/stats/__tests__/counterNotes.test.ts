/**
 * Feature 83 · `LAV-54`, `LAV-75` — as três notas do contador, no dono único.
 *
 * CÓPIA dos casos do painel (`apps/backoffice/src/widgets/store-movement/model/__tests__/labels.test.ts`,
 * `VIS-38`, `VIS-39`, `VIS-44`), que ficam lá sem uma linha alterada e passam a provar o dono pela
 * reexportação. Mesmo arnês: um `describe.each` de fusos de PROCESSO (`UTC`, São Paulo, Tóquio), com
 * o módulo REIMPORTADO depois de cada troca de `TZ` — as fixtures escolhem instantes cujo dia em UTC
 * DIFERE do de Brasília, e a máquina local (São Paulo) e o CI (UTC) mediriam coisas diferentes.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { StoreMovement } from '../movement.ts'

type Modulo = typeof import('../counterNotes.ts')

const FUSOS = ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo'] as const
const TZ_ORIGINAL = process.env.TZ
const deslocamentos: Record<string, number> = {}

const periodo = () => ({ visitas: 0, vendas: 0, faturamento: 0, ticket: null as number | null })

/** Quarta-feira, 21/10: a semana começou na segunda, 19/10. */
const base = (m: Partial<StoreMovement> = {}): StoreMovement => ({
  hoje: '2026-10-21',
  ontem: '2026-10-20',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-22T03:00:00+00:00',
  lido_em: '2026-10-21T18:32:05.123+00:00',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: '2026-10-01T12:00:00+00:00',
  contagem_desde_dia: '2026-10-01',
  ultima_visita: null,
  ultima_visita_dia: null,
  teto_dia: null,
  periodos: { hoje: periodo(), ontem: periodo(), semana: periodo() },
  ...m,
})

describe.each(FUSOS)('no fuso de processo %s', (fuso) => {
  let L: Modulo

  beforeAll(async () => {
    process.env.TZ = fuso
    deslocamentos[fuso] = new Date(0).getTimezoneOffset()
    vi.resetModules()
    L = await import('../counterNotes.ts')
  })

  describe('VIS-38 — "Contando desde", quando o período começa antes da contagem', () => {
    const m = base({
      hoje: '2026-10-22',
      ontem: '2026-10-21',
      inicio_semana: '2026-10-19',
      contagem_desde: '2026-10-21T18:32:00Z',
      contagem_desde_dia: '2026-10-21',
    })

    it('Ontem e Esta semana mostram; Hoje (que começa em 22/10) não', () => {
      expect(L.countingSinceLine('ontem', m)).toBe('Contando desde 21/10 às 15h32')
      expect(L.countingSinceLine('semana', m)).toBe('Contando desde 21/10 às 15h32')
      expect(L.countingSinceLine('hoje', m)).toBeNull()
    })

    it('o MESMO dia da contagem conta como "começa antes" (limiar `>`, não `>=`)', () => {
      // `L-071`: o caso no limiar. Hoje = 21/10 e a contagem começou às 15h32 de 21/10: o período
      // começou às 00:00, antes da contagem.
      const noDia = base({ contagem_desde: '2026-10-21T18:32:00Z', contagem_desde_dia: '2026-10-21' })
      expect(L.countingSinceLine('hoje', noDia)).toBe('Contando desde 21/10 às 15h32')
    })

    it('contagem anterior a todo período: nenhuma linha', () => {
      expect(L.countingSinceLine('semana', base())).toBeNull()
      expect(L.countingSinceLine('ontem', base())).toBeNull()
    })

    it('sem contagem: nenhuma linha (quem fala é o VIS-39)', () => {
      expect(L.countingSinceLine('semana', base({ contagem_desde: null, contagem_desde_dia: null }))).toBeNull()
    })
  })

  describe('VIS-39 — o contador sem nenhuma visita registrada', () => {
    it('com o host de produção preenchido', () => {
      const m = base({ contagem_desde: null, contagem_desde_dia: null })
      expect(L.emptyCounterLine(m)).toBe(
        'Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.',
      )
    })

    it('com o host vazio', () => {
      const m = base({ contagem_desde: null, contagem_desde_dia: null, production_host: '' })
      expect(L.emptyCounterLine(m)).toBe('O contador está parado: falta configurar o endereço de produção da loja.')
    })

    it('com o host só de espaços: o mesmo que vazio (o `trim`, herdado da 71 — W-C09)', () => {
      const m = base({ contagem_desde: null, contagem_desde_dia: null, production_host: '   ' })
      expect(L.emptyCounterLine(m)).toBe('O contador está parado: falta configurar o endereço de produção da loja.')
    })

    it('o host é o que o BANCO devolveu (outro host, outro texto)', () => {
      const m = base({ contagem_desde: null, contagem_desde_dia: null, production_host: 'loja.exemplo.invalid' })
      expect(L.emptyCounterLine(m)).toBe(
        'Nenhuma visita registrada ainda. O contador só conta na loja em loja.exemplo.invalid.',
      )
    })

    it('com contagem: nenhuma linha', () => {
      expect(L.emptyCounterLine(base())).toBeNull()
    })
  })

  describe('VIS-44 — o teto do dia, só nos períodos que contêm o dia', () => {
    const TEXTO_21 = 'Em 21/10 o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.'

    it('teto hoje: aparece em Hoje e em Esta semana, some em Ontem', () => {
      const m = base({ teto_dia: '2026-10-21' })
      expect(L.cappedLine('hoje', m)).toBe(TEXTO_21)
      expect(L.cappedLine('semana', m)).toBe(TEXTO_21)
      expect(L.cappedLine('ontem', m)).toBeNull()
    })

    it('teto ontem: aparece em Ontem e em Esta semana, some em Hoje', () => {
      const m = base({ teto_dia: '2026-10-20' })
      expect(L.cappedLine('ontem', m)).toBe(
        'Em 20/10 o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.',
      )
      expect(L.cappedLine('semana', m)).not.toBeNull()
      expect(L.cappedLine('hoje', m)).toBeNull()
    })

    it('teto na semana anterior (domingo): nenhum período', () => {
      const m = base({ teto_dia: '2026-10-18' })
      expect(L.cappedLine('hoje', m)).toBeNull()
      expect(L.cappedLine('ontem', m)).toBeNull()
      expect(L.cappedLine('semana', m)).toBeNull()
    })

    it('sem teto: nenhuma linha', () => {
      expect(L.cappedLine('semana', base())).toBeNull()
    })
  })
})

describe('formatCount — o inteiro pt-BR (VIS-07, dono único desde a 83)', () => {
  it('separador de milhar pt-BR', async () => {
    const { formatCount } = await import('../labels.ts')
    expect(formatCount(0)).toBe('0')
    expect(formatCount(41)).toBe('41')
    expect(formatCount(1240)).toBe('1.240')
    expect(formatCount(1234567)).toBe('1.234.567')
  })
})

describe('SENSOR — a troca de fuso pegou nos três ramos', () => {
  afterAll(() => {
    process.env.TZ = TZ_ORIGINAL
  })

  it('três deslocamentos diferentes', () => {
    expect(new Set(Object.values(deslocamentos)).size).toBe(3)
  })
})
