import { describe, expect, it } from 'vitest'

import { createNuvemshopClient, MAX_ATTEMPTS, nextLink, NuvemshopError } from '../client.ts'

const ENV = {
  storeId: '5943282',
  accessToken: 'token-secreto',
  userAgent: 'Uma Estrelinha Importer (contato@umaestrelinha.com.br)',
  apiVersion: '2025-03',
}

interface Call { url: string; headers: Record<string, string> }

/** Dublê de fetch com roteiro de respostas — molde de `AD-004`, sem rede. */
const fakeFetch = (roteiro: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) => {
  const calls: Call[] = []
  const sleeps: number[] = []
  let i = 0

  const fetch = (async (url: string, init: { headers: Record<string, string> }) => {
    calls.push({ url, headers: init.headers })
    const passo = roteiro[Math.min(i, roteiro.length - 1)]
    i += 1
    return {
      status: passo.status,
      ok: passo.status >= 200 && passo.status < 300,
      json: async () => passo.body ?? [],
      headers: { get: (name: string) => passo.headers?.[name.toLowerCase()] ?? null },
    }
  }) as unknown as typeof globalThis.fetch

  return { fetch, calls, sleeps, sleep: async (ms: number) => { sleeps.push(ms) } }
}

describe('nextLink — paginação pelo header', () => {
  it('extrai a URL de rel="next"', () => {
    const header = '<https://api.tiendanube.com/2025-03/5943282/products?per_page=200&page=2>; rel="next", '
      + '<https://api.tiendanube.com/2025-03/5943282/products?per_page=200&page=4>; rel="last"'
    expect(nextLink(header)).toBe('https://api.tiendanube.com/2025-03/5943282/products?per_page=200&page=2')
  })

  it('devolve null quando só há rel="last" — é o fim da paginação', () => {
    expect(nextLink('<https://api/x?page=4>; rel="last"')).toBeNull()
  })

  it('devolve null para header ausente', () => {
    expect(nextLink(null)).toBeNull()
  })
})

describe('createNuvemshopClient — guardas de credencial (CAT-09)', () => {
  it('lança quando o User-Agent está vazio, SEM fazer nenhuma chamada de saída', () => {
    const f = fakeFetch([{ status: 200 }])
    expect(() => createNuvemshopClient({ ...ENV, userAgent: '   ' }, f))
      .toThrow(/NUVEMSHOP_USER_AGENT/)
    expect(f.calls).toHaveLength(0)
  })

  it('lança quando o token está ausente, nomeando a variável, sem chamada de saída', () => {
    const f = fakeFetch([{ status: 200 }])
    expect(() => createNuvemshopClient({ ...ENV, accessToken: '' }, f))
      .toThrow(/NUVEMSHOP_ACCESS_TOKEN/)
    expect(f.calls).toHaveLength(0)
  })

  it('nomeia todas as credenciais faltantes de uma vez', () => {
    const f = fakeFetch([{ status: 200 }])
    expect(() => createNuvemshopClient({ ...ENV, storeId: '', accessToken: '' }, f))
      .toThrow(/NUVEMSHOP_STORE_ID, NUVEMSHOP_ACCESS_TOKEN/)
  })

  it('constrói normalmente com as quatro credenciais preenchidas', () => {
    const f = fakeFetch([{ status: 200 }])
    expect(() => createNuvemshopClient(ENV, f)).not.toThrow()
  })
})

describe('cliente — headers obrigatórios', () => {
  it('manda Authentication bearer e User-Agent em toda request', async () => {
    const f = fakeFetch([{ status: 200, body: [] }])
    await createNuvemshopClient(ENV, f).listCategories()

    expect(f.calls).toHaveLength(1)
    expect(f.calls[0].headers.Authentication).toBe('bearer token-secreto')
    expect(f.calls[0].headers['User-Agent']).toBe(ENV.userAgent)
  })

  it('pede 200 por página, que é o teto da API', async () => {
    const f = fakeFetch([{ status: 200, body: [] }])
    await createNuvemshopClient(ENV, f).listProducts()
    expect(f.calls[0].url).toContain('per_page=200')
    expect(f.calls[0].url).toContain('/products')
  })
})

