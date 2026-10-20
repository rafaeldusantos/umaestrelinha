// Feature 69 — o `<head>` servido de qualquer rota (`AD-053`).
//
// Os auxiliares nasceram na edge function `product-page` (features 30, 38, 62 e 68) e foram COPIADOS
// para cá na T03 da 69; a cópia de lá é apagada na T12, quando a function sai do repositório. Até lá
// as duas existem, e quem decide o `<head>` servido é só esta (o `vercel.json` deixa de apontar para
// a function na T11).
//
// `applyHead` generaliza `productHeadTags`: o mesmo "substitui, nunca duplica", agora para produto,
// categoria, página fixa e 404 — `ogType`, `noindex` e `extra` são o que muda entre eles.
//
// Imports por ARQUIVO e com extensão explícita: a função da Vercel empacota este módulo fora do Vite.

import {
  GALLERY_STAGE_SIZES,
  RENDITION_WIDTHS,
  renditionSrcSet,
  renditionUrl,
} from '../media/rendition.ts'
import { escapeXml } from '../xml/escape.ts'
import { ROBOTS_META_OWNER } from '../seo/pages.ts'

/**
 * Serializa o JSON-LD para dentro de um `<script>`.
 *
 * `<` vira `\u003c` **sempre**. Uma descrição de produto contendo `</script>` fecharia a tag e o
 * resto do JSON viraria markup executável na página — a descrição vem da Nuvemshop e não é confiável
 * a esse ponto. Escapar o `<` é o que torna a injeção segura sem depender do conteúdo.
 */
export const jsonLdScript = (dados: Record<string, unknown>): string =>
  `<script type="application/ld+json">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>`

/**
 * O palco da galeria pede a MAIOR das rendições — derivada, nunca cravada.
 *
 * `ProductGallery` chama a mesma largura. O que precisa casar de verdade entre o preload e a galeria
 * é o par `srcset`/`sizes`, porque é dele que o navegador escolhe o candidato; o `href` é o recuo de
 * quem não entende `imagesrcset`.
 */
const PALCO_PX = RENDITION_WIDTHS[RENDITION_WIDTHS.length - 1]

/**
 * O `<link rel="preload" as="image">` da foto principal — `PRF-06`.
 *
 * `imagesrcset`/`imagesizes` repetem EXATAMENTE o que a galeria declara. Divergir aqui é pior que
 * não ter preload: o navegador escolheria um candidato para o preload e outro para o `<img>`, e
 * baixaria as duas fotos. Por isso `GALLERY_STAGE_SIZES` mora em `core/media`.
 *
 * Produto **sem** foto devolve `''`. Foto em host de terceiro sai com `href` e sem `imagesrcset`:
 * `renditionSrcSet` devolve `''` porque não há rendição a pedir, e um `imagesrcset` vazio faria o
 * navegador ignorar o preload.
 *
 * O escape é o `escapeXml` do projeto — a URL da rendição carrega `&quality=`, e `&` cru dentro de
 * atributo é o defeito silencioso clássico de quem monta HTML por concatenação.
 */
export const imagePreloadLink = (imageUrl: string): string => {
  const url = (imageUrl ?? '').trim()
  if (url === '') return ''

  const srcset = renditionSrcSet(url)
  const atributos = [
    'rel="preload"',
    'as="image"',
    `href="${escapeXml(renditionUrl(url, PALCO_PX))}"`,
    ...(srcset === ''
      ? []
      : [
          `imagesrcset="${escapeXml(srcset)}"`,
          `imagesizes="${escapeXml(GALLERY_STAGE_SIZES)}"`,
        ]),
    'fetchpriority="high"',
  ]
  return `<link ${atributos.join(' ')}>`
}

/** `<`, `>`, `&` e `"` — o conjunto que fecha um atributo `content="…"` ou abre markup. */
export const escapeHtmlAttr = (valor: string): string =>
  valor.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Insere o bloco imediatamente antes de `</head>`. Sem `</head>`, devolve o shell intacto. */
export const injectIntoHead = (shell: string, bloco: string): string => {
  const i = shell.toLowerCase().indexOf('</head>')
  if (i === -1) return shell
  return shell.slice(0, i) + bloco + shell.slice(i)
}

