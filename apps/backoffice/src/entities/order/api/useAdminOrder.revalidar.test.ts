// Feature `88` · T10 — `CRG-03`, `CRG-04`: a releitura que segue uma gravação NÃO pisca.
//
// Toda gravação no pedido chamava `reload()`, que ligava `loading` — e a página trocava o pedido
// inteiro por "Carregando...", levando a rolagem, o foco e o rastreio meio digitado. `reload('revalidar')`
// relê sem ligar `loading`, e em falha MANTÉM o pedido na tela e grava `staleError` (a faixa "Não
// consegui atualizar o pedido…"). `reload()` / `reload('inicial')` é a primeira carga de sempre.
//
// O dublê enxerga a consulta (`criarDuble`) e SEGURA a leitura do pedido quando o teste pede — é o
// que permite olhar o estado NO MEIO da releitura. Toda renderização do hook é registrada: "nunca
// ligou `loading`" se prova sobre a lista inteira, não só sobre o fim.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, type Registro, type Resposta } from '@/test/dubleSupabase'

const estado = vi.hoisted(() => ({ from: null as null | ((t: string) => unknown) }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: (t: string) => estado.from!(t) } }))

import { useAdminOrder, type AdminOrderDetail } from './useAdminOrder'

const ID = 'ord-88'
const PRODUTO = '1b832ffc-689b-4b4b-a0b3-98ef03bf9600'

let pedido: Record<string, unknown>
let falhaDoPedido: { message: string } | null
let segurar: { promessa: Promise<void>; soltar: () => void } | null
let calls: Registro[]

const novaTrava = () => {
  let soltar!: () => void
  const promessa = new Promise<void>((ok) => {
    soltar = ok
  })
  return { promessa, soltar }
}

const responder = async (r: Registro): Promise<Resposta> => {
  if (r.table === 'orders') {
    if (segurar) await segurar.promessa
    return falhaDoPedido ? { data: null, error: falhaDoPedido } : { data: { ...pedido }, error: null }
  }
  if (r.table === 'order_items') return { data: [{ id: 'it-1', order_id: ID, product_id: PRODUTO }], error: null }
  if (r.table === 'products') return { data: [{ id: PRODUTO, images: [{ url: 'https://x/capa.webp' }] }], error: null }
  if (r.table === 'customer_list') return { data: null, error: null }
  return { data: [], error: null }
}

beforeEach(() => {
  pedido = { id: ID, order_number: '0244', status: 'separating', customer_email: 'cliente@exemplo.invalid' }
  falhaDoPedido = null
  segurar = null
  const duble = criarDuble(responder)
  calls = duble.calls
  estado.from = duble.from as (t: string) => unknown
})

/** Monta o hook registrando o `loading` de CADA renderização. */
async function montar() {
  const loadings: boolean[] = []
  const view = renderHook(() => {
    const r = useAdminOrder(ID)
    loadings.push(r.loading)
    return r
  })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  await waitFor(() => expect(view.result.current.productRefs[PRODUTO]).toBeDefined())
  return { ...view, loadings }
}

describe("reload('inicial') — a primeira carga, igual a hoje", () => {
  it('liga `loading` e carrega o pedido; `staleError` nasce `null`', async () => {
    const { result, loadings } = await montar()
    expect(loadings[0]).toBe(true)
    expect(result.current.order?.id).toBe(ID)
    expect(result.current.error).toBeNull()
    expect(result.current.staleError).toBeNull()
  })

  it('`reload()` sem argumento é a carga inicial: liga `loading` de novo', async () => {
    const { result } = await montar()
    segurar = novaTrava()
    let fim!: Promise<void>
    act(() => {
      fim = result.current.reload()
    })
    await waitFor(() => expect(calls.filter((c) => c.table === 'orders').length).toBe(2))
    expect(result.current.loading).toBe(true)
    await act(async () => {
      segurar!.soltar()
      await fim
    })
    expect(result.current.loading).toBe(false)
  })

  it('falha na primeira carga: `error` com a mensagem, sem pedido — e NÃO é `staleError`', async () => {
    falhaDoPedido = { message: 'permission denied' }
    const view = renderHook(() => useAdminOrder(ID))
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.order).toBeNull()
    expect(view.result.current.error).toBe('permission denied')
    expect(view.result.current.staleError).toBeNull()
  })
})

describe("reload('revalidar') — CRG-03: sem 'Carregando...'", () => {
  it('NENHUMA renderização liga `loading`, o pedido e as fotos ficam na tela durante a releitura, e o novo chega no fim', async () => {
    const { result, loadings } = await montar()
    const antes: AdminOrderDetail = result.current
    loadings.length = 0

    segurar = novaTrava()
    pedido = { ...pedido, status: 'shipped' }
    let fim!: Promise<void>
    act(() => {
      fim = result.current.reload('revalidar')
    })

    // No meio da releitura: a leitura do pedido está segura no dublê.
    await waitFor(() => expect(calls.filter((c) => c.table === 'orders').length).toBe(2))
    expect(result.current.loading).toBe(false)
    expect(result.current.order).toBe(antes.order)
    expect(result.current.productRefs[PRODUTO]).toBeDefined()

    await act(async () => {
      segurar!.soltar()
      await fim
    })

    expect(loadings).not.toContain(true)
    expect(result.current.order?.status).toBe('shipped')
    expect(result.current.staleError).toBeNull()
  })

  it('CRG-04: a releitura FALHA ⇒ o pedido que estava na tela permanece, e `staleError` diz por quê', async () => {
    const { result, loadings } = await montar()
    const naTela = result.current.order
    loadings.length = 0

    falhaDoPedido = { message: 'Failed to fetch' }
    await act(async () => {
      await result.current.reload('revalidar')
    })

    expect(loadings).not.toContain(true)
    expect(result.current.order).toBe(naTela)
    expect(result.current.order?.id).toBe(ID)
    expect(result.current.staleError).toBe('Failed to fetch')
    // A falha da releitura não é a falha da carga: a página não troca o pedido pela faixa de erro.
    expect(result.current.error).toBeNull()
  })

  it('a releitura seguinte que dá certo APAGA o `staleError`', async () => {
    const { result } = await montar()
    falhaDoPedido = { message: 'Failed to fetch' }
    await act(async () => {
      await result.current.reload('revalidar')
    })
    expect(result.current.staleError).toBe('Failed to fetch')

    falhaDoPedido = null
    await act(async () => {
      await result.current.reload('revalidar')
    })
    expect(result.current.staleError).toBeNull()
  })
})
