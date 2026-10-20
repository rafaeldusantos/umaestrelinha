// Feature 33 — a API pública de `@estrelinha/core/sitemap`.
//
// Consumidor: desde a feature 70, a função `api/page` da Vercel (`apps/store/server`), que empacota
// o módulo por esbuild FORA do Vite — por isso a extensão explícita em todo reexport. Até a `69`
// quem o lia era a edge function `sitemap`, por caminho relativo; ela foi aposentada.
export type {
  SitemapCategory,
  SitemapFaqQuestion,
  SitemapOptionMark,
  SitemapProduct,
  SitemapUrl,
  SitemapVariant,
} from './types.ts'
export { originRefusal, sitemapUrls, type SitemapUrlsInput } from './urls.ts'
export {
  SITEMAP_IMAGE_NS,
  SITEMAP_MAX_BYTES,
  SITEMAP_MAX_IMAGES_PER_URL,
  SITEMAP_MAX_URLS,
  locValue,
  renderSitemapXml,
} from './render.ts'
export {
  SITEMAP_CACHE,
  SITEMAP_CONTENT_TYPE,
  readCatalog,
  serveSitemap,
  type SitemapDeps,
  type SitemapResponse,
} from './serve.ts'
