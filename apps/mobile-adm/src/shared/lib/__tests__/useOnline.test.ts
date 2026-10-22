// Feature 72, T10 — `useOnline` lê a rede NA MONTAGEM (sem um primeiro quadro errado) e segue os
// eventos `online`/`offline`.
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '../useOnline'

afterEach(() => vi.restoreAllMocks())

describe('useOnline', () => {
  it('nasce offline quando o navegador já está offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(renderHook(() => useOnline()).result.current).toBe(false)
  })

  it('segue os eventos, nos dois sentidos', () => {
    let rede = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => rede)
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)
    act(() => {
      rede = false
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
    act(() => {
      rede = true
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)
  })

  it('desmontar remove os ouvintes', () => {
    const remover = vi.spyOn(window, 'removeEventListener')
    renderHook(() => useOnline()).unmount()
    expect(remover.mock.calls.map((c) => c[0]).sort()).toEqual(['offline', 'online'])
  })
})
