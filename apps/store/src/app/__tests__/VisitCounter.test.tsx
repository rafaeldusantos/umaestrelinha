import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import {
  MemoryRouter,
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
  type NavigateFunction,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { OPT_OUT_PARAM } from '@estrelinha/core/visits'

/**
 * `VIS-16`..`VIS-25` e `VIS-42` (feature `71`) — o contador montado: QUANDO ele chama, quantas
 * vezes, e quando não chama.
 *
 * O que é de verdade aqui: o `VisitCounter`, o marcador (`shared/lib/visits/visitor.ts`), a decisão
 * (`refusal.ts`), o envio (`send.ts`) e a store de consentimento — **sem dublê** (`VIS-24` exige a
 * store real). O que é dublado: o `fetch` (a fronteira de rede), a leitura de `store_settings` e o
 * agendador `requestIdleCallback`, para os casos poderem contar chamadas ANTES de ele disparar.
 *
 * A configuração padrão destes casos é a fixture de `VIS-22`: o GA4 DESLIGADO e sem ID de medição,
 * com o host de produção igual ao do jsdom (`localhost`). O contador conta mesmo assim.
 */

const { leitura } = vi.hoisted(() => ({
  leitura: {
    linhas: [] as { key: string; value: unknown }[],
    segurar: null as null | Promise<void>,
  },
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

import VisitCounter from '../VisitCounter'
import { COOKIE_CONSENT_KEY, useCookieConsentStore } from '@/entities/cookie-consent'
import {
  OPT_OUT_KEY,
  VISITOR_KEY,
  resetVisitCounterForTests,
} from '@/shared/lib/visits/visitor'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const AGORA = 1_792_600_000_000

/** GA4 desligado, sem ID, host de produção = o do jsdom. */
const ANALYTICS_DESLIGADO = { enabled: false, measurement_id: '', production_host: 'localhost' }

// ── O agendador dublado ────────────────────────────────────────────────────────────────────────
type Janela = Window & {
  requestIdleCallback?: (cb: () => void, opts?: unknown) => number
  cancelIdleCallback?: (h: number) => void
}
const fila = new Map<number, () => void>()
let proximo = 1
const instalarAgendador = () => {
  const w = window as Janela
  w.requestIdleCallback = (cb) => {
    const h = proximo++
    fila.set(h, cb)
    return h
  }
  w.cancelIdleCallback = (h) => {
    fila.delete(h)
  }
}
const removerAgendador = () => {
  const w = window as Janela
  delete w.requestIdleCallback
  delete w.cancelIdleCallback
}

/**
 * Deixa promessas, timers de 0 ms e renderizações correrem. Vários `act` curtos, e não um longo: o
 * React só renderiza ao SAIR do `act`, e um efeito que reagenda depois da configuração chegar ficaria
 * para depois do escoamento.
 */
const escoar = async () => {
  for (let i = 0; i < 12; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
  }
}

/** Dispara o que estiver agendado e espera a tentativa terminar. */
const disparar = async () => {
  await escoar()
  await act(async () => {
    const cbs = [...fila.values()]
    fila.clear()
    for (const cb of cbs) cb()
  })
  await escoar()
}

// ── O fetch dublado ───────────────────────────────────────────────────────────────────────────
const fetchMock = vi.fn()
const respostaJson = (status: number, corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status }))
const ok = () => respostaJson(200, { desfecho: 'gravada', dia: '2026-10-21', ate: AGORA + 3_600_000, agora: AGORA })

// ── A sonda do roteador ───────────────────────────────────────────────────────────────────────
const sonda = {} as { navigate: NavigateFunction; location: Location; tipo: string }
const Sonda = () => {
  sonda.navigate = useNavigate()
  sonda.location = useLocation()
  sonda.tipo = useNavigationType()
  return null
}

const montar = (entradas: string[] = ['/'], indice?: number) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {/* O `Toaster` vem ANTES, como no `App.tsx`: montado depois, ele não ouve o aviso da montagem. */}
      <Toaster />
      <MemoryRouter initialEntries={entradas} initialIndex={indice}>
        <VisitCounter />
        <Sonda />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const navegar = async (para: string) => {
  act(() => {
    sonda.navigate(para)
  })
  await disparar()
}

const marcador = () => {
  const cru = window.localStorage.getItem(VISITOR_KEY)
  return cru === null ? null : JSON.parse(cru)
}

const definirReadyState = (estado: DocumentReadyState) =>
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => estado })

