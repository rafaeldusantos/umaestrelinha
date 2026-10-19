import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  GALLERY_STAGE_SIZES,
  RENDITION_WIDTHS,
  renditionUrl,
} from '../../../../packages/core/src/media/rendition.ts'
import { escapeXml } from '../../../../packages/core/src/xml/escape.ts'
import { productPageMeta } from '../../../../packages/core/src/seo/pages.ts'
import { productHead, publicOptionMarks } from '../../../../packages/core/src/seo/variant.ts'
import { productJsonLd, withPageUrl } from '../../../../packages/core/src/shopping/index.ts'
import { renderFeedXml, resolveOffer } from '../../../../packages/core/src/shopping/index.ts'
import {
  SHELL_TTL_MS,
  createShellCache,
  handleProductPage,
  imagePreloadLink,
  injectIntoHead,
  jsonLdScript,
  productHeadTags,
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
    // A function mexe em exatamente QUATRO coisas: o `preload` da foto principal (`PRF-06`), o
    // JSON-LD, o `<head>` do produto (feature 62: o `<title>` trocado no lugar e as `<meta>` de
    // descrição e card) e — desde a feature 68 — a `<link rel="canonical">` (SVR-18). Retirar as
    // quatro tem de devolver o shell byte a byte, com o `<title>` original — é o que prova que nada
    // mais no documento foi tocado. A asserção não afrouxou: ganhou a quarta modificação a descontar,
    // e a vizinha abaixo ganhou a contagem dela.
    const semInjecao = corpo
      .replace(/<link rel="preload"[^>]*>/, '')
      .replace(/<link rel="canonical"[^>]*>/, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
      .replace(/<meta [^>]*>/g, '')
      .replace(/<title>[^<]*<\/title>/, '<title>Uma Estrelinha</title>')
    expect(semInjecao).toBe(SHELL)
  })

  it('são QUATRO modificações, e só quatro — a vizinha da asserção acima', async () => {
    const corpo = await (
      await handleProductPage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))
    ).text()
    // Sem esta, o `replace` acima poderia estar descontando algo que não deveria existir.
    expect(corpo.match(/<link rel="preload"/g)).toHaveLength(1)
    expect(corpo.match(/<script type="application\/ld\+json">/g)).toHaveLength(1)
    expect(corpo.match(/<title>/g)).toHaveLength(1)
    expect(corpo.match(/<link rel="canonical"/g)).toHaveLength(1)
    // as nove do bloco do head: description, og:type/title/description/url,
    // twitter:title/description, og:image e twitter:image
    expect(corpo.match(/<meta /g)).toHaveLength(9)
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

/**
 * `PRF-06` — o `<link rel="preload" as="image">` da foto principal.
 *
 * A maior imagem da página do produto é a foto do palco, e sem o preload o navegador só descobre
 * que ela existe **depois** de baixar o bundle, interpretá-lo e montar a árvore. O preload no
 * `<head>` a coloca na fila junto com o JavaScript, em vez de atrás dele.
 *
 * A régua aqui é o par `imagesrcset`/`imagesizes`: divergir do que a galeria declara é PIOR que não
 * ter preload, porque o navegador escolheria um candidato para cada um e baixaria as duas fotos.
 */
