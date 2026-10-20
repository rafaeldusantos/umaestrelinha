// Feature 33 — as formas mínimas que o sitemap precisa ler do catálogo.
//
// Deliberadamente **estruturais e menores que as do banco**: o sitemap não conhece descrição nem
// nome. (Preço e saldo entraram na 68 e na 69 só para decidir a representante — a opção indexável e
// a primeira foto —, nunca para serem anunciados.) Declarar aqui só o que é lido é o que impede a
// próxima coluna de entrar por acidente — e é o que deixa o teste montar uma entrada de três campos
// em vez de um produto inteiro.

import type { OptionMark } from '../filters/types.ts'
import type { MenuCategory } from '../menu/index.ts'
import type { VariantSeoAxis } from '../seo/variant.ts'

/** Uma linha de `products`, do ponto de vista do sitemap. */
export interface SitemapProduct {
  slug: string
  /** `products.updated_at`. Vira `<lastmod>`; ausente omite a tag. */
  updated_at?: string | null
  /**
   * Feature 68: o que liga a peça às variações e marcações dela, e os eixos. Opcionais — sem eles a
   * peça sai só com a `<loc>` dela, o documento de antes da 68.
   */
  id?: string
  /** A RLS já filtrou; ausente vale como ativa. */
  is_active?: boolean | null
  options?: readonly VariantSeoAxis[] | null
  /**
   * Feature 69 · SSV-24: as fotos (`products.images`) e a política de estoque, que decide a
   * representante e por isso a primeira foto. Ausentes, a `<url>` sai sem `<image:image>` — o
   * documento de antes da 69.
   */
  images?: readonly { url: string }[] | null
  stock_policy?: 'track' | 'backorder' | 'none'
}

/** Uma linha de `product_variants` — só o que decide se a opção tem página e qual é o `?variant=`. */
export interface SitemapVariant {
  id: string
  product_id: string
  nuvemshop_id?: number | null
  price: number | null
  is_active: boolean
  position?: number | null
  option_values?: Readonly<Record<string, string>> | null
  /**
   * Feature 69: a foto da linha e o saldo — os dois decidem a primeira `<image:loc>` (a da
   * representante, que é o `og:image` da página). Sem `stock`, toda linha de peça `track` pareceria
   * esgotada e a representante mudaria.
   */
  image_url?: string | null
  stock?: number
}

/** Uma linha de `product_option_filter_values`, já filtrada pela RLS (grupo ativo, peça ativa). */
export interface SitemapOptionMark extends OptionMark {
  product_id: string
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

/** Uma pergunta da página de perguntas frequentes — só o que monta o endereço dela. */
export interface SitemapFaqQuestion {
  id: string
  question: string
}

/** Uma entrada do documento. Sem `changefreq` e sem `priority` — o Google ignora as duas. */
export interface SitemapUrl {
  /** Absoluta, sem barra final e sem query — exceto `?variant=` de opção indexável (feature 68). */
  loc: string
  /** W3C Datetime, ou ausente. */
  lastmod?: string | null
  /**
   * Feature 69 · SSV-24..30: as fotos da página, absolutas, cada uma vira um `<image:image>`. Só em
   * `<url>` de produto sem `?variant=`; ausente ou vazia ⇒ nenhum bloco.
   */
  images?: readonly string[]
}
