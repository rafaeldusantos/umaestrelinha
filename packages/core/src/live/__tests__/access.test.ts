// Feature 83 · `LAV-07`, `LAV-51`..`LAV-53`, `LAV-67` — a regra pura da seção Acessos.
//
// As fixturas fazem os campos candidatos DIVERGIREM (`L-013`): o total de hoje × `base_hoje`, as
// visitas × as vendas da comparação. Uma leitura do campo errado muda o número esperado.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreAccess, StoreMovement } from '../../stats/movement.ts'
import {
  ACCESS_BAND_LABELS,
  ACCESS_TITLE,
  BAND_NOTE,
  CHART_UNAVAILABLE,
  CONSENT_NOTE,
  WEEK_NOTE,
  accessCards,
  accessChart,
  accessDelta,
  comparisonLabel,
  conversion,
  deltaLine,
  formatConversion,
  freshnessLine,
  noHourNote,
} from '../access.ts'

const acessos = (extra: Partial<StoreAccess> = {}): StoreAccess => ({
  faixa_atual: 5,
  hoje: { por_faixa: [1, 0, 2, 3, 4, 5, null, null], sem_hora: 0 },
  ontem: { por_faixa: [2, 1, 0, 6, 9, 7, 5, 3], sem_hora: 0 },
  semana: {
    por_dia: [
      { dia: '2026-10-19', visitas: 30 },
      { dia: '2026-10-20', visitas: 0 },
      { dia: '2026-10-21', visitas: 142 },
    ],
  },
  comparacao: {
    hoje: { ate_hora: 15, visitas: 80, vendas: 2, base_hoje: { visitas: 90, vendas: 1 } },
    // anteontem com 5 vendas e ontem (periodos.ontem) com 4: as vendas também discordam (L-013)
    ontem: { dia: '2026-10-19', visitas: 100, vendas: 5 },
    semana: null,
  },
  ...extra,
})

const movimento = (extra: Partial<StoreMovement> = {}): StoreMovement => ({
  hoje: '2026-10-21',
  ontem: '2026-10-20',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-22T03:00:00Z',
  lido_em: '2026-10-21T18:02:00Z',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: '2026-10-10T12:00:00Z',
  contagem_desde_dia: '2026-10-10',
  ultima_visita: '2026-10-21T18:00:00Z',
  ultima_visita_dia: '2026-10-21',
  teto_dia: null,
  periodos: {
    hoje: { visitas: 142, vendas: 3, faturamento: 300, ticket: 100 },
    ontem: { visitas: 120, vendas: 4, faturamento: 400, ticket: 100 },
    semana: { visitas: 1240, vendas: 9, faturamento: 900, ticket: 100 },
  },
  acessos: acessos(),
  ...extra,
})

describe('as frases fixas (LAV-50, LAV-53, LAV-55, LAV-67)', () => {
  it('título, notas e a frase do gráfico indisponível', () => {
    expect(ACCESS_TITLE).toBe('Acessos')
    expect(CONSENT_NOTE).toBe('Conta só quem aceitou cookies de estatística.')
    expect(BAND_NOTE).toBe('Faixas de 3 horas, pela hora da primeira visita.')
    expect(WEEK_NOTE).toBe('Desde segunda-feira.')
    expect(CHART_UNAVAILABLE).toBe('O gráfico por horário ainda não está disponível.')
  })

  it('os 8 rótulos das faixas de 3 h', () => {
    expect([...ACCESS_BAND_LABELS]).toEqual(['0h', '3h', '6h', '9h', '12h', '15h', '18h', '21h'])
  })
})

describe('conversion / formatConversion (LAV-51)', () => {
  it('3/142 ⇒ 2,1% · 0/10 ⇒ 0,0% · 5/0 ⇒ — · 3/2 ⇒ 150,0% (sem teto)', () => {
    expect(formatConversion(conversion(3, 142))).toBe('2,1%')
    expect(formatConversion(conversion(0, 10))).toBe('0,0%')
    expect(conversion(5, 0)).toBeNull()
    expect(formatConversion(conversion(5, 0))).toBe('—')
    expect(formatConversion(conversion(3, 2))).toBe('150,0%')
  })

  it('o valor cru não é arredondado (quem arredonda é a escrita)', () => {
    expect(conversion(3, 142)).toBeCloseTo(2.1127, 4)
  })
})

