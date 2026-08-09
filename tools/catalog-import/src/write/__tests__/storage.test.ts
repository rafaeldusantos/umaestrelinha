import { describe, expect, it } from 'vitest'

import type { ImagePlan } from '../../map/image.ts'
import { createMemoryCache } from '../cache.ts'
import { ensureImage, existingPaths, StorageUnavailableError, UPLOAD_ATTEMPTS, type StorageDeps, type UploadError } from '../storage.ts'

const CDN = 'https://acdn-us.mitiendanube.com/stores/005/943/282/products'

const plan: ImagePlan = {
  nuvemshop_id: 1230884211,
  product_nuvemshop_id: 279680049,
  webpUrl: `${CDN}/foto-1024-1024.webp`,
  originalUrl: `${CDN}/foto-1024-1024.png`,
  storageBase: 'nuvemshop/279680049/1230884211',
  alt: 'Corrente singapura',
  position: 1,
}

interface Roteiro { [url: string]: { status: number; contentType?: string; throws?: string } }

const deps = (
  roteiro: Roteiro,
  uploadError: UploadError | null = null,
  erros = Infinity,
  listagem: Array<{ name: string }> | null = [],
  listagemErro: UploadError | null = null,
) => {
  const fetched: string[] = []
  const sleeps: number[] = []
  const listados: string[] = []
  const uploads: Array<{ path: string; contentType: string; upsert: boolean; bytes: number }> = []

  const d: StorageDeps = {
    fetch: (async (url: string) => {
      fetched.push(url)
      const passo = roteiro[url]
      if (!passo) return { ok: false, status: 404, headers: { get: () => null } }
      if (passo.throws) throw new Error(passo.throws)
      return {
        ok: passo.status >= 200 && passo.status < 300,
        status: passo.status,
        headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? passo.contentType ?? null : null) },
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }
    }) as unknown as typeof globalThis.fetch,
    supabase: {
      storage: {
        from: () => ({
          upload: async (path: string, bytes: Uint8Array, opts: { contentType: string; upsert: boolean }) => {
            uploads.push({ path, contentType: opts.contentType, upsert: opts.upsert, bytes: bytes.length })
            return { error: uploads.length <= erros ? uploadError : null }
          },
          list: async (prefix: string) => {
            listados.push(prefix)
            return { data: listagem, error: listagemErro }
          },
        }),
      },
    },
    supabaseUrl: 'http://127.0.0.1:54341',
    cache: createMemoryCache(),
    sleep: async (ms: number) => { sleeps.push(ms) },
  }

  return { d, fetched, uploads, sleeps, listados }
}

describe('ensureImage — rendição WebP com fallback (CAT-03)', () => {
  it('usa o WebP quando ele responde 200 com content-type image/webp', async () => {
    const { d, fetched, uploads } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    const out = await ensureImage(plan, d)

    expect(out.kind).toBe('new')
    expect(fetched).toEqual([plan.webpUrl])
    expect(uploads[0].path).toBe('nuvemshop/279680049/1230884211.webp')
    expect(uploads[0].contentType).toBe('image/webp')
  })

  it('cai para o original quando o WebP não responde 200', async () => {
    const { d, fetched, uploads } = deps({
      [plan.webpUrl]: { status: 403 },
      [plan.originalUrl]: { status: 200, contentType: 'image/png' },
    })
    const out = await ensureImage(plan, d)

    expect(out.kind).toBe('new')
    expect(fetched).toEqual([plan.webpUrl, plan.originalUrl])
    // A extensão sai da URL que serviu: gravar PNG num `.webp` seria um nome que mente.
    expect(uploads[0].path).toBe('nuvemshop/279680049/1230884211.png')
    expect(uploads[0].contentType).toBe('image/png')
  })

  it('cai para o original quando o WebP responde 200 mas NÃO é image/webp', async () => {
    const { d, fetched, uploads } = deps({
      [plan.webpUrl]: { status: 200, contentType: 'application/xml' },
      [plan.originalUrl]: { status: 200, contentType: 'image/png' },
    })
    await ensureImage(plan, d)

    expect(fetched).toEqual([plan.webpUrl, plan.originalUrl])
    expect(uploads[0].path).toBe('nuvemshop/279680049/1230884211.png')
  })

  it('cai para o original quando o fetch do WebP lança', async () => {
    const { d, fetched } = deps({
      [plan.webpUrl]: { status: 0, throws: 'ECONNRESET' },
      [plan.originalUrl]: { status: 200, contentType: 'image/png' },
    })
    expect((await ensureImage(plan, d)).kind).toBe('new')
    expect(fetched).toEqual([plan.webpUrl, plan.originalUrl])
  })
})

