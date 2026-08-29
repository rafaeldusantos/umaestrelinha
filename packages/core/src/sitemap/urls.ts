// Feature 33 · `SMP-02`..`SMP-08`, `SMP-12` — o catálogo virando a lista de URLs canônicas.
//
// ---------------------------------------------------------------------------------------------
// ESTE MÓDULO NÃO SABE MONTAR UMA URL, E ISSO É O PONTO
// ---------------------------------------------------------------------------------------------
// A regra "qual é o endereço canônico deste conteúdo" **já tem dono** desde a feature 23:
// `productPath` (`core/routes`) e `categoryHref` (`core/menu`). Um sitemap que concatenasse
// `'/produtos/' + slug` seria a quarta escrita dessa regra — e a `BL-007` avisou disso por escrito
// em 2026-08-09: *"o sitemap precisa importar `productPath`/`categoryHref` em vez de montar string
// própria, senão nasce a quarta cópia da regra"*.
//
// A consequência prática é forte: como `categoryHref` é **a mesma função** que
// `resolveCategoryRoute` usa para declarar a `<link rel="canonical">` da página, sitemap e canônica
// não podem divergir. Não por disciplina — por construção.
//
// Extensão explícita em todo import relativo: este grafo é carregado pelo **Deno** da edge function.

import { categoryHref } from '../menu/index.ts'
import { SITEMAP_STATIC_PATHS, productPath } from '../routes/index.ts'
import type { SitemapCategory, SitemapProduct, SitemapUrl } from './types.ts'

export interface SitemapUrlsInput {
  /** A origem pública da loja. Barra final é tolerada e normalizada. */
  origin: string
  /** Produtos legíveis pela chave publicável — a RLS já filtrou `is_active`. */
  products: readonly SitemapProduct[]
  /** Categorias legíveis pela chave publicável — a RLS já filtrou `active`. */
  categories: readonly SitemapCategory[]
  /** Sobrescrita só para teste; produção usa `SITEMAP_STATIC_PATHS`. */
  staticPaths?: readonly string[]
}

/**
 * A origem sem barra final.
 *
 * `'https://x/'` e `'https://x'` precisam produzir a **mesma** `<loc>`: com a barra sobrando,
 * `/sobre` viraria `https://x//sobre`, que é outra URL para o rastreador — conteúdo duplicado
 * criado por um caractere de configuração.
 */
const normalizeOrigin = (origin: string): string => String(origin ?? '').replace(/\/+$/, '')

/**
 * O motivo pelo qual esta origem não serve, ou `null` quando ela serve.
 *
 * **`string | null`, e não união discriminada por literal booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo `{ ok: true } | { ok: false; reason: string }` **não
 * estreita**: ler `.reason` no ramo do `else` é TS2339. Mesmo formato de `reservedSlugRefusal` e
 * `menuSlotRefusal`.
 *
 * A validação existe porque o estrago é **de escala**: uma origem vazia ou relativa não produz uma
 * URL errada, produz **todas** as 719 erradas de uma vez, num documento que continua sendo XML
 * perfeitamente válido. Nenhum parser acusa, e quem descobre é o Search Console.
 */
export const originRefusal = (origin: string): string | null => {
  const valor = String(origin ?? '').trim()
  if (valor === '') return 'STORE_PUBLIC_URL não está configurada'

  let parsed: URL
  try {
    parsed = new URL(valor)
  } catch {
    return `STORE_PUBLIC_URL não é uma URL absoluta: ${valor}`
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `STORE_PUBLIC_URL precisa ser http ou https: ${valor}`
  }
  return null
}

/**
 * Origem + caminho, sem barra final.
 *
 * A raiz é o único caminho que **não** ganha sufixo: `origin + '/'` terminaria em barra, e
 * `trailingSlash: false` no `vercel.json` diz que a forma canônica é sem ela.
 */
const absolute = (origin: string, path: string): string =>
  path === '/' ? origin : `${origin}${path}`

/** Ordem estável de categoria: a mesma da vitrine (`sort_order`), com o slug desempatando. */
const byCategoryOrder = (a: SitemapCategory, b: SitemapCategory): number => {
  const oa = typeof a.sort_order === 'number' ? a.sort_order : 0
  const ob = typeof b.sort_order === 'number' ? b.sort_order : 0
  return oa !== ob ? oa - ob : a.slug.localeCompare(b.slug)
}

/**
 * As URLs canônicas da loja, em ordem determinística.
 *
 * A ordem — institucionais, categorias, produtos — não é estética: duas leituras do mesmo catálogo
 * têm de produzir documentos comparáveis. Com a ordem incidental que o PostgREST devolve, qualquer
 * releitura pareceria uma reescrita completa, e ninguém conseguiria ver o que de fato mudou.
 *
 * @throws quando duas entradas produzem a mesma `<loc>`. `products.slug` e `categories.slug` são
 * `UNIQUE`, então isto é impossível hoje — e é justamente por isso que a recusa é barata e vale a
 * pena: se um dia deixar de ser impossível, o sintoma seria um sitemap com URL repetida, que o
 * Google trata como sinal de baixa qualidade em vez de erro.
 */
export const sitemapUrls = ({
  origin,
  products,
  categories,
  staticPaths = SITEMAP_STATIC_PATHS,
}: SitemapUrlsInput): SitemapUrl[] => {
  const base = normalizeOrigin(origin)

  const estaticas: SitemapUrl[] = staticPaths.map(path => ({
    loc: absolute(base, path),
    // Sem `<lastmod>` de propósito: página institucional não tem coluna de onde derivar a data, e
    // carimbar o instante da leitura faria toda página parecer editada a cada requisição — que é
    // exatamente o sinal que o `lastmod` existe para NÃO dar.
    lastmod: null,
  }))

  const categorias: SitemapUrl[] = [...categories].sort(byCategoryOrder).map(category => ({
    // A lista inteira vai junto porque `categoryHref` sobe até o pai imediato para decidir entre
    // `/filha` e `/pai/filha`. Passar só a categoria produziria sempre a forma de um segmento.
    loc: absolute(base, categoryHref(categories, category.id)),
    lastmod: category.updated_at ?? null,
  }))

  const produtos: SitemapUrl[] = [...products]
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(product => ({
      loc: absolute(base, productPath(product.slug)),
      lastmod: product.updated_at ?? null,
    }))

  const todas = [...estaticas, ...categorias, ...produtos]

  const vistas = new Set<string>()
  for (const url of todas) {
    if (vistas.has(url.loc)) {
      throw new Error(`URL duplicada no sitemap: ${url.loc}`)
    }
    vistas.add(url.loc)
  }

  return todas
}
