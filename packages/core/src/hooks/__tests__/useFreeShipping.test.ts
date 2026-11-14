// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `FRG-03` — a ponte entre `store_settings` e a regra pura.
 *
 * O que este arquivo prova não é a aritmética (isso é `shipping/__tests__/freeShipping.test.ts`): é
 * que o **interruptor do banco chega até a regra**. Uma ponte que lesse só `free_shipping_threshold`
 * compilaria, passaria no teste da regra pura e devolveria a loja ao estado que a feature 37 existe
 * para consertar.
 */

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: selectMock }) },
}))

import { useFreeShipping } from '../useFreeShipping'
import { useStoreSettings } from '../useStoreSettings'

const rows = (data: Array<{ key: string; value: unknown }>) => {
  selectMock.mockResolvedValue({ data, error: null })
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

async function carregar(subtotal: number) {
  const { result } = renderHook(
    () => ({ query: useStoreSettings(), frete: useFreeShipping(subtotal) }),
    { wrapper: makeWrapper() },
  )
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
  return result
}

beforeEach(() => {
  selectMock.mockReset()
  rows([])
})

describe('useFreeShipping — o interruptor do banco chega à regra', () => {
  it('interruptor ligado no banco ativa a faixa', async () => {
    rows([
      {
        key: 'shipping',
        value: { free_shipping_enabled: true, free_shipping_threshold: 150 },
      },
    ])
    const result = await carregar(100)
    expect(result.current.frete.active).toBe(true)
    expect(result.current.frete.threshold).toBe(150)
    expect(result.current.frete.remaining).toBe(50)
    expect(result.current.frete.reached).toBe(false)
  })

  it('interruptor desligado no banco não libera nada, mesmo com subtotal acima da faixa', async () => {
    rows([
      {
        key: 'shipping',
        value: { free_shipping_enabled: false, free_shipping_threshold: 150 },
      },
    ])
    const result = await carregar(999)
    expect(result.current.frete.active).toBe(false)
    expect(result.current.frete.reached).toBe(false)
    expect(result.current.frete.threshold).toBe(0)
  })

  it('linha `shipping` antiga, sem o campo, cai no default DESLIGADO', async () => {
    // Mesmo caminho já provado para `handling_days`: `fetchAllSettings` faz merge sobre os defaults.
    rows([{ key: 'shipping', value: { free_shipping_threshold: 150 } }])
    const result = await carregar(999)
    expect(result.current.frete.active).toBe(false)
    expect(result.current.frete.reached).toBe(false)
  })

  it('sem linha nenhuma no banco, o default DESLIGADO vale', async () => {
    rows([])
    const result = await carregar(999)
    expect(result.current.frete.active).toBe(false)
  })

  it('subtotal default é 0 — quem só quer saber se está ligado não precisa passar nada', async () => {
    rows([
      {
        key: 'shipping',
        value: { free_shipping_enabled: true, free_shipping_threshold: 200 },
      },
    ])
    const { result } = renderHook(
      () => ({ query: useStoreSettings(), frete: useFreeShipping() }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
    expect(result.current.frete.active).toBe(true)
    expect(result.current.frete.threshold).toBe(200)
    expect(result.current.frete.remaining).toBe(200)
  })

  it('a identidade do retorno é estável entre renders com as mesmas primitivas', async () => {
    // Sem o memo, `DeliveryBlock` refaria o cálculo das opções de entrega a cada render.
    rows([
      {
        key: 'shipping',
        value: { free_shipping_enabled: true, free_shipping_threshold: 150 },
      },
    ])
    const { result, rerender } = renderHook(
      () => ({ query: useStoreSettings(), frete: useFreeShipping(100) }),
      { wrapper: makeWrapper() },
    )
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
    const primeiro = result.current.frete
    rerender()
    expect(result.current.frete).toBe(primeiro)
  })
})

describe('useFreeShipping — o CEP do destino chega à regra', () => {
  const sulSudeste = () =>
    rows([
      {
        key: 'shipping',
        value: {
          free_shipping_enabled: true,
          free_shipping_threshold: 150,
          free_shipping_regions: ['sul', 'sudeste'],
        },
      },
    ])

  async function comCep(subtotal: number, cep?: string) {
    const { result, rerender } = renderHook(
      (props: { cep?: string }) => ({
        query: useStoreSettings(),
        frete: useFreeShipping(subtotal, props.cep),
      }),
      { wrapper: makeWrapper(), initialProps: { cep } },
    )
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
    return { result, rerender }
  }

  it('com CEP de uma região que vale, concede', async () => {
    sulSudeste()
    const { result } = await comCep(200, '90010-000') // Porto Alegre, Sul
    expect(result.current.frete.destination).toBe('inside')
    expect(result.current.frete.granted).toBe(true)
    expect(result.current.frete.regionLimited).toBe(true)
  })

  it('com CEP de uma região que não vale, a faixa atinge e não concede', async () => {
    sulSudeste()
    const { result } = await comCep(200, '69900-000') // Rio Branco, Norte
    expect(result.current.frete.destination).toBe('outside')
    expect(result.current.frete.reached).toBe(true)
    expect(result.current.frete.granted).toBe(false)
  })

  it('sem CEP e com as regiões limitadas, não concede', async () => {
    sulSudeste()
    const { result } = await comCep(200)
    expect(result.current.frete.destination).toBe('unknown')
    expect(result.current.frete.granted).toBe(false)
  })

  it('sem CEP e com a linha antiga (sem o campo), o de hoje: atinge e concede', async () => {
    rows([{ key: 'shipping', value: { free_shipping_enabled: true, free_shipping_threshold: 150 } }])
    const { result } = await comCep(200)
    expect(result.current.frete.regions).toEqual(['sul', 'sudeste', 'centro-oeste', 'nordeste', 'norte'])
    expect(result.current.frete.regionLimited).toBe(false)
    expect(result.current.frete.reached).toBe(true)
    expect(result.current.frete.granted).toBe(true)
  })

  it('lista de regiões vazia com o interruptor ligado deixa o frete grátis inativo', async () => {
    rows([
      {
        key: 'shipping',
        value: { free_shipping_enabled: true, free_shipping_threshold: 150, free_shipping_regions: [] },
      },
    ])
    const { result } = await comCep(999, '90010-000')
    expect(result.current.frete.active).toBe(false)
    expect(result.current.frete.granted).toBe(false)
  })

  it('mudar só o CEP muda o estado', async () => {
    sulSudeste()
    const { result, rerender } = await comCep(200, '90010-000')
    expect(result.current.frete.granted).toBe(true)
    rerender({ cep: '69900-000' })
    expect(result.current.frete.destination).toBe('outside')
    expect(result.current.frete.granted).toBe(false)
  })

  it('a identidade é estável entre renders com as mesmas primitivas, com CEP e regiões', async () => {
    sulSudeste()
    const { result, rerender } = await comCep(200, '90010-000')
    const primeiro = result.current.frete
    rerender({ cep: '90010-000' })
    expect(result.current.frete).toBe(primeiro)
  })
})
