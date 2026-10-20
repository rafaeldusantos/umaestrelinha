import { describe, expect, it } from 'vitest'
import { renditionUrl } from '../../media/rendition.ts'
import { OG_IMAGE_WIDTH } from '../images.ts'
import { servePage, type PageDeps, type ProductPageData } from '../serve.ts'

/**
 * Portado de `supabase/functions/product-page/__tests__/productHead.test.ts` na feature 69 (T03/T05):
 * os 15 casos, contra `servePage` (que monta o `<head>` por `applyHead`). Um mudou de veredito pela
 * spec — slug desconhecido passa de "shell intacto" a **404 com noindex** (SSV-07).
 *
 * Feature 62 · `MTA-15`..`MTA-18` — o HTML servido de um produto traz o título, a descrição e o card
 * DA JOIA. É a única superfície do produto que o WhatsApp lê: ele não executa JavaScript.
 *
 * O shell daqui tem as tags genéricas que o `index.html` de verdade declara — é contra elas que a
 * regra "substitui, nunca duplica" se mede.
 */

const ORIGEM = 'https://umaestrelinha.com.br'
const SLUG = 'pulseira-7-nos-ajustavel-protecao-kabbalah'

const SHELL_REAL = [
  '<!doctype html><html lang="pt-BR"><head>',
  '    <title>Uma Estrelinha - Joias afetivas artesanais em resina</title>',
  '    <meta name="description" content="Descrição genérica da loja.">',
  '    <meta property="og:type" content="website" />',
  '    <meta name="twitter:card" content="summary_large_image" />',
  '    <meta property="og:title" content="Uma Estrelinha - Joias afetivas artesanais em resina">',
  '    <meta name="twitter:title" content="Uma Estrelinha - Joias afetivas artesanais em resina">',
  '    <meta property="og:description" content="Descrição genérica da loja.">',
  '    <meta name="twitter:description" content="Descrição genérica da loja.">',
  '    <meta property="og:image" content="https://umaestrelinha.com.br/arte.jpg">',
  '    <meta property="og:image:type" content="image/jpeg">',
  '    <meta property="og:image:width" content="1200">',
  '    <meta property="og:image:height" content="630">',
  '    <meta property="og:image:alt" content="Arte da loja">',
  '    <meta name="twitter:image" content="https://umaestrelinha.com.br/arte.jpg">',
  '    <meta name="twitter:image:alt" content="Arte da loja">',
  '  </head><body><div id="root"></div></body></html>',
].join('\n')

const produto = (over: Partial<ProductPageData['product']> = {}): ProductPageData => ({
  product: {
    id: '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93',
    nuvemshop_id: 281745761,
    name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
    slug: SLUG,
    description: '<p>Pulseira dos 7 n&oacute;s</p>',
    images: [{ url: 'https://cdn/p1.jpg' }],
    is_active: true,
    stock_policy: 'track',
    ...over,
  },
  variants: [
    {
      id: 'dd0e2171-4d3d-4e20-a868-21e5223bd917',
      nuvemshop_id: 1259936246,
      price: 19.9,
      compare_price: null,
      stock: 4,
      image_url: null,
      is_active: true,
      position: 0,
    },
  ],
})

type Over = Partial<PageDeps> & { storeDescription?: string }

const deps = ({ storeDescription, ...over }: Over = {}, d: ProductPageData | null = produto()): PageDeps => ({
  shell: SHELL_REAL,
  origin: ORIGEM,
  readProduct: async () => d,
  readOptionMarks: async () => [],
  readProductRedirect: async () => null,
  readCategories: async () => [],
  readCategoryRedirect: async () => null,
  readInactiveFallback: async () => null,
  readSettings: async () => ({ defaultProductCategory: null, storeDescription: storeDescription ?? null }),
  log: () => {},
  ...over,
})

const servido = async (
  over: Over = {},
  p: Partial<ProductPageData['product']> = {},
  qs = '',
): Promise<string> => (await servePage(deps(over, produto(p)), new URL(`https://x/produtos/${SLUG}${qs}`))).body

/** O `content` de cada `<meta>` com aquele `name`/`property`, na ordem do documento. */
const metaDe = (corpo: string, chave: string): string[] =>
  [...corpo.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)]
    .filter(m => m[1] === chave)
    .map(m => m[2])

const tituloDe = (corpo: string): string[] => [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1])

describe('o <head> servido do produto (MTA-15)', () => {
  it('com seo_title curado: <title>, og:title e twitter:title são ele, com a marca', async () => {
    const corpo = await servido({}, { seo_title: 'Pulseira de Proteção 7 Nós' })
    const esperado = 'Pulseira de Proteção 7 Nós | Uma Estrelinha'
    expect(tituloDe(corpo)).toEqual([esperado])
    expect(metaDe(corpo, 'og:title')).toEqual([esperado])
    expect(metaDe(corpo, 'twitter:title')).toEqual([esperado])
  })

  it('sem seo_title: o nome do produto, com a marca', async () => {
    expect(tituloDe(await servido())).toEqual([
      'Pulseira 7 Nós Ajustável Proteção Kabbalah | Uma Estrelinha',
    ])
  })

  it('a descrição curada nas TRÊS tags, idêntica', async () => {
    const corpo = await servido({}, { seo_description: 'Pulseira feita à mão para proteção.' })
    for (const chave of ['description', 'og:description', 'twitter:description']) {
      expect(metaDe(corpo, chave)).toEqual(['Pulseira feita à mão para proteção.'])
    }
  })

  it('sem seo_description: a derivada da descrição do produto', async () => {
    expect(metaDe(await servido(), 'description')).toEqual(['Pulseira dos 7 nós'])
  })

  it('sem descrição aproveitável: a da configuração; sem ela, a que o shell declara (A16)', async () => {
    expect(
      metaDe(await servido({ storeDescription: 'Da configuração.' }, { description: '' }), 'description'),
    ).toEqual(['Da configuração.'])
    expect(metaDe(await servido({}, { description: '' }), 'description')).toEqual([
      'Descrição genérica da loja.',
    ])
  })
})

