import { describe, expect, it } from 'vitest'
import { GALLERY_STAGE_SIZES } from '../../media/rendition.ts'
import { escapeXml } from '../../xml/escape.ts'
import {
  applyHead,
  imagePreloadLink,
  injectIntoHead,
  jsonLdScript,
  shellDescription,
  type ServedHead,
} from '../head.ts'

/**
 * Feature 69, T03 — `applyHead`, a generalização de `productHeadTags` (da edge function
 * `product-page`). A regra é a mesma, agora para produto, categoria, página fixa e 404:
 * **substitui, nunca duplica** (SSV-20).
 *
 * O shell daqui tem as tags genéricas que o `index.html` de verdade declara — é contra elas que a
 * regra se mede. Os casos que atravessam a página do produto inteira (título de `productHead`,
 * rendição do `og:image`…) moram em `productHead.test.ts`, contra `servePage`.
 */

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

const HEAD: ServedHead = {
  title: 'Joia de Leite Materno | Uma Estrelinha',
  description: 'Joias de leite materno feitas à mão.',
  canonical: 'https://umaestrelinha.com.br/joias-afetivas/joia-de-leite-materno',
  image: null,
  ogType: 'website',
}

const metaDe = (corpo: string, chave: string): string[] =>
  [...corpo.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)]
    .filter(m => m[1] === chave)
    .map(m => m[2])

const tituloDe = (corpo: string): string[] => [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1])
const canonicas = (corpo: string) =>
  [...corpo.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m => m[1])

describe('applyHead — substitui, nunca duplica (SSV-20)', () => {
  it('cada tag gerenciada aparece EXATAMENTE uma vez, e o <title> também', () => {
    const corpo = applyHead(SHELL_REAL, { ...HEAD, image: 'https://cdn/foto.jpg', ogType: 'product' })
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
    expect(tituloDe(corpo)).toEqual([HEAD.title])
    expect(canonicas(corpo)).toEqual([HEAD.canonical])
  })

  it('ogType "product" e "website" saem como pedidos', () => {
    expect(metaDe(applyHead(SHELL_REAL, { ...HEAD, ogType: 'product' }), 'og:type')).toEqual(['product'])
    expect(metaDe(applyHead(SHELL_REAL, HEAD), 'og:type')).toEqual(['website'])
  })

  it('og:url é a canônica, com o mesmo valor', () => {
    const corpo = applyHead(SHELL_REAL, HEAD)
    expect(metaDe(corpo, 'og:url')).toEqual([HEAD.canonical])
  })

  it('canonical nula: nem <link rel="canonical"> nem og:url — e a do shell sai', () => {
    const shell = SHELL_REAL.replace('</head>', '<link rel="canonical" href="https://outra/"></head>')
    const corpo = applyHead(shell, { ...HEAD, canonical: null })
    expect(corpo).not.toContain('rel="canonical"')
    expect(metaDe(corpo, 'og:url')).toEqual([])
  })

  it('shell que já traga canônica fica com EXATAMENTE uma — a da página', () => {
    const shell = SHELL_REAL.replace('</head>', '  <link rel="canonical" href="https://outra/">\n</head>')
    expect(canonicas(applyHead(shell, HEAD))).toEqual([HEAD.canonical])
  })

  it('sem imagem, o card padrão do shell continua inteiro', () => {
    const corpo = applyHead(SHELL_REAL, HEAD)
    expect(metaDe(corpo, 'og:image')).toEqual(['https://umaestrelinha.com.br/arte.jpg'])
    expect(metaDe(corpo, 'og:image:width')).toEqual(['1200'])
    expect(metaDe(corpo, 'og:image:alt')).toEqual(['Arte da loja'])
  })

  it('com imagem, as dimensões e o alt da arte padrão saem', () => {
    const corpo = applyHead(SHELL_REAL, { ...HEAD, image: 'https://cdn/foto.jpg' })
    expect(metaDe(corpo, 'og:image')).toEqual(['https://cdn/foto.jpg'])
    expect(metaDe(corpo, 'twitter:image')).toEqual(['https://cdn/foto.jpg'])
    for (const chave of ['og:image:width', 'og:image:height', 'og:image:alt', 'og:image:type', 'twitter:image:alt']) {
      expect(metaDe(corpo, chave)).toEqual([])
    }
  })

  it('o twitter:card do shell fica — ele não é da página', () => {
    expect(metaDe(applyHead(SHELL_REAL, HEAD), 'twitter:card')).toEqual(['summary_large_image'])
  })

  it('aspas, < > e & saem escapados', () => {
    const hostil = 'Colar "Mãe & Filha" <script>alert(1)</script>'
    const corpo = applyHead(SHELL_REAL, { ...HEAD, title: hostil, description: hostil })
    expect(corpo).not.toContain('<script>alert(1)</script>')
    expect(metaDe(corpo, 'description')).toEqual([
      'Colar &quot;Mãe &amp; Filha&quot; &lt;script&gt;alert(1)&lt;/script&gt;',
    ])
    expect(tituloDe(corpo)).toEqual(['Colar "Mãe &amp; Filha" &lt;script&gt;alert(1)&lt;/script&gt;'])
  })

  it('shell sem <title> ganha um', () => {
    const corpo = applyHead('<html><head></head><body></body></html>', HEAD)
    expect(tituloDe(corpo)).toEqual([HEAD.title])
  })

  it('shell sem </head> volta intacto', () => {
    expect(applyHead('<html></html>', HEAD)).toBe('<html></html>')
  })
})

