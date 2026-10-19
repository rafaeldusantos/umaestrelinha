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
import type { OptionMark } from '@estrelinha/core/filters'
import type { Product } from '@estrelinha/supabase/types'

/**
 * Feature 66 — as marcações de filtro do produto, nos dois `select` (o completo e o enxuto).
 *
 * Embed e não consulta à parte: a categoria filtra no navegador sobre a lista que já baixou inteira,
 * e uma segunda ida ao banco por página seria custo sem ganho. A RLS de `product_filter_values` só
 * entrega a anon marcação de valor de grupo **ativo** e de produto ativo — então desligar um grupo
 * no painel tira as marcações dele da loja sem tocar nelas (medido por probe HTTP no banco local).
 */
export const PRODUCT_FILTER_VALUES_EMBED = 'product_filter_values(value_id)'

/**
 * Feature 67 — as marcações por OPÇÃO da peça ("nesta peça, Cor = Prata 925 é o valor X"), nos dois
 * `select`, pela mesma razão do embed acima: a regra roda no navegador sobre a lista já baixada.
 *
 * Este arquivo é o ÚNICO da loja que nomeia a tabela, e o mapper o único que lê o campo do produto:
 * quem decide com ele é `@estrelinha/core/filters` (`marcacaoPorOpcaoComDonoUnico.test.ts`). A RLS
 * entrega a anon só a marcação de grupo ativo e de peça ativa (probe HTTP no banco local, `AD-012`).
 */
export const PRODUCT_OPTION_MARKS_EMBED = 'product_option_filter_values(option_name, option_value, value_id)'

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
  `*, categories!products_category_id_fkey(slug, name), product_variants(*), product_categories(category_id, position, categories(slug, sort_order, active)), ${PRODUCT_FILTER_VALUES_EMBED}, ${PRODUCT_OPTION_MARKS_EMBED}`

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

/**
 * O `select` da LISTAGEM — só o que o card desenha (`PRF-08`).
 *
 * Medido em 2026-09-05 contra a categoria de 147 produtos: `PRODUCT_SELECT` gastava **1.220.067
 * bytes crus / 307 KB comprimidos** para desenhar 24 cards. Quase tudo era coisa que a vitrine não
 * lê — `description` sozinha valia 293.448 bytes, e `product_variants(*)` outros 200.000 em colunas
 * que `normalizeVariants` mapeia mas nenhuma tela de listagem consulta.
 *
 * **O que fica não é negociável, e cada grupo tem um leitor com nome:**
 *
 * - `weight_kg`, `width_cm`, `height_cm`, `length_cm` — `SHP-02`. Sem eles a cotação de frete cai
 *   nos fallbacks `11/2/16/0.1` **em silêncio**, e a listagem adiciona ao carrinho.
 * - `is_new`, `base_price`, `original_price` — os filtros e a ordenação da categoria (`LST-*`), que
 *   continuam rodando no cliente sobre a lista inteira. `tags` continua no `select` porque a busca a
 *   pontua (`searchProducts`); desde a feature 66 nenhum FILTRO a lê (`filtroSemTag.test.ts`).
 * - `product_filter_values(value_id)` — os filtros curados (feature 66), e a marcação por opção
 *   (feature 67), que decide em qual variação o card abre.
 * - `requires_material`, `material_kinds`, `engraving_max_chars` — feature `22`.
 * - `product_categories` COMPLETO — `displayCategory` (`PST-06`) escolhe o selo entre todas as
 *   categorias do produto; recortar aqui trocaria o selo sem quebrar nada.
 * - `options` + `product_variants` — a gaveta de variação abre a partir do card.
 *
 * **O que sai, e o que isso custa:** `description` sai, e com ela sai o casamento por descrição da
 * busca (`searchProducts` a pontua com peso 5, o último recurso). A busca já é uma dívida própria —
 * baixa o catálogo inteiro e herda o teto de 1.000 linhas do PostgREST —, registrada em `BL-025`.
 *
 * `mapDbToProduct` **não muda**: ele já coalesce toda coluna ausente, e é `cardSelect.test.ts` que
 * prova, coluna a coluna, que a linha recortada por este `select` ainda preenche o card inteiro.
 */
