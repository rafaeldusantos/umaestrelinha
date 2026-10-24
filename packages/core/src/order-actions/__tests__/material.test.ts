import { beforeEach, describe, expect, it } from 'vitest'

import { writeMaterialStatus } from '../material.ts'
import { criarDuble, passosDe, type Duble } from './dubleDoClient.ts'

// Feature `75` · `MAA-02`..`MAA-05`, A1, A3 — a transição do material. **Só por RPC**
// (`set_material_status`, que guarda os estados de origem no próprio `where`), e o aviso só no `ok`.

const ID = 'ord-1'
let d: Duble

beforeEach(() => {
  d = criarDuble()
})

describe('writeMaterialStatus', () => {
  it('chama `set_material_status` UMA vez, com o pedido e o alvo — e nenhum `update` em tabela', async () => {
    await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })

    expect(d.rpcs).toEqual([{ fn: 'set_material_status', args: { p_order_id: ID, p_status: 'material_recebido' } }])
    expect(d.cadeias).toEqual([])
  })

  it('`ok` ⇒ UM aviso `material_status_changed`, e o status devolvido pela RPC', async () => {
    d.responderRpc = () => ({ data: { ok: true, status: 'em_producao', reason: null }, error: null })
    const r = await writeMaterialStatus(d.deps, { id: ID, to: 'em_producao' })

    expect(r).toEqual({ tipo: 'ok', status: 'em_producao', emailSent: true })
    expect(d.notify).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith(ID, 'material_status_changed')
    expect(d.log).toEqual(['rpc set_material_status', 'notify material_status_changed'])
  })

  it('o `ok` idempotente (`MAA-05`) é `ok` — o aviso que volta falso chega como `emailSent: false`', async () => {
    d.notify.mockResolvedValueOnce(false)
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({
      tipo: 'ok',
      status: 'material_recebido',
      emailSent: false,
    })
  })

  it('`reason: "not_admin"` ⇒ `sem-papel`, zero avisos', async () => {
    d.responderRpc = () => ({ data: { ok: false, status: null, reason: 'not_admin' }, error: null })
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({ tipo: 'sem-papel' })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid_transition', 'em_producao'],
    ['order_not_found', null],
  ])('`reason: "%s"` ⇒ `material-recusado` com o motivo e o status devolvidos, zero avisos', async (reason, status) => {
    d.responderRpc = () => ({ data: { ok: false, status, reason }, error: null })
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({
      tipo: 'material-recusado',
      reason,
      status,
    })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`ok: false` SEM `reason` ⇒ `reason: null` (o painel traduz para `invalid_transition`)', async () => {
    d.responderRpc = () => ({ data: { ok: false }, error: null })
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({
      tipo: 'material-recusado',
      reason: null,
      status: null,
    })
  })

  it('`data` nulo sem erro não é `ok` — `material-recusado` com `reason: null`', async () => {
    d.responderRpc = () => ({ data: null, error: null })
    expect((await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).tipo).toBe('material-recusado')
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`{ error }` ⇒ `falhou`, zero avisos', async () => {
    const error = { message: 'network' }
    d.responderRpc = () => ({ data: null, error })
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({ tipo: 'falhou', erro: error })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('exceção síncrona ⇒ `falhou`, sem lançar', async () => {
    d.rpcLancaSincrono = true
    expect((await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).tipo).toBe('falhou')
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('promessa rejeitada ⇒ `falhou`, sem lançar', async () => {
    const boom = new Error('rede')
    d.responderRpc = () => {
      throw boom
    }
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).toEqual({ tipo: 'falhou', erro: boom })
  })

  it('`avisar: false` ⇒ `ok` sem aviso', async () => {
    expect(await writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido', avisar: false })).toEqual({
      tipo: 'ok',
      status: 'material_recebido',
      emailSent: false,
    })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('o aviso é CONTIDO pelo contrato dele, não por um `catch` daqui: se a notificadora lançar, a exceção sobe (paridade com o painel, `MAT-09`)', async () => {
    d.notify.mockRejectedValueOnce(new Error('notificadora quebrou o contrato'))
    await expect(writeMaterialStatus(d.deps, { id: ID, to: 'material_recebido' })).rejects.toThrow(
      'notificadora quebrou o contrato',
    )
  })
})

it('sanidade do dublê — nenhuma cadeia de tabela nas escritas do material', async () => {
  const dd = criarDuble()
  await writeMaterialStatus(dd.deps, { id: ID, to: 'material_recebido' })
  expect(passosDe(dd, 'orders')).toEqual([])
})