beforeEach(() => {
  window.localStorage.clear()
  resetVisitCounterForTests()
  useCookieConsentStore.getState().hydrate()
  leitura.linhas = [{ key: 'analytics', value: ANALYTICS_DESLIGADO }]
  leitura.segurar = null
  fetchMock.mockReset()
  fetchMock.mockImplementation(ok)
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('PROD', true)
  fila.clear()
  instalarAgendador()
  vi.spyOn(Date, 'now').mockReturnValue(AGORA)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  removerAgendador()
  // O jsdom real: o documento já carregou.
  definirReadyState('complete')
})

describe('VIS-17 — fora do caminho crítico', () => {
  it('nenhum fetch antes de o agendador disparar; depois dele, um', async () => {
    montar()
    expect(fetchMock).not.toHaveBeenCalled()
    await escoar()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(fila.size).toBeGreaterThan(0)
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sem requestIdleCallback e com o documento já carregado (troca de rota da SPA) ⇒ chama', async () => {
    removerAgendador()
    definirReadyState('complete')
    montar()
    await escoar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // A troca de rota acontece DEPOIS do `load`: um ouvinte novo de `load` nunca dispararia.
    window.localStorage.removeItem(VISITOR_KEY)
    act(() => {
      sonda.navigate('/sobre')
    })
    await escoar()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sem requestIdleCallback e com a página ainda carregando ⇒ espera o load', async () => {
    removerAgendador()
    definirReadyState('loading')
    montar()
    await escoar()
    expect(fetchMock).not.toHaveBeenCalled()
    act(() => {
      window.dispatchEvent(new Event('load'))
    })
    await escoar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('VIS-16 — uma chamada por prazo', () => {
  it('5 navegações ⇒ 1 chamada; o marcador guarda o id e o prazo em relógio local', async () => {
    montar()
    await disparar()
    for (const p of ['/a', '/b', '/c', '/d', '/e']) await navegar(p)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const m = marcador()
    expect(m).toEqual({ v: 1, id: m.id, ate: AGORA + 3_600_000, em: AGORA })
    expect(m.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    // O id que viajou é o mesmo do marcador.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ id: m.id })
  })

  it('passado o prazo (virou o dia), a navegação seguinte chama de novo, com o MESMO id', async () => {
    montar()
    await disparar()
    const id = marcador().id
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    await navegar('/amanha')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ id })
  })

  it('uma chamada em voo por vez: navegar com o POST no ar não dispara outro', async () => {
    let soltar: (r: Response) => void = () => {}
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (soltar = r)))
    montar()
    await disparar()
    await navegar('/a')
    await navegar('/b')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar(new Response(JSON.stringify({ dia: 'x', ate: AGORA + 1000, agora: AGORA }), { status: 200 }))
    })
    await escoar()
    expect(marcador().ate).toBe(AGORA + 1000)
  })
})