describe('accessDelta (LAV-51)', () => {
  it('alta, queda e exatamente 0', () => {
    expect(accessDelta(90, 80)).toBe(13) // +12,5 ⇒ +13
    expect(accessDelta(60, 80)).toBe(-25)
    expect(accessDelta(80, 80)).toBe(0)
    expect(Object.is(accessDelta(80, 80), -0)).toBe(false)
  })

  it('o meio é simétrico, para longe do zero: +12,5 ⇒ +13 e −12,5 ⇒ −13', () => {
    expect(accessDelta(9, 8)).toBe(13)
    expect(accessDelta(7, 8)).toBe(-13)
    // meio exato que a divisão ANTES da multiplicação levava a 57,4999… (achado do gate do Lote 1)
    expect(accessDelta(63, 40)).toBe(58)
    expect(accessDelta(17, 40)).toBe(-58)
    expect(accessDelta(126, 80)).toBe(58)
    expect(accessDelta(91, 40)).toBe(128)
  })

  it('anterior 0 ou null, ou atual null ⇒ null (nunca +∞% nem +100%)', () => {
    expect(accessDelta(5, 0)).toBeNull()
    expect(accessDelta(5, null)).toBeNull()
    expect(accessDelta(null, 5)).toBeNull()
  })
})

describe('deltaLine (LAV-51)', () => {
  it('+p em alta; −p com U+2212 em neutra; 0% em neutra', () => {
    expect(deltaLine(13, 'ontem até as 15h')).toEqual({ texto: '+13% vs ontem até as 15h', tom: 'alta' })
    expect(deltaLine(-5, 'anteontem')).toEqual({ texto: '−5% vs anteontem', tom: 'neutra' })
    expect(deltaLine(-5, 'anteontem').texto).not.toContain('-')
    expect(deltaLine(0, 'anteontem')).toEqual({ texto: '0% vs anteontem', tom: 'neutra' })
  })
})

describe('comparisonLabel (LAV-51)', () => {
  it('Hoje ⇒ "ontem até as {ate_hora}h" (do servidor); Ontem ⇒ "anteontem"; Semana ⇒ null', () => {
    expect(comparisonLabel(movimento(), 'hoje')).toBe('ontem até as 15h')
    expect(comparisonLabel(movimento({ acessos: acessos({ comparacao: { ...acessos().comparacao, hoje: { ate_hora: 9, visitas: 1, vendas: 0, base_hoje: { visitas: 1, vendas: 0 } } } }) }), 'hoje')).toBe('ontem até as 9h')
    expect(comparisonLabel(movimento(), 'ontem')).toBe('anteontem')
    expect(comparisonLabel(movimento(), 'semana')).toBeNull()
  })

  it('sem `acessos` (banco antigo) ⇒ null', () => {
    expect(comparisonLabel(movimento({ acessos: undefined }), 'hoje')).toBeNull()
  })
})

