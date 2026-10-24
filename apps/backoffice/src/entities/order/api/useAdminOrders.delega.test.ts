import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Feature `75` · `MAA-27`, A2, A8, A24, G1, G3, `AD-059` — o painel DELEGA as três escritas ao dono
// (`@estrelinha/core/order-actions`) e traduz cada desfecho para a forma de retorno de hoje, byte a
// byte. Uma linha da tabela de tradução do design (§3.3) por caso. O dono é dublado: o que se prova
// aqui é a entrada que o painel passa (inclusive o que ele NÃO passa — `expectedFrom`, `statusIn`),
// a tradução e as releituras.

const dono = vi.hoisted(() => ({
  writeOrderStatus: vi.fn(),
  writeTrackingCode: vi.fn(),
  writeMaterialStatus: vi.fn(),
}))
vi.mock('@estrelinha/core/order-actions', () => dono)

/** As leituras que o hook faz — é por elas que se conta a releitura. */
const selects: unknown[][] = []
let pedidosDaLista: Array<{ id: string; status: string }> = []
let rpcLancaSincrono = false

vi.mock('@estrelinha/supabase/client', () => {
  type Cadeia = Record<string, (...args: never[]) => unknown>
  function makeChain() {
    const chain: Cadeia = {
      select: (...args: unknown[]) => {
        selects.push(args)
        return chain
      },
      order: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      or: () => chain,
      range: () => Promise.resolve({ data: pedidosDaLista, error: null, count: pedidosDaLista.length }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    }
    return chain
  }
  const channel: Record<string, () => unknown> = { on: () => channel, subscribe: () => channel }
  return {
    supabase: {
      from: () => makeChain(),
      rpc: () => {
        if (rpcLancaSincrono) throw new Error('rpc lançou')
        return Promise.resolve({ data: { ok: true, status: 'material_recebido' }, error: null })
      },
      channel: () => channel,
      removeChannel: () => {},
    },
  }
})

vi.mock('./notifyOrder', () => ({ notifyOrder: vi.fn(async () => true) }))

import { supabase } from '@estrelinha/supabase/client'
import { notifyOrder } from './notifyOrder'
import { useAdminOrders } from './useAdminOrders'

const ID = 'ord-1'

/** Quantas vezes cada releitura rodou: a lista (`select('*', { count })`) e as contagens. */
const releituras = () => ({
  lista: selects.filter((a) => a[0] === '*').length,
  contagens: selects.filter((a) => a[0] === 'status, material_status').length,
})

async function montar() {
  const view = renderHook(() => useAdminOrders())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  await waitFor(() => expect(releituras().contagens).toBeGreaterThan(0))
  return view
}

beforeEach(() => {
  selects.length = 0
  pedidosDaLista = [{ id: ID, status: 'paid' }]
  rpcLancaSincrono = false
  dono.writeOrderStatus.mockReset()
  dono.writeTrackingCode.mockReset()
  dono.writeMaterialStatus.mockReset()
})

describe('updateStatus → writeOrderStatus', () => {
  it('passa o client e a notificadora do painel por IDENTIDADE, e `from` do cache da lista — sem `expectedFrom` (G3)', async () => {
    dono.writeOrderStatus.mockResolvedValue({ tipo: 'ok', emailSent: true })
    const { result } = await montar()

    await act(async () => {
      await result.current.updateStatus(ID, 'separating', 'nota')
    })

    expect(dono.writeOrderStatus).toHaveBeenCalledTimes(1)
    const [deps, entrada] = dono.writeOrderStatus.mock.calls[0]
    expect(deps.client).toBe(supabase)
    expect(deps.notify).toBe(notifyOrder)
    expect(entrada).toEqual({ id: ID, to: 'separating', from: 'paid', note: 'nota' })
    expect(entrada).not.toHaveProperty('expectedFrom')
  })

  it('pedido FORA da lista carregada ⇒ `from: undefined` (o dono grava `from_status: null`, como hoje)', async () => {
    dono.writeOrderStatus.mockResolvedValue({ tipo: 'ok', emailSent: false })
    const { result } = await montar()

    await act(async () => {
      await result.current.updateStatus('outro-pedido', 'shipped')
    })

    const entrada = dono.writeOrderStatus.mock.calls[0][1]
    expect(entrada.from).toBeUndefined()
    expect(entrada.id).toBe('outro-pedido')
  })

  it('`ok { emailSent }` ⇒ `{ error: null, emailSent }` e relê a lista E as contagens', async () => {
    dono.writeOrderStatus.mockResolvedValue({ tipo: 'ok', emailSent: true })
    const { result } = await montar()
    const antes = releituras()

    let saida: unknown
    await act(async () => {
      saida = await result.current.updateStatus(ID, 'shipped')
    })

    expect(saida).toEqual({ error: null, emailSent: true })
    expect(releituras().lista).toBe(antes.lista + 1)
    expect(releituras().contagens).toBe(antes.contagens + 1)
  })

  it('`falhou { erro }` ⇒ `{ error: erro, emailSent: false }`, sem releitura', async () => {
    const erro = { message: 'violates check constraint' }
    dono.writeOrderStatus.mockResolvedValue({ tipo: 'falhou', erro })
    const { result } = await montar()
    const antes = releituras()

    let saida: { error: unknown; emailSent: boolean } | undefined
    await act(async () => {
      saida = await result.current.updateStatus(ID, 'shipped')
    })

    expect(saida).toEqual({ error: erro, emailSent: false })
    expect(saida?.error).toBe(erro)
    expect(releituras()).toEqual(antes)
  })

  it('`nenhuma-linha` ⇒ `Error("Nenhum pedido foi alterado.")` e `emailSent: false`, sem releitura (A24)', async () => {
    dono.writeOrderStatus.mockResolvedValue({ tipo: 'nenhuma-linha' })
    const { result } = await montar()
    const antes = releituras()

    let saida: { error: unknown; emailSent: boolean } | undefined
    await act(async () => {
      saida = await result.current.updateStatus(ID, 'shipped')
    })

    expect(saida?.error).toBeInstanceOf(Error)
    expect((saida?.error as Error).message).toBe('Nenhum pedido foi alterado.')
    expect(saida?.emailSent).toBe(false)
    expect(releituras()).toEqual(antes)
  })
})

describe('addTrackingCode → writeTrackingCode', () => {
  it('passa `carrier`, sem `statusIn` (G3), e o código BYTE A BYTE como a tela passou (A8 é só do app)', async () => {
    dono.writeTrackingCode.mockResolvedValue({ tipo: 'ok', emailSent: true })
    const { result } = await montar()

    await act(async () => {
      await result.current.addTrackingCode(ID, ' an 123 br ', 'Correios')
    })

    const [deps, entrada] = dono.writeTrackingCode.mock.calls[0]
    expect(deps.client).toBe(supabase)
    expect(deps.notify).toBe(notifyOrder)
    expect(entrada).toEqual({ id: ID, code: ' an 123 br ', carrier: 'Correios' })
    expect(entrada).not.toHaveProperty('statusIn')
  })

  it('com o campo de transportadora vazio, `carrier` vai `""` — nunca `null`', async () => {
    dono.writeTrackingCode.mockResolvedValue({ tipo: 'ok', emailSent: false })
    const { result } = await montar()

    await act(async () => {
      await result.current.addTrackingCode(ID, 'AN123456789BR', '')
    })

    expect(dono.writeTrackingCode.mock.calls[0][1].carrier).toBe('')
  })

  it('`ok` ⇒ `{ error: null, emailSent }` e relê SÓ a lista (como hoje)', async () => {
    dono.writeTrackingCode.mockResolvedValue({ tipo: 'ok', emailSent: true })
    const { result } = await montar()
    const antes = releituras()

    let saida: unknown
    await act(async () => {
      saida = await result.current.addTrackingCode(ID, 'AN123456789BR', 'Correios')
    })

    expect(saida).toEqual({ error: null, emailSent: true })
    expect(releituras()).toEqual({ lista: antes.lista + 1, contagens: antes.contagens })
  })

  it('`falhou` ⇒ `{ error: erro, emailSent: false }`, sem releitura', async () => {
    const erro = { message: 'permission denied' }
    dono.writeTrackingCode.mockResolvedValue({ tipo: 'falhou', erro })
    const { result } = await montar()
    const antes = releituras()

    let saida: unknown
    await act(async () => {
      saida = await result.current.addTrackingCode(ID, 'NA1', 'Correios')
    })

    expect(saida).toEqual({ error: erro, emailSent: false })
    expect(releituras()).toEqual(antes)
  })

  it('`nenhuma-linha` ⇒ `Error("Nenhum pedido foi alterado.")`, sem releitura', async () => {
    dono.writeTrackingCode.mockResolvedValue({ tipo: 'nenhuma-linha' })
    const { result } = await montar()
    const antes = releituras()

    let saida: { error: unknown; emailSent: boolean } | undefined
    await act(async () => {
      saida = await result.current.addTrackingCode(ID, 'AN123456789BR', 'Correios')
    })

    expect(saida?.error).toBeInstanceOf(Error)
    expect((saida?.error as Error).message).toBe('Nenhum pedido foi alterado.')
    expect(saida?.emailSent).toBe(false)
    expect(releituras()).toEqual(antes)
  })
})

describe('setMaterialStatus → writeMaterialStatus', () => {
  it('passa o client e a notificadora por identidade, e `{ id, to }`', async () => {
    dono.writeMaterialStatus.mockResolvedValue({ tipo: 'ok', status: 'material_recebido', emailSent: true })
    const { result } = await montar()

    await act(async () => {
      await result.current.setMaterialStatus(ID, 'material_recebido')
    })

    const [deps, entrada] = dono.writeMaterialStatus.mock.calls[0]
    expect(deps.client).toBe(supabase)
    expect(deps.notify).toBe(notifyOrder)
    expect(entrada).toEqual({ id: ID, to: 'material_recebido' })
  })

  it('`ok { status, emailSent }` ⇒ `{ ok: true, reason: null, emailSent }` e relê lista e contagens', async () => {
    dono.writeMaterialStatus.mockResolvedValue({ tipo: 'ok', status: 'material_recebido', emailSent: false })
    const { result } = await montar()
    const antes = releituras()

    let saida: unknown
    await act(async () => {
      saida = await result.current.setMaterialStatus(ID, 'material_recebido')
    })

    expect(saida).toEqual({ ok: true, reason: null, emailSent: false })
    expect(releituras()).toEqual({ lista: antes.lista + 1, contagens: antes.contagens + 1 })
  })

  it.each([
    ['`sem-papel`', { tipo: 'sem-papel' }, 'not_admin'],
    ['`material-recusado` com `reason: null`', { tipo: 'material-recusado', reason: null, status: null }, 'invalid_transition'],
    ['`material-recusado` com o motivo', { tipo: 'material-recusado', reason: 'order_not_found', status: null }, 'order_not_found'],
    ['`falhou`', { tipo: 'falhou', erro: { message: 'rede' } }, 'rpc_failed'],
  ])('%s ⇒ `{ ok: false, reason: "%s" }`, sem releitura', async (_r, desfecho, reason) => {
    dono.writeMaterialStatus.mockResolvedValue(desfecho)
    const { result } = await montar()
    const antes = releituras()

    let saida: unknown
    await act(async () => {
      saida = await result.current.setMaterialStatus(ID, 'material_recebido')
    })

    expect(saida).toEqual({ ok: false, reason, emailSent: false })
    expect(releituras()).toEqual(antes)
  })
})

describe('a mudança benigna declarada (§3.3): exceção SÍNCRONA do client vira `rpc_failed`', () => {
  it('com o dono de VERDADE, o `supabase.rpc` lançando na hora devolve `{ ok: false, reason: "rpc_failed" }` em vez de propagar', async () => {
    const real = await vi.importActual<typeof import('@estrelinha/core/order-actions')>('@estrelinha/core/order-actions')
    dono.writeMaterialStatus.mockImplementation(real.writeMaterialStatus)
    rpcLancaSincrono = true
    const { result } = await montar()

    let saida: unknown
    await act(async () => {
      saida = await result.current.setMaterialStatus(ID, 'material_recebido')
    })

    expect(saida).toEqual({ ok: false, reason: 'rpc_failed', emailSent: false })
  })
})
