// Feature 33 · `SMP-01`, `SMP-09`, `SMP-10`, `SMP-13` — a serialização do protocolo sitemaps.org.
//
// Molde de `shopping/xml.ts`, inclusive na recusa: **lista vazia lança** em vez de produzir um
// `<urlset>` sem filho. Um sitemap vazio é um documento tecnicamente válido dizendo que a loja não
// tem página nenhuma; quem chama transforma o `throw` em 5xx e o rastreador tenta de novo, que é o
// desfecho certo.

import { escapeXml } from '../xml/escape.ts'
import type { SitemapUrl } from './types.ts'

const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'

/**
 * Os tetos do protocolo, por arquivo. Estão aqui como **dado**, não como comentário, porque a
 * decisão de não ter `<sitemapindex>` foi tomada contra estes números (719 URLs hoje) e precisa
 * poder ser revisada contra eles.
 */
export const SITEMAP_MAX_URLS = 50_000
export const SITEMAP_MAX_BYTES = 50 * 1024 * 1024

/**
 * O `<loc>` de um caminho absoluto, na ordem certa: **percent-encode e depois XML-escape**.
 *
 * A ordem não é preferência. Invertida, um `&` no slug viraria `&amp;` no primeiro passo e
 * `%26amp%3B` no segundo — uma URL que não existe. `encodeURI` preserva os separadores (`/`, `:`)
 * e codifica só o que não é seguro, que é exatamente o que o protocolo pede.
 *
 * Medido em 2026-08-29: os **680** slugs do catálogo são `[a-z0-9-]` puro, então hoje a codificação
 * é no-op. É por isso que o teste desta função usa um slug **sintético** com `&` e acento — sem ele
 * a regra nasceria escrita e não exercitada, que é o pior estado possível para uma regra de escape.
 */
export const locValue = (absoluteUrl: string): string => escapeXml(encodeURI(absoluteUrl))

const entry = (url: SitemapUrl): string => {
  const lastmod =
    url.lastmod == null || url.lastmod === ''
      ? ''
      : `    <lastmod>${escapeXml(String(url.lastmod))}</lastmod>\n`

  return `  <url>\n    <loc>${locValue(url.loc)}</loc>\n${lastmod}  </url>\n`
}

/**
 * O documento.
 *
 * **Sem `<changefreq>` e sem `<priority>`**: o Google declara que ignora as duas. Emitir campo
 * ignorado só cria uma segunda afirmação sobre o catálogo — que envelhece, diverge do `lastmod` e
 * não é lida por ninguém.
 *
 * @throws se a lista estiver vazia, ou se passar do teto de 50.000 URLs (aí a resposta é um
 * `<sitemapindex>`, e essa é uma decisão de arquitetura, não um detalhe de serialização).
 */
export const renderSitemapXml = (urls: readonly SitemapUrl[]): string => {
  if (urls.length === 0) {
    throw new Error('sitemap vazio: um `<urlset>` sem filho declara que a loja não tem página nenhuma')
  }
  if (urls.length > SITEMAP_MAX_URLS) {
    throw new Error(
      `sitemap com ${urls.length} URLs passa do teto de ${SITEMAP_MAX_URLS} por arquivo — precisa de <sitemapindex>`,
    )
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset xmlns="${NS}">\n` +
    urls.map(entry).join('') +
    '</urlset>\n'
  )
}
