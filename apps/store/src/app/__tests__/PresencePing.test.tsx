import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { MemoryRouter, useNavigate, type NavigateFunction } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * O pulso de presença montado: QUANDO ele bate, com o quê, e quando não bate.
 *
 * De verdade: o `PresencePing`, o id e a origem (`shared/lib/presence`), o envio, a decisão
 * (`visitRefusal`), a store de consentimento e a do carrinho. Dublados: o `fetch` (a fronteira de
 * rede), a leitura de `store_settings` e o `setInterval` (relógio falso só para ele).
 */

const { leitura } = vi.hoisted(() => ({
  leitura: { linhas: [] as { key: string; value: unknown }[], segurar: null as null | Promise<void> },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  SUPABASE_URL: 'http://127.0.0.1:54441',
  SUPABASE_PUBLISHABLE_KEY: 'chave-publicavel-de-teste',
  supabase: {
    from: () => ({
      select: async () => {
        if (leitura.segurar) await leitura.segurar
        return { data: leitura.linhas, error: null }
      },
    }),
  },
}))

import PresencePing, { PRESENCE_INTERVAL_MS } from '../PresencePing'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { useCartStore } from '@/entities/cart'
import { PRESENCE_KEY, resetPresenceForTests } from '@/shared/lib/presence/presence'
import { OPT_OUT_KEY, VISITOR_KEY, resetVisitCounterForTests } from '@/shared/lib/visits/visitor'

const AGORA = 1_792_600_000_000
const ID_DO_CONTADOR = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const ANALYTICS = { enabled: false, measurement_id: '', production_host: 'localhost' }

const fetchMock = vi.fn()
const ok = () =>
  Promise.resolve(new Response(JSON.stringify({ desfecho: 'gravada', ate: AGORA + 3_600_000, agora: AGORA }), { status: 200 }))

const pulsos = () =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).includes('action=ping'))
    .map(([url, init]) => ({ url: String(url), init: init as RequestInit, corpo: JSON.parse(String((init as RequestInit).body)) }))

const escoar = async () => {
  for (let i = 0; i < 12; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

const sonda = {} as { navigate: NavigateFunction }
const Sonda = () => {
  sonda.navigate = useNavigate()
  return null
}

const montar = (entrada = '/produtos/colar-estrela') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[entrada]}>
        <PresencePing />
        <Sonda />
      </MemoryRouter>
    </QueryClientProvider>,
  )

let visibilidade: DocumentVisibilityState = 'visible'
const mudarVisibilidade = (v: DocumentVisibilityState) => {
  visibilidade = v
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

const referrer = (r: string) => Object.defineProperty(document, 'referrer', { configurable: true, get: () => r })

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetPresenceForTests()
  resetVisitCounterForTests()
  useCookieConsentStore.getState().hydrate()
  useCartStore.setState({ items: [] })
  leitura.linhas = [{ key: 'analytics', value: ANALYTICS }]
  leitura.segurar = null
  fetchMock.mockReset()
  fetchMock.mockImplementation(ok)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('PROD', true)
  visibilidade = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilidade })
  referrer('')
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  vi.spyOn(Date, 'now').mockReturnValue(AGORA)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('o pulso — o que ele leva', () => {
  it('bate na montagem com o tipo de página, a joia, a sacola e a origem', async () => {
    useCartStore.setState({ items: [{ quantity: 2 }, { quantity: 1 }] as never })
    montar()
    await escoar()
    expect(pulsos()).toHaveLength(1)
    const { corpo, url, init } = pulsos()[0]
    expect(url).toBe('http://127.0.0.1:54441/functions/v1/visit?action=ping')
    expect(Object.keys(corpo).sort()).toEqual(['cart', 'id', 'page', 'product', 'source'])
    expect(corpo).toMatchObject({ page: 'joia', product: 'colar-estrela', cart: 3, source: 'direto' })
    expect(init.credentials).toBe('omit')
  })

  it('sem JWT: só a chave publicável vai no cabeçalho', async () => {
    montar()
    await escoar()
    const headers = pulsos()[0].init.headers as Record<string, string>
    expect(Object.keys(headers).map((k) => k.toLowerCase()).sort()).toEqual(['apikey', 'content-type'])
  })

  it('o id do contador de visitas nunca entra no pulso', async () => {
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID_DO_CONTADOR, ate: null, em: null }))
    montar()
    await escoar()
    expect(pulsos()[0].init.body).not.toContain(ID_DO_CONTADOR)
    expect(pulsos()[0].corpo.id).toBe(JSON.parse(window.localStorage.getItem(PRESENCE_KEY)!).id)
  })

  it('a origem é calculada uma vez, no pouso, e mantida nas páginas seguintes', async () => {
    referrer('https://l.instagram.com/')
    montar('/joias-afetivas')
    await escoar()
    referrer('https://www.google.com/')
    act(() => sonda.navigate('/carrinho'))
    await escoar()
    expect(pulsos().map((p) => [p.corpo.page, p.corpo.source])).toEqual([
      ['lista', 'instagram'],
      ['sacola', 'instagram'],
    ])
  })

  it('o id muda quando o prazo do servidor vence', async () => {
    montar()
    await escoar()
    const primeiro = pulsos()[0].corpo.id
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    act(() => sonda.navigate('/busca'))
    await escoar()
    expect(pulsos()[1].corpo.id).not.toBe(primeiro)
  })
})

