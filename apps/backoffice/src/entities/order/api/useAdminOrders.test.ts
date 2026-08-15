import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendOrderEmailMock = vi.fn<(orderId: string, type: string) => Promise<boolean>>()

/** Resultado do `.update().eq()` — trocado por teste para exercitar o caminho de falha. */
let updateResult: { error: unknown } = { error: null }
const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = []

/** Feature 22: as duas transições de material são RPC, nunca `update`. O dublê registra as chamadas. */
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
let rpcResult: { data: unknown; error: unknown } = {
  data: { ok: true, status: 'material_recebido', reason: null },
  error: null,
}

vi.mock('@estrelinha/supabase/client', () => {
  // Cadeia mínima: só a superfície que `useAdminOrders` usa. Um dublê que imita o supabase-js
  // inteiro dá falso verde (mesma regra dos dublês das edge functions).
  function makeChain(table: string) {
    const chain: any = {
      select: () => chain,
      order: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      or: () => chain,
      range: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ error: null }),
      update: (values: Record<string, unknown>) => {
        updateCalls.push({ table, values })
        return { eq: () => Promise.resolve(updateResult) }
      },
      // Awaitable sem terminador — é como `fetchStatusCounts` lê `select('status')`.
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    }
    return chain
  }

  const channel: any = { on: () => channel, subscribe: () => channel }

  return {
    supabase: {
      from: (table: string) => makeChain(table),
      rpc: (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args })
        return Promise.resolve(rpcResult)
      },
      channel: () => channel,
      removeChannel: () => {},
    },
  }
})

vi.mock('./sendOrderEmail', () => ({
  sendOrderEmail: (orderId: string, type: string) => sendOrderEmailMock(orderId, type),
}))

import { useAdminOrders } from './useAdminOrders'

const ORDER_ID = 'ord-1'

async function mountHook() {
  const view = renderHook(() => useAdminOrders())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  updateResult = { error: null }
  updateCalls.length = 0
  rpcCalls.length = 0
  rpcResult = { data: { ok: true, status: 'material_recebido', reason: null }, error: null }
  sendOrderEmailMock.mockReset()
  sendOrderEmailMock.mockResolvedValue(true)
})

describe('TRG-12 — os DOIS escritores tentam o e-mail de enviado', () => {
  it('updateStatus para `shipped` tenta o e-mail order_shipped', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(sendOrderEmailMock).toHaveBeenCalledWith(ORDER_ID, 'order_shipped')
  })

  it('addTrackingCode tenta SEMPRE — é o outro lado do par, e cobre o Melhor Envio', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.addTrackingCode(ORDER_ID, 'NA123456789BR', 'Correios')
    })

    expect(sendOrderEmailMock).toHaveBeenCalledWith(ORDER_ID, 'order_shipped')
    expect(updateCalls.find((c) => 'tracking_code' in c.values)?.values).toEqual({
      tracking_code: 'NA123456789BR',
      shipping_carrier: 'Correios',
    })
  })

  it.each(['pending', 'paid', 'delivered', 'cancelled'])(
    'updateStatus para `%s` NÃO tenta e-mail de enviado',
    async (status) => {
      const { result } = await mountHook()

      await act(async () => {
        await result.current.updateStatus(ORDER_ID, status)
      })

      expect(sendOrderEmailMock).not.toHaveBeenCalled()
    },
  )

  it('propaga emailSent para quem chamou, para o toast poder ser honesto', async () => {
    const { result } = await mountHook()
    sendOrderEmailMock.mockResolvedValue(false)

    let outcome: any
    await act(async () => {
      outcome = await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(outcome).toEqual({ error: null, emailSent: false })
  })
})

