// Feature `83` (`LAV-75`, `AD-066`) — as três notas do contador ("Contando desde", o contador parado,
// o teto do dia) e o inteiro pt-BR subiram para `@estrelinha/core/stats`, que a Loja ao vivo do app
// do ateliê também lê, e o painel as REEXPORTA. A régua é `toBe` (identidade), nunca `toEqual`: uma
// cópia colada com o mesmo texto passaria por igualdade estrutural e seria exatamente o segundo dono
// que a subida existe para impedir (o defeito 01). Molde: `regrasDoPedidoNoCore.test.ts`.
//
// A lista é LITERAL (um símbolo por linha, pelos caminhos que os chamadores do painel usam), e não
// derivada de `Object.keys`: derivar provaria que o painel reexporta o que reexporta.
import { describe, expect, it } from 'vitest'

import * as core from '@estrelinha/core/stats'

import * as labels from '@/widgets/store-movement/model/labels'

const PARES: [string, unknown, unknown][] = [
  ['labels.countingSinceLine', labels.countingSinceLine, core.countingSinceLine],
  ['labels.emptyCounterLine', labels.emptyCounterLine, core.emptyCounterLine],
  ['labels.cappedLine', labels.cappedLine, core.cappedLine],
  ['labels.formatCount', labels.formatCount, core.formatCount],
]

describe('o painel reexporta as notas do contador de core — identidade, não cópia (LAV-75)', () => {
  it('âncora: a lista tem os 4 símbolos e nenhum valor ausente', () => {
    expect(PARES).toHaveLength(4)
    for (const [nome, painel, dono] of PARES) {
      expect(painel, `${nome} existe no painel`).toBeDefined()
      expect(dono, `${nome} existe em core`).toBeDefined()
    }
  })

  it.each(PARES)('%s é a mesma referência de core', (_nome, painel, dono) => {
    expect(painel).toBe(dono)
  })

  it('sensor: uma cópia com o MESMO texto reprova na régua', () => {
    const m = {
      hoje: '2026-10-21', ontem: '2026-10-20', inicio_semana: '2026-10-19',
      expira_em: '2026-10-22T03:00:00Z', lido_em: '2026-10-21T18:00:00Z', production_host: '',
      contagem_desde: null, contagem_desde_dia: null, ultima_visita: null, ultima_visita_dia: null,
      teto_dia: null,
      periodos: {
        hoje: { visitas: 0, vendas: 0, faturamento: 0, ticket: null },
        ontem: { visitas: 0, vendas: 0, faturamento: 0, ticket: null },
        semana: { visitas: 0, vendas: 0, faturamento: 0, ticket: null },
      },
    }
    const copia = (x: typeof m) => core.emptyCounterLine(x)
    expect(copia(m)).toBe(core.emptyCounterLine(m))
    expect(copia).not.toBe(core.emptyCounterLine)

    const copiaDoInteiro = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
    expect(copiaDoInteiro(1240)).toBe(core.formatCount(1240))
    expect(copiaDoInteiro).not.toBe(core.formatCount)
  })
})
