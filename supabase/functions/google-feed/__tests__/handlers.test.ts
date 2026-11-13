import { describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import {
  FEED_CAMPAIGN_CHUNK,
  FEED_PAGE_SIZE,
  handleFeed,
  readAllRows,
  readFeedCampaign,
  toOffers,
  type FeedDeps,
  type FeedRow,
} from '../handlers.ts'

/**
 * `GSH-05`, `GSH-15` — o feed, e os quatro jeitos de ele **não** responder.
 *
 * A régua central: **nenhum caminho de erro devolve XML.** O Merchant Center lê a ausência de um
 * item como pedido de remoção, então um feed parcial ou vazio é destrutivo — mais do que não
 * responder, que ele trata mantendo a última leitura boa.
 */

const CANAL = {
  title: 'Uma Estrelinha',
  link: 'https://umaestrelinha.com.br',
  description: 'Joias afetivas artesanais em resina',
}

const linha = (n: number, over: Partial<FeedRow> = {}): FeedRow => ({
  product: {
    id: `p-${n}`,
    nuvemshop_id: 281745761 + n,
    name: `Peça ${n}`,
    slug: `peca-${n}`,
    description: '<p>Uma peça</p>',
    images: [{ url: `https://cdn/${n}.jpg` }],
    is_active: true,
    stock_policy: 'track',
    ...(over.product ?? {}),
  },
  variant: {
    id: `v-${n}`,
    nuvemshop_id: 1259936246 + n,
    price: 19.9,
    compare_price: null,
    stock: 3,
    image_url: null,
    is_active: true,
    ...(over.variant ?? {}),
  },
})

const deps = (over: Partial<FeedDeps> = {}, linhas: FeedRow[] = [linha(0)]): FeedDeps => ({
  readConfig: async () => ({ enabled: true, default_product_category: null }),
  countRows: async () => linhas.length,
  readPage: async (from, to) => linhas.slice(from, to + 1),
  markFetched: async () => {},
  readCampaign: async () => ({ percentOf: new Map(), window: null }),
  origin: 'https://umaestrelinha.com.br',
  channel: CANAL,
  ...over,
})

describe('handleFeed — o interruptor', () => {
  it('desligado responde 404', async () => {
    const res = await handleFeed(deps({ readConfig: async () => ({ enabled: false }) }))
    expect(res.status).toBe(404)
  })

  it('desligado NÃO lê o catálogo', async () => {
    const countRows = vi.fn(async () => 1)
    const readPage = vi.fn(async () => [linha(0)])
    await handleFeed(deps({ readConfig: async () => ({ enabled: false }), countRows, readPage }))
    expect(countRows).not.toHaveBeenCalled()
    expect(readPage).not.toHaveBeenCalled()
  })

  it('configuração ausente é tratada como desligada', async () => {
    const res = await handleFeed(deps({ readConfig: async () => null }))
    expect(res.status).toBe(404)
  })

  it('ligado responde 200 com XML', async () => {
    const res = await handleFeed(deps())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/xml')
    expect(await res.text()).toContain('<rss')
  })
})

describe('handleFeed — nenhum caminho de erro devolve XML', () => {
  const naoEhFeed = async (res: Response) => {
    const corpo = await res.text()
    expect(corpo).not.toContain('<rss')
    expect(corpo).not.toContain('<item>')
    expect(res.headers.get('Content-Type')).not.toContain('xml')
  }

  it('erro ao ler a configuração ⇒ 503 sem feed', async () => {
    const res = await handleFeed(
      deps({
        readConfig: async () => {
          throw new Error('banco fora')
        },
      }),
    )
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })

  it('erro ao ler o catálogo ⇒ 503 sem feed', async () => {
    const res = await handleFeed(
      deps({
        countRows: async () => {
          throw new Error('banco fora')
        },
      }),
    )
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })

  it('origem da loja ausente ⇒ 503, em vez de 3.233 links com host errado', async () => {
    const res = await handleFeed(deps({ origin: '' }))
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })

  it('catálogo sem oferta elegível ⇒ 503, nunca RSS vazio', async () => {
    const inativas = [linha(0, { product: { is_active: false } as never })]
    const res = await handleFeed(deps({}, inativas), )
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })

  it('catálogo vazio ⇒ 503', async () => {
    const res = await handleFeed(deps({ countRows: async () => 0, readPage: async () => [] }, []))
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })

  it('offer_id duplicado ⇒ 503, porque o Google descartaria o item em silêncio', async () => {
    const duplicadas = [linha(0), linha(0)]
    const res = await handleFeed(deps({}, duplicadas))
    expect(res.status).toBe(503)
    await naoEhFeed(res)
  })
})

describe('readAllRows — o teto de 1.000 do PostgREST', () => {
  it('pagina acima de 1.000 e traz todas as linhas', async () => {
    const todas = Array.from({ length: 3233 }, (_, i) => linha(i))
    const lidas = await readAllRows(deps({}, todas))
    expect(lidas).toHaveLength(3233)
  })

  it('faz o número de páginas que o total exige', async () => {
    const todas = Array.from({ length: 3233 }, (_, i) => linha(i))
    const readPage = vi.fn(async (from: number, to: number) => todas.slice(from, to + 1))
    await readAllRows(deps({ readPage }, todas))
    expect(readPage).toHaveBeenCalledTimes(Math.ceil(3233 / FEED_PAGE_SIZE))
  })

  it('LANÇA quando a leitura vem truncada — 1.000 de 3.233', async () => {
    const todas = Array.from({ length: 3233 }, (_, i) => linha(i))
    await expect(
      readAllRows(
        deps(
          {
            countRows: async () => 3233,
            readPage: async (from, to) => (from === 0 ? todas.slice(0, 1000) : []),
          },
          todas,
        ),
      ),
    ).rejects.toThrow(/1000 de 3233/)
  })

  it('a mensagem diz o que faltou, para o log não virar mistério', async () => {
    await expect(
      readAllRows(deps({ countRows: async () => 10, readPage: async () => [] }, [])),
    ).rejects.toThrow(/incompleta/)
  })

  it('leitura truncada chega ao HTTP como 503', async () => {
    const todas = Array.from({ length: 3233 }, (_, i) => linha(i))
    const res = await handleFeed(
      deps(
        {
          countRows: async () => 3233,
          readPage: async from => (from === 0 ? todas.slice(0, 1000) : []),
        },
        todas,
      ),
    )
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('<rss')
  })
})

describe('toOffers — a regra de inclusão tem um dono', () => {
  it('pula variação inativa, produto inativo e linha sem preço', async () => {
    const linhas = [
      linha(0),
      linha(1, { variant: { is_active: false } as never }),
      linha(2, { product: { is_active: false } as never }),
      linha(3, { variant: { price: null } as never }),
    ]
    expect(toOffers(linhas, 'https://umaestrelinha.com.br')).toHaveLength(1)
  })

  it('a categoria padrão da loja chega na oferta', () => {
    const ofertas = toOffers([linha(0)], 'https://umaestrelinha.com.br', 'Apparel & Accessories > Jewelry')
    expect(ofertas[0].googleProductCategory).toBe('Apparel & Accessories > Jewelry')
  })
})

describe('handleFeed — o carimbo de última busca', () => {
  it('grava o carimbo na resposta 200', async () => {
    const markFetched = vi.fn(async () => {})
    await handleFeed(deps({ markFetched }))
    expect(markFetched).toHaveBeenCalledTimes(1)
  })

  it('NÃO grava quando responde 404', async () => {
    const markFetched = vi.fn(async () => {})
    await handleFeed(deps({ markFetched, readConfig: async () => ({ enabled: false }) }))
    expect(markFetched).not.toHaveBeenCalled()
  })

  it('NÃO grava quando responde 503', async () => {
    const markFetched = vi.fn(async () => {})
    await handleFeed(deps({ markFetched, origin: '' }))
    expect(markFetched).not.toHaveBeenCalled()
  })

  it('falhar ao carimbar não derruba o feed — observabilidade não vale um catálogo', async () => {
    const res = await handleFeed(
      deps({
        markFetched: async () => {
          throw new Error('sem permissão')
        },
      }),
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<rss')
  })
})

describe('handleFeed — a oferta medida atravessa a function', () => {
  it('publica o offer_id e o item_group_id que o Merchant Center já conhece', async () => {
    const real: FeedRow = {
      product: {
        id: '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93',
        nuvemshop_id: 281745761,
        name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
        slug: 'pulseira-7-nos-ajustavel-protecao-kabbalah',
        description: '<p>Pulseira dos 7 n&oacute;s</p>',
        images: [{ url: 'https://cdn/p1.jpg' }],
        is_active: true,
        stock_policy: 'track',
      },
      variant: {
        id: 'dd0e2171-4d3d-4e20-a868-21e5223bd917',
        nuvemshop_id: 1259936246,
        price: 19.9,
        compare_price: null,
        stock: 4,
        image_url: null,
        is_active: true,
      },
    }
    const xml = await (await handleFeed(deps({}, [real]))).text()
    expect(xml).toContain('<g:id>1259936246</g:id>')
    expect(xml).toContain('<g:item_group_id>281745761</g:item_group_id>')
    expect(xml).toContain('<g:price>19.90 BRL</g:price>')
    expect(xml).toContain(
      '<link>https://umaestrelinha.com.br/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246</link>',
    )
  })
})

describe('GSH-23 — a taxonomia herdada da categoria', () => {
  const comCategorias = (cats: { name: string; sort_order: number; google_product_category: string | null }[]) => {
    const l = linha(0)
    return { ...l, categories: cats }
  }

  it('a categoria empresta a taxonomia quando o produto não define', async () => {
    const xml = await (
      await handleFeed(
        deps({}, [comCategorias([{ name: 'Pulseiras', sort_order: 0, google_product_category: 'DA CATEGORIA' }])]),
      )
    ).text()
    expect(xml).toContain('<g:google_product_category>DA CATEGORIA</g:google_product_category>')
  })

  it('o produto vence a categoria', async () => {
    const base = comCategorias([{ name: 'Pulseiras', sort_order: 0, google_product_category: 'DA CATEGORIA' }])
    const xml = await (
      await handleFeed(
        deps({}, [{ ...base, product: { ...base.product, google_product_category: 'DO PRODUTO' } }]),
      )
    ).text()
    expect(xml).toContain('<g:google_product_category>DO PRODUTO</g:google_product_category>')
  })

  it('sem categoria com valor, cai no padrão da loja', async () => {
    const xml = await (
      await handleFeed(
        deps(
          { readConfig: async () => ({ enabled: true, default_product_category: 'DA LOJA' }) },
          [comCategorias([{ name: 'Pulseiras', sort_order: 0, google_product_category: null }])],
        ),
      )
    ).text()
    expect(xml).toContain('<g:google_product_category>DA LOJA</g:google_product_category>')
  })

  it('produto sem categoria nenhuma não quebra a geração', async () => {
    const res = await handleFeed(deps({}, [linha(0)]))
    expect(res.status).toBe(200)
  })
})

/**
 * A campanha de desconto em vigência chega ao feed pelo leitor único das functions
 * (`_shared/campaigns.ts`), com o relógio DA FUNCTION — a service role ignora a RLS. O banco é o
 * dublê de `_shared/testing`, que enxerga o `.in()` e o `.eq()` de cada leitura.
 */
describe('handleFeed — a campanha de desconto em vigência', () => {
  const CAMPANHA = {
    id: 'camp-black',
    name: 'Black Friday',
    starts_at: '2026-11-27T03:00:00.000Z',
    ends_at: '2026-11-30T03:00:00.000Z',
    active: true,
  }
  const DENTRO = Date.parse('2026-11-28T12:00:00.000Z')
  const ANTES = Date.parse('2026-11-27T02:59:59.999Z')
  const NO_FIM = Date.parse('2026-11-30T03:00:00.000Z')

  // `p-0` marcado com 15%; `p-1` fora da campanha. `p-0` tem duas variações.
  const banco = () =>
    createFakeSupabase({
      lists: {
        campaigns: [CAMPANHA],
        product_campaigns: (eqs, _select, read) => {
          if (!eqs.some(([c, v]) => c === 'campaign_id' && v === 'camp-black')) return []
          const pedidos = (read.in.find(([c]) => c === 'product_id')?.[1] ?? []) as string[]
          return [{ product_id: 'p-0', percent: 15 }].filter(m => pedidos.includes(m.product_id))
        },
      },
    })

  const catalogo: FeedRow[] = [
    linha(0, { variant: { id: 'v-0a', nuvemshop_id: 1001, price: 199.9 } as FeedRow['variant'] }),
    linha(0, { variant: { id: 'v-0b', nuvemshop_id: 1002, price: 180, compare_price: 200 } as FeedRow['variant'] }),
    linha(1, { variant: { id: 'v-1', nuvemshop_id: 1003, price: 50 } as FeedRow['variant'] }),
  ]

  const itens = (xml: string): Map<string, Record<string, string>> => {
    const mapa = new Map<string, Record<string, string>>()
    for (const bloco of xml.split('<item>').slice(1)) {
      const campos: Record<string, string> = {}
      for (const m of bloco.matchAll(/<g:([a-z_]+)>([^<]*)<\/g:\1>/g)) campos[m[1]] = m[2]
      mapa.set(campos.id, campos)
    }
    return mapa
  }

  const feed = async (agora: number) => {
    const supabase = banco()
    const res = await handleFeed(
      deps({ readCampaign: ids => readFeedCampaign(supabase.client, () => agora, ids) }, catalogo),
    )
    return { res, supabase }
  }

  it('dentro da vigência: sale_price e sale_price_effective_date em cada variação marcada', async () => {
    const { res } = await feed(DENTRO)
    expect(res.status).toBe(200)
    const porId = itens(await res.text())
    // 15% sobre 199,90 = 169,915 ⇒ 169,92.
    expect(porId.get('1001')).toMatchObject({
      price: '199.90 BRL',
      sale_price: '169.92 BRL',
      sale_price_effective_date: '2026-11-27T03:00:00Z/2026-11-30T03:00:00Z',
    })
    // 15% sobre o "de" (200) = 170, menor que os 180 de hoje.
    expect(porId.get('1002')).toMatchObject({
      price: '200.00 BRL',
      sale_price: '170.00 BRL',
      sale_price_effective_date: '2026-11-27T03:00:00Z/2026-11-30T03:00:00Z',
    })
    // A peça fora da campanha segue a de sempre.
    expect(porId.get('1003')?.price).toBe('50.00 BRL')
    expect(porId.get('1003')?.sale_price).toBeUndefined()
    expect(porId.get('1003')?.sale_price_effective_date).toBeUndefined()
  })

  it('antes do início e no instante do fim: nenhuma oferta leva a campanha', async () => {
    for (const agora of [ANTES, NO_FIM]) {
      const { res } = await feed(agora)
      const porId = itens(await res.text())
      expect(porId.get('1001')).toMatchObject({ price: '199.90 BRL' })
      expect(porId.get('1001')?.sale_price).toBeUndefined()
      expect(porId.get('1002')).toMatchObject({ price: '200.00 BRL', sale_price: '180.00 BRL' })
      for (const item of porId.values()) expect(item.sale_price_effective_date).toBeUndefined()
    }
  })

  it('as marcações são pedidas só para as peças que estão no feed', async () => {
    const { supabase } = await feed(DENTRO)
    const pedidos = supabase.reads
      .filter(l => l.table === 'product_campaigns')
      .flatMap(l => l.in.flatMap(([, v]) => v as string[]))
    expect([...pedidos].sort()).toEqual(['p-0', 'p-1'])
  })

  it('a leitura da campanha falhando ⇒ 503 sem feed, nunca o preço sem a campanha', async () => {
    const supabase = createFakeSupabase({ listErrorByTable: { campaigns: { message: 'fora do ar' } } })
    const markFetched = vi.fn(async () => {})
    const res = await handleFeed(
      deps({ readCampaign: ids => readFeedCampaign(supabase.client, () => DENTRO, ids), markFetched }, catalogo),
    )
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('<rss')
    expect(markFetched).not.toHaveBeenCalled()
  })

  it('catálogo grande: as peças vão em lotes, e todas as marcadas levam a campanha', async () => {
    const muitas = Array.from({ length: FEED_CAMPAIGN_CHUNK * 2 + 3 }, (_, n) => `p-${n}`)
    const supabase = createFakeSupabase({
      lists: {
        campaigns: [CAMPANHA],
        product_campaigns: (_eqs, _select, read) => {
          const pedidos = (read.in.find(([c]) => c === 'product_id')?.[1] ?? []) as string[]
          return pedidos.map(id => ({ product_id: id, percent: 10 }))
        },
      },
    })
    const r = await readFeedCampaign(supabase.client, () => DENTRO, muitas)
    expect(r.percentOf.size).toBe(muitas.length)
    expect(r.window).toEqual({ starts_at: CAMPANHA.starts_at, ends_at: CAMPANHA.ends_at })
    const lotes = supabase.reads.filter(l => l.table === 'product_campaigns')
    expect(lotes).toHaveLength(3)
    for (const l of lotes) expect((l.in[0][1] as string[]).length).toBeLessThanOrEqual(FEED_CAMPAIGN_CHUNK)
  })
})