describe('accessCards (LAV-51)', () => {
  it('Hoje: os números grandes são o TOTAL; a variação compara `base_hoje` × `comparacao.hoje` (horas completas)', () => {
    expect(accessCards(movimento(), 'hoje')).toEqual([
      // total 142, mas a variação é 90 × 80 = +12,5 ⇒ +13 (com o total seria +78)
      { rotulo: 'Visitas', valor: '142', variacao: { texto: '+13% vs ontem até as 15h', tom: 'alta' } },
      // 1 × 2 = −50
      { rotulo: 'Vendas', valor: '3', variacao: { texto: '−50% vs ontem até as 15h', tom: 'neutra' } },
      // 3/142 = 2,1%; variação entre 1/90 e 2/80 = −55,6 ⇒ −56
      { rotulo: 'Conversão', valor: '2,1%', variacao: { texto: '−56% vs ontem até as 15h', tom: 'neutra' } },
    ])
  })

  it('Ontem: o dia inteiro contra anteontem inteiro — visitas e vendas DISCORDAM (L-013)', () => {
    expect(accessCards(movimento(), 'ontem')).toEqual([
      { rotulo: 'Visitas', valor: '120', variacao: { texto: '+20% vs anteontem', tom: 'alta' } },
      // 4 × 5 = −20 (com as vendas de anteontem no lugar das de ontem seria 0%)
      { rotulo: 'Vendas', valor: '4', variacao: { texto: '−20% vs anteontem', tom: 'neutra' } },
      // 4/120 = 3,33% contra 5/100 = 5% ⇒ −33,3 ⇒ −33
      { rotulo: 'Conversão', valor: '3,3%', variacao: { texto: '−33% vs anteontem', tom: 'neutra' } },
    ])
  })

  it('Semana: os três números, nenhum com variação (Semana = opção (a) do portão)', () => {
    expect(accessCards(movimento(), 'semana')).toEqual([
      { rotulo: 'Visitas', valor: '1.240', variacao: null },
      { rotulo: 'Vendas', valor: '9', variacao: null },
      { rotulo: 'Conversão', valor: '0,7%', variacao: null },
    ])
  })

  it('sem `acessos`: os números, e nenhuma variação nos três', () => {
    for (const p of ['hoje', 'ontem', 'semana'] as const) {
      const cards = accessCards(movimento({ acessos: undefined }), p)
      expect(cards.map((c) => c.rotulo)).toEqual(['Visitas', 'Vendas', 'Conversão'])
      expect(cards.every((c) => c.variacao === null)).toBe(true)
    }
    expect(accessCards(movimento({ acessos: undefined }), 'hoje')[0].valor).toBe('142')
  })

  it('visitas 0 e vendas > 0: Conversão "—" e sem variação', () => {
    const m = movimento({
      periodos: { ...movimento().periodos, hoje: { visitas: 0, vendas: 2, faturamento: 200, ticket: 100 } },
    })
    const conv = accessCards(m, 'hoje')[2]
    expect(conv).toEqual({ rotulo: 'Conversão', valor: '—', variacao: null })
  })

  it('o servidor anulou as visitas da comparação: Visitas e Conversão sem linha, Vendas com', () => {
    const base = acessos().comparacao
    const m = movimento({
      acessos: acessos({ comparacao: { ...base, hoje: { ate_hora: 15, visitas: null, vendas: 2, base_hoje: { visitas: null, vendas: 1 } } } }),
    })
    const [vis, ven, conv] = accessCards(m, 'hoje')
    expect(vis.variacao).toBeNull()
    expect(ven.variacao).toEqual({ texto: '−50% vs ontem até as 15h', tom: 'neutra' })
    expect(conv.variacao).toBeNull()
  })

  it('comparação com anterior 0 ⇒ sem linha (nem +∞%)', () => {
    const base = acessos().comparacao
    const m = movimento({ acessos: acessos({ comparacao: { ...base, ontem: { dia: '2026-10-19', visitas: 0, vendas: 0 } } }) })
    expect(accessCards(m, 'ontem').map((c) => c.variacao)).toEqual([null, null, null])
  })
})

