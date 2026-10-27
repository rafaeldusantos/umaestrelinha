// Feature 72, T10 — `useOnline` lê a rede NA MONTAGEM (sem um primeiro quadro errado) e segue os
// eventos `online`/`offline`.
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnline } from '../useOnline'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useOnline', () => {
  it('nasce offline quando o navegador já está offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(renderHook(() => useOnline()).result.current).toBe(false)
  })

  it('segue os eventos, nos dois sentidos', () => {
    // Feature `82`, T18: o `offline` só vale depois de 5 s contínuos — o relógio anda até lá.
    vi.useFakeTimers()
    let rede = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => rede)
    const { result } = renderHook(() => useOnline())
    expect(result.current).toBe(true)
    act(() => {
      rede = false
      window.dispatchEvent(new Event('offline'))
      vi.advanceTimersByTime(5000)
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

// Feature `82` · Fase 5, T18 (`BUG-20261026-queda-curta-de-rede-apaga-o-codigo`): o app só vai a
// "Sem conexão" depois de 5 s offline CONTÍNUOS. Abrir já offline continua imediato (`MAF-19`), e a volta
// da rede continua imediata (`MAF-21`). Os números são escritos por extenso, nunca lidos da constante.
describe('useOnline — a carência de 5 s', () => {
  let rede = true
  const evento = (e: 'online' | 'offline') =>
    act(() => {
      rede = e === 'online'
      window.dispatchEvent(new Event(e))
    })
  const andar = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

  beforeEach(() => {
    rede = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => rede)
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('o `offline` não vira "sem rede" antes de 5 s; aos 5 s, vira', () => {
    const { result } = renderHook(() => useOnline())
    evento('offline')
    expect(result.current).toBe(true)
    andar(4999)
    expect(result.current).toBe(true)
    andar(1)
    expect(result.current).toBe(false)
  })

  it('a rede volta antes de 5 s ⇒ nunca vira "sem rede", nem depois', () => {
    const { result } = renderHook(() => useOnline())
    evento('offline')
    andar(1000)
    evento('online')
    andar(60_000)
    expect(result.current).toBe(true)
  })

  it('"contínuos": cair, voltar e cair de novo recomeça a contagem', () => {
    const { result } = renderHook(() => useOnline())
    evento('offline')
    andar(3000)
    evento('online')
    andar(1000)
    evento('offline')
    andar(4999)
    expect(result.current).toBe(true)
    andar(1)
    expect(result.current).toBe(false)
  })

  it('um segundo `offline` sem `online` no meio não recomeça a contagem (V15)', () => {
    // A queda é UMA desde o primeiro `offline`: 3 s + 2 s = 5 s contínuos sem rede. Recomeçar no segundo
    // evento atrasaria "Sem conexão" para 8 s.
    const { result } = renderHook(() => useOnline())
    evento('offline')
    andar(3000)
    evento('offline')
    andar(1999)
    expect(result.current).toBe(true)
    andar(1)
    expect(result.current).toBe(false)
  })

  it('um `offline` que chega com o navegador já de volta não conta (a leitura é a do fim dos 5 s)', () => {
    const { result } = renderHook(() => useOnline())
    evento('offline')
    act(() => {
      rede = true
    })
    andar(5000)
    expect(result.current).toBe(true)
  })

  it('desmontar com a contagem armada não dispara nada depois', () => {
    const { result, unmount } = renderHook(() => useOnline())
    evento('offline')
    unmount()
    andar(5000)
    expect(result.current).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})