describe('ensureImage — falha de imagem não descarta o produto (CAT-07)', () => {
  it('devolve `failed` quando nem o WebP nem o original respondem, sem lançar', async () => {
    const { d, uploads } = deps({ [plan.webpUrl]: { status: 403 }, [plan.originalUrl]: { status: 404 } })
    const out = await ensureImage(plan, d)

    expect(out.kind).toBe('failed')
    if (out.kind === 'failed') {
      expect(out.motivo).toContain('HTTP 403')
      expect(out.motivo).toContain('HTTP 404')
    }
    expect(uploads).toHaveLength(0)
  })

  it('não sobe nada quando o download falhou', async () => {
    const { d, uploads } = deps({})
    expect((await ensureImage(plan, d)).kind).toBe('failed')
    expect(uploads).toHaveLength(0)
  })
})

describe('ensureImage — idempotência pelo caminho determinístico (CAT-03)', () => {
  it('conta como reusada quando o Storage acusa duplicata', async () => {
    const { d } = deps(
      { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } },
      { statusCode: '409', message: 'The resource already exists' },
    )
    const out = await ensureImage(plan, d)

    expect(out.kind).toBe('reused')
    if (out.kind !== 'failed') {
      expect(out.url).toBe(
        'http://127.0.0.1:54341/storage/v1/object/public/product-images/nuvemshop/279680049/1230884211.webp',
      )
    }
  })

  it('nunca usa upsert — reenviar 410 MB a cada execução é o oposto do requisito', async () => {
    const { d, uploads } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    await ensureImage(plan, d)
    expect(uploads[0].upsert).toBe(false)
  })
})

describe('existingPaths — saber o que já está lá SEM enviar os bytes', () => {
  it('lista a pasta do produto e devolve caminhos completos', async () => {
    const { d, listados } = deps({}, null, Infinity, [{ name: '1230884211.webp' }, { name: '999.png' }])
    const paths = await existingPaths(279680049, d)

    expect(listados).toEqual(['nuvemshop/279680049'])
    expect([...paths].sort()).toEqual([
      'nuvemshop/279680049/1230884211.webp',
      'nuvemshop/279680049/999.png',
    ])
  })

  it('devolve conjunto vazio quando a listagem falha — o pior caso é voltar a subir', async () => {
    const { d } = deps({}, null, Infinity, null, { message: 'timeout' })
    expect(await existingPaths(1, d)).toEqual(new Set())
  })
})

describe('ensureImage — imagem já gravada não é baixada NEM enviada (CAT-03)', () => {
  it('sai como reusada sem tocar no CDN nem no Storage', async () => {
    // O motivo de isto existir: descobrir "já está lá" pelo erro de duplicata custa o CORPO
    // INTEIRO. Medido no import real: ~410 MB reenviados por execução, e 852 timeouts contra o
    // container local — o próprio ato de verificar derrubava a verificação.
    const { d, fetched, uploads } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    const out = await ensureImage(plan, d, new Set(['nuvemshop/279680049/1230884211.webp']))

    expect(out.kind).toBe('reused')
    expect(fetched).toEqual([])
    expect(uploads).toEqual([])
  })

  it('reconhece também a extensão do ORIGINAL, quando a gravação veio do fallback', async () => {
    const { d, fetched, uploads } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    const out = await ensureImage(plan, d, new Set(['nuvemshop/279680049/1230884211.png']))

    expect(out.kind).toBe('reused')
    if (out.kind !== 'failed') expect(out.path).toBe('nuvemshop/279680049/1230884211.png')
    expect(fetched).toEqual([])
    expect(uploads).toEqual([])
  })

  it('sobe normalmente quando o caminho não está no conjunto', async () => {
    const { d, uploads } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    const out = await ensureImage(plan, d, new Set(['nuvemshop/279680049/outra.webp']))

    expect(out.kind).toBe('new')
    expect(uploads).toHaveLength(1)
  })
})