describe('cliente — paginação', () => {
  it('segue rel="next" e concatena as páginas', async () => {
    const f = fakeFetch([
      { status: 200, body: [{ id: 1 }, { id: 2 }], headers: { link: '<https://api/pagina2>; rel="next"' } },
      { status: 200, body: [{ id: 3 }] },
    ])
    const items = await createNuvemshopClient(ENV, f).listProducts()

    expect(items.map((i: { id: number }) => i.id)).toEqual([1, 2, 3])
    expect(f.calls).toHaveLength(2)
    expect(f.calls[1].url).toBe('https://api/pagina2')
  })

  it('para na primeira página quando não há rel="next"', async () => {
    const f = fakeFetch([{ status: 200, body: [{ id: 1 }] }])
    await createNuvemshopClient(ENV, f).listCategories()
    expect(f.calls).toHaveLength(1)
  })
})

describe('cliente — rate limit lido do header (CAT-06)', () => {
  it('aguarda a janela quando o orçamento restante chega ao piso', async () => {
    const f = fakeFetch([{
      status: 200,
      body: [],
      headers: { 'x-rate-limit-remaining': '1', 'x-rate-limit-reset': '1000' },
    }])
    await createNuvemshopClient(ENV, f).listCategories()
    expect(f.sleeps).toEqual([1000])
  })

  it('não aguarda quando ainda há orçamento', async () => {
    const f = fakeFetch([{
      status: 200,
      body: [],
      headers: { 'x-rate-limit-remaining': '39', 'x-rate-limit-reset': '1000' },
    }])
    await createNuvemshopClient(ENV, f).listCategories()
    expect(f.sleeps).toEqual([])
  })

  it('não aguarda quando a resposta não traz os headers', async () => {
    const f = fakeFetch([{ status: 200, body: [] }])
    await createNuvemshopClient(ENV, f).listCategories()
    expect(f.sleeps).toEqual([])
  })
})

describe('cliente — backoff e parada limpa (CAT-06)', () => {
  it('repete em 429 respeitando Retry-After, em segundos', async () => {
    const f = fakeFetch([
      { status: 429, headers: { 'retry-after': '3' } },
      { status: 200, body: [{ id: 1 }] },
    ])
    const items = await createNuvemshopClient(ENV, f).listCategories()

    expect(f.sleeps).toEqual([3000])
    expect(items).toHaveLength(1)
  })

  it('repete em 5xx com backoff exponencial quando não há Retry-After', async () => {
    const f = fakeFetch([
      { status: 503 },
      { status: 503 },
      { status: 200, body: [] },
    ])
    await createNuvemshopClient(ENV, f).listCategories()
    expect(f.sleeps).toEqual([1000, 2000])
  })

  it('LANÇA depois de esgotar as 4 tentativas, em vez de devolver lista pela metade', async () => {
    const f = fakeFetch([{ status: 500 }])
    await expect(createNuvemshopClient(ENV, f).listProducts())
      .rejects.toThrow(new RegExp(`500 após ${MAX_ATTEMPTS} tentativas`))
    expect(f.calls).toHaveLength(MAX_ATTEMPTS)
  })

  it('lança sem repetir em erro que não é transitório (404)', async () => {
    const f = fakeFetch([{ status: 404 }])
    await expect(createNuvemshopClient(ENV, f).listProducts()).rejects.toThrow(NuvemshopError)
    expect(f.calls).toHaveLength(1)
  })

  it('lança em 400, que é o que a API devolve quando o User-Agent não chega', async () => {
    const f = fakeFetch([{ status: 400 }])
    await expect(createNuvemshopClient(ENV, f).listProducts()).rejects.toThrow(/400/)
    expect(f.calls).toHaveLength(1)
  })
})
