import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCardInstallmentOptions } from '../useCardInstallmentOptions'
import { useCheckoutStore } from '../checkoutStore'

// O dono do que a lista mostra, do que o botão diz e do resumo do card de cartão. A tabela do
// Mercado Pago é dublê (a chamada real é do SDK); o corte é a regra pura de `core`, de verdade.

const tabela: { data: unknown; isError: boolean } = { data: undefined, isError: false }
const chamadas: Array<[number, string | null]> = []
vi.mock('../../api/useCardInstallments', () => ({
  useCardInstallments: (amount: number, bin: string | null) => {
    chamadas.push([amount, bin])
    return tabela
  },
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ min_installment_value: 10 }),
}))

const TABELA = [
  { installments: 1, installment_rate: 0, installment_amount: 120, total_amount: 120 },
  { installments: 2, installment_rate: 0, installment_amount: 60, total_amount: 120 },
  { installments: 3, installment_rate: 9.64, installment_amount: 43.86, total_amount: 131.57 },
]

beforeEach(() => {
  tabela.data = undefined
  tabela.isError = false
  chamadas.length = 0
  useCheckoutStore.getState().reset()
})

describe('useCardInstallmentOptions', () => {
  it('sem número reconhecido é `idle` — nada para escolher, nada para cobrar', () => {
    const { result } = renderHook(() => useCardInstallmentOptions(120))
    expect(result.current).toEqual({ status: 'idle', options: [], selected: null })
  })

  it('pede a tabela com o valor e o BIN do cartão digitado', () => {
    useCheckoutStore.getState().setCardBin('54916700')
    renderHook(() => useCardInstallmentOptions(120))
    expect(chamadas.at(-1)).toEqual([120, '54916700'])
  })

  it('com o número e a tabela a caminho, `loading` sem parcela escolhida', () => {
    useCheckoutStore.getState().setCardBin('54916700')
    const { result } = renderHook(() => useCardInstallmentOptions(120))
    expect(result.current.status).toBe('loading')
    expect(result.current.selected).toBeNull()
  })

  it('com a tabela, as opções e a escolhida seguem o store', () => {
    tabela.data = TABELA
    useCheckoutStore.getState().setCardBin('54916700')
    const { result } = renderHook(() => useCardInstallmentOptions(120))
    expect(result.current.status).toBe('ready')
    expect(result.current.options.map((o) => [o.count, o.interestFree])).toEqual([
      [1, true],
      [2, true],
      [3, false],
    ])
    expect(result.current.selected?.count).toBe(1)

    act(() => useCheckoutStore.getState().setCardInstallments(3))
    expect(result.current.selected).toEqual({ count: 3, value: 43.86, total: 131.57, interestFree: false })
  })

  it('escolha que a tabela não tem cai para o à vista', () => {
    tabela.data = TABELA
    useCheckoutStore.getState().setCardBin('54916700')
    useCheckoutStore.getState().setCardInstallments(8)
    const { result } = renderHook(() => useCardInstallmentOptions(120))
    expect(result.current.selected?.count).toBe(1)
  })

  it('a tabela falhar deixa o à vista ESCOLHIDO — a compra não trava por falta de tabela', () => {
    tabela.isError = true
    useCheckoutStore.getState().setCardBin('54916700')
    const { result } = renderHook(() => useCardInstallmentOptions(120))
    expect(result.current.status).toBe('error')
    expect(result.current.options).toEqual([{ count: 1, value: 120, total: 120, interestFree: true }])
    expect(result.current.selected).toEqual(result.current.options[0])
  })
})
