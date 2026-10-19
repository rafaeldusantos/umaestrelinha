// Feature 33 — wiring do sitemap.
//
// Só env, client e `Deno.serve`. A lógica está em `handlers.ts`, com dependências injetadas, e é lá
// que ela é testada (`AD-004`).
//
// `verify_jwt = false` no `config.toml`: quem busca é rastreador, que não manda JWT nenhum. Não há
// o que autenticar — o conteúdo é a lista de endereços que a vitrine já publica.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  handleSitemap,
  type SitemapDeps,
} from './handlers.ts'
import type {
  SitemapCategory,
  SitemapOptionMark,
  SitemapProduct,
  SitemapVariant,
} from '../../../packages/core/src/sitemap/index.ts'
import type { FaqPageLink } from '../../../packages/core/src/faq/types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!

/**
 * A chave PUBLICÁVEL, e **não** a de service role — é a única diferença deliberada em relação à
 * `google-feed`, e ela é o desenho, não economia.
 *
 * Com a chave pública, a visibilidade do sitemap **é** a RLS: `public read products using
 * (is_active = true)` e `public read categories using (active = true)`. Com service role, a function
 * teria de repetir esses dois predicados num `.eq()` — uma segunda escrita da política de acesso,
 * que divergiria da primeira sem quebrar nada e faria o sitemap anunciar página que a loja esconde.
 *
 * `SUPABASE_ANON_KEY` é o nome que o runtime injeta; `SUPABASE_PUBLISHABLE_KEY` é o nome novo da
 * mesma coisa. Faltando as duas, as consultas voltam 401, `readCatalog` lança e a resposta é 503 —
 * nunca um sitemap com 4 URLs institucionais.
 */
const publicKey =
  Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''

/** A origem PÚBLICA da loja, não a do Supabase. É o host de toda `<loc>`. */
const storeUrl = Deno.env.get('STORE_PUBLIC_URL') ?? ''

if (!publicKey) {
  console.log(JSON.stringify({ fn: 'sitemap', erro: 'chave_publica_ausente' }))
}

const supabase = createClient(supabaseUrl, publicKey)

/**
 * Só o que vira `<loc>` e `<lastmod>`. Enumerado para o payload não crescer sem decisão. Desde a
 * feature 68 também o que decide as páginas de opção: o `id` (liga a peça às variações e marcações
 * dela), `is_active` e os eixos.
 */
const COLUNAS_PRODUTO = 'id,slug,updated_at,is_active,options'

/** Feature 68: só o que decide se a opção tem página e qual é o `?variant=` dela. */
const COLUNAS_VARIACAO = 'id,product_id,nuvemshop_id,price,is_active,position,option_values'

/** Feature 68: a marcação por opção. A RLS já recortou grupo ativo e peça ativa. */
const COLUNAS_MARCACAO = 'product_id,option_name,option_value,value_id'

/** A chave primária de `product_option_filter_values` — composta, sem `id` —, para a ordem estável. */
const ORDEM_MARCACAO = ['product_id', 'option_name', 'option_value', 'value_id']

/**
 * As colunas de `MenuCategory` mais `updated_at`.
 *
 * São mais do que o sitemap "usa" porque quem monta a canônica é `categoryHref`, e ele recebe
 * `MenuCategory[]`. Passar linhas de verdade em vez de objetos de fachada é o que impede a URL de
 * mudar em silêncio no dia em que `categoryHref` passar a ler outro campo. São 35 linhas.
 *
 * **`show_in_menu` saiu daqui na feature 39**: ela virou coluna gerada e legado não lido, `MenuCategory`
 * não a declara mais, e o sitemap nunca decidiu nada com ela. Pedi-la ao PostgREST era leitura de
 * coluna legado num arquivo que o guarda de `apps/**` não alcançava — o escopo de
 * `menuSurfaceSingleOwner.test.ts` passou a incluir `supabase/functions/**` por causa disto.
 */
const COLUNAS_CATEGORIA = 'id,name,slug,parent_id,sort_order,active,updated_at'

/**
 * `order('id')` é o que torna a paginação estável: sem ordem explícita o PostgREST não garante a
 * mesma sequência entre páginas, e linhas repetiriam ou sumiriam entre uma e outra — com a
 * contagem batendo, que é o pior caso.
 */
const contar = async (tabela: string, coluna = 'slug'): Promise<number> => {
  const { count, error } = await supabase.from(tabela).select(coluna, { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

const ler = async <T>(
  tabela: string,
  colunas: string,
  from: number,
  to: number,
  ordem: readonly string[] = ['id'],
): Promise<T[]> => {
  let consulta = supabase.from(tabela).select(colunas)
  for (const coluna of ordem) consulta = consulta.order(coluna, { ascending: true })
  const { data, error } = await consulta.range(from, to)
  if (error) throw error
  return (data ?? []) as unknown as T[]
}

/**
 * As perguntas da página, com a mesma forma que a loja lê (`useFaqPage`). Entrada inativa chega
 * `faq: null` pela RLS, e `resolveFaqPage` a pula — igual à página.
 */
const lerPerguntas = async (): Promise<FaqPageLink[]> => {
  const { data, error } = await supabase
    .from('faq_page_items')
    .select('faq_id, category, position, answer_override, faq:faqs(id, question, answer, is_active)')
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as FaqPageLink[]
}

Deno.serve(async () => {
  const deps: SitemapDeps = {
    origin: storeUrl,
    countProducts: () => contar('products'),
    countCategories: () => contar('categories'),
    readProducts: (from, to) => ler<SitemapProduct>('products', COLUNAS_PRODUTO, from, to),
    readCategories: (from, to) => ler<SitemapCategory>('categories', COLUNAS_CATEGORIA, from, to),
    readFaqLinks: lerPerguntas,
    countVariants: () => contar('product_variants', 'id'),
    readVariants: (from, to) => ler<SitemapVariant>('product_variants', COLUNAS_VARIACAO, from, to),
    countOptionMarks: () => contar('product_option_filter_values', 'product_id'),
    readOptionMarks: (from, to) =>
      ler<SitemapOptionMark>('product_option_filter_values', COLUNAS_MARCACAO, from, to, ORDEM_MARCACAO),
  }

  return await handleSitemap(deps)
})