describe('o pulso — quando ele bate', () => {
  it('a cada 60 s com a aba visível', async () => {
    montar()
    await escoar()
    expect(pulsos()).toHaveLength(1)
    act(() => vi.advanceTimersByTime(PRESENCE_INTERVAL_MS))
    await escoar()
    act(() => vi.advanceTimersByTime(PRESENCE_INTERVAL_MS))
    await escoar()
    expect(pulsos()).toHaveLength(3)
  })

  it('para em segundo plano, e volta a bater quando a aba volta', async () => {
    montar()
    await escoar()
    mudarVisibilidade('hidden')
    act(() => vi.advanceTimersByTime(PRESENCE_INTERVAL_MS * 5))
    await escoar()
    expect(pulsos()).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
    mudarVisibilidade('visible')
    await escoar()
    expect(pulsos()).toHaveLength(2)
  })

  it('com a aba oculta, nem a troca de rota nem a sacola fazem bater', async () => {
    montar()
    await escoar()
    mudarVisibilidade('hidden')
    act(() => sonda.navigate('/checkout'))
    act(() => useCartStore.setState({ items: [{ quantity: 1 }] as never }))
    await escoar()
    expect(pulsos()).toHaveLength(1)
  })

  it('na troca de rota', async () => {
    montar()
    await escoar()
    act(() => sonda.navigate('/checkout'))
    await escoar()
    expect(pulsos().map((p) => p.corpo.page)).toEqual(['joia', 'checkout'])
  })

  it('na mudança da sacola', async () => {
    montar()
    await escoar()
    act(() => useCartStore.setState({ items: [{ quantity: 1 }] as never }))
    await escoar()
    expect(pulsos().map((p) => p.corpo.cart)).toEqual([0, 1])
  })

  it('a sacola acima do teto vai cortada no teto', async () => {
    useCartStore.setState({ items: [{ quantity: 250 }] as never })
    montar()
    await escoar()
    expect(pulsos()[0].corpo.cart).toBe(99)
  })
})

describe('o pulso — quando ele NÃO bate', () => {
  it('sem consentimento de estatística', async () => {
    useCookieConsentStore.getState().save(false)
    montar()
    await escoar()
    act(() => vi.advanceTimersByTime(PRESENCE_INTERVAL_MS))
    await escoar()
    expect(pulsos()).toEqual([])
  })

  it('com robô (webdriver ou user agent)', async () => {
    Object.defineProperty(window.navigator, 'webdriver', { configurable: true, get: () => true })
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
    delete (window.navigator as { webdriver?: boolean }).webdriver
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (compatible; Googlebot/2.1)')
    act(() => sonda.navigate('/busca'))
    await escoar()
    expect(pulsos()).toEqual([])
  })

  it('em host interno', async () => {
    leitura.linhas = [{ key: 'analytics', value: { ...ANALYTICS, production_host: 'umaestrelinha.com.br' } }]
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
  })

  it('com a marca de "não contar"', async () => {
    window.localStorage.setItem(OPT_OUT_KEY, '1')
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
  })

  it('na prévia do painel', async () => {
    window.history.replaceState(null, '', '/?preview=1')
    const pai = vi.spyOn(window, 'parent', 'get').mockReturnValue({} as Window)
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
    pai.mockRestore()
    window.history.replaceState(null, '', '/')
  })

  it('fora do build de produção', async () => {
    vi.stubEnv('PROD', false)
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
  })

  it('antes de a configuração chegar — e bate quando ela chega', async () => {
    let soltar!: () => void
    leitura.segurar = new Promise<void>((r) => (soltar = r))
    montar()
    await escoar()
    expect(pulsos()).toEqual([])
    await act(async () => soltar())
    await escoar()
    expect(pulsos()).toHaveLength(1)
  })

  it('a recusa de cookies apaga o id da presença e para o pulso', async () => {
    montar()
    await escoar()
    expect(window.localStorage.getItem(PRESENCE_KEY)).not.toBeNull()
    act(() => useCookieConsentStore.getState().save(false))
    expect(window.localStorage.getItem(PRESENCE_KEY)).toBeNull()
    act(() => vi.advanceTimersByTime(PRESENCE_INTERVAL_MS))
    await escoar()
    expect(pulsos()).toHaveLength(1)
    expect(window.localStorage.getItem(PRESENCE_KEY)).toBeNull()
  })
})
