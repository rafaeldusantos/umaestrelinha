import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePickupOption, usePickupOptionState } from '../usePickupOption'

// Feature 63 — RET-01 (os dados da opção) e RET-05 (quando ela não existe). A regra é de
// `@estrelinha/core/shipping/pickup.ts`; o que se prova aqui é que o hook a alimenta com a
// configuração da loja e com o prazo de preparo.

/* eslint-disable @typescript-eslint/no-explicit-any */
const settings: { data: any; isFetched: boolean } = { data: undefined, isFetched: true }
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => settings,
}))


const MATERIAL = {
  recipient: 'Adri Muniz',
  street: 'Rua Dona Laura',
  number: '455',
  complement: 'Sala 3',
  neighborhood: 'Rio Branco',
  city: 'Porto Alegre',
  state: 'RS',
  zip: '90430091',
  notes: '',
}

const comSettings = (shipping: Record<string, unknown>, material: Record<string, unknown> = MATERIAL) => {
  settings.data = {
    shipping: { handling_days: 2, pickup_enabled: true, ...shipping },
    material,
  }
}

beforeEach(() => {
  // `shouldAdvanceTime` não é preciso: nada aqui espera. 2026-10-12 é uma segunda-feira.
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 12))
  settings.isFetched = true
  comSettings({})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePickupOption — CEP do RS, ligada e com endereço (RET-01)', () => {
  it('devolve a linha inteira do escritório, sem número nem complemento', () => {
    const { result } = renderHook(() => usePickupOption('91240-010'))

    expect(result.current?.location).toBe(
      'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre/RS',
    )
    expect(result.current?.location).not.toContain('455')
    expect(result.current?.location).not.toContain('Sala 3')
  })

  it('a data é hoje + handling_days em dias úteis: seg 12/10 + 2 = 14 de outubro', () => {
    const { result } = renderHook(() => usePickupOption('91240-010'))

    expect(result.current?.readyLabel).toBe('a partir de 14 de outubro')
  })

  it('handling_days move a data — sexta 16/10 + 1 dia útil atravessa o fim de semana', () => {
    vi.setSystemTime(new Date(2026, 9, 16))
    comSettings({ handling_days: 1 })
    const { result } = renderHook(() => usePickupOption('91240-010'))

    expect(result.current?.readyLabel).toBe('a partir de 19 de outubro')
  })
})

describe('usePickupOption — quando a retirada não existe (RET-02, RET-05)', () => {
  it('retirada desligada ⇒ null', () => {
    comSettings({ pickup_enabled: false })
    const { result } = renderHook(() => usePickupOption('91240-010'))

    expect(result.current).toBeNull()
  })

  it('endereço do Material sem rua ⇒ null', () => {
    comSettings({}, { ...MATERIAL, street: '' })
    const { result } = renderHook(() => usePickupOption('91240-010'))

    expect(result.current).toBeNull()
  })

  it('CEP de São Paulo ⇒ null', () => {
    const { result } = renderHook(() => usePickupOption('01310-100'))

    expect(result.current).toBeNull()
  })

  it('configuração ainda não chegou ⇒ null (o Material nasce vazio de propósito)', () => {
    settings.data = undefined
    settings.isFetched = false
    const { result } = renderHook(() => usePickupOptionState('91240-010'))

    expect(result.current.option).toBeNull()
    expect(result.current.settled).toBe(false)
  })

  it('configuração carregada ⇒ settled, que é o que autoriza desfazer uma escolha restaurada', () => {
    comSettings({ pickup_enabled: false })
    const { result } = renderHook(() => usePickupOptionState('91240-010'))

    expect(result.current.option).toBeNull()
    expect(result.current.settled).toBe(true)
  })
})
