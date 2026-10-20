// Feature 70 — as leituras de `/sitemap.xml` na função `api/page` (SMV-07).
//
// Era o `index.ts` da edge function `sitemap` (features 33, 46, 68 e 69), e mudou de casa sem
// mudar de coluna: o que se lê é exatamente o que a function lia. A regra — paginação, 503 degradado,
// documento — é `serveSitemap` (`@estrelinha/core/sitemap`), pura e testada em `core`. Aqui ficam só
// as leituras de `SitemapDeps`.
//
// A chave é a PUBLICÁVEL, a mesma de `pageDeps` (`AD-022`): com ela a visibilidade do sitemap **é** a
// RLS — `public read products using (is_active = true)`, `public read categories using
// (active = true)`. Com a chave de serviço seria preciso repetir os dois predicados num `.eq()`, uma
// segunda escrita da política de acesso que divergiria da primeira sem quebrar nada e faria o
// sitemap anunciar página que a loja esconde. `chaveDeServidorForaDoNavegador.test.ts` varre `apps/**`
// e recusa a outra chave aqui também.

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SitemapCategory,
  SitemapDeps,
  SitemapOptionMark,
  SitemapProduct,
  SitemapVariant,
} from '@estrelinha/core/sitemap'

/** As colocações da página de perguntas, como `serveSitemap` as lê — tiradas do contrato. */
type FaqLinkRow = Awaited<ReturnType<SitemapDeps['readFaqLinks']>>[number]

/**
 * Só o que vira `<loc>` e `<lastmod>`. Enumerado para o payload não crescer sem decisão. Desde a
 * feature 68 também o que decide as páginas de opção: o `id` (liga a peça às variações e marcações
 * dela), `is_active` e os eixos. Desde a 69, as fotos (`images`, uma `<image:image>` cada) e
 * `stock_policy`, que com o `stock` da variação decide a representante — a dona da primeira foto,
 * que é o `og:image` da página. Sem as duas a primeira `<image:loc>` divergiria do `og:image` em
 * silêncio (`server/__tests__/sitemap.test.ts` lê estas constantes do disco).
 */
export const COLUNAS_PRODUTO_SITEMAP = 'id,slug,updated_at,is_active,options,images,stock_policy'

/**
 * Feature 68: só o que decide se a opção tem página e qual é o `?variant=` dela. Feature 69: a foto
 * da linha e o saldo, que decidem a primeira foto da peça.
 */
export const COLUNAS_VARIACAO_SITEMAP =
  'id,product_id,nuvemshop_id,price,is_active,position,option_values,image_url,stock'

/** Feature 68: a marcação por opção. A RLS já recortou grupo ativo e peça ativa. */
export const COLUNAS_MARCACAO_SITEMAP = 'product_id,option_name,option_value,value_id'

/** A chave primária de `product_option_filter_values` — composta, sem `id` —, para a ordem estável. */
export const ORDEM_MARCACAO_SITEMAP = ['product_id', 'option_name', 'option_value', 'value_id'] as const

/**
 * As colunas de `MenuCategory` mais `updated_at`.
 *
 * São mais do que o sitemap "usa" porque quem monta a canônica é `categoryHref`, e ele recebe
 * `MenuCategory[]`. Passar linhas de verdade em vez de objetos de fachada é o que impede a URL de
 * mudar em silêncio no dia em que `categoryHref` passar a ler outro campo.
 *
 * **`show_in_menu` não entra** (feature 39): é coluna gerada e legado não lido, e o sitemap nunca
 * decidiu nada com ela (`menuSurfaceSingleOwner.test.ts`).
 */
export const COLUNAS_CATEGORIA_SITEMAP = 'id,name,slug,parent_id,sort_order,active,updated_at'

/** A mesma forma que a loja lê (`useFaqPage`). Entrada inativa chega `faq: null` pela RLS. */
export const COLUNAS_PERGUNTAS_SITEMAP =
  'faq_id, category, position, answer_override, faq:faqs(id, question, answer, is_active)'

type Log = (entrada: Record<string, unknown>) => void

/** As leituras reais de `SitemapDeps`. Erro do PostgREST LANÇA — `serveSitemap` o converte em 503. */
export const sitemapDeps = (
  supabase: SupabaseClient,
  ctx: { origin: string; log: Log },
): SitemapDeps => {
  const contar = async (tabela: string, coluna = 'slug'): Promise<number> => {
    const { count, error } = await supabase.from(tabela).select(coluna, { count: 'exact', head: true })
    if (error) throw error
    return count ?? 0
  }

  /**
   * `order(...)` é o que torna a paginação estável: sem ordem explícita o PostgREST não garante a
   * mesma sequência entre páginas, e linhas repetiriam ou sumiriam entre uma e outra — com a
   * contagem batendo, que é o pior caso.
   */
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

  return {
    origin: ctx.origin,
    log: ctx.log,
    countProducts: () => contar('products'),
    countCategories: () => contar('categories'),
    readProducts: (from, to) => ler<SitemapProduct>('products', COLUNAS_PRODUTO_SITEMAP, from, to),
    readCategories: (from, to) => ler<SitemapCategory>('categories', COLUNAS_CATEGORIA_SITEMAP, from, to),
    // Sem paginação: uma linha por pergunta, dezenas e não milhares (`readCatalog` explica).
    readFaqLinks: async (): Promise<FaqLinkRow[]> => {
      const { data, error } = await supabase
        .from('faq_page_items')
        .select(COLUNAS_PERGUNTAS_SITEMAP)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as FaqLinkRow[]
    },
    countVariants: () => contar('product_variants', 'id'),
    readVariants: (from, to) => ler<SitemapVariant>('product_variants', COLUNAS_VARIACAO_SITEMAP, from, to),
    countOptionMarks: () => contar('product_option_filter_values', 'product_id'),
    readOptionMarks: (from, to) =>
      ler<SitemapOptionMark>(
        'product_option_filter_values',
        COLUNAS_MARCACAO_SITEMAP,
        from,
        to,
        ORDEM_MARCACAO_SITEMAP,
      ),
  }
}
