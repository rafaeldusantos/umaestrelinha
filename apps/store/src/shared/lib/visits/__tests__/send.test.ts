import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `VIS-13` e `VIS-18` (feature `71`) — o `POST` da visita.
 *
 * O client do Supabase é dublado COM UMA SESSÃO ATIVA: o que se prova é que, mesmo com a cliente
 * logada, o token dela não viaja. `supabase.functions.invoke` anexaria o JWT da sessão, e por isso
 * o envio é um `fetch` cru com só a chave publicável.
 */

const TOKEN_DA_SESSAO = 'eyJ.token-da-sessao.da-cliente'
const URL_DO_PROJETO = 'http://127.0.0.1:54441'
const CHAVE = 'chave-publicavel-de-teste'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  SUPABASE_URL: 'http://127.0.0.1:54441',
  SUPABASE_PUBLISHABLE_KEY: 'chave-publicavel-de-teste',
  supabase: {
    functions: { invoke },
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { access_token: 'eyJ.token-da-sessao.da-cliente' } }, error: null }),
    },
  },
}))

import { postVisit } from '../send'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'

const fetchMock = vi.fn()

const resposta = (status: number, corpo: unknown) =>
  Promise.resolve(
    new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

beforeEach(() => {
  fetchMock.mockReset()
  invoke.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const chamada = () => {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: new Headers(init.headers) }
}

describe('VIS-13 — o pedido', () => {
  it('POST para a function `visit` do projeto', async () => {
    fetchMock.mockReturnValue(resposta(200, { desfecho: 'gravada', dia: '2026-10-21', ate: 1, agora: 0 }))
    await postVisit(ID)
    const { url, init } = chamada()
    expect(url).toBe(`${URL_DO_PROJETO}/functions/v1/visit`)
    expect(init.method).toBe('POST')
  })

  it('o corpo é EXATAMENTE { id } — chaves comparadas por igualdade', async () => {
    fetchMock.mockReturnValue(resposta(200, { dia: '2026-10-21', ate: 1, agora: 0 }))
    await postVisit(ID)
    const corpo = JSON.parse(chamada().init.body as string)
    expect(Object.keys(corpo)).toEqual(['id'])
    expect(corpo.id).toBe(ID)
  })

  it('com sessão ativa, Authorization NÃO vai — só a chave publicável', async () => {
    fetchMock.mockReturnValue(resposta(200, { dia: '2026-10-21', ate: 1, agora: 0 }))
    await postVisit(ID)
    const { headers, init } = chamada()
    expect(headers.has('authorization')).toBe(false)
    expect(headers.get('apikey')).toBe(CHAVE)
    expect(headers.get('content-type')).toBe('application/json')
    // Nenhum cabeçalho carrega o token da sessão, com qualquer nome.
    for (const [, valor] of headers) expect(valor).not.toContain(TOKEN_DA_SESSAO)
    expect(JSON.stringify(init)).not.toContain(TOKEN_DA_SESSAO)
  })

  it('não passa por supabase.functions.invoke (que anexaria o JWT da sessão)', async () => {
    fetchMock.mockReturnValue(resposta(200, { dia: '2026-10-21', ate: 1, agora: 0 }))
    await postVisit(ID)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('sem cookies (credentials omit) e sem keepalive', async () => {
    fetchMock.mockReturnValue(resposta(200, { dia: '2026-10-21', ate: 1, agora: 0 }))
    await postVisit(ID)
    const { init } = chamada()
    expect(init.credentials).toBe('omit')
    expect('keepalive' in init).toBe(false)
  })
})

describe('VIS-16/VIS-18 — a resposta', () => {
  it('200 com ate e agora inteiros ⇒ devolve os dois', async () => {
    fetchMock.mockReturnValue(
      resposta(200, { desfecho: 'gravada', dia: '2026-10-21', ate: 1792638000000, agora: 1792610000000 }),
    )
    expect(await postVisit(ID)).toEqual({ status: 200, ate: 1792638000000, agora: 1792610000000 })
  })

  it('429 com relógio ⇒ devolve o relógio (a loja grava o prazo e não tenta mais no dia)', async () => {
    fetchMock.mockReturnValue(resposta(429, { dia: '2026-10-21', ate: 2000, agora: 1000 }))
    expect(await postVisit(ID)).toEqual({ status: 429, ate: 2000, agora: 1000 })
  })

  it.each<[string, unknown]>([
    ['ate como texto', { ate: '1792638000000', agora: 1 }],
    ['agora ausente', { ate: 1792638000000 }],
    ['ate ausente', { agora: 1 }],
    ['ate nulo', { ate: null, agora: 1 }],
    ['429 sem relógio', {}],
  ])('%s ⇒ sem relógio (conta como falha)', async (_nome, corpo) => {
    fetchMock.mockReturnValue(resposta(200, corpo))
    const r = await postVisit(ID)
    expect(r.ate).toBeUndefined()
    expect(r.agora).toBeUndefined()
  })

  it('corpo que não é JSON ⇒ status preservado, sem relógio, sem lançar', async () => {
    fetchMock.mockReturnValue(resposta(502, '<html>bad gateway</html>'))
    expect(await postVisit(ID)).toEqual({ status: 502 })
  })

  it('500 ⇒ o status chega, sem relógio', async () => {
    fetchMock.mockReturnValue(resposta(500, { error: 'erro' }))
    expect(await postVisit(ID)).toEqual({ status: 500 })
  })

  it('rede que rejeita ⇒ status 0, sem lançar', async () => {
    fetchMock.mockReturnValue(Promise.reject(new TypeError('Failed to fetch')))
    await expect(postVisit(ID)).resolves.toEqual({ status: 0 })
  })
})

describe('o client continua sendo o único leitor das duas env, e continua lançando sem elas', () => {
  // Estes casos importam o client DE VERDADE (o dublê acima vale só para `../send`).
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const clientDeVerdade = async () => {
    vi.resetModules()
    vi.doUnmock('@estrelinha/supabase/client')
    return import('@estrelinha/supabase/client')
  }

  it('exporta a URL e a chave publicável lidas da env', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54441')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'outra-chave')
    const mod = await clientDeVerdade()
    expect(mod.SUPABASE_URL).toBe('http://127.0.0.1:54441')
    expect(mod.SUPABASE_PUBLISHABLE_KEY).toBe('outra-chave')
  })

  it('sem a URL, o carregamento do módulo lança', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    await expect(clientDeVerdade()).rejects.toThrow(/Supabase não configurado/)
  })

  it('sem a chave publicável, o carregamento do módulo lança', async () => {
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    await expect(clientDeVerdade()).rejects.toThrow(/Supabase não configurado/)
  })
})
