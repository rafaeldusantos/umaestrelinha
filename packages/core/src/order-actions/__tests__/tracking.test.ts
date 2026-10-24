import { beforeEach, describe, expect, it } from 'vitest'

import { writeTrackingCode } from '../tracking.ts'
import { ERRO, ZERO_LINHAS, criarDuble, passosDe, type Duble } from './dubleDoClient.ts'

// Feature `75` · `MAA-13` (passo 1), `MAA-14`, `MAA-21`, A9, A25 — a escrita do rastreio, subida de
// `useAdminOrders.addTrackingCode`. **O dono não normaliza nem valida o código** (A8 vale só no app):
// um normalizador posto "por segurança" aqui mudaria o que o painel grava com a suíte verde.

const ID = 'ord-1'
let d: Duble

beforeEach(() => {
  d = criarDuble()
})

const valoresDoUpdate = () => passosDe(d, 'orders')[0][0][1] as Record<string, unknown>

describe('writeTrackingCode — a transportadora (A9)', () => {
  it('`carrier` ausente ⇒ o objeto do `update` NÃO tem a chave `shipping_carrier`', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })
    expect(valoresDoUpdate()).toEqual({ tracking_code: 'AN123456789BR' })
    expect(valoresDoUpdate()).not.toHaveProperty('shipping_carrier')
  })

  it('`carrier` passada vai EXATAMENTE como recebida', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', carrier: 'Correios' })
    expect(valoresDoUpdate()).toEqual({ tracking_code: 'AN123456789BR', shipping_carrier: 'Correios' })
  })

  it('a string VAZIA (o painel com o campo vazio) vai como `""` — nunca vira `null`', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', carrier: '' })
    expect(valoresDoUpdate()).toEqual({ tracking_code: 'AN123456789BR', shipping_carrier: '' })
  })

  it('`null` só chega ao `update` se o chamador o passar', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', carrier: null })
    expect(valoresDoUpdate()).toEqual({ tracking_code: 'AN123456789BR', shipping_carrier: null })
  })
})

describe('writeTrackingCode — o código vai byte a byte (A8 é do app)', () => {
  it('minúsculas e espaço interno chegam ao `update` como passados', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: ' an 123 br ' })
    expect(valoresDoUpdate()).toEqual({ tracking_code: ' an 123 br ' })
  })

  it('um código de 3 caracteres é gravado sem recusa', async () => {
    const r = await writeTrackingCode(d.deps, { id: ID, code: 'NA1' })
    expect(r.tipo).toBe('ok')
    expect(valoresDoUpdate()).toEqual({ tracking_code: 'NA1' })
  })
})

describe('writeTrackingCode — a cadeia e a guarda de status (A25)', () => {
  it('sem `statusIn`: nenhum `.in`, e `.select("id")` sempre', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', carrier: 'Correios' })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { tracking_code: 'AN123456789BR', shipping_carrier: 'Correios' }],
        ['eq', 'id', ID],
        ['select', 'id'],
      ],
    ])
  })

  it('com `statusIn`: `.in("status", statusIn)` antes do `select`', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', statusIn: ['separating', 'shipped'] })
    expect(passosDe(d, 'orders')).toEqual([
      [
        ['update', { tracking_code: 'AN123456789BR' }],
        ['eq', 'id', ID],
        ['in', 'status', ['separating', 'shipped']],
        ['select', 'id'],
      ],
    ])
  })

  it('nunca grava histórico — é o que o painel faz', async () => {
    await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })
    expect(passosDe(d, 'order_status_history')).toEqual([])
    expect(d.cadeias.map((c) => c.tabela)).toEqual(['orders'])
  })
})

describe('writeTrackingCode — desfechos', () => {
  it('uma linha ⇒ `ok` e UM aviso `order_status_changed` (o outro lado do par, TRG-12)', async () => {
    const r = await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })
    expect(r).toEqual({ tipo: 'ok', emailSent: true })
    expect(d.notify).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith(ID, 'order_status_changed')
  })

  it('`avisar: false` ⇒ `ok` sem aviso', async () => {
    const r = await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', avisar: false })
    expect(r).toEqual({ tipo: 'ok', emailSent: false })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('zero linhas ⇒ `nenhuma-linha`, sem aviso', async () => {
    d.responder = () => ZERO_LINHAS
    expect(await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR', statusIn: ['shipped'] })).toEqual({
      tipo: 'nenhuma-linha',
    })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('`{ error }` ⇒ `falhou`, sem aviso', async () => {
    d.responder = () => ERRO
    expect(await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({ tipo: 'falhou', erro: ERRO.error })
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('exceção síncrona ⇒ `falhou`, sem lançar', async () => {
    d.fromLancaSincrono = true
    expect((await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })).tipo).toBe('falhou')
    expect(d.notify).not.toHaveBeenCalled()
  })

  it('promessa rejeitada ⇒ `falhou`, sem lançar', async () => {
    const boom = new Error('rede')
    d.responder = () => {
      throw boom
    }
    expect(await writeTrackingCode(d.deps, { id: ID, code: 'AN123456789BR' })).toEqual({ tipo: 'falhou', erro: boom })
    expect(d.notify).not.toHaveBeenCalled()
  })
})