export const PRODUCT_CARD_SELECT = [
  // `nuvemshop_id` — feature 61 (`EVT-13`): o `item_id` dos eventos do GA4 é `publicProductId`, e
  // sem a coluna ele cairia no UUID em silêncio — a vitrine deixaria de se ligar à compra.
  'id, name, slug, nuvemshop_id',
  'base_price, original_price',
  // A FK nomeada pela mesma razão de `PRODUCT_SELECT`: sem ela o PostgREST devolve 300 PGRST201 e
  // a vitrine fica vazia sem erro. `name` sai — o mapper lê só o `slug`.
  'category_id, categories!products_category_id_fkey(slug)',
  'images, options, stock_policy',
  // **`stock` NÃO entra, e a razão é schema, não economia.** A coluna foi renomeada para
  // `stock_total` na migration `20260726000000_products_extended_fields.sql`, e o que sobrou dela é
  // o fallback `p.stock ?? p.stock_total` do `mapDbToProduct` — guardado na época para o bundle
  // velho sobreviver ao intervalo de deploy. Pedir `stock` aqui foi ler esse fallback como se fosse
  // declaração de schema: o PostgREST responde **400 `column products.stock does not exist`** e a
  // vitrine inteira fica vazia. `PRODUCT_SELECT` nunca sofreu disso porque usa `*`.
  //
  // É o `AD-012` outra vez, e do lado da leitura: tipo e fallback são afirmação, o banco é a
  // verificação. Quem impede a volta é `renamedColumns.test.ts`, que lê os `RENAME COLUMN` das
  // migrations do disco.
  'stock_total, low_stock_threshold',
  'is_new, is_featured, tags',
  'weight_kg, width_cm, height_cm, length_cm',
  'requires_material, material_kinds, engraving_max_chars',
  // Lista explícita, nunca `*`: `created_at`, `product_id`, `sku` e `weight_kg` da variação não têm
  // leitor de listagem. `product_id` ausente cai no id do produto, dentro do próprio
  // `normalizeVariants`. `nuvemshop_id` entrou na feature 67: o card que abre na variação linka
  // `?variant=<publicVariantId>`, e sem a coluna o link sairia com o UUID em vez do id que o Google
  // Shopping já indexou — a mesma página, com outro endereço.
  'product_variants(id, name, price, compare_price, stock, image_url, is_active, position, option_values, nuvemshop_id)',
  // `categories(slug, sort_order, active)` DENTRO do vínculo — feature 61: é o que dá ao `item_category` do
  // GA4 a categoria de exibição sem consulta extra. Não reabre a ambiguidade da FK: de
  // `product_categories` para `categories` existe um caminho só (`category_id`).
  'product_categories(category_id, position, categories(slug, sort_order, active))',
  // Feature 66 — os filtros curados da categoria e da busca (`core/filters`, por id).
  PRODUCT_FILTER_VALUES_EMBED,
  // Feature 67 — a marcação por opção, que faz a peça passar pela variação (`matchProduct`).
  PRODUCT_OPTION_MARKS_EMBED,
].join(', ')

/**
 * O enxuto com o embed aliased do filtro por categoria.
 *
 * A razão do alias é a de `PRODUCT_SELECT_BY_CATEGORY`, e não mudou: filtrar direto no
 * `product_categories` embutido com `!inner` faria o PostgREST devolver **só as linhas que casam**,
 * e `displayCategory` (`PST-06`) escolheria outro selo em silêncio.
 */
export const PRODUCT_CARD_SELECT_BY_CATEGORY =
  `${PRODUCT_CARD_SELECT}, filtro:product_categories!inner(category_id)`

/** A coluna do embed aliased, para o `.in()` do filtro. */
export const CATEGORY_FILTER_COLUMN = 'filtro.category_id'

/**
 * O embed `product_filter_values(value_id)` → a lista de ids. Ausente (o `select` não pediu) ou
 * torto vira `[]`: produto sem marcação, nunca página quebrada.
 */
const toFilterValueIds = (raw: unknown): string[] =>
  Array.isArray(raw)
    ? raw
        .map(r => (r && typeof r === 'object' ? (r as { value_id?: unknown }).value_id : null))
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []

/**
 * O embed das marcações por opção → `{ option_name, option_value, value_id }[]`. Linha sem as três
 * strings é descartada: eixo vazio nunca casa variação, e um id ausente não nomeia valor nenhum.
 * Ausente (o `select` não pediu) ou torto vira `[]`, como o embed da 66.
 */
const toOptionMarks = (raw: unknown): OptionMark[] =>
  Array.isArray(raw)
    ? raw.flatMap(r => {
        if (!r || typeof r !== 'object') return []
        const { option_name, option_value, value_id } = r as Record<string, unknown>
        if (typeof option_name !== 'string' || option_name.length === 0) return []
        if (typeof option_value !== 'string' || option_value.length === 0) return []
        if (typeof value_id !== 'string' || value_id.length === 0) return []
        return [{ option_name, option_value, value_id }]
      })
    : []

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
  // Feature 62: a copy de busca curada chegava no `select *` e era descartada aqui.
  seo_title: p.seo_title ?? null,
  seo_description: p.seo_description ?? null,
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
  // Feature 61 (`EVT-13`). Sem `?? 0`: zero não é id, e `publicProductId` trata ausente e `null`
  // caindo no UUID — que é o recuo certo.
  nuvemshop_id: typeof p.nuvemshop_id === 'number' ? p.nuvemshop_id : null,
  // Feature 66: sempre um array — `[]` quando o embed não veio.
  filter_value_ids: toFilterValueIds(p.product_filter_values),
  // Feature 67: sempre um array — `[]` quando o embed não veio.
  option_marks: toOptionMarks(p.product_option_filter_values),
})
/* eslint-enable @typescript-eslint/no-explicit-any */