describe('VIS-18 — a falha', () => {
  it('429 com relógio ⇒ grava o prazo e não tenta mais no dia', async () => {
    fetchMock.mockImplementation(() => respostaJson(429, { dia: '2026-10-21', ate: AGORA + 5000, agora: AGORA }))
    montar()
    await disparar()
    await navegar('/a')
    await navegar('/b')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(marcador()).toMatchObject({ ate: AGORA + 5000, em: AGORA })
  })

  it.each<[string, () => Promise<Response>]>([
    ['500', () => respostaJson(500, { error: 'erro' })],
    ['400', () => respostaJson(400, { error: 'inválido' })],
    ['rede que rejeita', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['200 sem ate', () => respostaJson(200, { desfecho: 'gravada', dia: '2026-10-21' })],
    ['429 sem relógio', () => respostaJson(429, {})],
  ])('%s ⇒ sem prazo; UMA tentativa a mais na próxima navegação; depois nenhuma', async (_n, falha) => {
    fetchMock.mockImplementation(falha)
    montar()
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(marcador()?.ate ?? null).toBeNull()
    await navegar('/a')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await navegar('/b')
    await navegar('/c')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('a tentativa a mais NÃO é imediata: só na próxima navegação', async () => {
    fetchMock.mockImplementation(() => respostaJson(500, {}))
    montar()
    await disparar()
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('a tentativa a mais que dá certo grava o prazo', async () => {
    fetchMock.mockImplementationOnce(() => respostaJson(500, {})).mockImplementation(ok)
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(marcador().ate).toBe(AGORA + 3_600_000)
  })
})

describe('VIS-22 — quando não chama', () => {
  it('GA4 DESLIGADO e sem ID de medição, com o resto liberado ⇒ CHAMA (o contador não depende do GA4)', async () => {
    leitura.linhas = [{ key: 'analytics', value: { enabled: false, measurement_id: '', production_host: 'localhost' } }]
    montar()
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('host de produção configurado e a loja em localhost ⇒ nenhuma chamada, e nenhum id criado', async () => {
    leitura.linhas = [{ key: 'analytics', value: { ...ANALYTICS_DESLIGADO, production_host: 'umaestrelinha.com.br' } }]
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(marcador()).toBeNull()
  })

  it('configuração carregando ⇒ espera; quando ela chega, chama', async () => {
    let soltar: () => void = () => {}
    leitura.segurar = new Promise<void>((r) => (soltar = r))
    montar()
    await disparar()
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => soltar())
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  describe('com a página NO HOST PADRÃO (conserto G6 da verificação r1)', () => {
    // O caso acima segura a leitura em `localhost`, e o host PADRÃO (`DEFAULT_ANALYTICS`, devolvido
    // enquanto a leitura não termina) já recusa `localhost` como interno: esperar e não esperar dão o
    // mesmo resultado ali. Aqui a página está no host padrão, onde o padrão LIBERARIA — só a espera
    // separa a configuração carregando da chamada.
    const HOST_PADRAO = 'umaestrelinha.com.br'
    type JanelaJsdom = { reconfigure: (o: { url: string }) => void }
    const jsdom = () => (globalThis as unknown as { jsdom: JanelaJsdom }).jsdom
    let urlOriginal = ''

    beforeEach(() => {
      urlOriginal = window.location.href
      jsdom().reconfigure({ url: `https://${HOST_PADRAO}/` })
    })
    afterEach(() => {
      jsdom().reconfigure({ url: urlOriginal })
    })

    it('âncora: a página está mesmo no host padrão', () => {
      expect(window.location.hostname).toBe(HOST_PADRAO)
    })

    it('leitura segurada ⇒ zero fetch; terminada com o host do banco = o da página ⇒ chama', async () => {
      let soltar: () => void = () => {}
      leitura.segurar = new Promise<void>((r) => (soltar = r))
      leitura.linhas = [{ key: 'analytics', value: { ...ANALYTICS_DESLIGADO, production_host: HOST_PADRAO } }]
      montar()
      await disparar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()).toBeNull()
      await act(async () => soltar())
      await disparar()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('leitura segurada ⇒ zero fetch; terminada com o host do banco VAZIO (contagem parada) ⇒ nenhuma chamada', async () => {
      let soltar: () => void = () => {}
      leitura.segurar = new Promise<void>((r) => (soltar = r))
      leitura.linhas = [{ key: 'analytics', value: { ...ANALYTICS_DESLIGADO, production_host: '' } }]
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      await act(async () => soltar())
      await disparar()
      await navegar('/a')
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()).toBeNull()
    })
  })

  it('build que não é de produção ⇒ nenhuma chamada', async () => {
    vi.stubEnv('PROD', false)
    montar()
    await disparar()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('navigator.webdriver ⇒ nenhuma chamada', async () => {
    // O jsdom não define `navigator.webdriver`; o navegador do Playwright define `true`.
    Object.defineProperty(window.navigator, 'webdriver', { configurable: true, get: () => true })
    try {
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      delete (window.navigator as { webdriver?: boolean }).webdriver
    }
  })

  it('user agent de robô ⇒ nenhuma chamada', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0 Safari/537.36',
    )
    montar()
    await disparar()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a marca de não contar ⇒ nenhuma chamada', async () => {
    window.localStorage.setItem(OPT_OUT_KEY, '1')
    montar()
    await disparar()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('Estatísticas recusada ⇒ nenhuma chamada, e nenhum id criado', async () => {
    useCookieConsentStore.getState().save(false)
    montar()
    await disparar()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(marcador()).toBeNull()
  })
})

describe('VIS-24 — a recusa com a store REAL', () => {
  it('save(false) + navegar (já no dia seguinte) ⇒ zero fetch, e o id não volta', async () => {
    montar()
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    act(() => useCookieConsentStore.getState().save(false))
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    await navegar('/a')
    await navegar('/b')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(marcador().id).toBeNull()
  })

  it('POST no ar ⇒ save(false) ⇒ a resposta 200 chega ⇒ o id continua nulo', async () => {
    let soltar: (r: Response) => void = () => {}
    fetchMock.mockImplementation(() => new Promise<Response>((r) => (soltar = r)))
    montar()
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    act(() => useCookieConsentStore.getState().save(false))
    await act(async () => {
      soltar(new Response(JSON.stringify({ dia: 'x', ate: AGORA + 1000, agora: AGORA }), { status: 200 }))
    })
    await escoar()
    expect(marcador()).toEqual({ v: 1, id: null, ate: AGORA + 1000, em: AGORA })
  })
})

describe('VIS-24/VIS-20 — a recusa que chega enquanto a trava do id espera', () => {
  it('trava segurada ⇒ save(false) ⇒ trava solta ⇒ nenhuma chamada', async () => {
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      act(() => useCookieConsentStore.getState().save(false))
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).not.toHaveBeenCalled()
      // Sonda R01 da verificação r1 (G4): o código NÃO pode ter sido criado depois da recusa. Antes
      // do conserto a trava soltava, `criarOuLer` gravava um id novo, e só depois a decisão recusava.
      expect(marcador()?.id ?? null).toBeNull()
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })

  it('id JÁ guardado + trava segurada ⇒ save(false) ⇒ trava solta ⇒ o id continua apagado', async () => {
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: AGORA - 10, em: AGORA - 20 }))
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      act(() => useCookieConsentStore.getState().save(false))
      expect(marcador()).toEqual({ v: 1, id: null, ate: AGORA - 10, em: AGORA - 20 })
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()).toEqual({ v: 1, id: null, ate: AGORA - 10, em: AGORA - 20 })
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })

  it(`trava segurada ⇒ ?${OPT_OUT_PARAM}=1 ⇒ trava solta ⇒ nenhuma chamada, e nenhum id criado`, async () => {
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      await navegar(`/?${OPT_OUT_PARAM}=1`)
      expect(window.localStorage.getItem(OPT_OUT_KEY)).toBe('1')
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()?.id ?? null).toBeNull()
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })

  // Conserto G8 da verificação r2 (a sonda R2-N3 do verificador). Os três casos acima recusam na
  // MESMA aba, onde a memória muda na hora — e uma decisão dentro da trava que NÃO relesse o
  // armazenamento também recusaria. A recusa de OUTRA aba só existe no armazenamento compartilhado:
  // é ela que prova que a pergunta de dentro da trava é `podeChamar` (que chama `syncFromStorage`).
  // Sem a releitura, um código NOVO nasceria depois da recusa, e só a decisão de rede (seguinte)
  // impediria a chamada — o defeito G4 da r1, pela outra porta.
  it('trava segurada ⇒ OUTRA aba grava a recusa (sem evento) ⇒ trava solta ⇒ nenhuma chamada e nenhum id', async () => {
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      expect(fetchMock).not.toHaveBeenCalled()
      // âncora: esta aba ainda tem o aceite em memória — a recusa não passa por ela.
      expect(useCookieConsentStore.getState().statistics).toBe(true)
      window.localStorage.setItem(
        COOKIE_CONSENT_KEY,
        JSON.stringify({ v: 1, notice: 'answered', statistics: false }),
      )
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(marcador()?.id ?? null).toBeNull()
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })

  it('sensor dos três casos acima: a MESMA trava, sem recusa no meio ⇒ cria o id e chama', async () => {
    let soltar: () => void = () => {}
    const segura = new Promise<void>((r) => (soltar = r))
    Object.defineProperty(window.navigator, 'locks', {
      configurable: true,
      value: {
        request: async (_nome: string, cb: () => Promise<unknown>) => {
          await segura
          return cb()
        },
      },
    })
    try {
      montar()
      await disparar()
      await act(async () => soltar())
      await escoar()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(marcador().id).toMatch(/^[0-9a-f-]{36}$/)
    } finally {
      delete (window.navigator as { locks?: unknown }).locks
    }
  })
})

describe('VIS-19 — o componente montado sem armazenamento que grava (conserto G5 da verificação r1)', () => {
  // A unidade (`visitor.test.ts`) prova que `ensureVisitorId` devolve `null`; "nenhum fetch" lá é
  // verdade por construção, porque ela não faz rede. Quem chama a rede é o componente, e é ele que
  // tem de NÃO mandar `{"id":null}`.
  it('`setItem` que lança para o marcador ⇒ zero fetch, nem na navegação seguinte', async () => {
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === VISITOR_KEY) throw new Error('QuotaExceededError')
      return original.call(this, k, v)
    })
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(marcador()).toBeNull()
  })

  it('sem `crypto.randomUUID` ⇒ zero fetch', async () => {
    vi.stubGlobal('crypto', {})
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(marcador()).toBeNull()
  })

  it('sensor dos dois: com armazenamento e `randomUUID`, o mesmo percurso chama uma vez', async () => {
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('VIS-25 — a recusa feita em outra aba', () => {
  const recusaDeOutraAba = () =>
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ v: 1, notice: 'answered', statistics: false }),
    )

  it('aba A com statistics em memória, recusa gravada por outra aba, virada do prazo ⇒ NENHUMA chamada', async () => {
    montar()
    await disparar()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    recusaDeOutraAba() // sem evento nenhum
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    await navegar('/a')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })

  it('sensor do caso acima: SEM a recusa da outra aba, a mesma virada chama', async () => {
    montar()
    await disparar()
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    await navegar('/a')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gravação que lança + recusa + navegar ⇒ a recusa continua valendo (aceite antigo no armazenamento)', async () => {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ v: 1, notice: 'answered', statistics: true }),
    )
    useCookieConsentStore.getState().hydrate()
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === COOKIE_CONSENT_KEY) throw new Error('QuotaExceededError')
      return original.call(this, k, v)
    })
    useCookieConsentStore.getState().save(false)
    montar()
    await disparar()
    await navegar('/a')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })
})

