import { describe, expect, it, vi } from 'vitest'
import { renderFeedXml, resolveOffer } from '../../../../packages/core/src/shopping/index.ts'
import {
  SHELL_TTL_MS,
  createShellCache,
  handleProductPage,
  injectIntoHead,
  jsonLdScript,
  type ProductPageData,
  type ProductPageDeps,
} from '../handlers.ts'

/**
 * `GSH-12`, `GSH-13` — a landing page prova o preço sem executar JavaScript.
 *
 * Duas réguas aqui:
 *   1. **todo caminho de erro devolve a PÁGINA**, não um erro — esta function está no caminho de toda
 *      visita a produto, não só a do rastreador;
 *   2. o preço injetado é **o mesmo** que o feed anuncia para aquele `offer_id`.
 */

const SHELL =
  '<!doctype html><html><head><title>Uma Estrelinha</title></head><body><div id="root"></div></body></html>'

const ORIGEM = 'https://umaestrelinha.com.br'

const dados = (over: Partial<ProductPageData> = {}): ProductPageData => ({
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
    {
      id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
      nuvemshop_id: 1259936247,
      price: 24.9,
      compare_price: null,
      stock: 2,
      image_url: null,
      is_active: true,
      position: 1,
    },
  ],
  ...over,
})

const deps = (over: Partial<ProductPageDeps> = {}, d: ProductPageData | null = dados()): ProductPageDeps => ({
  fetchShell: async () => SHELL,
  readProduct: async () => d,
  origin: ORIGEM,
  ...over,
})

const url = (qs: string) => new URL(`https://x/functions/v1/product-page${qs}`)

const ld = (corpo: string): Record<string, any> | null => {
  const m = corpo.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  return m ? JSON.parse(m[1].replace(/\\u003c/g, '<')) : null
}

describe('handleProductPage — o bloco é injetado', () => {
  it('responde 200 com HTML', async () => {
    const res = await handleProductPage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/html')
  })

  it('o bloco entra ANTES de </head>', async () => {
    const corpo = await (
      await handleProductPage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))
    ).text()
    expect(corpo.indexOf('application/ld+json')).toBeLessThan(corpo.indexOf('</head>'))
  })

  it('o resto do shell sai intacto', async () => {
    const corpo = await (
      await handleProductPage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))
    ).text()
    expect(corpo.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')).toBe(SHELL)
  })

  it('declara Product com nome, imagem, sku e oferta', async () => {
    const corpo = await (
      await handleProductPage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah&variant=1259936246'))
    ).text()
    const dados = ld(corpo)!
    expect(dados['@type']).toBe('Product')
    expect(dados.name).toBe('Pulseira 7 Nós Ajustável Proteção Kabbalah')
    expect(dados.image).toEqual(['https://cdn/p1.jpg'])
    expect(dados.sku).toBe('1259936246')
    expect(dados.offers.priceCurrency).toBe('BRL')
    expect(dados.offers.availability).toBe('https://schema.org/InStock')
  })
})

