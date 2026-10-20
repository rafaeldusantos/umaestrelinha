// Feature 33 — a API pública de `@estrelinha/core/sitemap`.
//
// Consumidor: `supabase/functions/sitemap`, que importa por **caminho relativo com extensão
// explícita** (`../../../packages/core/src/sitemap/index.ts`), no precedente de `shopping` e
// `payment`. O barrel serve a quem passa pelo Vite.
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
