// Feature `88` · T10 — `CRG-12`: a lista relê depois do lote ou de uma ação de linha SEM trocar a
// tabela por "Carregando...". `refetch('revalidar')` não liga `loading`, expõe `revalidando` (o selo
// "Atualizando…" do cabeçalho) enquanto a releitura corre, mantém página e tamanho, e em falha
// MANTÉM as linhas e grava `staleError`. `refetch()` / `refetch('inicial')` é a carga de sempre.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, type Registro, type Resposta } from '@/test/dubleSupabase'

const estado = vi.hoisted(() => ({ from: null as null | ((t: string) => unknown) }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: (t: string) => estado.from!(t) } }))

import { defaultOrderQuery, type OrderQuery } from './orderQuery'
import { useAdminOrderList } from './useAdminOrderList'

let linhas: Array<{ id: string; status: string }>
let falhaDaLista: { message: string } | null
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
  if (r.table === 'order_list') {
    if (segurar) await segurar.promessa
    return falhaDaLista ? { data: null, error: falhaDaLista } : { data: linhas.map((l) => ({ ...l })), error: null, count: 120 }
  }
  return { data: [], error: null, count: 0 }
}

beforeEach(() => {
  linhas = [
    { id: 'a', status: 'paid' },
    { id: 'b', status: 'separating' },
  ]
  falhaDaLista = null
  segurar = null
  const duble = criarDuble(responder)
  calls = duble.calls
  estado.from = duble.from as (t: string) => unknown
})

const ranges = () =>
  calls.filter((c) => c.table === 'order_list').map((c) => c.filters.find((f) => f.method === 'range')?.args)

async function montar(query: OrderQuery = defaultOrderQuery()) {
  const loadings: boolean[] = []
  const view = renderHook(() => {
    const r = useAdminOrderList(query)
    loadings.push(r.loading)
    return r
  })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  await waitFor(() => expect(view.result.current.rows).toHaveLength(2))
  return { ...view, loadings }
}

describe("refetch('revalidar') — CRG-12", () => {
  it('não liga `loading`; `revalidando` fica verdadeiro SÓ enquanto a releitura corre; as linhas ficam na tela', async () => {
    const { result, loadings } = await montar()
    expect(result.current.revalidando).toBe(false)
    const naTela = result.current.rows
    loadings.length = 0

    segurar = novaTrava()
    linhas = [{ id: 'a', status: 'shipped' }]
    let fim!: Promise<void>
    act(() => {
      fim = result.current.refetch('revalidar')
    })

    await waitFor(() => expect(result.current.revalidando).toBe(true))
    expect(result.current.loading).toBe(false)
    expect(result.current.rows).toBe(naTela)

    await act(async () => {
      segurar!.soltar()
      await fim
    })

    expect(loadings).not.toContain(true)
    expect(result.current.revalidando).toBe(false)
    expect(result.current.rows).toEqual([{ id: 'a', status: 'shipped' }])
    expect(result.current.staleError).toBeNull()
  })

  it('mantém a página e o tamanho: a releitura pede o MESMO recorte (página 3 de 50 ⇒ 100..149)', async () => {
    const query: OrderQuery = { ...defaultOrderQuery(), page: 3, pageSize: 50 }
    const { result } = await montar(query)
    expect(ranges()).toEqual([[100, 149]])

    await act(async () => {
      await result.current.refetch('revalidar')
    })
    expect(ranges()).toEqual([
      [100, 149],
      [100, 149],
    ])
  })

  it('em FALHA mantém as linhas e o total, grava `staleError`, e não vira o erro da carga', async () => {
    const { result } = await montar()
    const naTela = result.current.rows

    falhaDaLista = { message: 'Failed to fetch' }
    await act(async () => {
      await result.current.refetch('revalidar')
    })

    expect(result.current.rows).toBe(naTela)
    expect(result.current.total).toBe(120)
    expect(result.current.staleError).toBe('Failed to fetch')
    expect(result.current.error).toBeNull()
    expect(result.current.revalidando).toBe(false)
  })

  it('a releitura seguinte que dá certo APAGA o `staleError`', async () => {
    const { result } = await montar()
    falhaDaLista = { message: 'Failed to fetch' }
    await act(async () => {
      await result.current.refetch('revalidar')
    })
    expect(result.current.staleError).toBe('Failed to fetch')

    falhaDaLista = null
    await act(async () => {
      await result.current.refetch('revalidar')
    })
    expect(result.current.staleError).toBeNull()
  })
})

describe("refetch('inicial') — igual a hoje", () => {
  it('liga `loading` e, em falha, esvazia a lista com o `error` (`PED-08`) — sem `staleError`', async () => {
    const { result } = await montar()

    segurar = novaTrava()
    let fim!: Promise<void>
    act(() => {
      fim = result.current.refetch()
    })
    await waitFor(() => expect(result.current.loading).toBe(true))
    expect(result.current.revalidando).toBe(false)

    falhaDaLista = { message: 'permission denied' }
    await act(async () => {
      segurar!.soltar()
      await fim
    })
    expect(result.current.rows).toEqual([])
    expect(result.current.error).toBe('permission denied')
    expect(result.current.staleError).toBeNull()
  })
})