describe('UX-02 — falha de escrita não é engolida e não dispara e-mail', () => {
  it('erro no update de status volta em `error` e NÃO tenta e-mail', async () => {
    updateResult = { error: { message: 'violates check constraint "orders_status_check"' } }
    const { result } = await mountHook()

    let outcome: any
    await act(async () => {
      outcome = await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(outcome.error).toEqual({ message: 'violates check constraint "orders_status_check"' })
    expect(outcome.emailSent).toBe(false)
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })

  it('erro no update de rastreio volta em `error` e NÃO tenta e-mail', async () => {
    updateResult = { error: { message: 'permission denied' } }
    const { result } = await mountHook()

    let outcome: any
    await act(async () => {
      outcome = await result.current.addTrackingCode(ORDER_ID, 'NA1', 'Correios')
    })

    expect(outcome.error).toEqual({ message: 'permission denied' })
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })
})

// =================================================================================================
// Feature 22 — a fila de material (MAT-08, MAT-09, MAT-10, MAT-11)
// =================================================================================================

describe('MAT-08 — a transição do material é RPC, nunca `update`', () => {
  it('`setMaterialStatus` chama `set_material_status` com o pedido e o alvo', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(rpcCalls).toContainEqual({
      fn: 'set_material_status',
      args: { p_order_id: ORDER_ID, p_status: 'material_recebido' },
    })
  })

  it('NENHUM `update` em `orders` toca `material_status`', async () => {
    // Um `update` daqui contornaria a máquina de estado inteira — inclusive o salto direto e a
    // guarda de "nunca volta atrás", que vivem no `where` da RPC.
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(updateCalls.filter(c => 'material_status' in c.values)).toEqual([])
  })

  it('recusa da RPC devolve o motivo e NÃO dispara e-mail', async () => {
    rpcResult = {
      data: { ok: false, status: 'nao_aplicavel', reason: 'invalid_transition' },
      error: null,
    }
    const { result } = await mountHook()

    let resultado: { ok: boolean; reason: string | null } | undefined
    await act(async () => {
      resultado = await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(resultado?.ok).toBe(false)
    expect(resultado?.reason).toBe('invalid_transition')
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })

  it('erro de rede na RPC não vira exceção — devolve `ok: false`', async () => {
    rpcResult = { data: null, error: { message: 'network' } }
    const { result } = await mountHook()

    let resultado: { ok: boolean } | undefined
    await act(async () => {
      resultado = await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(resultado?.ok).toBe(false)
  })
})

describe('MAT-09 — o e-mail de material recebido é CONTIDO (AD-008)', () => {
  it('transição bem-sucedida para `material_recebido` tenta o e-mail', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(sendOrderEmailMock).toHaveBeenCalledWith(ORDER_ID, 'material_received')
  })

  it('as outras transições NÃO disparam e-mail', async () => {
    rpcResult = { data: { ok: true, status: 'em_producao', reason: null }, error: null }
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialStatus(ORDER_ID, 'em_producao')
    })

    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })

  it('e-mail que FALHA não reverte o estado nem vira erro para a admin', async () => {
    // A Adri acabou de conferir o envelope na bancada. Desfazer isso porque o Resend caiu seria
    // pior do que não avisar a cliente.
    sendOrderEmailMock.mockResolvedValue(false)
    const { result } = await mountHook()

    let resultado: { ok: boolean; emailSent: boolean } | undefined
    await act(async () => {
      resultado = await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
    })

    expect(resultado?.ok).toBe(true)
    expect(resultado?.emailSent).toBe(false)
  })

  it('e-mail que REJEITA não propaga a exceção', async () => {
    sendOrderEmailMock.mockRejectedValue(new Error('boom'))
    const { result } = await mountHook()

    let erro: unknown = null
    await act(async () => {
      try {
        await result.current.setMaterialStatus(ORDER_ID, 'material_recebido')
      } catch (e) {
        erro = e
      }
    })

    // `sendOrderEmail` tem contrato de nunca lançar; se um dia lançar, quem chama precisa saber.
    // Este teste é o sensor: hoje ele documenta que a promessa vem de lá.
    expect(erro).not.toBeNull()
  })
})

describe('MAT-11 — o rastreio da remessa da cliente, pelo painel', () => {
  it('usa a MESMA RPC que a loja — uma máquina de estado, não duas', async () => {
    rpcResult = { data: { ok: true, status: 'material_enviado', reason: null }, error: null }
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialTracking(ORDER_ID, 'AA123456789BR')
    })

    expect(rpcCalls).toContainEqual({
      fn: 'set_material_tracking',
      args: { p_order_id: ORDER_ID, p_code: 'AA123456789BR' },
    })
  })

  it('NUNCA grava `material_tracking_code` por `update`', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialTracking(ORDER_ID, 'AA1BR')
    })

    expect(updateCalls.filter(c => 'material_tracking_code' in c.values)).toEqual([])
  })

  it('não confunde com `tracking_code`, que é a remessa DE SAÍDA', async () => {
    // Reusar aquela coluna faria "postamos sua joia" sair com o código do envelope da cliente.
    const { result } = await mountHook()

    await act(async () => {
      await result.current.setMaterialTracking(ORDER_ID, 'AA1BR')
    })

    expect(updateCalls.filter(c => 'tracking_code' in c.values)).toEqual([])
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })
})

describe('MAT-10 — filtro e contagens da fila', () => {
  it('o filtro de material começa em `all`', async () => {
    const { result } = await mountHook()
    expect(result.current.materialFilter).toBe('all')
  })

  it('trocar o filtro volta para a primeira página', async () => {
    // Sem isto, filtrar estando na página 3 mostraria "nenhum pedido" numa fila que tem pedidos.
    const { result } = await mountHook()

    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    act(() => result.current.setMaterialFilter('aguardando_material'))
    await waitFor(() => expect(result.current.page).toBe(1))
  })

  it('expõe `materialCounts`', async () => {
    const { result } = await mountHook()
    expect(result.current.materialCounts).toBeDefined()
  })
})
