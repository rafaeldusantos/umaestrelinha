// Feature `88` · T11 — `AVS-03`, `AVS-04`, `AVS-09`, ponta a ponta DENTRO do painel: o hook, o dono de
// verdade (`@estrelinha/core/order-actions`), `notifyOrder` de verdade e o corpo que chega a
// `functions.invoke`. Nada é dublado no caminho além do client — a prova é o CORPO, por valor.
//
// `cancelOrder` escreve aqui (é a única entrada da allowlist de `pedidoGravadoSoPeloDono`), e só o
// AVISO dele muda: com a caixa desmarcada o gatilho leva `customer: false`; sem a escolha, o corpo de
// sempre.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const registro = vi.hoisted(() => ({
  invocacoes: [] as Array<{ porta: string; body: Record<string, unknown> }>,
  updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  /** T23: o `update` do cancelamento falha. */
  falharUpdate: false,
  /** T23: o que o motor responde ao gatilho. */
  sent: true,
}))

/** O client: o mínimo que o hook, o dono e `notifyOrder` usam — e `functions.invoke` registrando. */
const falso = vi.hoisted(() => {
  type Cadeia = Record<string, (...a: never[]) => unknown>
  const cadeia = (table: string): Cadeia => {
    const c: Cadeia = {
      select: () => c,
      order: () => c,
      eq: () => c,
      gte: () => c,
      lte: () => c,
      or: () => c,
      range: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ error: null }),
      update: ((values: Record<string, unknown>) => {
        registro.updates.push({ table, values })
        // O dono confere o efeito com `.select('id')`; o `cancelOrder` do painel aguarda o `.eq()`.
        const efeito = registro.falharUpdate
          ? { data: null, error: { message: 'boom' } }
          : { data: [{ id: 'ord-1' }], error: null }
        const eq = { select: () => Promise.resolve(efeito), then: (ok: (v: unknown) => unknown) => Promise.resolve(efeito).then(ok) }
        return { eq: () => eq }
      }) as never,
      then: ((ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok)) as never,
    }
    return c
  }
  const canal: Record<string, () => unknown> = { on: () => canal, subscribe: () => canal }
  return {
    from: (t: string) => cadeia(t),
    rpc: (fn: string) =>
      Promise.resolve({ data: { ok: true, status: fn === 'set_material_status' ? 'material_recebido' : 'material_enviado' }, error: null }),
    channel: () => canal,
    removeChannel: () => {},
    functions: {
      invoke: (porta: string, { body }: { body: Record<string, unknown> }) => {
        registro.invocacoes.push({ porta, body })
        return Promise.resolve({ data: { sent: registro.sent }, error: null })
      },
    },
  }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: falso }))
vi.mock('@estrelinha/supabase', () => ({ supabase: falso }))

import { useAdminOrders } from './useAdminOrders'

const ID = 'ord-1'
const gatilhos = () => registro.invocacoes.filter((i) => i.porta === 'send-notification?action=trigger')

async function montar() {
  const view = renderHook(() => useAdminOrders())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  registro.invocacoes.length = 0
  registro.updates.length = 0
})

describe('o corpo do gatilho, pelas quatro escritas', () => {
  it.each([
    ['updateStatus', (h: ReturnType<typeof useAdminOrders>, a?: boolean) => h.updateStatus(ID, 'shipped', undefined, a), 'order_status_changed'],
    ['addTrackingCode', (h: ReturnType<typeof useAdminOrders>, a?: boolean) => h.addTrackingCode(ID, 'AN123456789BR', 'Correios', a), 'order_status_changed'],
    ['setMaterialStatus', (h: ReturnType<typeof useAdminOrders>, a?: boolean) => h.setMaterialStatus(ID, 'material_recebido', a), 'material_status_changed'],
    ['setMaterialTracking', (h: ReturnType<typeof useAdminOrders>, a?: boolean) => h.setMaterialTracking(ID, 'AA123456789BR', a), 'material_tracking_set'],
  ] as const)('%s: caixa desmarcada ⇒ `customer: false`; ausente ⇒ o corpo de hoje', async (_nome, chamar, trigger) => {
    const { result } = await montar()

    await act(async () => {
      await chamar(result.current, false)
    })
    expect(gatilhos()).toEqual([
      { porta: 'send-notification?action=trigger', body: { order_id: ID, trigger, customer: false } },
    ])

    registro.invocacoes.length = 0
    await act(async () => {
      await chamar(result.current)
    })
    expect(gatilhos()).toEqual([{ porta: 'send-notification?action=trigger', body: { order_id: ID, trigger } }])
  })
})

describe('cancelOrder — AVS-09', () => {
  it('`cancelOrder(id, motivo, false)` invoca `trigger` com `customer: false`', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.cancelOrder(ID, 'Cliente desistiu', false)
    })
    expect(gatilhos()).toEqual([
      { porta: 'send-notification?action=trigger', body: { order_id: ID, trigger: 'order_status_changed', customer: false } },
    ])
  })

  it('sem a escolha ⇒ o corpo de sempre, sem `customer`', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.cancelOrder(ID, 'Cliente desistiu')
    })
    expect(gatilhos()).toEqual([
      { porta: 'send-notification?action=trigger', body: { order_id: ID, trigger: 'order_status_changed' } },
    ])
  })

  it('`true` ⇒ o corpo de sempre — a escrita do cancelamento é a mesma nos três casos', async () => {
    const { result } = await montar()
    await act(async () => {
      await result.current.cancelOrder(ID, 'Cliente desistiu', true)
    })
    expect(gatilhos()[0].body).toEqual({ order_id: ID, trigger: 'order_status_changed' })
    expect(registro.updates.filter((u) => u.table === 'orders').map((u) => u.values)).toEqual([
      { status: 'cancelled', cancel_reason: 'Cliente desistiu' },
    ])
  })
})

describe('cancelOrder devolve se o e-mail saiu — T23, AVS-07', () => {
  beforeEach(() => {
    registro.falharUpdate = false
    registro.sent = true
  })

  it('o motor respondeu `sent: true` ⇒ `{ error: null, emailSent: true }`', async () => {
    const { result } = await montar()
    let r: unknown
    await act(async () => {
      r = await result.current.cancelOrder(ID, 'Cliente desistiu', true)
    })
    expect(r).toEqual({ error: null, emailSent: true })
  })

  it('o motor respondeu `sent: false` ⇒ `emailSent: false` — o mesmo booleano de `notifyOrder`', async () => {
    registro.sent = false
    const { result } = await montar()
    let r: unknown
    await act(async () => {
      r = await result.current.cancelOrder(ID, 'Cliente desistiu')
    })
    expect(r).toEqual({ error: null, emailSent: false })
  })

  it('a escrita falha ⇒ o erro, `emailSent: false`, e nenhum gatilho', async () => {
    registro.falharUpdate = true
    const { result } = await montar()
    let r: { error: unknown; emailSent: boolean } | undefined
    await act(async () => {
      r = await result.current.cancelOrder(ID, 'Cliente desistiu', false)
    })
    expect(r?.error).toEqual({ message: 'boom' })
    expect(r?.emailSent).toBe(false)
    expect(gatilhos()).toEqual([])
  })
})