describe('applyHead — noindex', () => {
  const robots = (corpo: string) =>
    [...corpo.matchAll(/<meta name="robots" content="([^"]*)"[^>]*>/g)].map(m => m[1])

  it('noindex: true injeta EXATAMENTE uma <meta name="robots" content="noindex">', () => {
    const corpo = applyHead(SHELL_REAL, { ...HEAD, noindex: true })
    expect(robots(corpo)).toEqual(['noindex'])
    expect(corpo.match(/name="robots"/g)).toHaveLength(1)
  })

  it('um robots que o shell já traga sai — continua uma só', () => {
    const shell = SHELL_REAL.replace('</head>', '    <meta name="robots" content="index,follow">\n</head>')
    const corpo = applyHead(shell, { ...HEAD, noindex: true })
    expect(robots(corpo)).toEqual(['noindex'])
    expect(corpo.match(/name="robots"/g)).toHaveLength(1)
  })

  it('o robots servido é marcado com o dono que o cliente reconhece (o SPA o remove ao navegar)', () => {
    const corpo = applyHead(SHELL_REAL, { ...HEAD, noindex: true })
    expect(corpo).toContain('<meta name="robots" content="noindex" data-owner="estrelinha-spa">')
  })

  it('sem noindex, nenhum robots é escrito', () => {
    expect(applyHead(SHELL_REAL, HEAD)).not.toContain('name="robots"')
  })

  it('o robots fica dentro do <head>', () => {
    const corpo = applyHead(SHELL_REAL, { ...HEAD, noindex: true })
    expect(corpo.indexOf('name="robots"')).toBeLessThan(corpo.indexOf('</head>'))
  })
})

describe('applyHead — extra', () => {
  it('entra DEPOIS do bloco e antes de </head> — byte a byte a composição antiga do produto', () => {
    const extra = '<script type="application/ld+json">{}</script>'
    const com = applyHead(SHELL_REAL, { ...HEAD, extra })
    expect(com).toBe(injectIntoHead(applyHead(SHELL_REAL, HEAD), extra))
    expect(com.indexOf(extra)).toBeLessThan(com.indexOf('</head>'))
    expect(com.indexOf('name="twitter:description"')).toBeLessThan(com.indexOf(extra))
  })
})

describe('shellDescription', () => {
  it('lê a description que o shell declara, ou null', () => {
    expect(shellDescription(SHELL_REAL)).toBe('Descrição genérica da loja.')
    expect(shellDescription('<html><head></head></html>')).toBeNull()
  })
})

/** Portados de `supabase/functions/product-page/__tests__/handlers.test.ts` (os puros). */
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
})

describe('injectIntoHead', () => {
  it('preserva tudo o que havia antes e depois', () => {
    expect(injectIntoHead('<head><title>T</title></head>', '<b/>')).toBe('<head><title>T</title><b/></head>')
  })
})

describe('imagePreloadLink', () => {
  const STORAGE =
    'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pulseira.webp'

  it('o `imagesizes` é o MESMO `sizes` que a galeria declara — um dono só', () => {
    expect(imagePreloadLink(STORAGE)).toContain('imagesizes="' + escapeXml(GALLERY_STAGE_SIZES) + '"')
  })

  it('IMG-03: o `imagesrcset` tem as quatro larguras do palco largo, e o `href` é a de 1080', () => {
    const link = imagePreloadLink(STORAGE)
    const render = STORAGE.replace('/object/public/', '/render/image/public/')
    const esperado = [360, 480, 720, 1080]
      .map((w) => `${render}?width=${w}&resize=contain&quality=80 ${w}w`)
      .join(', ')
    expect(link).toContain(`imagesrcset="${escapeXml(esperado)}"`)
    expect(link).toContain(`href="${escapeXml(`${render}?width=1080&resize=contain&quality=80`)}"`)
  })

  it('URL vazia devolve string vazia, e não um `<link>` sem destino', () => {
    expect(imagePreloadLink('')).toBe('')
    expect(imagePreloadLink('   ')).toBe('')
  })
})