describe('accessChart (LAV-52, LAV-53)', () => {
  it('Hoje com faixa_atual 5: a 5 é a atual, 0..4 passadas, 6 e 7 futuras', () => {
    const g = accessChart(movimento(), 'hoje')
    expect(g?.titulo).toBe('Visitas por horário')
    expect(g?.nota).toBe(BAND_NOTE)
    expect(g?.colunas).toEqual([
      { rotulo: '0h', valor: 1, destaque: 'passada' },
      { rotulo: '3h', valor: 0, destaque: 'passada' },
      { rotulo: '6h', valor: 2, destaque: 'passada' },
      { rotulo: '9h', valor: 3, destaque: 'passada' },
      { rotulo: '12h', valor: 4, destaque: 'passada' },
      { rotulo: '15h', valor: 5, destaque: 'atual' },
      { rotulo: '18h', valor: null, destaque: 'futura' },
      { rotulo: '21h', valor: null, destaque: 'futura' },
    ])
  })

  it('Hoje com `null` ANTES da atual (antes da contagem) ⇒ `sem_contagem`, nunca `futura`', () => {
    const m = movimento({ acessos: acessos({ hoje: { por_faixa: [null, null, 0, 1, 2, 3, null, null], sem_hora: 0 } }) })
    expect(accessChart(m, 'hoje')?.colunas.map((c) => c.destaque)).toEqual([
      'sem_contagem', 'sem_contagem', 'passada', 'passada', 'passada', 'atual', 'futura', 'futura',
    ])
  })

  it('Ontem: as 8 passadas, nenhuma atual; `null` ⇒ `sem_contagem`', () => {
    const g = accessChart(movimento(), 'ontem')
    expect(g?.colunas.map((c) => c.destaque)).toEqual(Array(8).fill('passada'))
    expect(g?.colunas.map((c) => c.valor)).toEqual([2, 1, 0, 6, 9, 7, 5, 3])
    const comNull = movimento({ acessos: acessos({ ontem: { por_faixa: [null, null, null, 0, 1, 0, 0, 0], sem_hora: 0 } }) })
    expect(accessChart(comNull, 'ontem')?.colunas.map((c) => c.destaque)).toEqual([
      'sem_contagem', 'sem_contagem', 'sem_contagem', 'passada', 'passada', 'passada', 'passada', 'passada',
    ])
  })

  it('sem `acessos` ⇒ null (o app desenha a frase estática)', () => {
    for (const p of ['hoje', 'ontem', 'semana'] as const) expect(accessChart(movimento({ acessos: undefined }), p)).toBeNull()
  })

  it('a nota de sem_hora: Hoje e Ontem, cada um com o SEU número; Semana nunca', () => {
    const m = movimento({
      acessos: acessos({ hoje: { ...acessos().hoje, sem_hora: 1 }, ontem: { ...acessos().ontem, sem_hora: 7 } }),
    })
    expect(accessChart(m, 'hoje')?.semHora).toBe('1 visita deste dia foi contada antes da contagem por horário.')
    expect(accessChart(m, 'ontem')?.semHora).toBe('7 visitas deste dia foram contadas antes da contagem por horário.')
    expect(accessChart(m, 'semana')?.semHora).toBeNull()
    expect(accessChart(movimento(), 'hoje')?.semHora).toBeNull()
  })

  describe('Semana — "hoje" é o dia do SERVIDOR, com o relógio do processo em outro dia (L-058)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T15:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('quarta: três colunas, a última "hoje"', () => {
      const g = accessChart(movimento(), 'semana')
      expect(g?.titulo).toBe('Visitas por dia')
      expect(g?.nota).toBe(WEEK_NOTE)
      expect(g?.colunas).toEqual([
        { rotulo: 'seg', valor: 30, destaque: 'passada' },
        { rotulo: 'ter', valor: 0, destaque: 'passada' },
        { rotulo: 'hoje', valor: 142, destaque: 'atual' },
      ])
    })

    it('numa segunda: UMA coluna, "hoje"', () => {
      const m = movimento({ hoje: '2026-10-19', acessos: acessos({ semana: { por_dia: [{ dia: '2026-10-19', visitas: 4 }] } }) })
      expect(accessChart(m, 'semana')?.colunas).toEqual([{ rotulo: 'hoje', valor: 4, destaque: 'atual' }])
    })

    it('num domingo: SETE colunas, seg … sáb e "hoje"', () => {
      const por_dia = ['19', '20', '21', '22', '23', '24', '25'].map((d, i) => ({ dia: `2026-10-${d}`, visitas: i }))
      const m = movimento({ hoje: '2026-10-25', acessos: acessos({ semana: { por_dia } }) })
      expect(accessChart(m, 'semana')?.colunas.map((c) => c.rotulo)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'hoje'])
      expect(accessChart(m, 'semana')?.colunas.filter((c) => c.destaque === 'atual')).toHaveLength(1)
    })

    it('todos zero: os valores são 0 (as barras de 4 px são do app)', () => {
      const por_dia = [{ dia: '2026-10-19', visitas: 0 }, { dia: '2026-10-20', visitas: 0 }]
      const m = movimento({ hoje: '2026-10-20', acessos: acessos({ semana: { por_dia } }) })
      expect(accessChart(m, 'semana')?.colunas.map((c) => c.valor)).toEqual([0, 0])
    })
  })
})

describe('noHourNote (LAV-53)', () => {
  it('0 ⇒ null · 1 ⇒ singular · 2 ⇒ plural · 1.200 em pt-BR', () => {
    expect(noHourNote(0)).toBeNull()
    expect(noHourNote(1)).toBe('1 visita deste dia foi contada antes da contagem por horário.')
    expect(noHourNote(2)).toBe('2 visitas deste dia foram contadas antes da contagem por horário.')
    expect(noHourNote(1200)).toBe('1.200 visitas deste dia foram contadas antes da contagem por horário.')
  })
})

describe('freshnessLine (LAV-07)', () => {
  it.each([
    [0, 'Atualizado agora'],
    [1.9, 'Atualizado agora'],
    [2, 'Atualizado há 2 s'],
    [59, 'Atualizado há 59 s'],
    [60, 'Atualizado há 1 min'],
    [125, 'Atualizado há 2 min'],
    // truncado, nunca arredondado (V-C03, V-C04)
    [2.9, 'Atualizado há 2 s'],
    [59.9, 'Atualizado há 59 s'],
    [90, 'Atualizado há 1 min'],
    [119, 'Atualizado há 1 min'],
  ])('%s s ⇒ "%s"', (s, frase) => {
    expect(freshnessLine(s)).toBe(frase)
  })
})