describe('handleProductPage — o preload da foto principal (PRF-06)', () => {
  /** A forma real de um objeto público do Storage deste projeto — a única que vira rendição. */
  const STORAGE =
    'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pulseira.webp'

  const comFoto = (u: string) => dados({ product: { ...dados().product, images: [{ url: u }] } })
  const semFoto = () => dados({ product: { ...dados().product, images: [] } })

  const corpoDe = async (d: ProductPageData) =>
    await (await handleProductPage(deps({}, d), url('?slug=x'))).text()

  const linkDe = (corpo: string) => corpo.match(/<link rel="preload"[^>]*>/)?.[0] ?? ''

  /**
   * O `href` isolado do `<link>`, e **não** o `<link>` inteiro.
   *
   * A primeira escrita destes testes media com `expect(link).toContain(...)` sobre a string do
   * elemento — e passava com o `href` apontando para **qualquer** coisa, porque o `imagesrcset`
   * do mesmo elemento carrega as três rendições e satisfazia todos os `toContain`. O Verifier
   * provou: apontando o `href` para a URL original, e depois para a rendição de 360, a suíte
   * passou nas duas vezes.
   *
   * É a regra de payload deste projeto: a asserção tem de mirar **o campo**, nunca o elemento
   * que o contém. `href` é o que o navegador de fato baixa — errar nele é baixar a foto errada
   * com o preload dizendo que está certo.
   */
  const hrefDe = (link: string) => link.match(/\shref="([^"]*)"/)?.[1] ?? ''

  it('produto com foto do Storage: o `href` do preload É a rendição de 720', async () => {
    const link = linkDe(await corpoDe(comFoto(STORAGE)))
    const href = hrefDe(link)

    expect(link).toContain('as="image"')
    // Igualdade, não `toContain`: a URL inteira, montada pelo dono único.
    expect(href).toBe(renditionUrl(STORAGE, 720).replace(/&/g, '&amp;'))
    expect(href).toContain('/storage/v1/render/image/public/product-images/pulseira.webp')
    expect(href).toContain('width=720')
    expect(href).toContain('quality=75')
  })

  it('o `href` NÃO é a URL original — o sensor da lacuna que o Verifier achou', async () => {
    const href = hrefDe(linkDe(await corpoDe(comFoto(STORAGE))))

    expect(href).not.toBe(STORAGE)
    expect(href).toContain('/render/image/')
    expect(href).not.toMatch(/\/object\/public\//)
  })

  it('o `href` NÃO é nenhuma das outras larguras do `imagesrcset`', async () => {
    const href = hrefDe(linkDe(await corpoDe(comFoto(STORAGE))))

    // 360 e 480 estão no `imagesrcset` do MESMO elemento. É exatamente por isso que uma asserção
    // sobre o elemento inteiro não distinguia: as três larguras estão todas ali dentro.
    expect(href).not.toContain('width=360')
    expect(href).not.toContain('width=480')
  })

  it('o `imagesrcset` traz as três larguras que a galeria pede', async () => {
    // Coerência com T3: `ProductGallery` declara `renditionSrcSet(active.url)`, que é o mesmo
    // conjunto. Uma largura a mais ou a menos aqui e o preload deixa de ser reaproveitado.
    const link = linkDe(await corpoDe(comFoto(STORAGE)))

    expect(link).toContain('imagesrcset="')
    for (const w of RENDITION_WIDTHS) expect(link).toContain(String(w) + 'w')
  })

  it('o `imagesizes` é o MESMO `sizes` que a galeria declara — um dono só', () => {
    // `GALLERY_STAGE_SIZES` mora em `core/media/rendition.ts` justamente para não haver duas
    // escritas desta string. Lê-la aqui é o que torna a coerência verificável, e não uma promessa.
    expect(imagePreloadLink(STORAGE)).toContain('imagesizes="' + escapeXml(GALLERY_STAGE_SIZES) + '"')
  })

  it('pede prioridade alta — é o LCP da página do produto', async () => {
    expect(linkDe(await corpoDe(comFoto(STORAGE)))).toContain('fetchpriority="high"')
  })

  it('o `&` da query sai ESCAPADO — `&` cru em atributo é o defeito silencioso', async () => {
    // A URL da rendição carrega `?width=720&resize=contain&quality=75`. Concatenado cru, o `&quality` viraria uma
    // referência de entidade malformada, e o documento deixaria de validar.
    const link = linkDe(await corpoDe(comFoto(STORAGE)))

    expect(link).toContain('&amp;quality=75')
    expect(link).not.toMatch(/[^;]&quality=75/)
  })

  it('foto em host de terceiro sai sem `imagesrcset`, com a URL intacta', async () => {
    // Não há rendição a pedir de um host que não é o nosso: reescrever a URL inventaria um
    // endpoint. E um `imagesrcset` vazio faria o navegador ignorar o preload inteiro.
    const link = linkDe(await corpoDe(comFoto('https://cdn.terceiro.example/p1.jpg')))

    expect(link).toContain('href="https://cdn.terceiro.example/p1.jpg"')
    expect(link).not.toContain('imagesrcset')
    expect(link).not.toContain('/render/image/')
  })

  it('produto SEM foto não ganha preload nenhum', async () => {
    expect(await corpoDe(semFoto())).not.toContain('rel="preload"')
  })

  it('produto SEM foto responde o que respondia antes desta feature — byte a byte', async () => {
    // A prova de que a injeção do preload é ADITIVA: sem foto, a resposta é exatamente o shell com
    // o `<head>` do produto (feature 62) mais o JSON-LD — nenhum `preload` no meio. A régua continua
    // byte a byte; ganhou a peça da 62, que sem foto não leva `og:image`, e a da 68: a canônica no
    // `<head>` (que `productHeadTags` emite) e a `url` do `Product` (SVR-22, por `withPageUrl`).
    const d = semFoto()
    const corpo = await corpoDe(d)

    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    const meta = productPageMeta(d.product)
    const head = productHeadTags(SHELL, {
      title: meta.title,
      description: meta.description,
      url: `${ORIGEM}/produtos/${d.product.slug}`,
      image: null,
    })
    expect(corpo).toBe(
      injectIntoHead(
        head,
        jsonLdScript(withPageUrl(productJsonLd(oferta), { url: `${ORIGEM}/produtos/${d.product.slug}` })),
      ),
    )
  })

  it('o preload vem antes do JSON-LD, e os dois dentro do `<head>`', async () => {
    const corpo = await corpoDe(comFoto(STORAGE))

    expect(corpo.indexOf('rel="preload"')).toBeLessThan(corpo.indexOf('application/ld+json'))
    expect(corpo.indexOf('application/ld+json')).toBeLessThan(corpo.indexOf('</head>'))
  })

  it('o `Content-Type` continua `text/html; charset=utf-8` (AD-021)', async () => {
    // O gateway `*.supabase.co` reescreve para `text/plain`, e quem desfaz isso é um header do
    // `vercel.json`. Se a function deixar de declarar `text/html`, o conserto de lá para de valer.
    const res = await handleProductPage(deps({}, comFoto(STORAGE)), url('?slug=x'))

    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('o JSON-LD continua idêntico com e sem preload', async () => {
    // O preload não pode ter mexido no dado estruturado: é ele que o Merchant Center rastreia.
    const com = ld(await corpoDe(comFoto(STORAGE)))!
    const sem = ld(await corpoDe(comFoto('https://cdn.terceiro.example/p1.jpg')))!

    expect(com['@type']).toBe(sem['@type'])
    expect(com.offers).toEqual(sem.offers)
  })

  it('URL vazia devolve string vazia, e não um `<link>` sem destino', () => {
    expect(imagePreloadLink('')).toBe('')
    expect(imagePreloadLink('   ')).toBe('')
  })
})

/**
 * A fumaça de Deno, feita por leitura de disco.
 *
 * O `deno check` seria o instrumento certo, e o CLI do Deno **não está instalado nesta máquina**.
 * O que este bloco mede é exatamente o modo de falha que ele pegaria, e que já custou uma feature
 * (a `33`): o Deno resolve o grafo de TIPOS por caminho relativo com extensão explícita. Um
 * `import type { X } from '@estrelinha/supabase/types'` em qualquer arquivo alcançável daqui
 * derruba o worker com `Failed resolving types` **antes da primeira linha rodar** — e nada acusa,
 * porque Vite e vitest resolvem as duas formas.
 */
describe('fumaça de Deno — o grafo de imports desta function resolve fora do Vite', () => {
  const AQUI = dirname(fileURLToPath(import.meta.url))

  /** Todo especificador de `import`/`export ... from` do arquivo, incluindo `import type`. */
  const especificadores = (fonte: string): string[] =>
    [...fonte.matchAll(/(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g)].map(
      (m) => m[1],
    )

  const visitados = new Map<string, string[]>()

  const andar = (arquivo: string): void => {
    if (visitados.has(arquivo)) return
    const fonte = readFileSync(arquivo, 'utf8')
    const specs = especificadores(fonte)
    visitados.set(arquivo, specs)
    for (const spec of specs) {
      // Só o que é do repositório: `https://esm.sh/...` e pacote npm não são grafo local.
      if (spec.startsWith('.')) andar(resolve(dirname(arquivo), spec))
    }
  }

  andar(resolve(AQUI, '../handlers.ts'))

  const todos = [...visitados.values()].flat()

  it('a varredura andou o grafo de verdade — âncora dupla', () => {
    // Sem as duas metades, um caminho errado leria um arquivo, não acharia import nenhum, e toda
    // asserção abaixo passaria por vacuidade.
    expect(visitados.size).toBeGreaterThanOrEqual(5)
    expect(todos.length).toBeGreaterThanOrEqual(5)
  })

  it('o `rendition.ts` é alcançado por ARQUIVO, nunca pelo barrel de `core/media`', () => {
    // O barrel importa `@estrelinha/supabase/types`. Passar por ele é a armadilha da `33`.
    const caminhos = [...visitados.keys()].map((p) => p.split('\\').join('/'))
    expect(caminhos.some((p) => p.endsWith('packages/core/src/media/rendition.ts'))).toBe(true)
    expect(caminhos.some((p) => p.endsWith('packages/core/src/media/index.ts'))).toBe(false)
  })

  it('todo especificador relativo do grafo tem extensão `.ts` explícita', () => {
    const semExtensao = todos.filter((s) => s.startsWith('.') && !s.endsWith('.ts'))
    expect(semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa pacote com alias `@estrelinha/`', () => {
    // Inclui `import type`: o Deno resolve o grafo de tipos, e o alias não existe para ele.
    expect(todos.filter((s) => s.startsWith('@estrelinha/'))).toEqual([])
  })

  it('a régua DE FATO pegaria as duas formas — sensor por mutação', () => {
    const sintetico = [
      "import { x } from './sem-extensao'",
      "import type { Y } from '@estrelinha/supabase/types'",
      "export * from './outro.ts'",
    ].join('\n')
    const specs = especificadores(sintetico)

    expect(specs).toEqual(['./sem-extensao', '@estrelinha/supabase/types', './outro.ts'])
    expect(specs.filter((s) => s.startsWith('.') && !s.endsWith('.ts'))).toEqual(['./sem-extensao'])
    expect(specs.filter((s) => s.startsWith('@estrelinha/'))).toHaveLength(1)
  })
})

/**
 * Feature 68 — SVR-17..22, SVR-30, SVR-33: o HTML servido de uma URL de OPÇÃO diz o mesmo que a
 * página escreve depois, pela MESMA função (`productHead`), e toda peça ganha UMA canônica servida.
 */
describe('feature 68 — a página de opção servida', () => {
  const PRATA = 'Prata 925'
  const OURO = 'Prata 925 Folheado a Ouro'
  const ROSE = 'Prata 925 Folheado a Ouro Rose'
  const SLUG = 'pingente-afetivo-pata'
  const variacao = (n: number, cor: string, position: number) => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    nuvemshop_id: 1349521830 + n,
    price: 100 + n,
    compare_price: null,
    stock: 3,
    image_url: null,
    is_active: true,
    position,
    option_values: { Cor: cor },
  })
  const pata = (over: Partial<ProductPageData['product']> = {}, cores = [PRATA, OURO, ROSE]): ProductPageData => ({
    product: {
      id: 'p-pata',
      nuvemshop_id: 300100200,
      name: 'Pingente Afetivo Pata',
      slug: SLUG,
      description: '<p>Feito à mão em resina.</p>',
      images: [{ url: 'https://cdn/pata.jpg' }],
      is_active: true,
      stock_policy: 'track',
      options: [{ name: 'Cor', values: cores }],
      ...over,
    },
    variants: [variacao(1, cores[0], 0), variacao(2, cores[1], 1), variacao(3, cores[2], 2), variacao(4, cores[2], 3)],
  })
  const linha = (option_value: string, is_active = true, option_name = 'Cor') => ({
    option_name,
    option_value,
    value_id: `v-${option_value}`,
    filter_values: { filter_groups: { is_active } },
  })
  const MARCAS = [linha(PRATA), linha(ROSE), linha(OURO, false)]
  const servir = async (qs: string, over: Partial<ProductPageDeps> = {}, d = pata()) => {
    const res = await handleProductPage(
      deps({ readOptionMarks: async () => MARCAS, ...over }, d),
      url(`?slug=${SLUG}${qs}`),
    )
    return { res, corpo: await res.text() }
  }
  const canonicas = (corpo: string) => [...corpo.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m => m[1])
  const metaDe = (corpo: string, chave: string) =>
    [...corpo.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].filter(m => m[1] === chave).map(m => m[2])
  const tituloDe = (corpo: string) => [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1])
  const daRegra = (d: ProductPageData, param: string | null, marcas = MARCAS) =>
    productHead({ product: { ...d.product, option_marks: publicOptionMarks(marcas) }, variants: d.variants }, param)
  const ROSE_REP = '1349521833'
  const ROSE_OUTRA = '1349521834'

  it('SVR-18: a peça sem ?variant= ganha UMA canônica absoluta, igual ao og:url', async () => {
    const { corpo } = await servir('')
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
    expect(metaDe(corpo, 'og:url')).toEqual(canonicas(corpo))
  })

  it('SVR-17/18: ?variant= de opção ⇒ <title>, description, og e twitter de productHead, e a canônica da opção', async () => {
    const { res, corpo } = await servir(`&variant=${ROSE_REP}`)
    const regra = daRegra(pata(), ROSE_REP)
    expect(res.status).toBe(200)
    expect(regra.page.kind).toBe('option')
    // com a marca passaria de 60 caracteres: sai sem ela (SVR-08)
    expect(regra.meta.title).toBe(`Pingente Afetivo Pata — ${ROSE}`)
    expect(tituloDe(corpo)).toEqual([regra.meta.title])
    for (const chave of ['og:title', 'twitter:title']) expect(metaDe(corpo, chave)).toEqual([regra.meta.title])
    for (const chave of ['description', 'og:description', 'twitter:description']) {
      expect(metaDe(corpo, chave)).toEqual([regra.meta.description])
    }
    expect(regra.meta.description.startsWith(`${ROSE}. `)).toBe(true)
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
    expect(metaDe(corpo, 'og:url')).toEqual(canonicas(corpo))
  })

  it('SVR-17: a canônica de opção é byte a byte o <g:link> da representante', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    expect(canonicas(corpo)).toEqual([resolveOffer(d.product, d.variants[2], { origin: ORIGEM }).link])
  })

  it('a NÃO representante do texto indexável: <head> da opção, canônica da representante, oferta da aberta', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_OUTRA}`)
    expect(tituloDe(corpo)).toEqual([`Pingente Afetivo Pata — ${ROSE}`])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
    const dado = ld(corpo)!
    expect(dado.sku).toBe(ROSE_OUTRA)
    expect(dado.offers.url).toBe(resolveOffer(d.product, d.variants[3], { origin: ORIGEM }).link)
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`)
  })

  it('SVR-20: texto marcado em grupo INATIVO ⇒ <head> e canônica da peça', async () => {
    const { corpo } = await servir('&variant=1349521832')
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it('SVR-20: o mesmo texto com o grupo ATIVO teria página — o recorte é o grupo, não o texto', async () => {
    const { corpo } = await servir('&variant=1349521832', { readOptionMarks: async () => [linha(OURO, true)] })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=1349521832`])
  })

  it.each([
    ['inválido', '&variant=xyz'],
    ['desconhecido', '&variant=999'],
    ['de texto sem marcação pública (Ouro, grupo inativo)', '&variant=1349521832'],
  ])('?variant= %s ⇒ o <head> e a canônica da peça, como hoje', async (_n, qs) => {
    const { corpo } = await servir(qs)
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it('outros parâmetros (utm, gclid) nunca entram na canônica', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}&utm_source=x&gclid=abc`)
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
  })

  it('SVR-21: marcações que falham ⇒ 200, <head> e canônica da peça, e o log nomeia o slug', async () => {
    const espiao = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      const { res, corpo } = await servir(`&variant=${ROSE_REP}`, {
        readOptionMarks: async () => {
          throw new Error('marcações fora')
        },
      })
      expect(res.status).toBe(200)
      expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
      expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
      // a oferta continua a da variação aberta — o pagamento e a paridade com o feed não dependem disto
      expect(ld(corpo)!.sku).toBe(ROSE_REP)
      const logs = espiao.mock.calls.map(c => JSON.parse(String(c[0])))
      expect(logs).toContainEqual(expect.objectContaining({ fn: 'product-page', erro: 'marcacoes', slug: SLUG }))
    } finally {
      espiao.mockRestore()
    }
  })

  it('a leitura das marcações recebe o id da peça', async () => {
    const leitura = vi.fn(async () => MARCAS)
    await servir('', { readOptionMarks: leitura })
    expect(leitura).toHaveBeenCalledWith('p-pata')
  })

  it('sem a leitura de marcações nas deps, a peça não tem opção com página', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}`, { readOptionMarks: undefined })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it.each([
    ['vazia', ''],
    ['relativa', '/loja'],
    ['sem esquema', 'umaestrelinha.com.br'],
  ])('SVR-19: origem %s ⇒ nenhuma canônica e nenhum og:url — nunca relativos', async (_n, origin) => {
    for (const qs of ['', `&variant=${ROSE_REP}`]) {
      const { corpo } = await servir(qs, { origin })
      expect(canonicas(corpo)).toEqual([])
      expect(corpo).not.toContain('rel="canonical"')
      expect(metaDe(corpo, 'og:url')).toEqual([])
      // A metade do documento que a canônica não cobre (N09, rodada 2 da verificação): sem origem
      // absoluta o JSON-LD não declara `url` nenhuma — nem `null` — e não vira `ProductGroup`, cujas
      // `hasVariant[].url` sairiam relativas.
      const dado = ld(corpo)!
      expect(dado['@type']).toBe('Product')
      expect(dado).not.toHaveProperty('url')
      expect(dado).not.toHaveProperty('hasVariant')
    }
  })

  it('SVR-18: um shell que já traga canônica fica com EXATAMENTE uma — a do produto', async () => {
    const shell = SHELL.replace('</head>', '  <link rel="canonical" href="https://outra/">\n</head>')
    const { corpo } = await servir('', { fetchShell: async () => shell })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
    expect(corpo.match(/rel="canonical"/g)).toHaveLength(1)
  })

  it('SVR-30/31: a peça sem ?variant= com opções em Cor declara UM ProductGroup, no lugar do Product', async () => {
    const d = pata()
    const { corpo } = await servir('')
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('ProductGroup')
    // O nome é o da PEÇA (SVR-30), asserido no documento servido: `jsonld.test.ts` recebe o nome do
    // próprio teste e não prova a fiação do handler (mutante M39, rodada 1 da verificação).
    expect(dado.name).toBe('Pingente Afetivo Pata')
    expect(dado.productGroupID).toBe('300100200')
    expect(dado.variesBy).toBe('https://schema.org/color')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
    expect(dado.hasVariant.map((v: any) => [v.name, v.color, v.sku, v.url])).toEqual([
      [`Pingente Afetivo Pata — ${PRATA}`, PRATA, '1349521831', `${ORIGEM}/produtos/${SLUG}?variant=1349521831`],
      [`Pingente Afetivo Pata — ${ROSE}`, ROSE, ROSE_REP, `${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`],
    ])
    expect(dado.hasVariant[1].offers).toEqual(productJsonLd(resolveOffer(d.product, d.variants[2], { origin: ORIGEM })).offers)
    expect(corpo.match(/"@type":"Product(Group)?"/g)).toHaveLength(3) // o grupo + as duas variantes, num bloco só
    expect(corpo.match(/application\/ld\+json/g)).toHaveLength(1)
  })

  it('SVR-33: com ?variant= válido, o Product da aberta ganha inProductGroupWithID e a url da canônica', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.inProductGroupWithID).toBe('300100200')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`)
    expect(dado).not.toHaveProperty('hasVariant')
  })

  it('SVR-33: ?variant= válido que resolve para a PEÇA continua com o Product da aberta, url da peça', async () => {
    const { corpo } = await servir('&variant=1349521832')
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.sku).toBe('1349521832')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
  })

  it('SVR-32: eixo fora da tabela (Tipos de elo) ⇒ o Product de hoje, com a url — sem ProductGroup', async () => {
    const d = pata({ options: [{ name: 'Tipos de elo', values: [PRATA, OURO, ROSE] }] })
    d.variants.forEach(v => (v.option_values = { 'Tipos de elo': v.option_values!.Cor }))
    const { corpo } = await servir('', { readOptionMarks: async () => [linha(PRATA, true, 'Tipos de elo')] }, d)
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
  })

  it('SVR-22: preço, sku e offers.url com ?variant= de opção são os do feed para aquela variação', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    const oferta = resolveOffer(d.product, d.variants[2], { origin: ORIGEM })
    const xml = renderFeedXml([oferta], { title: 't', link: ORIGEM, description: 'd' })
    expect(ld(corpo)!.offers.price).toBe(xml.match(/<g:price>([\d.]+) BRL<\/g:price>/)![1])
    expect(ld(corpo)!.offers.url).toBe(oferta.link)
    expect(ld(corpo)!.sku).toBe(oferta.id)
  })

  it('edge case: texto da opção com &, < e aspas sai escapado no HTML e no JSON-LD', async () => {
    const hostil = 'Prata "925" & <b>ouro</b>'
    const d = pata({}, [hostil, OURO, ROSE])
    const { corpo } = await servir('&variant=1349521831', { readOptionMarks: async () => [linha(hostil)] }, d)
    expect(corpo).not.toContain('<b>ouro</b>')
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata — Prata "925" &amp; &lt;b&gt;ouro&lt;/b&gt;'])
    expect(metaDe(corpo, 'og:title')).toEqual([
      'Pingente Afetivo Pata — Prata &quot;925&quot; &amp; &lt;b&gt;ouro&lt;/b&gt;',
    ])
    expect(metaDe(corpo, 'description')[0].startsWith('Prata &quot;925&quot; &amp; &lt;b&gt;ouro&lt;/b&gt;. ')).toBe(true)
    const bloco = corpo.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]
    expect(bloco).not.toContain('<')
  })
})