/** A `description` que o shell declara — o recuo quando a configuração não respondeu (A16). */
export const shellDescription = (shell: string): string | null =>
  shell.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? null

/** As tags genéricas do shell que todo `<head>` servido SUBSTITUI. As de imagem, só com foto. */
const TAGS_DE_TEXTO = [
  'description',
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'twitter:title',
  'twitter:description',
]
const TAGS_DE_IMAGEM = [
  'og:image',
  'og:image:type',
  'og:image:width',
  'og:image:height',
  'og:image:alt',
  'twitter:image',
  'twitter:image:alt',
]

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O `<head>` de uma resposta servida. */
export interface ServedHead {
  title: string
  description: string
  /**
   * Absoluta. Vira a `<link rel="canonical">` E o `og:url`, com o mesmo valor. `null` quando não há
   * canônica a declarar (origem não absoluta, 404): nenhuma das duas, nunca relativa.
   */
  canonical: string | null
  /** A foto do card. `null` ⇒ o card padrão do shell continua, inteiro. */
  image: string | null
  /** `product` para a página da peça; `website` para o resto. */
  ogType: 'product' | 'website'
  /** `true` ⇒ exatamente uma `<meta name="robots" content="noindex">` no documento. */
  noindex?: boolean
  /** Entra antes de `</head>` DEPOIS do bloco — o preload e o JSON-LD do produto. */
  extra?: string
}

/**
 * Troca o `<head>` genérico do shell pelo da página (`MTA-15`..`MTA-17`, SSV-20).
 *
 * **Substitui, nunca duplica**: duas `og:title` no mesmo documento é comportamento indefinido em
 * todo rastreador. Cada tag gerenciada é RETIRADA do shell antes de o bloco novo entrar, e o
 * `<title>` é trocado no lugar. A canônica e o `robots` seguem a mesma régua: a do shell sai.
 */
export const applyHead = (shell: string, head: ServedHead): string => {
  const gerenciadas = head.image ? [...TAGS_DE_TEXTO, ...TAGS_DE_IMAGEM] : TAGS_DE_TEXTO
  let saida = shell
  for (const chave of [...gerenciadas, ...(head.noindex ? ['robots'] : [])]) {
    // A linha inteira sai (recuo e quebra), para o shell não ficar com linhas em branco no lugar.
    const re = new RegExp(
      `[ \\t]*<meta\\s+(?:name|property)="${escapeRegex(chave)}"[^>]*>[ \\t]*\\r?\\n?`,
      'gi',
    )
    saida = saida.replace(re, '')
  }

  // Exatamente UMA canônica no documento (SVR-18): a que o shell trouxer sai, a da página entra.
  saida = saida.replace(/[ \t]*<link\b[^>]*\brel="canonical"[^>]*>[ \t]*\r?\n?/gi, '')

  const titulo = `<title>${head.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>`
  saida = /<title>[\s\S]*?<\/title>/i.test(saida)
    ? saida.replace(/<title>[\s\S]*?<\/title>/i, () => titulo)
    : injectIntoHead(saida, titulo)

  const meta = (atributo: 'name' | 'property', chave: string, valor: string) =>
    `<meta ${atributo}="${chave}" content="${escapeHtmlAttr(valor)}">`
  const bloco = [
    head.noindex
      ? `<meta name="robots" content="noindex" data-owner="${ROBOTS_META_OWNER}">`
      : '',
    meta('name', 'description', head.description),
    meta('property', 'og:type', head.ogType),
    meta('property', 'og:title', head.title),
    meta('property', 'og:description', head.description),
    head.canonical ? `<link rel="canonical" href="${escapeHtmlAttr(head.canonical)}">` : '',
    head.canonical ? meta('property', 'og:url', head.canonical) : '',
    meta('name', 'twitter:title', head.title),
    meta('name', 'twitter:description', head.description),
    head.image ? meta('property', 'og:image', head.image) : '',
    head.image ? meta('name', 'twitter:image', head.image) : '',
  ].join('')
  const comBloco = injectIntoHead(saida, bloco)
  return head.extra ? injectIntoHead(comBloco, head.extra) : comBloco
}
