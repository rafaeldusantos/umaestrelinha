// Feature 33 — as formas mínimas que o sitemap precisa ler do catálogo.
//
// Deliberadamente **estruturais e menores que as do banco**: o sitemap não conhece preço, estoque,
// imagem nem descrição. Declarar aqui só `slug` e `updated_at` é o que impede a próxima coluna de
// entrar por acidente — e é o que deixa o teste montar uma entrada de três campos em vez de um
// produto inteiro.

import type { MenuCategory } from '../menu/index.ts'

/** Uma linha de `products`, do ponto de vista do sitemap. */
export interface SitemapProduct {
  slug: string
  /** `products.updated_at`. Vira `<lastmod>`; ausente omite a tag. */
  updated_at?: string | null
}

/**
 * Uma linha de `categories`, do ponto de vista do sitemap.
 *
 * **É a `MenuCategory` inteira, e não uma forma reduzida**, porque quem monta a canônica é
 * `categoryHref` e ele recebe `MenuCategory[]`. A alternativa — declarar aqui só `id`, `slug` e
 * `parent_id` e preencher o resto com valores de fachada na hora de chamar — funcionaria hoje e
 * mentiria amanhã: bastaria `categoryHref` passar a ler `active` para a fachada mudar o resultado
 * em silêncio. Ler as colunas de verdade custa nada (são 35 linhas) e não tem esse modo de falha.
 */
export interface SitemapCategory extends MenuCategory {
  /** `categories.updated_at`. Vira `<lastmod>`; ausente omite a tag. */
  updated_at?: string | null
}

/** Uma entrada do documento. Sem `changefreq` e sem `priority` — o Google ignora as duas. */
export interface SitemapUrl {
  /** Absoluta, sem barra final e sem query. */
  loc: string
  /** W3C Datetime, ou ausente. */
  lastmod?: string | null
}
