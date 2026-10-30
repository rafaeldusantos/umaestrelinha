import { beforeEach, describe, expect, it } from 'vitest'

import type { NotificationTrigger } from '../../notifications/triggers.ts'
import { writeMaterialStatus } from '../material.ts'
import { writeMaterialTracking } from '../materialTracking.ts'
import { writeOrderStatus } from '../status.ts'
import { writeTrackingCode } from '../tracking.ts'
import type { OrderWriteDeps } from '../types.ts'
import { criarDuble, type Duble } from './dubleDoClient.ts'

// Feature `88` · `AVS-03`, `AVS-04`, `A-04`, Tech Decision "dois argumentos quando ausente" — a escolha
// da caixa ("Avisar a cliente por e-mail") chega ao dono como `avisarCliente`, ao lado de `avisar`.
// `avisar` continua sendo "dispare o gatilho?"; `avisarCliente: false` dispara o gatilho com
// `{ cliente: false }`. Ausente ou `true`, a notificadora é chamada com EXATAMENTE dois argumentos —
// a chamada de antes da `88`, que `runAppAction` e o app do ateliê continuam fazendo.

const ID = 'ord-1'
let d: Duble

beforeEach(() => {
  d = criarDuble()
})

interface Caso {
  nome: string
  gatilho: NotificationTrigger
  escrever: (deps: OrderWriteDeps, extra: { avisar?: boolean; avisarCliente?: boolean }) => Promise<{ tipo: string; emailSent?: boolean }>
  preparar?: (d: Duble) => void
}

const CASOS: Caso[] = [
  {
    nome: 'writeOrderStatus',
    gatilho: 'order_status_changed',
    escrever: (deps, extra) => writeOrderStatus(deps, { id: ID, to: 'shipped', from: 'separating', ...extra }),
  },
  {
    nome: 'writeTrackingCode',
    gatilho: 'order_status_changed',
    escrever: (deps, extra) => writeTrackingCode(deps, { id: ID, code: 'AN123456789BR', ...extra }),
  },
  {
    nome: 'writeMaterialStatus',
    gatilho: 'material_status_changed',
    escrever: (deps, extra) => writeMaterialStatus(deps, { id: ID, to: 'material_recebido', ...extra }),
  },
  {
    nome: 'writeMaterialTracking',
    gatilho: 'material_tracking_set',
    escrever: (deps, extra) => writeMaterialTracking(deps, { id: ID, code: 'AN123456789BR', ...extra }),
    preparar: (dd) => {
      dd.responderRpc = () => ({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
    },
  },
]

describe.each(CASOS)('$nome — avisarCliente', ({ gatilho, escrever, preparar }) => {
  beforeEach(() => preparar?.(d))

  it('`avisarCliente: false` ⇒ o gatilho de sempre, com `{ cliente: false }` como terceiro argumento (AVS-04)', async () => {
    const r = await escrever(d.deps, { avisarCliente: false })
    expect(r.tipo).toBe('ok')
    expect(d.notify.mock.calls).toEqual([[ID, gatilho, { cliente: false }]])
  })

  it('o desfecho do aviso pulado chega como `emailSent` do que a notificadora devolveu', async () => {
    d.notify.mockResolvedValueOnce(false)
    const r = await escrever(d.deps, { avisarCliente: false })
    expect(r.emailSent).toBe(false)
  })

  it('`avisarCliente` AUSENTE ⇒ a notificadora com EXATAMENTE dois argumentos (paridade com antes da 88)', async () => {
    await escrever(d.deps, {})
    expect(d.notify.mock.calls).toEqual([[ID, gatilho]])
    expect(d.notify.mock.calls[0]).toHaveLength(2)
  })

  it('`avisarCliente: true` ⇒ também dois argumentos (AVS-03: a caixa marcada é o corpo de hoje)', async () => {
    await escrever(d.deps, { avisarCliente: true })
    expect(d.notify.mock.calls).toEqual([[ID, gatilho]])
    expect(d.notify.mock.calls[0]).toHaveLength(2)
  })

  it('`avisar: false` continua não disparando NADA, mesmo com `avisarCliente: false`', async () => {
    const r = await escrever(d.deps, { avisar: false, avisarCliente: false })
    expect(r.tipo).toBe('ok')
    expect(d.notify).not.toHaveBeenCalled()
  })
})