// O parâmetro vem do dono (`core/visits/optOut.ts`), nunca escrito por extenso aqui.
const P = OPT_OUT_PARAM

describe('VIS-42 — o parâmetro de não contar, pela URL', () => {
  const comMarcador = () =>
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: AGORA - 10, em: AGORA - 20 }))

  it('=1: grava a marca, apaga o id mantendo o prazo, tira o parâmetro sem entrada nova, avisa, e não chama', async () => {
    comMarcador()
    montar(['/anterior', `/produtos/pingente?${P}=1&utm=x`], 1)
    expect(await screen.findByText('Este navegador não é mais contado nas visitas da loja.')).toBeInTheDocument()
    expect(window.localStorage.getItem(OPT_OUT_KEY)).toBe('1')
    expect(marcador()).toEqual({ v: 1, id: null, ate: AGORA - 10, em: AGORA - 20 })
    expect(sonda.location.pathname).toBe('/produtos/pingente')
    expect(sonda.location.search).toBe('?utm=x')
    expect(sonda.tipo).toBe('REPLACE')
    await disparar()
    await navegar('/a')
    expect(fetchMock).not.toHaveBeenCalled()
    // Sem entrada nova no histórico: voltar duas vezes a partir de /a cai em /anterior, não na URL com o parâmetro.
    act(() => sonda.navigate(-1))
    expect(sonda.location.pathname + sonda.location.search).toBe('/produtos/pingente?utm=x')
    act(() => sonda.navigate(-1))
    expect(sonda.location.pathname).toBe('/anterior')
  })

  it('=0: apaga a marca, tira o parâmetro, avisa — e a chamada volta a acontecer', async () => {
    window.localStorage.setItem(OPT_OUT_KEY, '1')
    montar([`/?${P}=0`])
    expect(await screen.findByText('Este navegador voltou a ser contado nas visitas da loja.')).toBeInTheDocument()
    expect(window.localStorage.getItem(OPT_OUT_KEY)).toBeNull()
    expect(sonda.location.search).toBe('')
    expect(sonda.tipo).toBe('REPLACE')
    await disparar()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('valor desconhecido (=x) não muda nada', async () => {
    comMarcador()
    montar([`/?${P}=x`])
    await disparar()
    expect(window.localStorage.getItem(OPT_OUT_KEY)).toBeNull()
    expect(sonda.location.search).toBe(`?${P}=x`)
    expect(sonda.tipo).toBe('POP')
    expect(screen.queryByText(/visitas da loja/)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ id: ID })
  })
})
