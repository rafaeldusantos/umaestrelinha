/**
 * O que a URL de categoria é: conteúdo, redirect ou 404 — feature 23 (`URL-03`, `URL-04`, `SEO-02`),
 * movido para `core` na feature 69.
 *
 * **Dois leitores em runtimes diferentes** (`AD-033`): a `CategoryPage` da loja, no navegador, e a
 * página servida pela função da Vercel (`servePage`), em Node. Escrita em cada um, a canônica que o
 * HTML servido declara e a que a SPA declara depois divergiriam sem nada quebrar — o "defeito 01".
 *
 * **Sem `@estrelinha/supabase/types`**: o tipo da categoria é estrutural e mínimo, e a função é
 * genérica sobre ele — a loja passa o `Category` dela e recebe o mesmo `Category` de volta em
 * `route.category`. Imports por arquivo e com a extensão explícita, `import type` incluso.
 *
 * **Discriminante é literal de STRING, não booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo união discriminada por literal booleano não estreita — ler
 * `route.canonical` no ramo do `kind: false` seria TS2339. Com literal de string, estreita.
 */
import { categoryHref, type MenuCategory } from '../menu/menu.ts'
import { categoryPath } from '../routes/routes.ts'

/** O que esta regra lê de uma categoria — a árvore só precisa de id, slug e pai. */
export interface CategoryRouteNode {
  id: string
  slug: string
  parent_id: string | null
}

export type CategoryRoute<C extends CategoryRouteNode = CategoryRouteNode> =
  | { kind: 'ok'; category: C; canonical: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'notfound' }

/**
 * O sentinela que a RPC `category_fallback` devolve para "categoria inativa SEM ancestral ativo"
 * (feature 69, SSV-15) — o destino é a Home. O contrato é da migration da 69; a constante mora aqui
 * porque quem traduz o id em caminho é esta função.
 */
export const ROOT_FALLBACK = '00000000-0000-0000-0000-000000000000'

export interface CategoryRouteInput<C extends CategoryRouteNode> {
  /** O último segmento da URL — a própria categoria. */
  slug: string
  /** O primeiro segmento, quando a URL tem dois. `null`/ausente é a forma de um segmento. */
  parentSlug?: string | null
  /**
   * A árvore ATIVA. **A policy `public read categories using (active = true)` mantém a categoria
   * inativa fora daqui** — ela não é encontrada, e quem a reconhece é `inactiveFallback`.
   */
  categories: readonly C[]
  /** O `category_id` que `category_redirects` guarda para este `slug`, ou `null` (`SEO-02`). */
  redirectTo?: string | null
  /**
   * O id que a RPC `category_fallback(slug)` devolveu (feature 69): `null` ⇒ não existe categoria
   * INATIVA com esse slug; `ROOT_FALLBACK` ⇒ inativa sem ancestral ativo (⇒ `/`); outro ⇒ o
   * ancestral ativo mais próximo. A loja no navegador não o passa (`L-027`, declarado no design).
   */
  inactiveFallback?: string | null
}

/**
 * A decisão da página de categoria.
 *
 * `AD-018`: a canônica da filha tem **dois** segmentos, e a forma de um segmento **resolve** em vez
 * de redirecionar — `categories.slug` é `UNIQUE` global, então um segmento não é ambíguo, e o 301 do
 * edge (que não conhece a árvore) só sabe apontar para lá. Redirecionar de novo faria dev e produção
 * divergirem em número de saltos, sem ganho.
 *
 * **Precedência fixa (SSV-34): categoria ativa > `category_redirects` > categoria inativa > 404.**
 * `category_redirects.from_slug` divide namespace com `categories.slug`; sem precedência declarada, a
 * mesma URL seria conteúdo e redirect ao mesmo tempo e a resposta dependeria da ordem da consulta.
 *
 * O destino da inativa é a canônica do ancestral montada por `categoryHref` sobre a árvore ativa —
 * **um salto** (SSV-16), nunca uma cadeia: a RPC já subiu até o primeiro ativo.
 */
export const resolveCategoryRoute = <C extends CategoryRouteNode>({
  slug,
  parentSlug,
  categories,
  redirectTo,
  inactiveFallback,
}: CategoryRouteInput<C>): CategoryRoute<C> => {
  if (!slug) return { kind: 'notfound' }

  // `categoryHref` só lê id, slug e parent_id — o mesmo recorte de `CategoryRouteNode`.
  const tree = categories as unknown as readonly MenuCategory[]
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
    // nenhum: segue a precedência.
    if (target) return { kind: 'redirect', to: categoryHref(tree, target.id) }
  }

  if (inactiveFallback) {
    if (inactiveFallback === ROOT_FALLBACK) return { kind: 'redirect', to: '/' }
    const ancestral = categories.find(c => c.id === inactiveFallback)
    // Id fora da árvore ativa (a árvore mudou entre as duas leituras) é ignorado: um salto para o
    // `categoryHref` de um id desconhecido seria a Home por acidente, não por decisão.
    if (ancestral) return { kind: 'redirect', to: categoryHref(tree, ancestral.id) }
  }

  return { kind: 'notfound' }
}