describe('handleProductPage — o ?variant=', () => {
  const preco = async (qs: string, d = dados()) =>
    ld(await (await handleProductPage(deps({}, d), url(qs))).text())!.offers.price

  it('casa por nuvemshop_id', async () => {
    expect(await preco('?slug=x&variant=1259936246')).toBe('19.90')
  })

  // O UUID testado é o da SEGUNDA linha, de propósito. Com o da primeira, o recuo para o
  // representativo devolveria 19,90 de qualquer jeito, e o teste passaria sem provar casamento
  // nenhum — foi assim que ele passou antes de `variantByPublicId` aceitar UUID.
  it('casa por UUID, e não pelo recuo ao representativo', async () => {
    expect(await preco('?slug=x&variant=aa11bb22-cc33-dd44-ee55-ff6677889900')).toBe('24.90')
  })

  it('a segunda variação anuncia o preço dela, não o da primeira', async () => {
    expect(await preco('?slug=x&variant=1259936247')).toBe('24.90')
  })

  it('desconhecido cai no representativo, sem erro', async () => {
    expect(await preco('?slug=x&variant=999999')).toBe('19.90')
  })

  it('malformado cai no representativo, sem erro', async () => {
    expect(await preco('?slug=x&variant=%%%')).toBe('19.90')
  })

  it('ausente cai no representativo', async () => {
    expect(await preco('?slug=x')).toBe('19.90')
  })

  it('variação INATIVA é tratada como desconhecida', async () => {
    const d = dados()
    d.variants[0].is_active = false
    expect(await preco('?slug=x&variant=1259936246', d)).toBe('24.90')
  })

  it('o representativo pula a esgotada e pega a próxima disponível', async () => {
    const d = dados()
    d.variants[0].stock = 0
    expect(await preco('?slug=x', d)).toBe('24.90')
  })

  it('com a grade toda esgotada, usa a primeira e a declara indisponível', async () => {
    const d = dados()
    d.variants.forEach(v => (v.stock = 0))
    const corpo = await (await handleProductPage(deps({}, d), url('?slug=x'))).text()
    expect(ld(corpo)!.offers.price).toBe('19.90')
    expect(ld(corpo)!.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('handleProductPage — todo caminho de erro devolve a PÁGINA', () => {
  it('slug desconhecido devolve o shell intacto, com 200', async () => {
    const res = await handleProductPage(deps({}, null), url('?slug=nao-existe'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(SHELL)
  })

  it('erro ao ler o produto devolve o shell intacto, com 200', async () => {
    const res = await handleProductPage(
      deps({
        readProduct: async () => {
          throw new Error('banco fora')
        },
      }),
      url('?slug=x'),
    )
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(SHELL)
  })

  it('sem slug devolve o shell intacto', async () => {
    const res = await handleProductPage(deps(), url(''))
    expect(await res.text()).toBe(SHELL)
  })

  it('produto sem variação elegível devolve o shell intacto', async () => {
    const d = dados()
    d.variants.forEach(v => (v.price = null))
    const res = await handleProductPage(deps({}, d), url('?slug=x'))
    expect(await res.text()).toBe(SHELL)
  })

  it('o único 5xx é o shell não carregar', async () => {
    const res = await handleProductPage(
      deps({
        fetchShell: async () => {
          throw new Error('deploy fora')
        },
      }),
      url('?slug=x'),
    )
    expect(res.status).toBe(502)
  })

  it('shell sem </head> volta intacto, sem quebrar a página', async () => {
    const res = await handleProductPage(deps({ fetchShell: async () => '<html></html>' }), url('?slug=x'))
    expect(await res.text()).toBe('<html></html>')
  })

  it('não lê o produto quando o shell falhou', async () => {
    const readProduct = vi.fn(async () => dados())
    await handleProductPage(
      deps({
        readProduct,
        fetchShell: async () => {
          throw new Error('x')
        },
      }),
      url('?slug=x'),
    )
    expect(readProduct).not.toHaveBeenCalled()
  })
})

describe('jsonLdScript — a injeção é segura por construção', () => {
  it('escapa < para uma descrição não conseguir fechar o script', () => {
    const bloco = jsonLdScript({ d: 'antes </script><img src=x onerror=alert(1)> depois' })
    expect(bloco).not.toContain('</script><img')
    expect(bloco).toContain('\\u003c/script')
  })

  it('o conteúdo continua legível como JSON depois de desescapado', () => {
    const bloco = jsonLdScript({ d: 'a<b' })
    const json = bloco.replace(/^<script[^>]*>|<\/script>$/g, '').replace(/\\u003c/g, '<')
    expect(JSON.parse(json).d).toBe('a<b')
  })

  it('descrição hostil não escapa do script na resposta montada', async () => {
    const d = dados()
    d.product.description = '<p>Peça</p></script><script>alert(1)</script>'
    const corpo = await (await handleProductPage(deps({}, d), url('?slug=x'))).text()
    expect(corpo).not.toContain('<script>alert(1)</script>')
  })
})

describe('injectIntoHead', () => {
  it('preserva tudo o que havia antes e depois', () => {
    expect(injectIntoHead('<head><title>T</title></head>', '<b/>')).toBe(
      '<head><title>T</title><b/></head>',
    )
  })
})

describe('a resposta pede cache de borda', () => {
  it('declara s-maxage e stale-while-revalidate — a function não pode ser o caminho quente', async () => {
    const res = await handleProductPage(deps(), url('?slug=x'))
    const cc = res.headers.get('Cache-Control') ?? ''
    expect(cc).toContain('s-maxage=300')
    expect(cc).toContain('stale-while-revalidate=86400')
  })
})

describe('createShellCache — o shell velho é quadro branco', () => {
  it('busca uma vez e reusa dentro do TTL', async () => {
    const buscar = vi.fn(async () => SHELL)
    let t = 0
    const ler = createShellCache(buscar, () => t, 60_000)
    await ler()
    t = 59_000
    await ler()
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('busca de novo depois do TTL — o deploy da loja troca o hash dos bundles', async () => {
    const buscar = vi.fn(async () => SHELL)
    let t = 0
    const ler = createShellCache(buscar, () => t, 60_000)
    await ler()
    t = 60_001
    await ler()
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('devolve o conteúdo novo depois de expirar, não o antigo', async () => {
    let versao = 'A'
    let t = 0
    const ler = createShellCache(async () => versao, () => t, 1000)
    expect(await ler()).toBe('A')
    versao = 'B'
    t = 2000
    expect(await ler()).toBe('B')
  })

  it('o TTL padrão é de um minuto', () => {
    expect(SHELL_TTL_MS).toBe(60_000)
  })

  it('falha de busca não envenena o cache com vazio', async () => {
    let falhar = false
    let t = 0
    const ler = createShellCache(
      async () => {
        if (falhar) throw new Error('deploy fora')
        return SHELL
      },
      () => t,
      1000,
    )
    expect(await ler()).toBe(SHELL)
    falhar = true
    t = 2000
    await expect(ler()).rejects.toThrow()
    falhar = false
    expect(await ler()).toBe(SHELL)
  })
})

/**
 * A paridade já é medida em `core` (`shoppingParity.test.ts`), mas aqui ela é medida **atravessando a
 * function**: o que a página serve contra o que o feed serve, pelas duas serializações reais.
 */
describe('paridade: a página declara o que o feed anuncia', () => {
  it('mesmo preço para o mesmo offer_id', async () => {
    const d = dados()
    const corpo = await (await handleProductPage(deps({}, d), url('?slug=x&variant=1259936246'))).text()
    const daPagina = ld(corpo)!.offers.price

    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    const xml = renderFeedXml([oferta], { title: 't', link: ORIGEM, description: 'd' })
    const doFeed = xml.match(/<g:price>([\d.]+) BRL<\/g:price>/)![1]

    expect(daPagina).toBe(doFeed)
  })

  it('mesma URL nas duas superfícies', async () => {
    const d = dados()
    const corpo = await (await handleProductPage(deps({}, d), url('?slug=x&variant=1259936246'))).text()
    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    expect(ld(corpo)!.offers.url).toBe(oferta.link)
  })
})
