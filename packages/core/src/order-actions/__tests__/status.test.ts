import { beforeEach, describe, expect, it } from 'vitest'

import { writeOrderStatus } from '../status.ts'
import { ERRO, ZERO_LINHAS, criarDuble, passosDe, type Duble } from './dubleDoClient.ts'

// Feature `75` · `MAA-08`, `MAA-21`, `MAA-22`, `MAA-38`, A3, A4, A22, A24 — a escrita do status,
// subida de `useAdminOrders.updateStatus` com o efeito conferido por `.select('id')`.

const ID = 'ord-1'
let d: Duble

beforeEach(() => {
  d = criarDuble()
})

describe('writeOrderStatus — a cadeia, por igualdade', () => {
  it('sem `expectedFrom`: `update({ status }).eq("id").select("id")` — nenhum filtro de status', async () => {
    await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })

    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { status: 'shipped' }],
        ['eq', 'id', ID],
        ['select', 'id'],
      ],
    ])
  })

  it('com `expectedFrom`: a guarda `.eq("status", expectedFrom)` entra antes do `select`', async () => {
    await writeOrderStatus(d.deps, { id: ID, to: 'separating', from: 'paid', expectedFrom: 'paid' })

    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { status: 'separating' }],
        ['eq', 'id', ID],
        ['eq', 'status', 'paid'],
        ['select', 'id'],
      ],
    ])
  })
})

describe('writeOrderStatus — desfechos', () => {
  it('uma linha ⇒ histórico (from → to, nota) e UM aviso `order_status_changed`, nessa ordem', async () => {
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating', note: 'postado' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true })
    expect(passosDe(d, 'order_status_history')).toEqual([
      [['insert', { order_id: ID, from_status: 'separating', to_status: 'shipped', note: 'postado' }]],
    ])
    expect(d.notify).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith(ID, 'order_status_changed')
    expect(d.log).toEqual(['update orders', 'insert order_status_history', 'notify order_status_changed'])
  })

  it('o aviso que diz que NÃO saiu chega como `emailSent: false`', async () => {
    d.notify.mockResolvedValueOnce(false)
    expect(await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })).toEqual({
      tipo: 'ok',
      emailSent: false,
    })
  })

  it('`expectedFrom` vence `from` no histórico — é o estado que a guarda garantiu', async () => {
    await writeOrderStatus(d.deps, { id: ID, to: 'separating', from: 'pending', expectedFrom: 'paid' })
    expect(passosDe(d, 'order_status_history')[0][0][1]).toMatchObject({ from_status: 'paid' })
  })

  it('nota ausente ou vazia vira `null` (como o painel grava hoje)', async () => {
    await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating', note: '' })
    expect(passosDe(d, 'order_status_history')[0][0][1]).toMatchObject({ note: null })
  })

  it('`from: undefined` sem `expectedFrom` ⇒ `from_status: null` (o pedido fora da lista carregada do painel)', async () => {
    await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: undefined })
    expect(passosDe(d, 'order_status_history')).toEqual([
      [['insert', { order_id: ID, from_status: null, to_status: 'shipped', note: null }]],
    ])
  })

  it('ZERO linhas ⇒ `nenhuma-linha`, SEM histórico e SEM aviso (A22)', async () => {
    d.responder = () => ZERO_LINHAS
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating', expectedFrom: 'separating' })

    expect(r).toEqual({ tipo: 'nenhuma-linha' })
    expect(passosDe(d, 'order_status_history')).toEqual([])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`data` nulo sem erro também é zero linhas — nunca sucesso presumido', async () => {
    d.responder = () => ({ data: null, error: null })
    expect(await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })).toEqual({ tipo: 'nenhuma-linha' })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`{ error }` ⇒ `falhou` com o erro, sem histórico e sem aviso', async () => {
    d.responder = () => ERRO
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })

    expect(r).toEqual({ tipo: 'falhou', erro: ERRO.error })
    expect(passosDe(d, 'order_status_history')).toEqual([])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('exceção SÍNCRONA do client ⇒ `falhou`, sem lançar', async () => {
    d.fromLancaSincrono = true
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })

    expect(r.tipo).toBe('falhou')
    expect((r as { erro: Error }).erro).toBeInstanceOf(Error)
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('promessa REJEITADA ⇒ `falhou`, sem lançar', async () => {
    const boom = new Error('rede')
    d.responder = () => {
      throw boom
    }
    expect(await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })).toEqual({
      tipo: 'falhou',
      erro: boom,
    })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`avisar: false` ⇒ histórico gravado e ZERO avisos, `emailSent: false`', async () => {
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating', avisar: false })

    expect(r).toEqual({ tipo: 'ok', emailSent: false })
    expect(passosDe(d, 'order_status_history')).toHaveLength(1)
    expect(d.notify).not.toHaveBeenCalled()
  })

  it.each([
    ['com `{ error }`', () => ERRO],
    [
      'rejeitado',
      () => {
        throw new Error('rede no histórico')
      },
    ],
  ])('o histórico %s NÃO muda o desfecho (paridade com o painel, Q8/R6) — o aviso ainda sai', async (_r, falha) => {
    d.responder = (c) => (c.tabela === 'order_status_history' ? falha() : { data: [{ id: ID }], error: null })
    const r = await writeOrderStatus(d.deps, { id: ID, to: 'shipped', from: 'separating' })

    expect(r).toEqual({ tipo: 'ok', emailSent: true })
    expect(d.notify).toHaveBeenCalledTimes(1)
  })
})
