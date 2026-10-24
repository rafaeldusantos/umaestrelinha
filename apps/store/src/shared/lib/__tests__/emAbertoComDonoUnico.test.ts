import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { OPEN_ORDER_RULE, OPEN_ORDER_STATUSES, openOrdersSqlFilter } from '@estrelinha/core/customers'
import { toSqlPredicate, type QueueRule } from '@estrelinha/core/orders'

/**
 * Feature `76` · `MAC-24`, `MAC-27` — "pedido em aberto" tem UM dono (`core/customers/open.ts`), e a
 * cópia em SQL dentro de `customer_stats` é DELIBERADA e guardada byte a byte (molde de
 * `filaComDonoUnico.test.ts`, da `73`).
 *
 * A cópia existe porque a lista de Clientes ordena e filtra NO SERVIDOR por uma coluna da view.
 * Duas escritas da mesma regra divergem sem nada quebrar: a pílula "Em aberto" do celular diria 18,
 * o filtro do painel outra coisa, com as duas suítes verdes. O guarda lê a migration do disco e exige
 * **exatamente** `openOrdersSqlFilter('v')`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261025120000_76-clientes-em-aberto.sql')

const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')
const sql = semComentario(readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n'))

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 70)}…`)
  return mutante
}

/** A migration contém a forma do dono, exatamente (uma vez). */
const contemODono = (texto: string, filtro: string): boolean => texto.split(filtro).length === 2

/** O filtro que um dono com a regra dada produziria. */
const filtroDe = (rule: QueueRule): string => `count(v.order_id) filter (where ${toSqlPredicate(rule, 'v')})`

describe('pedido em aberto: a migration carrega openOrdersSqlFilter("v") byte a byte', () => {
  it('âncora: a migration foi lida e a saída do dono tem os cinco literais', () => {
    expect(sql.length).toBeGreaterThan(500)
    const f = openOrdersSqlFilter('v')
    expect(f).toBe(
      "count(v.order_id) filter (where v.payment_status = 'approved' and v.status in ('pending', 'paid', 'separating', 'shipped'))",
    )
  })

  it('a migration contém exatamente a saída de openOrdersSqlFilter("v"), uma vez', () => {
    expect(contemODono(sql, openOrdersSqlFilter('v'))).toBe(true)
  })

  it('a coluna é nomeada orders_open logo depois do filtro', () => {
    expect(sql.includes(`${openOrdersSqlFilter('v')}      as orders_open`) || new RegExp(`${openOrdersSqlFilter('v').replace(/[()]/g, '\\$&')}\\s+as\\s+orders_open`, 'i').test(sql)).toBe(true)
  })

  it('OPEN_ORDER_RULE tem approved E os quatro status', () => {
    expect(OPEN_ORDER_RULE).toContainEqual({ col: 'payment_status', op: 'eq', value: 'approved' })
    expect(OPEN_ORDER_RULE).toContainEqual({ col: 'status', op: 'in', value: ['pending', 'paid', 'separating', 'shipped'] })
    expect([...OPEN_ORDER_STATUSES]).toEqual(['pending', 'paid', 'separating', 'shipped'])
  })

  it('sensor: um dono sem `separating` deixa a migration de fora do dono (o guarda reprova)', () => {
    const mutante: QueueRule = [
      OPEN_ORDER_RULE[0],
      { col: 'status', op: 'in', value: ['pending', 'paid', 'shipped'] },
    ]
    expect(contemODono(sql, filtroDe(mutante))).toBe(false)
  })

  it('sensor: um dono sem o par approved também reprova', () => {
    expect(contemODono(sql, filtroDe([OPEN_ORDER_RULE[1]]))).toBe(false)
  })

  it("sensor: a migration com 'approved' trocado por 'pending' reprova", () => {
    const m = mutar(sql, openOrdersSqlFilter('v'), openOrdersSqlFilter('v').replace("'approved'", "'pending'"))
    expect(contemODono(m, openOrdersSqlFilter('v'))).toBe(false)
  })

  it('sensor: a migration sem o status `separating` reprova', () => {
    const m = mutar(sql, openOrdersSqlFilter('v'), openOrdersSqlFilter('v').replace("'separating', ", ''))
    expect(contemODono(m, openOrdersSqlFilter('v'))).toBe(false)
  })

  it('o controle: a cópia exata passa (o guarda não vira "qualquer coisa reprova")', () => {
    expect(contemODono(sql, openOrdersSqlFilter('v'))).toBe(true)
    expect(contemODono(sql, filtroDe(OPEN_ORDER_RULE))).toBe(true)
  })
})
