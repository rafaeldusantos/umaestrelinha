/**
 * Feature `73` · task 05 — o painel REEXPORTA de `core` o que subiu para lá (`AD-056`), e não guarda
 * cópia. A régua é `toBe` (identidade), nunca `toEqual`: uma cópia colada com o mesmo corpo passaria
 * por igualdade estrutural e seria exatamente o segundo dono que a subida existe para impedir.
 */
import { describe, expect, it } from 'vitest'

import * as coreMovimento from '@estrelinha/core/hooks/useStoreMovement'
import * as coreCanal from '@estrelinha/core/hooks/useOrdersRealtime'
import * as coreStats from '@estrelinha/core/stats'
import * as coreOrders from '@estrelinha/core/orders'

import * as stats from '@/entities/stats'
import * as statsApi from '@/entities/stats/api/useStoreMovement'
import * as order from '@/entities/order'
import * as orderApi from '@/entities/order/api/useOrdersRealtime'
import * as orderQuery from '@/entities/order/api/orderQuery'

describe('o painel reexporta de core — identidade, não cópia', () => {
  it('`useStoreMovement` e `STORE_MOVEMENT_KEY`, pelos dois caminhos de antes', () => {
    expect(stats.useStoreMovement).toBe(coreMovimento.useStoreMovement)
    expect(statsApi.useStoreMovement).toBe(coreMovimento.useStoreMovement)
    expect(stats.STORE_MOVEMENT_KEY).toBe(coreMovimento.STORE_MOVEMENT_KEY)
  })

  it('`turnDelayMs`', () => {
    expect(stats.turnDelayMs).toBe(coreStats.turnDelayMs)
  })

  it('`useOrdersRealtime`, pelos dois caminhos de antes; o nome do canal do painel fica no painel', () => {
    expect(order.useOrdersRealtime).toBe(coreCanal.useOrdersRealtime)
    expect(orderApi.useOrdersRealtime).toBe(coreCanal.useOrdersRealtime)
    expect(order.ORDERS_REALTIME_CHANNEL).toBe('admin-orders-realtime')
  })

  it('`MATERIAL_NAO_SEGURA_LISTA` (a regra da fila, T02/T03)', () => {
    expect(orderQuery.MATERIAL_NAO_SEGURA_LISTA).toBe(coreOrders.MATERIAL_NAO_SEGURA_LISTA)
  })
})
