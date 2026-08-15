// De linha do banco para o `Product` que a loja consome.
//
// Existia em três cópias — `useProducts`, `useProduct` e `useRecoverCart` — e as três divergiam: a
// terceira já não mapeava as dimensões de frete (SHP-02), então um carrinho recuperado cotava com
// os fallbacks 11/2/16/0.1. Com a grade entrando no tipo (T18), manter três cópias significa
// esquecer a grade em uma delas e a loja tratar o produto como simples num caminho só.
//
// A tolerância a dado torto é deliberada e segue a regra de `normalizeImages`: um `options`
// corrompido faz o produto perder os seletores, não a página.

import { normalizeImages, primaryImage } from '@estrelinha/core/media'
// Os normalizadores de forma do produto vivem em `@estrelinha/core/product` desde a 11/T21: o
// backoffice lê as MESMAS colunas para editar a grade, e se os dois lados discordassem sobre o que
// é uma variação vendável, o lojista publicaria uma grade que a vitrine não mostra — sem erro em
// lugar nenhum. Nasceram aqui na 07/T18 e foram promovidos, não copiados.
import { normalizeCategoryLinks, normalizeOptions, normalizeVariants, toStockPolicy } from '@estrelinha/core/product'
import { toMaterialKinds } from '@estrelinha/core/material'
import type { Product } from '@estrelinha/supabase/types'

/**
 * O `select` que traz tudo o que este mapper lê. Uma string só, para os 3 hooks não divergirem.
 *
 * **`categories!products_category_id_fkey` não é preciosismo — sem o nome da FK a loja fica vazia.**
 * Existem DOIS caminhos de `products` para `categories`: a coluna legada `products.category_id` e a
 * N:N `product_categories` (criada pela feature `07`). Com os dois embutidos no mesmo `select`, o
 * PostgREST se recusa a adivinhar e responde `300 PGRST201` — os hooks tratam como "sem resultado" e
 * a vitrine mostra zero produtos, sem erro visível. Nomear a FK desfaz a ambiguidade.
 */
export const PRODUCT_SELECT =
  '*, categories!products_category_id_fkey(slug, name), product_variants(*), product_categories(category_id, position)'

/**
 * O mesmo `select`, mais um embed **aliased** só para filtrar por categoria no servidor.
 *
 * ## Por que o alias, e não `product_categories!inner`
 *
 * Filtrar direto no embed existente resolveria a consulta e **quebraria o selo do card**: quando o
 * PostgREST aplica um filtro sobre um embed `!inner`, ele devolve **apenas as linhas que casam**.
 * `category_links` deixaria de ser "todas as categorias do produto" e passaria a ser "as da árvore
 * que estou navegando" — e `displayCategory` (PST-06), que escolhe o selo pela menor
 * `categories.sort_order` entre TODAS, passaria a escolher outro. Silenciosamente.
 *
 * Com o alias, `product_categories` volta completo e só `filtro` é truncado. Medido contra o banco
 * real: 46 produtos, 5 vínculos em `product_categories` e 1 em `filtro`, nos 46.
 *
 * ## Por que não `in('id', [...])`
 *
 * Era como funcionava até `BUG-20260809`: buscava os `product_id` da árvore e mandava a lista de
 * uuids na URL. Com o catálogo real isso virou uma URL de **14.309 caracteres** para
 * `/colecao/joias-afetivas`, recusada antes de chegar ao PostgREST — e a página mostrava
 * "0 produtos encontrados". Funcionava no seed porque a maior categoria tinha 4 produtos.
 */
export const PRODUCT_SELECT_BY_CATEGORY =
  `${PRODUCT_SELECT}, filtro:product_categories!inner(category_id)`

/** A coluna do embed aliased, para o `.in()` do filtro. */
export const CATEGORY_FILTER_COLUMN = 'filtro.category_id'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mapDbToProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  price: p.base_price ?? p.price ?? 0,
  compare_price: p.original_price ?? p.compare_price ?? null,
  category_id: p.category_id ?? '',
  category_slug: p.categories?.slug ?? '',
  description: p.description ?? '',
  // VAR-11: `images` chega como jsonb. `''` em vez de `undefined` porque `image_url` alimenta
  // `<img src>` em 6 componentes — `src={undefined}` renderiza a URL da página como imagem.
  image_url: primaryImage(p.images)?.url ?? '',
  images: normalizeImages(p.images),
  options: normalizeOptions(p.options),
  variants: normalizeVariants(p.product_variants, p.id),
  stock_policy: toStockPolicy(p.stock_policy),
  category_links: normalizeCategoryLinks(p.product_categories),
  stock_total: p.stock ?? p.stock_total ?? 0,
  low_stock_threshold: p.low_stock_threshold ?? 5,
  is_new: p.is_new ?? false,
  is_featured: p.is_featured ?? false,
  tags: p.tags ?? [],
  // SHP-02: sem estes campos a cotação de frete cairia sempre nos fallbacks 11/2/16/0.1.
  weight_kg: p.weight_kg ?? undefined,
  width_cm: p.width_cm ?? undefined,
  height_cm: p.height_cm ?? undefined,
  length_cm: p.length_cm ?? undefined,
  // Feature 22. **Sem `?? false`**: `null` é o marcador de "nunca decidido", e coalescer aqui o
  // apagaria — `requiresMaterial()` já trata `null` como "não exige", que é o comportamento seguro.
  requires_material:
    typeof p.requires_material === 'boolean' ? p.requires_material : null,
  material_kinds: toMaterialKinds(p.material_kinds),
  engraving_max_chars:
    typeof p.engraving_max_chars === 'number' ? p.engraving_max_chars : null,
})
/* eslint-enable @typescript-eslint/no-explicit-any */
