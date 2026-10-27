import { beforeEach, describe, expect, it } from 'vitest'

import { writeMaterialTracking } from '../materialTracking.ts'
import { criarDuble, type Duble } from './dubleDoClient.ts'

// Feature `82` · `ENV-07`, `ENV-14` — o código do envelope DA CLIENTE. **Só por RPC**
// (`set_material_tracking`), o aviso `material_tracking_set` só no `ok`, e a tradução de cada
// resposta da RPC num desfecho. O dublê registra a RPC, os argumentos e a ordem (`log`).

const ID = 'ord-1'
let d: Duble

beforeEach(() => {
  d = criarDuble()
  d.responderRpc = () => ({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
})

describe('writeMaterialTracking', () => {
  it('chama `set_material_tracking` UMA vez, com o pedido e o código como recebido — nenhuma tabela', async () => {
    await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })

    expect(d.rpcs).toEqual([{ fn: 'set_material_tracking', args: { p_order_id: ID, p_code: 'AN123456789BR' } }])
    expect(d.cadeias).toEqual([])
  })

  // Fase 5 (T19, `BUG-20261026-codigo-com-hifen-ou-espaco-gravado`): ANTES este caso cravava
  // "não normaliza nem valida" (`' an1 '` chegava cru à RPC). O dono passou a normalizar — é o que
  // dá ao painel e à loja a mesma forma do app. O comprimento continua sendo recusa só do app (A8).
  it('normaliza o código ANTES da RPC (`normalizeMaterialTrackingCode`), sem validar o comprimento', async () => {
    await writeMaterialTracking(d.deps, { id: ID, code: ' an1 ' })
    expect(d.rpcs[0].args).toEqual({ p_order_id: ID, p_code: 'AN1' })
  })

  it.each([
    ['hífen e ponto (colado do WhatsApp)', 'AN-123.456.789-BR'],
    ['espaços e minúsculas (o painel)', 'an 1234 5678 9br'],
    ['caracteres invisíveis', '\u202AAN123\u200B456789BR\u202C'],
  ])('%s ⇒ a RPC recebe a forma única', async (_nome, code) => {
    await writeMaterialTracking(d.deps, { id: ID, code })
    expect(d.rpcs).toEqual([{ fn: 'set_material_tracking', args: { p_order_id: ID, p_code: 'AN123456789BR' } }])
  })

  it('vazio depois de normalizar ⇒ `recusado` com `empty_code`, SEM rede e sem aviso', async () => {
    for (const code of ['', '   ', ' - . ', '\u200B\u202A']) {
      expect(await writeMaterialTracking(d.deps, { id: ID, code })).toEqual({ tipo: 'recusado', reason: 'empty_code' })
    }
    expect(d.rpcs).toEqual([])
    expect(d.log).toEqual([])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`ok` ⇒ o status da RPC e UM aviso `material_tracking_set`, depois da RPC', async () => {
    const r = await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })

    expect(r).toEqual({ tipo: 'ok', status: 'material_enviado', emailSent: true })
    expect(d.notify).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith(ID, 'material_tracking_set')
    expect(d.log).toEqual(['rpc set_material_tracking', 'notify material_tracking_set'])
  })

  it('o aviso que volta falso chega como `emailSent: false`', async () => {
    d.notify.mockResolvedValueOnce(false)
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({
      tipo: 'ok',
      status: 'material_enviado',
      emailSent: false,
    })
  })

  it('`avisar: false` ⇒ nenhum aviso, `emailSent: false`', async () => {
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR', avisar: false })).toEqual({
      tipo: 'ok',
      status: 'material_enviado',
      emailSent: false,
    })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it.each(['empty_code', 'material_not_applicable'])('`reason: "%s"` ⇒ `recusado` com o motivo, zero avisos', async (reason) => {
    d.responderRpc = () => ({ data: { ok: false, status: null, reason }, error: null })
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({ tipo: 'recusado', reason })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`ok: false` sem motivo, e `data` nulo, ⇒ `recusado` com `reason: null`, zero avisos', async () => {
    d.responderRpc = () => ({ data: { ok: false }, error: null })
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'X' })).toEqual({ tipo: 'recusado', reason: null })
    d.responderRpc = () => ({ data: null, error: null })
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'X' })).toEqual({ tipo: 'recusado', reason: null })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`reason: "not_allowed"` ⇒ `nao-permitido`, zero avisos', async () => {
    d.responderRpc = () => ({ data: { ok: false, status: null, reason: 'not_allowed' }, error: null })
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({ tipo: 'nao-permitido' })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`{ error }` ⇒ `falhou` com o erro, zero avisos', async () => {
    const error = { message: 'network' }
    d.responderRpc = () => ({ data: null, error })
    expect(await writeMaterialTracking(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({ tipo: 'falhou', erro: error })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('promessa rejeitada e exceção SÍNCRONA do client ⇒ `falhou`, nunca propaga', async () => {
    d.responderRpc = () => {
      throw new Error('rede')
    }
    expect((await writeMaterialTracking(d.deps, { id: ID, code: 'X' })).tipo).toBe('falhou')
    d.rpcLancaSincrono = true
    expect((await writeMaterialTracking(d.deps, { id: ID, code: 'X' })).tipo).toBe('falhou')
    expect(d.notify).not.toHaveBeenCalled()
  })
})