describe('o card do produto (MTA-16)', () => {
  it('og:type é product, e og:url é a canônica absoluta SEM o ?variant=', async () => {
    const corpo = await servido({}, {}, '?variant=1259936246')
    expect(metaDe(corpo, 'og:type')).toEqual(['product'])
    expect(metaDe(corpo, 'og:url')).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it('og:image e twitter:image são a foto da joia; as dimensões e o alt da arte padrão saem', async () => {
    const corpo = await servido()
    expect(metaDe(corpo, 'og:image')).toEqual(['https://cdn/p1.jpg'])
    expect(metaDe(corpo, 'twitter:image')).toEqual(['https://cdn/p1.jpg'])
    for (const chave of [
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'og:image:type',
      'twitter:image:alt',
    ]) {
      expect(metaDe(corpo, chave)).toEqual([])
    }
  })

  it('foto do Storage: og:image é a RENDIÇÃO de 1200 (JPEG para o mensageiro), não o original WebP', async () => {
    const original =
      'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/a/b.webp'
    const corpo = await servido({}, { images: [{ url: original }] })
    const [og] = metaDe(corpo, 'og:image')
    expect(og).toContain('/storage/v1/render/image/public/product-images/a/b.webp')
    expect(og).toContain('width=1200')
    expect(og).not.toBe(original)
    expect(OG_IMAGE_WIDTH).toBe(1200)
    // o `&` da query sai escapado no atributo; desescapado, é a rendição do dono único
    expect(og.replace(/&amp;/g, '&')).toBe(renditionUrl(original, 1200))
    expect(metaDe(corpo, 'twitter:image')).toEqual([og])
  })

  it('produto sem foto mantém o card padrão do shell, inteiro', async () => {
    const corpo = await servido({}, { images: [] })
    expect(metaDe(corpo, 'og:image')).toEqual(['https://umaestrelinha.com.br/arte.jpg'])
    expect(metaDe(corpo, 'og:image:width')).toEqual(['1200'])
    expect(metaDe(corpo, 'og:image:alt')).toEqual(['Arte da loja'])
  })

  it('origem que não é absoluta: nenhum og:url — nunca um relativo', async () => {
    expect(metaDe(await servido({ origin: '' }), 'og:url')).toEqual([])
  })

  it('o twitter:card do shell fica — ele não é do produto', async () => {
    expect(metaDe(await servido(), 'twitter:card')).toEqual(['summary_large_image'])
  })
})

describe('uma instância de cada, e escape (MTA-17)', () => {
  it('cada tag gerenciada aparece EXATAMENTE uma vez — a genérica sai, nunca duplica', async () => {
    const corpo = await servido({}, { seo_title: 'X', seo_description: 'Y' })
    for (const chave of [
      'description',
      'og:title',
      'og:description',
      'og:type',
      'og:url',
      'og:image',
      'twitter:title',
      'twitter:description',
      'twitter:image',
    ]) {
      expect(metaDe(corpo, chave)).toHaveLength(1)
    }
    expect(tituloDe(corpo)).toHaveLength(1)
  })

  it('aspas, < > e & saem escapados, e o documento mantém o número de <meta>', async () => {
    const hostil = 'Colar "Mãe & Filha" <script>alert(1)</script>'
    const corpo = await servido({}, { seo_title: hostil, seo_description: hostil })
    expect(corpo).not.toContain('<script>alert(1)</script>')
    expect(metaDe(corpo, 'description')).toEqual([
      'Colar &quot;Mãe &amp; Filha&quot; &lt;script&gt;alert(1)&lt;/script&gt;',
    ])
    expect(tituloDe(corpo)).toEqual([
      'Colar "Mãe &amp; Filha" &lt;script&gt;alert(1)&lt;/script&gt; | Uma Estrelinha',
    ])
    // 9 do bloco do produto + o twitter:card, que é do shell
    expect(corpo.match(/<meta /g)).toHaveLength(10)
  })
})

describe('os caminhos de falha servem a página com o <head> genérico (MTA-18)', () => {
  it('slug desconhecido: 404 com noindex (SSV-07) — o corpo continua o shell', async () => {
    const res = await servePage(deps({}, null), new URL('https://x/produtos/nao-existe'))
    expect(res.status).toBe(404)
    expect(res.body).toContain('<meta name="robots" content="noindex" data-owner="estrelinha-spa">')
    expect(res.body).toContain('<div id="root"></div>')
  })

  it('leitura que falha: o shell sai intacto, com 200', async () => {
    const res = await servePage(
      deps({
        readProduct: async () => {
          throw new Error('banco fora')
        },
      }),
      new URL(`https://x/produtos/${SLUG}`),
    )
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL_REAL)
  })
})