describe('ensureImage — cache (a re-execução não toca o CDN)', () => {
  it('não faz nenhum fetch quando os bytes já estão no cache', async () => {
    const roteiro = { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } }
    const { d, fetched } = deps(roteiro)

    await ensureImage(plan, d)
    expect(fetched).toHaveLength(1)

    await ensureImage(plan, d)
    expect(fetched).toHaveLength(1)
  })

  it('o cache preserva qual URL serviu, então o caminho no Storage não muda entre execuções', async () => {
    const { d, uploads } = deps({
      [plan.webpUrl]: { status: 403 },
      [plan.originalUrl]: { status: 200, contentType: 'image/png' },
    })
    await ensureImage(plan, d)
    await ensureImage(plan, d)

    expect(uploads.map(u => u.path)).toEqual([
      'nuvemshop/279680049/1230884211.png',
      'nuvemshop/279680049/1230884211.png',
    ])
  })
})

describe('ensureImage — blip transitório não mata o import', () => {
  it('repete o upload e SUCEDE quando a falha foi passageira', async () => {
    // O primeiro import real morreu com UM `fetch failed` no meio de 3.651 uploads. Um soquete que
    // cai não é "Storage indisponível".
    const { d, uploads, sleeps } = deps(
      { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } },
      { message: 'fetch failed' },
      1,
    )
    const out = await ensureImage(plan, d)

    expect(out.kind).toBe('new')
    expect(uploads).toHaveLength(2)
    expect(sleeps).toEqual([500])
  })

  it('não repete quando a resposta é duplicata — é definitiva, não falha', async () => {
    const { d, uploads, sleeps } = deps(
      { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } },
      { statusCode: '409', message: 'The resource already exists' },
    )
    expect((await ensureImage(plan, d)).kind).toBe('reused')
    expect(uploads).toHaveLength(1)
    expect(sleeps).toEqual([])
  })

  it('repete também quando o client LANÇA em vez de devolver erro', async () => {
    let chamadas = 0
    const { d } = deps({ [plan.webpUrl]: { status: 200, contentType: 'image/webp' } })
    d.supabase = {
      storage: {
        from: () => ({
          upload: async () => {
            chamadas += 1
            if (chamadas < 2) throw new Error('fetch failed')
            return { error: null }
          },
        }),
      },
    } as never

    expect((await ensureImage(plan, d)).kind).toBe('new')
    expect(chamadas).toBe(2)
  })
})

describe('ensureImage — Storage indisponível para o import (CAT-06)', () => {
  it('LANÇA depois de esgotar as tentativas, quando a falha persiste', async () => {
    const { d, uploads } = deps(
      { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } },
      { statusCode: '500', message: 'connection refused' },
    )
    await expect(ensureImage(plan, d)).rejects.toThrow(StorageUnavailableError)
    expect(uploads).toHaveLength(UPLOAD_ATTEMPTS)
  })

  it('a mensagem nomeia o caminho e o número de tentativas', async () => {
    const { d } = deps(
      { [plan.webpUrl]: { status: 200, contentType: 'image/webp' } },
      { statusCode: '401', message: 'Invalid JWT' },
    )
    await expect(ensureImage(plan, d)).rejects.toThrow(/nuvemshop\/279680049\/1230884211\.webp/)
    await expect(ensureImage(plan, d)).rejects.toThrow(new RegExp(`${UPLOAD_ATTEMPTS} tentativas`))
  })
})
