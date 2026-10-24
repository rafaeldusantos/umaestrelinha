// Feature `74` (`MAP-47`, `AD-058`) — as regras do pedido que o painel e o app do ateliê leem subiram
// para `@estrelinha/core/orders`, e o painel as REEXPORTA. A régua é `toBe` (identidade), nunca
// `toEqual`: uma cópia colada com o mesmo valor passaria por igualdade estrutural e seria exatamente
// o segundo dono que a subida existe para impedir (o defeito 01).
//
// Mora em `app/__tests__` (e não em `entities/order/api/__tests__`, como o Design previa) porque lê
// `entities` E `features`: de `entities` o import de `features` é fronteira FSD ao contrário, e o lint
// do painel subiria 5 warnings. `app` é a camada que pode ler as duas.
//
// A lista é LITERAL (um símbolo por linha, pelo caminho que os chamadores do painel usam), e não
// derivada de `Object.keys`: derivar provaria que o painel reexporta o que reexporta.
import { describe, expect, it } from 'vitest'

import * as core from '@estrelinha/core/orders'

import * as orderQuery from '@/entities/order/api/orderQuery'
import * as listaModel from '@/features/order-list/model/rowSummary'
import * as listaFeature from '@/features/order-list'
import * as nextStepModel from '@/features/order-detail/model/nextStep'
import * as historyModel from '@/features/order-detail/model/history'
import * as detalheFeature from '@/features/order-detail'

const PARES: [string, unknown, unknown][] = [
  // `entities/order/api/orderQuery.ts`
  ['orderQuery.ORDER_VIEWS', orderQuery.ORDER_VIEWS, core.ORDER_VIEWS],
  ['orderQuery.viewPredicate', orderQuery.viewPredicate, core.viewPredicate],
  ['orderQuery.MATERIAL_QUEUE_STATES', orderQuery.MATERIAL_QUEUE_STATES, core.MATERIAL_QUEUE_STATES],
  ['orderQuery.ORDER_SEARCH_COLUMNS', orderQuery.ORDER_SEARCH_COLUMNS, core.ORDER_SEARCH_COLUMNS],
  ['orderQuery.buildOrderSearchCondition', orderQuery.buildOrderSearchCondition, core.buildOrderSearchCondition],
  ['orderQuery.SEARCH_DEBOUNCE_MS', orderQuery.SEARCH_DEBOUNCE_MS, core.SEARCH_DEBOUNCE_MS],
  ['orderQuery.PAYMENT_METHOD_LABELS', orderQuery.PAYMENT_METHOD_LABELS, core.PAYMENT_METHOD_LABELS],
  ['orderQuery.purchaseOrdinalLabel', orderQuery.purchaseOrdinalLabel, core.purchaseOrdinalLabel],
  ['orderQuery.queueSince', orderQuery.queueSince, core.queueSince],
  ['orderQuery.rowQueueAge', orderQuery.rowQueueAge, core.rowQueueAge],
  // `features/order-list`
  ['order-list/model/rowSummary.rowSummary', listaModel.rowSummary, core.rowSummary],
  ['order-list.rowSummary', listaFeature.rowSummary, core.rowSummary],
  // `features/order-detail`
  ['order-detail/model/nextStep.nextStep', nextStepModel.nextStep, core.nextStep],
  ['order-detail/model/nextStep.PICKUP_DONE_ACTION', nextStepModel.PICKUP_DONE_ACTION, core.PICKUP_DONE_ACTION],
  ['order-detail.nextStep', detalheFeature.nextStep, core.nextStep],
  ['order-detail/model/history.buildHistory', historyModel.buildHistory, core.buildHistory],
  ['order-detail.buildHistory', detalheFeature.buildHistory, core.buildHistory],
]

describe('o painel reexporta as regras do pedido de core — identidade, não cópia (MAP-47)', () => {
  it('âncora: a lista tem os 17 caminhos e nenhum valor ausente', () => {
    expect(PARES).toHaveLength(17)
    for (const [nome, painel, dono] of PARES) {
      expect(painel, `${nome} existe no painel`).toBeDefined()
      expect(dono, `${nome} existe em core`).toBeDefined()
    }
  })

  it.each(PARES)('%s é a mesma referência de core', (_nome, painel, dono) => {
    expect(painel).toBe(dono)
  })

  it('os filtros do histórico FICAM no painel (só ele filtra por tipo)', () => {
    expect(historyModel.HISTORY_FILTERS.map((f) => f.id)).toEqual(['all', 'status', 'email', 'note'])
    expect('HISTORY_FILTERS' in core).toBe(false)
    expect('filterHistory' in core).toBe(false)
  })

  it('sensor: uma cópia com o mesmo valor reprova na régua', () => {
    const copiaDeObjeto = [...core.ORDER_VIEWS]
    expect(copiaDeObjeto).toEqual(core.ORDER_VIEWS)
    expect(copiaDeObjeto).not.toBe(core.ORDER_VIEWS)

    const copiaDeFuncao = (row: Parameters<typeof core.rowSummary>[0]) => core.rowSummary(row)
    const linha = { material_status: 'aguardando_material', status: 'paid', tracking_code: null, payment_method: 'pix' }
    expect(copiaDeFuncao(linha)).toEqual(core.rowSummary(linha))
    expect(copiaDeFuncao).not.toBe(core.rowSummary)

    const copiaDeMapa = { ...core.PAYMENT_METHOD_LABELS }
    expect(copiaDeMapa).not.toBe(core.PAYMENT_METHOD_LABELS)
  })
})
