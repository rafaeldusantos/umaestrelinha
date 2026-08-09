import type { RawProduct } from '../nuvemshop/types.ts'
import { loc } from './loc.ts'

export interface ImagePlan {
  nuvemshop_id: number
  product_nuvemshop_id: number
  /** Rendição WebP do CDN — 89% menos bytes, medido. É a primeira tentativa. */
  webpUrl: string
  /** O arquivo como a origem o publica. Fallback quando o WebP não responde. */
  originalUrl: string
  /** Caminho no bucket **sem extensão**: quem fecha é `storagePath`, com a URL que de fato serviu. */
  storageBase: string
  alt: string
  position: number
}

const splitQuery = (url: string): [string, string] => {
  const at = url.indexOf('?')
  return at < 0 ? [url, ''] : [url.slice(0, at), url.slice(at)]
}

/** A extensão de uma URL, em minúscula e com o ponto (`'.png'`). `''` quando não há. */
export const extensionOf = (url: string): string => {
  const [path] = splitQuery(url)
  const dot = path.lastIndexOf('.')
  const slash = path.lastIndexOf('/')
  return dot > slash ? path.slice(dot).toLowerCase() : ''
}

/**
 * A mesma URL com extensão `.webp`.
 *
 * Medido em 2026-08-09: o CDN da Nuvemshop serve a rendição WebP na própria URL, com a extensão
 * trocada — 1.375 KB de PNG viram 118 KB de WebP, mesma dimensão. Em 11 de 12 amostras funcionou;
 * a 12ª devolveu 403, e é por isso que `originalUrl` existe.
 */
export const toWebpUrl = (src: string): string => {
  const ext = extensionOf(src)
  if (ext === '') return src
  const [path, query] = splitQuery(src)
  return `${path.slice(0, path.length - ext.length)}.webp${query}`
}

/**
 * O caminho final no bucket, a partir da URL que de fato serviu os bytes.
 *
 * A extensão vem da URL usada e não é fixa em `.webp`: caindo no fallback, gravar PNG num arquivo
 * chamado `.webp` seria um nome que mente sobre o conteúdo.
 */
export const storagePath = (plan: ImagePlan, servedUrl: string): string =>
  `${plan.storageBase}${extensionOf(servedUrl) || '.webp'}`

/**
 * Plano de imagem de um produto, na ordem de `position`.
 *
 * ## O caminho é determinístico, e é ele que faz a idempotência (CAT-03)
 *
 * `nuvemshop/<produto>/<imagem>` — sem UUID e sem timestamp. Na segunda execução o caminho é o
 * mesmo, o upload volta "duplicate", e o importador conta como reusada em vez de subir de novo. O
 * uploader do backoffice faz o oposto (`crypto.randomUUID()`), e é justamente por isso que ele não
 * serve aqui: cada re-execução criaria 3.660 arquivos novos.
 *
 * ## Alt
 *
 * Quando a origem tem alt escrito, ele vence — são as palavras de quem conhece a peça (20 das 3.660
 * imagens medidas). Para as outras, o template determinístico de `AD-011`: nome do produto na
 * primeira, `"<nome> — foto N"` nas demais. Sem chamada externa e sem modelo.
 */
export const planImages = (raw: RawProduct): ImagePlan[] => {
  const name = loc(raw.name)
  const ordenadas = [...raw.images].sort((a, b) => a.position - b.position)

  return ordenadas.map((image, index) => ({
    nuvemshop_id: image.id,
    product_nuvemshop_id: raw.id,
    webpUrl: toWebpUrl(image.src),
    originalUrl: image.src,
    storageBase: `nuvemshop/${raw.id}/${image.id}`,
    alt: loc(image.alt) || (index === 0 ? name : `${name} — foto ${index + 1}`),
    position: image.position,
  }))
}
