// Feature 72, T07 — o piso da splash (`MAF-06`): sai depois de NO MÍNIMO 600 ms, e nunca por um
// tempo fixo maior. O protótipo segurava 2,4 s; isso é espera fabricada.
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SPLASH_MIN_MS, useMinimumDuration } from '../model/useMinimumDuration'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useMinimumDuration', () => {
  it('o piso do app é 600 ms', () => {
    expect(SPLASH_MIN_MS).toBe(600)
  })

  it('aos 599 ms ainda não cumpriu; aos 600 ms cumpriu', () => {
    const { result } = renderHook(() => useMinimumDuration(SPLASH_MIN_MS))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(599))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(true)
  })

  it('agenda UM temporizador, do tamanho do piso — nenhum maior', () => {
    const espiao = vi.spyOn(globalThis, 'setTimeout')
    renderHook(() => useMinimumDuration(SPLASH_MIN_MS))
    const atrasos = espiao.mock.calls.map((c) => c[1])
    expect(atrasos).toEqual([600])
    espiao.mockRestore()
  })

  it('desmontar antes do piso cancela o temporizador', () => {
    const { unmount } = renderHook(() => useMinimumDuration(SPLASH_MIN_MS))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
