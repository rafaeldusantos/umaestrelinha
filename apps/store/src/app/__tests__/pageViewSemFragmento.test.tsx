import { act, render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Feature 89 · T23 — SEG-02: o link do pedido montado leva o token no FRAGMENTO, e o `page_view`
// sai antes de a página apagá-lo da barra (o rastreador fica antes das `Routes`). O
// `PageViewTracker` REAL não pode mandar o `#` ao Google.

const { trackSpy } = vi.hoisted(() => ({ trackSpy: vi.fn() }))
vi.mock('@/shared/lib/analytics', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

import PageViewTracker from '../PageViewTracker'

const TOKEN = 'b64url_TokenDeTeste-0123456789abcdefABCDEF'

beforeEach(() => {
  trackSpy.mockClear()
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})

describe('PageViewTracker sem o fragmento (SEG-02)', () => {
  it('o page_view da rota com o token no # sai sem ele', () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', `/pedido-montado#${TOKEN}`)
    render(
      <BrowserRouter>
        <PageViewTracker />
      </BrowserRouter>,
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(trackSpy).toHaveBeenCalledTimes(1)
    const evento = trackSpy.mock.calls[0][0] as { name: string; params: { page_location: string } }
    expect(evento.name).toBe('page_view')
    expect(evento.params.page_location).toBe(`${window.location.origin}/pedido-montado`)
    expect(JSON.stringify(trackSpy.mock.calls)).not.toContain(TOKEN)
    expect(JSON.stringify(trackSpy.mock.calls)).not.toContain('#')
  })
})
