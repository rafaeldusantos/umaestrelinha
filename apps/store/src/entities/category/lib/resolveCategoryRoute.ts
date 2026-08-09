import { categoryHref, type MenuCategory } from '@estrelinha/core/menu'
import { categoryPath } from '@estrelinha/core/routes'
import type { Category } from '@estrelinha/supabase/types'

/**
 * O que a URL de categoria é: conteúdo, redirect ou 404.
 *
 * **Discriminante é literal de STRING, não booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo união discriminada por literal booleano não estreita — ler
 * `route.canonical` no ramo do `kind: false` seria TS2339. Com literal de string, estreita.
 */
export type CategoryRoute =
  | { kind: 'ok'; category: Category; canonical: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'notfound' }

interface Input {
  /** O último segmento da URL — a própria categoria. */
  slug: string
  /** O primeiro segmento, quando a URL tem dois. `null`/ausente é a forma de um segmento. */
  parentSlug?: string | null
  /**
   * A árvore que a loja já carregou. **A policy `public read categories using (active = true)`
   * mantém a categoria inativa fora daqui** — por isso não há regra própria para "inativa": ela
   * simplesmente não é encontrada, e o resultado é `notfound`. É o mesmo mecanismo que faz uma
   * categoria desativada por curadoria responder 404 mesmo com a linha no banco.
   */
  categories: readonly Category[]
  /** O `category_id` que `category_redirects` guarda para este `slug`, ou `null` (`SEO-02`). */
  redirectTo?: string | null
}

/**
 * A decisão da página de categoria (`URL-03`, `URL-04`, `SEO-02`).
 *
 * `AD-018`: a canônica da filha tem **dois** segmentos, e a forma de um segmento **resolve** em vez
 * de redirecionar — `categories.slug` é `UNIQUE` global, então um segmento não é ambíguo, e o 301 do
 * edge (que não conhece a árvore) só sabe apontar para lá. Redirecionar de novo faria dev e produção
 * divergirem em número de saltos, sem ganho.
 *
 * **Precedência fixa: categoria viva > redirect > 404.** `category_redirects.from_slug` divide
 * namespace com `categories.slug`; sem precedência declarada, a mesma URL seria conteúdo e redirect
 * ao mesmo tempo e a resposta dependeria da ordem da consulta.
 */
export const resolveCategoryRoute = ({
  slug,
  parentSlug,
  categories,
  redirectTo,
}: Input): CategoryRoute => {
  if (!slug) return { kind: 'notfound' }

  const tree = categories as readonly MenuCategory[]
  const category = categories.find(c => c.slug === slug)

  if (category) {
    const canonical = categoryHref(tree, category.id)
    const asked = categoryPath(slug, parentSlug)
    // Pai errado na URL (ou pai numa categoria raiz) é a única forma que NÃO é canônica e NÃO
    // resolve: `/pai-que-nao-e-o-dela/filha` teria de servir o mesmo conteúdo sob dois endereços.
    if (asked !== canonical && parentSlug) return { kind: 'redirect', to: canonical }
    return { kind: 'ok', category, canonical }
  }

  if (redirectTo) {
    const target = categories.find(c => c.id === redirectTo)
    // Redirect apontando para categoria apagada ou escondida pela RLS não vira navegação para lugar
    // nenhum: vira a 404 própria.
    if (target) return { kind: 'redirect', to: categoryHref(tree, target.id) }
  }

  return { kind: 'notfound' }
}
