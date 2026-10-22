/**
 * Feature 71 · task 23 — os textos do bloco "Movimento da loja", puros.
 *
 * `VIS-07`, `VIS-08` (texto), `VIS-09`, `VIS-10` ("Atualizado às"), `VIS-38`, `VIS-39`, `VIS-40`,
 * `VIS-44`. Nenhum dia é decidido aqui: tudo vem de `hoje`, `ontem`, `inicio_semana` e dos `*_dia`
 * que o banco devolveu. A hora é escrita no fuso da loja.
 *
 * O arquivo roda num `describe.each` de fusos de PROCESSO (`UTC`, São Paulo, Tóquio), com o módulo
 * REIMPORTADO depois de cada troca de `TZ`: o formatador de hora de `core/time` é montado no
 * carregamento do módulo, e importado uma vez só ele nasceria sempre no fuso da máquina. A máquina
 * local está em São Paulo e o CI em UTC — num fuso só, cada mutante morreria numa máquina e
 * sobreviveria na outra. As fixtures escolhem instantes cujo dia em UTC DIFERE do de Brasília.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { StoreMovement } from '@/entities/stats'

type Modulo = typeof import('../labels')

const FUSOS = ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo'] as const
const TZ_ORIGINAL = process.env.TZ
const deslocamentos: Record<string, number> = {}

/** `formatPrice` separa `R$` do número com espaço inseparável. */
const reais = (texto: string) => texto.replace(' ', ' ')

const periodo = (p: Partial<StoreMovement['periodos']['hoje']> = {}) => ({
  visitas: 0,
  vendas: 0,
  faturamento: 0,
  ticket: null as number | null,
  ...p,
})

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
    L = await import('../labels')
  })

  describe('VIS-09 — a linha do período, montada das datas do banco', () => {
    it('Hoje, Ontem e Esta semana', () => {
      const m = base()
      expect(L.periodLine('hoje', m)).toBe('Hoje, 21/10')
      expect(L.periodLine('ontem', m)).toBe('Ontem, 20/10')
      expect(L.periodLine('semana', m)).toBe('De 19/10 a 21/10')
    })

    it('numa segunda-feira, a semana começa hoje', () => {
      const m = base({ hoje: '2026-10-19', ontem: '2026-10-18', inicio_semana: '2026-10-19' })
      expect(L.periodLine('semana', m)).toBe('Semana iniciada hoje, 19/10')
      expect(L.periodLine('hoje', m)).toBe('Hoje, 19/10')
    })

    it('`hoje = 2026-10-21` diz 21/10 — nunca 20/10 (o texto não passa por `new Date`)', () => {
      expect(L.periodLine('hoje', base({ hoje: '2026-10-21' }))).toBe('Hoje, 21/10')
    })
  })

  describe('VIS-07 — os valores', () => {
    it('inteiro com separador de milhar pt-BR', () => {
      expect(L.formatCount(1234)).toBe('1.234')
      expect(L.formatCount(9999)).toBe('9.999')
      expect(L.formatCount(0)).toBe('0')
    })

    it('Visitas e Vendas inteiros, Faturamento em reais, Ticket do valor DO BANCO, sem recálculo', () => {
      // 100 / 3 = 33,33 — o banco "disse" 99,99 de propósito: recalcular aqui daria 33,33.
      const m = base({
        periodos: {
          hoje: periodo({ visitas: 1234, vendas: 3, faturamento: 100, ticket: 99.99 }),
          ontem: periodo({ visitas: 2, vendas: 1, faturamento: 1234.56, ticket: 1234.56 }),
          semana: periodo(),
        },
      })
      expect(L.periodValues('hoje', m)).toEqual({
        visitas: '1.234',
        vendas: '3',
        faturamento: reais('R$ 100,00'),
        ticket: reais('R$ 99,99'),
      })
      expect(L.periodValues('ontem', m).faturamento).toBe(reais('R$ 1.234,56'))
    })

    it('sem venda: Vendas `0`, Faturamento `R$ 0,00`, Ticket `null` (a tela desenha `—` + sr-only)', () => {
      const m = base({ periodos: { hoje: periodo({ visitas: 0 }), ontem: periodo(), semana: periodo() } })
      expect(L.periodValues('hoje', m)).toEqual({
        visitas: '0',
        vendas: '0',
        faturamento: reais('R$ 0,00'),
        ticket: null,
      })
      expect(L.TICKET_VAZIO).toBe('—')
      expect(L.SEM_VENDAS_TEXT).toBe('sem vendas no período')
    })

    it('VIS-39: contador nunca usado ⇒ Visitas `—`, NUNCA `0`', () => {
      const m = base({ contagem_desde: null, contagem_desde_dia: null })
      expect(L.periodValues('hoje', m).visitas).toBe('—')
      expect(L.periodValues('semana', m).visitas).toBe('—')
    })
  })

  describe('VIS-10 — "Atualizado às HHhMM", de `lido_em`, no fuso da loja', () => {
    it('15h32', () => {
      expect(L.updatedAtLine(base())).toBe('Atualizado às 15h32')
    })

    it('02:59Z do dia 22 é 23h59 em Brasília', () => {
      expect(L.updatedAtLine(base({ lido_em: '2026-10-22T02:59:00+00:00' }))).toBe('Atualizado às 23h59')
    })
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
      expect(L.emptyCounterLine(m)).toBe(
        'O contador está parado: falta configurar o endereço de produção da loja.',
      )
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

  describe('VIS-40 — a última visita, comparada com o `hoje` e o `ontem` do BANCO', () => {
    // 02:10Z de 22/10 é 23h10 de 21/10 em Brasília: o dia em UTC difere do da loja.
    it('hoje', () => {
      const m = base({ ultima_visita: '2026-10-22T02:10:00Z', ultima_visita_dia: '2026-10-21' })
      expect(L.lastVisitLine(m)).toBe('Última visita registrada: hoje às 23h10')
    })

    it('ontem', () => {
      const m = base({ ultima_visita: '2026-10-21T02:10:00Z', ultima_visita_dia: '2026-10-20' })
      expect(L.lastVisitLine(m)).toBe('Última visita registrada: ontem às 23h10')
    })

    it('outro dia', () => {
      const m = base({ ultima_visita: '2026-10-19T02:10:00Z', ultima_visita_dia: '2026-10-18' })
      expect(L.lastVisitLine(m)).toBe('Última visita registrada: em 18/10 às 23h10')
    })

    it('sem visita: nenhuma linha', () => {
      expect(L.lastVisitLine(base())).toBeNull()
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

  it('VIS-08 — o texto do ⓘ é EXATAMENTE o da spec', () => {
    expect(L.VISIT_INFO_TEXT).toBe(
      'Cada navegador conta uma vez no período: uma vez por dia em Hoje e em Ontem, e uma vez na ' +
        'semana em Esta semana. Celular e computador contam como dois. Abrir a loja pelo Instagram e ' +
        'depois pelo navegador do celular também conta como dois, e cada janela anônima conta como um ' +
        'navegador novo. Quem recusa as estatísticas no aviso de cookies não é contado. As suas próprias ' +
        'visitas à loja também contam.',
    )
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
